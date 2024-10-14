import { query } from './dbconnect';

interface ApiCallLog {
  searchQueryId: string;  // UUID of the search query history
  apiCallUrl: string;     // URL of the API call
}

// Function to log a new API call
export const logApiCall = async ({ searchQueryId, apiCallUrl }: ApiCallLog) => {
  const text = `
    INSERT INTO api_call_logs (search_query_id, api_call_url, query_timestamp)
    VALUES ($1, $2, NOW())
    RETURNING id, search_query_id, api_call_url, query_timestamp;
  `;
  
  const values = [searchQueryId, apiCallUrl];

  try {
    const result = await query(text, values);
    return result.rows[0]; // Return the created log entry
  } catch (error) {
    console.error('Error logging API call:', error);
    throw error; // Rethrow the error for handling at a higher level
  }
};


