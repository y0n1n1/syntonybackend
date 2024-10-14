import { Router, Request, Response } from 'express';
import { SearchCriteria, searchArticles } from './searchController'; // Adjust the path as needed

const router = Router();

// Define a POST route for /search
router.post('/', async (req: Request, res: Response) => {
  try {
    const criteriaList: SearchCriteria[] = req.body.criteriaList;
    const userInfo: false | string = req.body.userId;
    const res_p_p: number = req.body.resultsPerPage;
    const p_n: number = req.body.pageNumber;

    if (!criteriaList || criteriaList.length === 0) {
      return res.status(400).json({ error: 'Search criteria is required' });
    }

    const results = await searchArticles(userInfo, res_p_p, p_n, criteriaList);

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error searching articles:', error);
    return res.status(500).json({ error: 'Error searching articles' });
  }
});

export { router as searchRouter };
