import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, '..', '..', 'data', 'db.json');

const defaultData = {
  users: [],
  lektionen: [],
  vocabulary: [],
  sentenceExercises: [],
  translationExercises: [],
  progress: [],
};

const adapter = new JSONFile(dbFile);
export const db = new Low(adapter, defaultData);

let ready;
export function loadDb() {
  if (!ready) ready = db.read().then(() => { db.data ||= structuredClone(defaultData); });
  return ready;
}
