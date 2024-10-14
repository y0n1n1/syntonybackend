import { query } from "./dbconnect";
import natural from 'natural';


const calculateIDF = async () => {
    const totalDocuments = await query('SELECT COUNT(*) FROM articles');
    const docCount = totalDocuments.rows[0].count;

    // Query all articles and extract terms
    const result = await query('SELECT title, abstract FROM articles');
    const documents = result.rows.map(row => `${row.title} ${row.abstract}`);

    const termDocCounts = new Map<string, number>();

    // Count occurrences of terms in documents
    documents.forEach(doc => {
        const terms = new Set(doc.toLowerCase().split(/\W+/)); // Split by non-word characters
        terms.forEach(term => {
            if (term) {
                termDocCounts.set(term, (termDocCounts.get(term) || 0) + 1);
            }
        });
    });

    // Calculate and store IDF values
    for (const [term, count] of termDocCounts) {
        console.log([term, count])
        const idf = Math.log(docCount / count);
        await query('INSERT INTO idf_values (term, idf) VALUES ($1, $2) ON CONFLICT (term) DO UPDATE SET idf = EXCLUDED.idf', [term, idf]);
    }
};

export const calculateTFIDF = async (search_query: string) => {
    // IMPROVEMENTS:
    // MORE EXPRESSIVENESS FOR NUMBER OF TERMS PRESENT (WITH BONUS FOR EVERY TERM)
    // EXPRESSIVENESS FOR ORDER OF TERMS (WITH BONUS FOR CORRECT ORDER)
    // MORE EXPRESSIVENESS FOR DIMINISHING THE RELEVANCE OF THE COUNT AFTER 3 REPEATS, AS OBV ABSTRACTS REMAIN CONSISE
    // SLIGHT TITLE PRIORITY OR ABSTRACT PRIORITY
    // SYNONYMS API: https://api.datamuse.com/words?ml=${term}



    console.log("search query: " + search_query);

    // Step 1: Split the query into terms and prepare effective query terms
    const queryTerms = search_query.toLowerCase().split(/\W+/).filter(Boolean);
    console.log("queryTerms: " + queryTerms);

    // Fetch IDF values for the query terms from the idf_values table
    const idfValues = await Promise.all(queryTerms.map(term => 
        query('SELECT idf FROM idf_values WHERE term = $1', [term])
    ));
    console.log("idfValues: " + idfValues);

    // Filter terms to include only those with an IDF score above 1
    const effectiveQueryTerms = queryTerms.filter((term, index) => {
        const idf = idfValues[index].rows.length > 0 ? idfValues[index].rows[0].idf : 0;
        console.log(idf)
        return idf > 5; // Keep terms with IDF scores greater than 1
    });
    // here check if effectiveQueryTerms is empty. if it is not, continue  through steps 2 to 4. otherwise, steps 2 to 4 should already start by activating the second filter

    console.log("effectiveQueryTerms: " + effectiveQueryTerms);

    let filteredArticles:any[] = [];
    if (effectiveQueryTerms.length===0) {

        const result = await query(`
            SELECT * FROM articles
            WHERE (
                (SELECT COUNT(*) FROM unnest($1::text[]) AS term WHERE title ILIKE '%' || term || '%') >= 2
                OR
                (SELECT COUNT(*) FROM unnest($1::text[]) AS term WHERE abstract ILIKE '%' || term || '%') >= 2
            )
            ORDER BY published_date DESC
            LIMIT 5000
            `, [queryTerms]);
    
        filteredArticles = result.rows
        console.log("length: " + filteredArticles.length);

    } else{
        // Step 2: Fetch articles containing at least one of the search terms
        console.log(`QUERY: SELECT * FROM articles WHERE title ILIKE ANY${[effectiveQueryTerms.map(term => `%${term}%`)]} OR abstract ILIKE ANY${[effectiveQueryTerms.map(term => `%${term}%`)]}` );
        const result = await query('SELECT * FROM articles WHERE title ILIKE ANY($1) OR abstract ILIKE ANY($1)', [effectiveQueryTerms.map(term => `%${term}%`)]);
        // Step 3: Check the initial result count
        filteredArticles = result.rows;
        console.log("filteredArticles.length: " + filteredArticles.length);
    
        // Step 4: Filter articles if their count exceeds 5,000
        if (filteredArticles.length > 5000) {
            console.log("over 5000, activating second filter");
            filteredArticles = filteredArticles.filter(article => {
                const termCount = effectiveQueryTerms.filter(term => 
                    article.title.includes(term) || article.abstract.includes(term)
                ).length;
                return termCount >= 2; // Keep articles containing at least two effective terms
            });
            console.log("new length: " + filteredArticles.length);
    }

    }
    

    // Populate the IDF map, defaulting to zero for non-existent terms
    const idfMap = new Map<string, number>();
    queryTerms.forEach((term, index) => {
        if (idfValues[index].rows.length > 0) {
            idfMap.set(term, idfValues[index].rows[0].idf);
        } else {
            idfMap.set(term, 0); // Assign zero if term not found
        }
    });

    // Step 6: Calculate TF-IDF scores manually
    const tfidfResults = filteredArticles.map((article) => {
        const scores: Record<string, number> = {};

        // Combine title and abstract as the document text
        const documentText = `${article.title} ${article.abstract}`;
        const docTerms = documentText.toLowerCase().split(/\W+/).filter(Boolean);

        queryTerms.forEach(term => {
            // Calculate term frequency (TF) = count of term in document / total terms in document
            const termCount = docTerms.filter(t => t === term).length;
            const tf = termCount / docTerms.length;

            // Get the IDF value from the map
            const idf = idfMap.get(term) || 0;

            // Calculate TF-IDF score
            scores[term] = (0.9 * termCount * idf) +(0.1 * idf * tf);
        });

        // Return the full article object along with the TF-IDF scores
        return {
            external_id: article.external_id,
            source: article.source,
            title: article.title,
            authors: article.authors,
            published_date: article.published_date,
            pdf_url: article.pdf_url,
            comments: article.comments,
            journal_ref: article.journal_ref,
            doi: article.doi,
            abstract: article.abstract,
            categories: article.categories,
            scat: article.scat,
            id: article.id,
            citations: article.citations,
            last_citation_check: article.last_citation_check,
            scores, // Include the TF-IDF scores for the query terms
        };
    });

    // Step 7: Multiply the scores for each article and rank them
    const rankedArticles = tfidfResults.map(article => {
        // Multiply all TF-IDF scores together
        const scoreProduct = Object.values(article.scores).reduce((acc, score) => acc * (score === 0 ? 0.05 : Math.max(score, 0.5)), 1);
        return {
            ...article,
            totalScore: scoreProduct // Add total score to each article
        };
    })
    .sort((a, b) => b.totalScore - a.totalScore) // Sort articles by totalScore in descending order
    .slice(0, 20); // Keep only the top 20 articles 

    // Step 8: Return the top 20 results
    console.log(rankedArticles);
    return rankedArticles;
};




//calculateTFIDF("transformer in deep learning models")

///calculateTFIDF("deep learning classifier")