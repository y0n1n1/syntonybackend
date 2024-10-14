import axios from 'axios';

interface ScholarResult {
  title: string;
  publicationDate: string;
  citations: number;
}

export async function fetchScholarData(title: string, authors: string[]): Promise<{ results_cit: ScholarResult[], queryUrl: string }> {
  const query = `${title} author:${authors.join(' author:')}`;
  const url = `https://serpapi.com/search`;

  try {
    const response = await axios.get(url, {
      params: {
        engine: 'google_scholar',
        q: query,
        api_key: "830f57d67885c0a66b86289178eaa979d6896e950c91dfbe346f7c338fa18aa1"
      }
    });

    const results_cit = response.data.organic_results;

    if (!results_cit || results_cit.length === 0) {
      console.log("No results found");
      return { results_cit: [], queryUrl: '' };
    }

    // Extract publication date and citations from the results
    const scholarResults: ScholarResult[] = results_cit.map((result: any) => {
      const publicationInfo = result.publication_info.summary || "";
      const citations = result.inline_links?.cited_by?.total || 0;

      // Try to extract publication year from the summary, fallback to empty string if not found
      const publicationDate = publicationInfo.match(/\d{4}/)?.[0] || "";

      return {
        title: result.title,
        publicationDate: publicationDate,
        citations: citations
      };
    });

    // Construct the query URL
    const queryUrl = `${url}?engine=google_scholar&q=${encodeURIComponent(query)}&api_key=YOUR_API_KEY`;

    return { results_cit: scholarResults, queryUrl }; // Return results and query URL
  } catch (error) {
    console.error("Error fetching data from Google Scholar API:", error);
    return { results_cit: [], queryUrl: '' }; // Return an empty array and empty URL in case of error
  }
}

// Usage example
/* 
const articleTitle = 'What is Machine Learning? A Primer for the Epidemiologist';
const authors = ['Qifang Bi'];

fetchScholarData(articleTitle, authors)
  .then(({ results, queryUrl }) => {
    results.forEach(result => {
      console.log(`Title: ${result.title}`);
      console.log(`Publication Date: ${result.publicationDate}`);
      console.log(`Citations: ${result.citations}`);
      console.log('---');
    });
    console.log('Query URL:', queryUrl);
  })
  .catch(error => {
    console.error('Error during fetch:', error);
  });
*/
