// THIS IS TO UPDATE DUPLICATE ARTICLES WITH DIFFERENT VERSIONS

import { query } from './dbconnect'; // Adjust the path to your `dbconnect` file

// Function to fetch all articles from the database
const fetchArticles = async () => {
  const queryText = 'SELECT id, title, authors, external_id FROM articles;';

  try {
    const result = await query(queryText);
    
    if (result.rows.length === 0) {
      console.log('No articles found in the database.');
      return;
    }

    // Group articles by title and authors
    const groupedArticles: { [key: string]: any[] } = {};

    for (const row of result.rows) {
      const key = `${row.title}|${row.authors.join(',')}`; // Create a unique key based on title and authors
      if (!groupedArticles[key]) {
        groupedArticles[key] = [];
      }
      groupedArticles[key].push(row);
    }

    // Process duplicates
    const idsToRemove: string[] = [];
    for (const group of Object.values(groupedArticles)) {
      if (group.length > 1) {
        // Find the one with the largest value after 'v' in external_id
        const maxExternalIdArticle = group.reduce((prev, current) => {
          return getValueAfterV(current.external_id) > getValueAfterV(prev.external_id) ? current : prev;
        });

        // Mark others for removal
        for (const article of group) {
          if (article.id !== maxExternalIdArticle.id) {
            idsToRemove.push(article.id);
            console.log(`Marked ID ${article.id} for removal. Keeping ID ${maxExternalIdArticle.id}`);
          }
        }
      }
    }

    // Remove duplicates in batches
    for (let i = 0; i < idsToRemove.length; i += 1000) {
      const batch = idsToRemove.slice(i, i + 1000);
      await removeExternalIds(batch);
    }

  } catch (err) {
    console.error('Error fetching articles:', err);
  }
};

// Function to extract the numeric value after 'v' in external_id
const getValueAfterV = (externalId: string): number => {
  const match = externalId.match(/v(\d+)/);
  return match ? parseInt(match[1], 10) : -1; // Return -1 if no match is found
};

// Function to remove external_ids in bulk
const removeExternalIds = async (ids: string[]) => {
  const deleteQuery = 'DELETE FROM articles WHERE id IN (' + ids.map(id => `'${id}'`).join(', ') + ');';
  
  try {
    await query(deleteQuery);
    console.log(`Removed entries with IDs: ${ids.join(', ')} due to duplicate title and authors.`);
  } catch (err) {
    console.error('Error removing external_ids:', err);
  }
};

// Execute the function
fetchArticles();
