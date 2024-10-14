import pdfParse from 'pdf-parse'; // PDF parsing library
import axios from 'axios'; // To fetch PDF files
import fs from 'fs'; // File system module to write JSON file
import path from 'path';
import { query } from './dbconnect'; // Assuming `query` is a function that executes SQL

// Function to process and export the first 25,000 articles
export const processAndExportArticles = async () => {
  try {
    // Query the first 25,000 articles by published_date
    const queryText = `
      SELECT external_id, pdf_url, title, authors, published_date
      FROM articles
      WHERE pdf_url IS NOT NULL
      ORDER BY published_date DESC
      LIMIT 25000;
    `;
    
    const result = await query(queryText); // Assuming `query` is a function that executes SQL
    
    // Iterate over the results and export each article to a JSON file
    for (let i = 0; i < result.rows.length; i++) {
      const { external_id, pdf_url, title, authors, published_date } = result.rows[i];
      
      console.log(`Processing article ${i + 1} with external_id: ${external_id}`);
      
      // Fetch the PDF and extract its text
      let extractedText = '';
      try {
        const pdfBuffer = await fetchPDF(pdf_url);
        extractedText = await extractPDFText(pdfBuffer);
      } catch (pdfError) {
        console.error(`Failed to extract PDF for article ${external_id}:`, pdfError);
        continue; // Skip this article and move to the next one
      }
      
      // Structure the article data with extracted PDF text
      const articleData = {
        external_id,
        pdf_url,
        title,
        authors,
        published_date,
        extracted_text: extractedText // Add extracted text to the article data
      };
      
      // Define the file path and name (e.g., 'external_id.json')
      const filePath = path.join('exported_articles', `${external_id}.json`);
      
      // Create the directory if it doesn't exist
      if (!fs.existsSync('exported_articles')) {
        fs.mkdirSync('exported_articles');
      }
      
      // Write the article data to a JSON file
      fs.writeFileSync(filePath, JSON.stringify(articleData, null, 2));
      
      console.log(`Article ${i + 1} exported to ${filePath}`);
      
      // Wait for 500ms before processing the next PDF (adjust as needed)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('All articles exported successfully.');
  } catch (error) {
    console.error('Error processing and exporting articles:', error);
  }
};

// Helper function to fetch the PDF as a buffer
const fetchPDF = async (pdfUrl: string): Promise<Buffer> => {
  const response = await axios.get(pdfUrl, {
    responseType: 'arraybuffer', // Ensure the response is returned as a buffer
  });
  return response.data; // Return the PDF data as a buffer
};

// Helper function to extract text from a PDF buffer
const extractPDFText = async (pdfBuffer: Buffer): Promise<string> => {
  const pdfData = await pdfParse(pdfBuffer);
  return pdfData.text; // Return the extracted text
};



processAndExportArticles()