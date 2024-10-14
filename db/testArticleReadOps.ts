import { searchArticles, SearchCriteria } from "./searchController";

const searchCriteria1: SearchCriteria = {
    authors: ['Alessio Devoto'],
    allAuthors: true,
    // No other criteria provided
  };

const searchCriteria2: SearchCriteria = {
    abstractsIncludes: ['chain-of-thought'],
    startDate:"2024-08-06T14:49:06.000Z",
    // No other criteria provided
};
  
searchArticles( "a28dcb9d-4da7-4470-8a15-f92b5f7058a8", 20, 1, [searchCriteria1]).then((response) => {
console.log(response); // This will log the result once the promise resolves
}).catch((error) => {
console.error('Error occurred:', error); // Log if any error occurs
});

  