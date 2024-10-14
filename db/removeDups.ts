import { query } from './dbconnect'; // Adjust the path to your `dbconnect` file

// Function to fetch all article IDs and external IDs from the database
const fetchArticleIdsAndExternalIds = async () => {
  const queryText = 'SELECT id, external_id FROM articles;';

  try {
    const result = await query(queryText);
    
    if (result.rows.length === 0) {
      console.log('No articles found in the database.');
      return;
    }

    // Map to store external_id and their associated IDs
    const externalIdMap: { [key: string]: string[] } = {};
    
    // Process each article to store external_ids and their corresponding IDs
    for (const row of result.rows) {
      // Clean the external_id by removing duplicates
      const cleanedExternalId = removeDuplicateVs(row.external_id);
      if (!externalIdMap[cleanedExternalId]) {
        externalIdMap[cleanedExternalId] = [];
      }
      externalIdMap[cleanedExternalId].push(row.id);
    }

    // Store IDs of entries to remove
    const idsToRemove: string[] = [];

    // Check for duplicates and determine which to keep
    for (const [externalId, ids] of Object.entries(externalIdMap)) {
      if (ids.length > 1) {
        // Keep the ID with the largest value after 'v'
        const idToKeep = ids.reduce((prev, current) => {
          return getValueAfterV(current) > getValueAfterV(prev) ? current : prev;
        });

        // Mark others for removal
        ids.forEach(id => {
          if (id !== idToKeep) {
            idsToRemove.push(id);
            console.log(`Marked ID ${id} for removal due to duplicate external_id: ${externalId}`);
          }
        });
      }
    }

    // Remove entries in batches of 5000
    for (let i = 0; i < idsToRemove.length; i += 5000) {
      const batch = idsToRemove.slice(i, i + 5000);
      await removeExternalIds(batch);
    }

  } catch (err) {
    console.error('Error fetching article IDs:', err);
  }
};

// Function to remove duplicate 'v's from the external_id
const removeDuplicateVs = (externalId: string): string => {
  // Use a regular expression to replace multiple 'v's with a single 'v'
  return externalId.replace(/v+/g, 'v');
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
    console.log(`Removed entries with IDs: ${ids.join(', ')} due to duplicate external_id.`);
  } catch (err) {
    console.error('Error removing external_ids:', err);
  }
};

// Execute the function
fetchArticleIdsAndExternalIds();
