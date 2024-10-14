import express, { Application } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { userRouter } from './db/userRoutes'; // Adjust as per your project structure
import { searchRouter } from './db/searchRoutes';

const app: Application = express();
const PORT = 8080;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Routes
app.use('/api/users', userRouter);

// Routes
app.use('/api/search', searchRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
