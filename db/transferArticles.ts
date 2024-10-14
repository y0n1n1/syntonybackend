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

// Function to check if an article already exists in the database
const articleExists = async (externalId: string): Promise<boolean> => {
  const queryText = 'SELECT COUNT(1) FROM articles WHERE external_id = $1;';
  const result = await query(queryText, [externalId]);
  return result.rows[0].count > 0;
};

// Function to get the latest version of an article
const getLatestVersionId = (article: Article): string => {
  const latestVersion = article.versions[article.versions.length - 1].version; // Get the latest version
  return `${article.id}v${latestVersion}`; // Append the version to the ID (e.g., 1812.04955v5)
};

// Function to transfer articles to the database
const transferArticlesToDatabase = async (articles: Article[]) => {
  if (!articles || !Array.isArray(articles)) {
    console.error("Articles data is not an array or is undefined.");
    return;
  }

  const totalArticles = articles.length;
  console.log(`Total articles: ${totalArticles}`); // Debugging log

  for (let i = 0; i < totalArticles; i++) {
    const article = articles[i];

    try {
      const latestVersionId = getLatestVersionId(article); // Get the article ID with the version appended

      // Check if the article with the versioned ID already exists
      const exists = await articleExists(latestVersionId);
      if (exists) {
        console.log(`Article with external_id ${latestVersionId} already exists. Skipping...`);
        continue;
      }

      // If it doesn't exist, insert it
      const newId = uuidv4(); // Generate a new UUID for each article

      // Split the authors string into an array
      const authorsArray = article.authors.split(',').map(author => author.trim());

      // Get the published date from the latest version
      const publishedDate = article.versions[article.versions.length - 1].created;

      const queryText = `
        INSERT INTO articles (
          id, external_id, source, title, authors, published_date, pdf_url, comments, journal_ref, doi, abstract, categories, scat
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        );
      `;

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

      await query(queryText, values);

      // Calculate and log percentage completion
      const percentageComplete = ((i + 1) / totalArticles) * 100;
      console.log(`Progress: ${percentageComplete.toFixed(2)}%`);

    } catch (err) {
      console.error(`Failed to process article with external_id ${article.id}:`, err);
    }
  }

  console.log('All articles transferred to the database.');
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

    // Access the list of articles from the "root" key
    const articles: Article[] = jsonData.root;

    transferArticlesToDatabase(articles);
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
  }
});
