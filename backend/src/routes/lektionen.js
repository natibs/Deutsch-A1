import { Router } from 'express';
import { db, loadDb } from '../db/store.js';
import { buildLektionSections } from '../lib/sections.js';

export const lektionenRouter = Router();

function sectionsFor(lektionId) {
  const vocabCount = db.data.vocabulary.filter((v) => v.lektionId === lektionId).length;
  const sentenceCount = db.data.sentenceExercises.filter((s) => s.lektionId === lektionId).length;
  const translationCount = db.data.translationExercises.filter((t) => t.lektionId === lektionId).length;
  return buildLektionSections(vocabCount, sentenceCount, translationCount);
}

lektionenRouter.get('/', async (req, res) => {
  await loadDb();
  const lektionen = db.data.lektionen
    .sort((a, b) => a.number - b.number)
    .map((l) => ({ ...l, sectionCount: sectionsFor(l.id).length }));
  res.json(lektionen);
});

lektionenRouter.get('/:id', async (req, res) => {
  await loadDb();
  const lektion = db.data.lektionen.find((l) => l.id === req.params.id);
  if (!lektion) return res.status(404).json({ error: 'Lektion not found' });
  res.json(lektion);
});

lektionenRouter.get('/:id/sections', async (req, res) => {
  await loadDb();
  res.json(sectionsFor(req.params.id));
});

lektionenRouter.get('/:id/vocabulary/:sectionId', async (req, res) => {
  await loadDb();
  const section = sectionsFor(req.params.id).find((s) => s.id === req.params.sectionId);
  if (!section || section.type !== 'vocabulary') {
    return res.status(404).json({ error: 'Vocabulary section not found' });
  }
  const vocab = db.data.vocabulary.filter((v) => v.lektionId === req.params.id);
  res.json(vocab.slice(section.start, section.start + section.count));
});

lektionenRouter.get('/:id/sentences', async (req, res) => {
  await loadDb();
  res.json(db.data.sentenceExercises.filter((s) => s.lektionId === req.params.id));
});

lektionenRouter.get('/:id/translations', async (req, res) => {
  await loadDb();
  res.json(db.data.translationExercises.filter((t) => t.lektionId === req.params.id));
});
