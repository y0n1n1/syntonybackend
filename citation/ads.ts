import axios from 'axios';

// Replace with your NASA ADS API key
const API_KEY = 'fjpaPITCaY4an74XZ2kfUHrp3P6unTzXv90qe0HH';

// Function to convert wrong authors to the correct format
function convertAuthors(wrongAuthors: string[]): string[] {
  return wrongAuthors.map(wrongAuthor => {
    const parts = wrongAuthor.split(' ');
    const lastName = parts.pop(); // Get the last name
    return `${lastName}, ${parts.join(' ')}`; // Format: "LastName, FirstName MiddleName"
  });
}

// Function to convert arXiv ID to Bibcode
function arxivToBibcode(arxivId: string, firstAuthorLastName: string) {
  const cleanArxivId = arxivId.split('v')[0];  // Strip any version part
  const firstTwoDigits = parseInt(cleanArxivId.substring(0, 2), 10);
  const year = firstTwoDigits > 50 ? '19' + firstTwoDigits : '20' + firstTwoDigits;
  const bibcode = `${year}arXiv${cleanArxivId.replace(/\./g, '')}${firstAuthorLastName.charAt(0).toUpperCase()}`;
  return bibcode;
}

// Function to query NASA ADS for multiple Bibcodes
export async function queryNASAADSForMultipleArticles(articles: { title: string, authors: string[], arxivId: string }[]) {
  const bibcodes: string[] = [];
  
  // Convert all articles to Bibcodes
  articles.forEach(article => {
    const correctAuthors = convertAuthors(article.authors);
    const firstAuthorLastName = correctAuthors[0].split(',')[0].trim(); // Extract last name from first author
    const bibcode = arxivToBibcode(article.arxivId, firstAuthorLastName);
    bibcodes.push(bibcode);
  });

  try {
    // Build query for all Bibcodes
    const query = `bibcode:(${bibcodes.join(' OR ')})`;
    
    // Construct the query URL
    const queryUrl = `https://api.adsabs.harvard.edu/v1/search/query?q=${encodeURIComponent(query)}&fl=bibcode,pubdate,citation_count&rows=${bibcodes.length}`;

    const response = await axios.get('https://api.adsabs.harvard.edu/v1/search/query', {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      params: {
        q: query, // Search query for Bibcodes
        fl: 'bibcode,pubdate,citation_count', // Fields to return: Bibcode, publication date, and citation count
        rows: bibcodes.length, // Number of rows to match the number of Bibcodes
      },
    });

    // Extract and return the results as an array of objects
    const results = response.data.response.docs;

    // Directly retain the original arXiv IDs
    const formattedResults = results.map((result: { bibcode: any; pubdate: any; citation_count: any; }) => {
      const originalArticle = articles.find(article => arxivToBibcode(article.arxivId, convertAuthors(article.authors)[0].split(',')[0].trim()) === result.bibcode);
      return {
        arxivId: originalArticle ? originalArticle.arxivId : '', // Keep the original arXiv ID
        publicationDate: result.pubdate,
        citationCount: result.citation_count,
      };
    });

    return { results: formattedResults, queryUrl }; // Return results and query URL
  } catch (error: any) {
    console.error('Error querying the NASA ADS API:', error);
    return { results: [], queryUrl: '' }; // Return an empty array and empty URL in case of error
  }
}

// Example articles
const articles = [
  {
    title: "Improving Generalization in Task-oriented Dialogues with Workflows and Action Plans",
    authors: ["Stefania Raimondo", "Christopher Pal", "Xiaotian Liu", "David Vazquez", "Hector Palacios"],
    arxivId: '2306.01729v1',
  },
  {
    title: "PAGAR: Taming Reward Misalignment in Inverse Reinforcement Learning-Based Imitation Learning with Protagonist Antagonist Guided Adversarial Reward",
    authors: ["Weichao Zhou", "Wenchao Li"],
    arxivId: '2306.01731v3',
  },
  {
    title: "Video Colorization with Pre-trained Text-to-Image Diffusion Models",
    authors: ["Hanyuan Liu", "Minshan Xie", "Jinbo Xing", "Chengze Li", "Tien-Tsin Wong"],
    arxivId: '2306.01732v1',
  },
  {
    title: "DaTaSeg: Taming a Universal Multi-Dataset Multi-Task Segmentation Model",
    authors: ["Xiuye Gu", "Yin Cui", "Jonathan Huang", "Abdullah Rashwan", "Xuan Yang", "Xingyi Zhou", "Golnaz Ghiasi", "Weicheng Kuo", "Huizhong Chen", "Liang-Chieh Chen", "David A Ross"],
    arxivId: '2306.01736v1',
  },
  {
    title: "Lifting Architectural Constraints of Injective Flows",
    authors: ["Peter Sorrenson", "Felix Draxler", "Armand Rousselot", "Sander Hummerich", "Lea Zimmermann", "Ullrich Köthe"],
    arxivId: '2306.01843v5',
  }
];
