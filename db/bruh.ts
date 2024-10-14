import * as pdfjsLib from 'pdfjs-dist';
import { getDocument } from 'pdfjs-dist';

// Set workerSrc for pdfjs-dist
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Function to get the contents of a PDF URL as a string
const getPDFTextFromURL = async (pdfUrl: string): Promise<string> => {
    const loadingTask = getDocument(pdfUrl);
    const pdfDocument = await loadingTask.promise;

    let fullText = '';

    // Loop through all pages
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract and concatenate the text from each page
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
};

// Example usage
const pdfUrl = 'https://example.com/sample.pdf';
getPDFTextFromURL(pdfUrl)
    .then(text => console.log("PDF Contents: ", text))
    .catch(err => console.error("Error loading PDF: ", err));
