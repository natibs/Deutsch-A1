export interface Lektion {
  id: string;
  number: number;
  titleDe: string;
  sectionCount: number;
}

export interface VocabularyEntry {
  id: string;
  lektionId: string;
  de: string;
  fullForm: string;
  he: string;
  en: string;
}

export interface SentenceExercise {
  id: string;
  lektionId: string;
  sentenceType: 'statement' | 'question';
  chunks: string[];
  solutionDe: string;
}

export interface TranslationHint {
  he: string;
  de: string;
}

export interface TranslationExercise {
  id: string;
  lektionId: string;
  he: string;
  en: string;
  solutions: string[];
  hints: TranslationHint[];
}

export type SectionType = 'vocabulary' | 'sentence' | 'translation';

export interface SectionDescriptor {
  id: string;
  type: SectionType;
  index: number;
  label: string;
  count: number;
  // Offset into the lektion's vocabulary array — only set for vocabulary
  // sections, used to slice out that section's words.
  start?: number;
}

export type Theme = 'light' | 'dark';

export interface User {
  id: string;
  username: string;
  theme: Theme;
}

export interface AuthResponse {
  user: User;
}

export interface ProgressRecord {
  lektionId: string;
  sectionId: string;
  completed: boolean;
  usedHint: boolean;
  updatedAt: string;
}
