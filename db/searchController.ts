import { getCitations } from '../citation/citationController';
import { SearchAlgorithm } from '../searchEngine/searchAlgorithm';
import { logApiCall } from './apiLogController';
import { query } from './dbconnect'; // Import your query function
import { addSearchHistory } from './searchHistoryController';
import { calculateTFIDF } from './tfidfController';

const useCitations = false

export interface SearchCriteria {
  authors?: string[];
  allAuthors?: boolean;
  startDate?: string;
  endDate?: string;
  titlesIncludes?: string[];
  allTitles?: boolean;
  abstractsIncludes?: string[];
  allAbstracts?: boolean;
  categories?: string[];
  allCategories?: boolean;
}

function splitMapIntoChunks<K, V>(originalMap: Map<K, V>, chunkSize: number): Map<K, V>[] {
  const mapChunks: Map<K, V>[] = [];
  let currentChunk = new Map<K, V>();
  let count = 0;

  for (const [key, value] of originalMap) {
    currentChunk.set(key, value);
    count++;

    // Once we reach the chunk size, push the current chunk to the result array and create a new chunk
    if (count === chunkSize) {
      mapChunks.push(currentChunk);
      currentChunk = new Map<K, V>();
      count = 0;
    }
  }

  // Push the last chunk if it has any remaining items
  if (currentChunk.size > 0) {
    mapChunks.push(currentChunk);
  }

  return mapChunks;
}

const buildQuery = (criteria: SearchCriteria) => {
  let baseQuery = 'SELECT * FROM articles WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  // Handle authors (text[])
  if (criteria.authors && criteria.authors.length > 0) {
    baseQuery += ' AND EXISTS (SELECT 1 FROM unnest(authors) AS author WHERE author ILIKE $' + paramIndex++ + ')';
    params.push(`%${criteria.authors.join('%')}%`);  // Join authors into a single pattern
  }

  // Handle date range
  if (criteria.startDate || criteria.endDate) {
    if (criteria.startDate && criteria.endDate) {
      // If both startDate and endDate are present
      baseQuery += " AND published_date BETWEEN $" + paramIndex++ + " AND $" + paramIndex++;
      params.push(criteria.startDate, criteria.endDate);
    } else if (criteria.startDate) {
      // If only startDate is present
      baseQuery += " AND published_date >= $" + paramIndex++;
      params.push(criteria.startDate);
    } else if (criteria.endDate) {
      // If only endDate is present
      baseQuery += " AND published_date <= $" + paramIndex++;
      params.push(criteria.endDate);
    }
  }

  // Handle titles includes
  if (criteria.titlesIncludes && criteria.titlesIncludes.length > 0) {
    baseQuery += ' AND (' + criteria.titlesIncludes.map(() => `(title ILIKE $${paramIndex++})`).join(' OR ') + ')';
    params.push(...criteria.titlesIncludes.map(title => `%${title}%`));
  }

  // Handle abstracts includes
  if (criteria.abstractsIncludes && criteria.abstractsIncludes.length > 0) {
    baseQuery += ' AND (' + criteria.abstractsIncludes.map(() => `(abstract ILIKE $${paramIndex++})`).join(' OR ') + ')';
    params.push(...criteria.abstractsIncludes.map(abstract => `%${abstract}%`));
  }

  // Handle categories (text[])
  if (criteria.categories && criteria.categories.length > 0) {
    baseQuery += ' AND EXISTS (SELECT 1 FROM unnest(categories) AS category WHERE category ILIKE $' + paramIndex++ + ')';
    params.push(`%${criteria.categories.join('%')}%`);  // Join categories into a single pattern
  }

  console.log('Constructed Query:', baseQuery);
  console.log('Query Parameters:', params);

  return { baseQuery, params };
};

const updateCitationsInBatches = async (citations: { citationCount: number; articleId: string }[], batchSize: number) => {
  try {
    const currentDate = new Date().toISOString().split('T')[0]; // Format to YYYY-MM-DD

    for (let i = 0; i < citations.length; i += batchSize) {
      const batch = citations.slice(i, i + batchSize);
      const updateQuery = `
        UPDATE public.articles
        SET citations = CASE external_id ${batch.map((_, index) => `WHEN $${index * 2 + 1} THEN $${index * 2 + 2}::integer`).join(' ')} END,
            last_citation_check = $${batch.length * 2 + 1}
        WHERE external_id IN (${batch.map((_, index) => `$${index * 2 + 1}`).join(', ')})
      `;

      // Flatten the parameters: [articleId1, citationCount1, articleId2, citationCount2, ..., currentDate]
      const params = batch.flatMap(({ citationCount, articleId }) => [articleId, citationCount]);
      params.push(currentDate); // Add the current date as the last parameter
      console.log('Params:', params);
      console.log('updateQuery:', updateQuery);

      await query(updateQuery, params);
      console.log(`Updated batch of ${batch.length} articles.`);
    }
  } catch (error) {
    console.error('Error updating citations in batch:', error);
  }
};




export const searchArticles = async (userInfo: false | string, results_per_page: number, page_n: number, criteriaList: SearchCriteria[]) => {
  const results = new Map<string, any>(); // Use a Map to store unique results by ID

  if (criteriaList.length===1) {
    if (criteriaList[0].titlesIncludes){
      const result = await calculateTFIDF(criteriaList[0].titlesIncludes[0])
      result.forEach((row: any) => results.set(row.id, row)); // Use article id as the unique key
    }
    else {
      for (const criteria of criteriaList) {
        const { baseQuery, params } = buildQuery(criteria);
        try {
          const result = await query(baseQuery, params);
          result.rows.forEach((row: any) => results.set(row.id, row)); // Use article id as the unique key
        } catch (error) {
          console.error('Error executing query:', error);
        }
      }

    }
  } else {

  for (const criteria of criteriaList) {
    const { baseQuery, params } = buildQuery(criteria);
    try {
      const result = await query(baseQuery, params);
      result.rows.forEach((row: any) => results.set(row.id, row)); // Use article id as the unique key
    } catch (error) {
      console.error('Error executing query:', error);
    }
  }
  }

  const uid = userInfo ? userInfo : "a28dcb9d-4da7-4470-8a15-f92b5f7058a8"; // id for people not logged in

  const history_ids = [];

  for (const criteria of criteriaList) {
    const History = {
      userId: uid, // Assuming userId is a UUID in string format
      authors: criteria.authors,
      allAuthors: criteria.allAuthors,
      startDate: criteria.startDate, // ISO format date string
      endDate: criteria.endDate, // ISO format date string
      titlesIncludes: criteria.titlesIncludes,
      allTitles: criteria.allTitles,
      abstractsIncludes: criteria.abstractsIncludes,
      allAbstracts: criteria.allAbstracts,
      categories: criteria.categories,
      allCategories: criteria.allCategories
    };
    const hist = addSearchHistory(History);
    history_ids.push((await hist).searchHistory.search_query_id);
  }

  // Convert results from Map to Array and sort by published_date (assuming `published_date` is available)
  const results_ranked = Array.from(results.values())

  const results_f = splitMapIntoChunks(new Map(results_ranked.map(item => [item.id, item])), results_per_page)[page_n - 1];

  

  const new_results_f: any[] = [];

  if (useCitations) {
      // Check for articles with null citations
    const articlesToUpdate = Array.from(results_f.values()).filter(article => article.citations === null);
    if (articlesToUpdate.length > 0) {
      // Prepare data for citation retrieval
      const articles = articlesToUpdate.map(article => ({
        title: article.title,
        authors: article.authors,
        arxivId: article.external_id // Assuming article.id is the arxivId
      }));

      // Call getCitations
      const { results_cit: citationResults, queryUrl } = await getCitations(articles, true); // Adjust useNASA flag as needed

      // Log the API call
      await logApiCall({
        searchQueryId: history_ids[0],
        apiCallUrl: queryUrl
      });

      const citationsToUpdate = citationResults.map(citation => ({
        citationCount: citation.citationCount,
        articleId: citation.arxivId
      }));

      // Call the batch update function with a desired batch size (e.g., 100)
      await updateCitationsInBatches(citationsToUpdate, 500);

      // After updating citations in batches, update results_f with the new citation data
      articles.forEach((artc) => {
        const article = Array.from(results_f.values()).find(item => item.external_id === artc.arxivId); // Find the article by external_id
        
        const updatedCitation = citationsToUpdate.find(cit => cit.articleId === artc.arxivId); // Find the citation data
        if (article && updatedCitation) {
          article.citations = updatedCitation.citationCount;
        }
      });
    }
  }
  
  if (!results_f || results_f.size === 0) {
    return [];
}
  

  for (const article of results_f.values()) {
    new_results_f.push(article);
  }

  const final_result = Array.from(new_results_f.values());
  return final_result;
};

