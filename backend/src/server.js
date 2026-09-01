import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { lektionenRouter } from './routes/lektionen.js';
import { progressRouter } from './routes/progress.js';
import { vocabularyRouter } from './routes/vocabulary.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/lektionen', lektionenRouter);
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/progress', progressRouter);

app.listen(PORT, () => {
  console.log(`Deutsch A1 backend listening on http://localhost:${PORT}`);
});
