import { query } from './dbconnect';

interface SearchHistoryInput {
  userId: string; // Assuming userId is a UUID in string format
  authors?: string[];
  allAuthors?: boolean;
  startDate?: string; // ISO format date string
  endDate?: string; // ISO format date string
  titlesIncludes?: string[];
  allTitles?: boolean;
  abstractsIncludes?: string[];
  allAbstracts?: boolean;
  categories?: string[];
  allCategories?: boolean;
}

// Add search history
export const addSearchHistory = async (input: SearchHistoryInput) => {
    const {
      userId,
      authors = [],
      allAuthors = false,
      startDate = null,
      endDate = null,
      titlesIncludes = [],
      allTitles = false,
      abstractsIncludes = [],
      allAbstracts = false,
      categories = [],
      allCategories = false,
    } = input;
  
    const text = `
      INSERT INTO search_history (
        user_id,
        time_of_query,
        authors,
        all_authors,
        start_date,
        end_date,
        titles_includes,
        all_titles,
        abstracts_includes,
        all_abstracts,
        categories,
        all_categories
      ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING search_query_id, user_id, time_of_query, authors, all_authors, start_date, end_date, titles_includes, all_titles, abstracts_includes, all_abstracts, categories, all_categories;
    `;
    const values = [
      userId,
      authors,
      allAuthors,
      startDate,
      endDate,
      titlesIncludes,
      allTitles,
      abstractsIncludes,
      allAbstracts,
      categories,
      allCategories,
    ];
  
    const result = await query(text, values);
  
    return {
      success: true,
      message: 'Search history added successfully',
      searchHistory: result.rows[0],
    };
  };



  const testAddSearchHistory = async () => {
    try {
      const userId = 'b2604470-e092-4bd0-b382-c6b5f34a2c93'; // Replace with an actual UUID
      const searchHistoryInput = {
        userId,
        authors: ['Alessio Devoto'],
        allAuthors: false,
        startDate: '2023-01-01', // Example ISO date
        endDate: '2023-12-31',   // Example ISO date
        titlesIncludes: ['Fire?'],
        allTitles: false,
        abstractsIncludes: ['Abstract A'],
        allAbstracts: true,
        categories: ['Category A', 'Category B'],
        allCategories: false,
      };
  
      const result = await addSearchHistory(searchHistoryInput);
      console.log('Search history added successfully:', result);
    } catch (error) {
      console.error('Error adding search history:', error);
    }
  };
  
  // Call the test function
  // testAddSearchHistory();