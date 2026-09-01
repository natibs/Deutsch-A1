import { db, loadDb } from './store.js';
import { lektion01 } from './content/lektion-01.js';
import { lektion02 } from './content/lektion-02.js';
import { lektion03 } from './content/lektion-03.js';
import { lektion04 } from './content/lektion-04.js';
import { lektion05 } from './content/lektion-05.js';
import { lektion06 } from './content/lektion-06.js';
import { lektion07 } from './content/lektion-07.js';
import { lektion08 } from './content/lektion-08.js';
import { lektion09 } from './content/lektion-09.js';
import { lektion10 } from './content/lektion-10.js';
import { lektion11 } from './content/lektion-11.js';
import { lektion12 } from './content/lektion-12.js';
import { lektion13 } from './content/lektion-13.js';
import { lektion14 } from './content/lektion-14.js';
import { lektion15 } from './content/lektion-15.js';
import { lektion16 } from './content/lektion-16.js';

const contentModules = [
  lektion01,
  lektion02,
  lektion03,
  lektion04,
  lektion05,
  lektion06,
  lektion07,
  lektion08,
  lektion09,
  lektion10,
  lektion11,
  lektion12,
  lektion13,
  lektion14,
  lektion15,
  lektion16,
];

await loadDb();

db.data.lektionen = contentModules.map((m) => m.lektion);
db.data.vocabulary = contentModules.flatMap((m) => m.vocabulary);
db.data.sentenceExercises = contentModules.flatMap((m) => m.sentences);
db.data.translationExercises = contentModules.flatMap((m) => m.translations);
// Progress and users are left untouched so re-seeding content doesn't wipe
// completion state or accounts, unless this is the first run (nothing yet).
db.data.progress ||= [];
db.data.users ||= [];

await db.write();

console.log(
  `Seeded ${db.data.lektionen.length} Lektion(en), ${db.data.vocabulary.length} vocabulary entries, ` +
    `${db.data.sentenceExercises.length} sentence exercises, ${db.data.translationExercises.length} translation exercises.`
);
