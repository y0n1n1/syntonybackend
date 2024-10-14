import fs from 'fs';
import { query } from './dbconnect'; // Adjust the path to your `dbconnect` file
import { v4 as uuidv4 } from 'uuid'; // Import UUID generation function

// Define the structure for articles
interface Article {
  id: string;
  title: string;
  authors: string;
  published: string; // ISO date format
  pdf_url: string;
  comments: string | null;
  journal_ref: string | null;
  doi: string | null;
  abstract: string;
  categories: string;
  scat: string;
  versions: { version: string; created: string }[]; // Array of versions
}

// Function to fetch all existing article external IDs from the database
const fetchExistingArticleIds = async (): Promise<Set<string>> => {
  const queryText = 'SELECT external_id FROM articles;';
  const result = await query(queryText);
  return new Set(result.rows.map(row => row.external_id));
};

// Function to get articles that are new and ready for insertion
const getArticlesForInsertion = async (articles: Article[], existingIds: Set<string>): Promise<{ id: string; values: any[] }[]> => {
  const insertData: { id: string; values: any[] }[] = [];

  for (const article of articles) {
    const latestVersionId = getLatestVersionId(article); // Get the article ID with the version appended

    // Check if the article with the versioned ID already exists
    if (existingIds.has(latestVersionId)) {
      console.log(`Article with external_id ${latestVersionId} already exists. Skipping...`);
      continue;
    }

    const newId = uuidv4(); // Generate a new UUID for each article
    const authorsArray = article.authors.split(',').map(author => author.trim());
    const publishedDate = article.versions[article.versions.length - 1].created;

    const values = [
      newId, // UUID
      latestVersionId, // Extracted arXiv ID with version
      'arXiv', // Source
      article.title,
      authorsArray, // Use the authors array here
      new Date(publishedDate), // Publication date
      article.pdf_url,
      article.comments,
      article.journal_ref,
      article.doi,
      article.abstract,
      article.categories,
      article.scat
    ];

    insertData.push({ id: newId, values });
  }

  return insertData;
};

// Function to perform the bulk insert into the database
const bulkInsertArticles = async (articles: Article[], batchSize: number = 1000) => {
  const existingIds = await fetchExistingArticleIds(); // Fetch existing IDs only once
  const articlesForInsertion = await getArticlesForInsertion(articles, existingIds);

  if (articlesForInsertion.length === 0) {
    console.log('No new articles to insert.');
    return;
  }

  // Batch insert logic
  for (let i = 0; i < articlesForInsertion.length; i += batchSize) {
    const batch = articlesForInsertion.slice(i, i + batchSize); // Get the current batch

    const queryText = `
      INSERT INTO articles (
        id, external_id, source, title, authors, published_date, pdf_url, comments, journal_ref, doi, abstract, categories, scat
      ) VALUES ${batch.map((_, index) => `($${index * 13 + 1}, $${index * 13 + 2}, $${index * 13 + 3}, $${index * 13 + 4}, $${index * 13 + 5}, $${index * 13 + 6}, $${index * 13 + 7}, $${index * 13 + 8}, $${index * 13 + 9}, $${index * 13 + 10}, $${index * 13 + 11}, $${index * 13 + 12}, $${index * 13 + 13})`).join(', ')};
    `;

    const flatValues = batch.flatMap(article => article.values);

    try {
      await query(queryText, flatValues);
      console.log(`Inserted batch starting from index ${i} successfully.`);
    } catch (err) {
      console.error(`Failed to insert batch starting from index ${i}:`, err);
    }
  }

  console.log('All new articles transferred to the database.');
};

// Load the JSON file and transfer the articles
const filePath = 'SUBSETarxiv-metadata.json'; // Path to your JSON file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading JSON file:', err);
    return;
  }

  try {
    const jsonData = JSON.parse(data);
    const articles: Article[] = jsonData.root;

    bulkInsertArticles(articles);
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
  }
});

// Function to get the latest version of an article
const getLatestVersionId = (article: Article): string => {
  const latestVersion = article.versions[article.versions.length - 1].version; // Get the latest version
  return `${article.id}v${latestVersion}`; // Append the version to the ID (e.g., 1812.05362v2)
};
