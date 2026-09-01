import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { db, loadDb } from '../db/store.js';

export const progressRouter = Router();
progressRouter.use(requireAuth);

// e.g. "vocabulary-1", "vocabulary-2", "sentence-1", "translation-1"
const SECTION_ID_PATTERN = /^(vocabulary|sentence|translation)-[1-9]\d*$/;

function findOrCreateRecord(userId, lektionId, sectionId) {
  let record = db.data.progress.find(
    (p) => p.lektionId === lektionId && p.sectionId === sectionId && p.userId === userId,
  );
  if (!record) {
    record = { userId, lektionId, sectionId, completed: false, usedHint: false, updatedAt: new Date().toISOString() };
    db.data.progress.push(record);
  }
  return record;
}

progressRouter.get('/', async (req, res) => {
  await loadDb();
  res.json(db.data.progress.filter((p) => p.userId === req.userId));
});

progressRouter.put('/:lektionId/:sectionId', async (req, res) => {
  await loadDb();
  const { lektionId, sectionId } = req.params;
  const { completed } = req.body;

  if (!SECTION_ID_PATTERN.test(sectionId)) {
    return res.status(400).json({ error: 'sectionId must look like "vocabulary-1", "sentence-1", etc.' });
  }
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be a boolean' });
  }

  const record = findOrCreateRecord(req.userId, lektionId, sectionId);
  record.completed = completed;
  // Marking a section incomplete is how the app invites a hint-free redo —
  // clear the flag here so a fresh attempt starts with a clean slate.
  if (!completed) record.usedHint = false;
  record.updatedAt = new Date().toISOString();
  await db.write();
  res.json(record);
});

// Marks that a hint (tooltip) was used somewhere in this section — kept
// separate from the completed PUT so using a hint never overwrites the
// completion state, and vice versa. Never gets un-set by the app; only a
// fresh attempt after "mark as incomplete" would naturally start clean since
// that's a new progress record's default.
progressRouter.put('/:lektionId/:sectionId/hint', async (req, res) => {
  await loadDb();
  const { lektionId, sectionId } = req.params;

  if (!SECTION_ID_PATTERN.test(sectionId)) {
    return res.status(400).json({ error: 'sectionId must look like "vocabulary-1", "sentence-1", etc.' });
  }

  const record = findOrCreateRecord(req.userId, lektionId, sectionId);
  record.usedHint = true;
  record.updatedAt = new Date().toISOString();
  await db.write();
  res.json(record);
});
