import { queryNASAADSForMultipleArticles } from "./ads";
import { fetchScholarData } from "./serpapi";
import axios from 'axios';

interface Article {
  title: string;
  authors: string[];
  arxivId: string;
}

interface CitationResult {
  arxivId: string;
  publicationDate: string;
  citationCount: number;
  queryUrl?: string; // Optional for storing the query URL
}

// Helper function to split the array into batches
function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

export async function getCitations(articles: Article[], useNASA: boolean, batchSize: number = 10): Promise<{ results_cit: CitationResult[], queryUrl: string }> {
  const citationResults: CitationResult[] = [];
  let queryUrl = '';

  // Split articles into batches
  const articleBatches = splitIntoBatches(articles, batchSize);

  if (useNASA) {
    // Process each batch for NASA ADS
    for (const batch of articleBatches) {
      const results_cit = await queryNASAADSForMultipleArticles(batch);
      
      // Use results.results to extract citation information
      results_cit.results.forEach((result: any) => {
        citationResults.push({
          arxivId: result.arxivId,
          publicationDate: result.publicationDate,
          citationCount: result.citationCount,
        });
      });

      // Get the query URL from the results (if available)
      if (results_cit.queryUrl) {
        queryUrl = results_cit.queryUrl;
      }
    }
  } else {
    // Process each batch for Scholar data
    for (const batch of articleBatches) {
      const scholarPromises = batch.map(async (article) => {
        const { results_cit: scholarResults, queryUrl: scholarQueryUrl } = await fetchScholarData(article.title, article.authors);
        
        // Use the URL from the fetchScholarData function
        if (scholarQueryUrl) {
          queryUrl = scholarQueryUrl;
        }

        scholarResults.forEach(result => {
          citationResults.push({
            arxivId: article.arxivId,
            publicationDate: result.publicationDate,
            citationCount: result.citations,
          });
        });
      });

      // Wait for the batch to complete
      await Promise.all(scholarPromises);
    }
  }

  return { results_cit: citationResults, queryUrl };
}

// Example usage
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

// Call getCitations with NASA ADS API
/*
getCitations(articles, true) // true for NASA ADS
  .then(({ results, queryUrl }) => {
    console.log('Citations:', results);
    console.log('Query URL:', queryUrl);
  })
  .catch(error => {
    console.error('Error fetching citations:', error);
  });
*/