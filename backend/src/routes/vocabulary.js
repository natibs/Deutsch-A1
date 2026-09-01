import { Router } from 'express';
import { db, loadDb } from '../db/store.js';

export const vocabularyRouter = Router();

// Full vocabulary pool, used by the frontend to build multiple-choice distractors
// that can span across Lektionen once more than one exists.
vocabularyRouter.get('/', async (req, res) => {
  await loadDb();
  res.json(db.data.vocabulary);
});
