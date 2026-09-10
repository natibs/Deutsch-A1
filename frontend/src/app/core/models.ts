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
  he: string;
  en: string;
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

export type SectionType = 'vocabulary' | 'vocabulary-reverse' | 'sentence' | 'translation';

export interface SectionDescriptor {
  id: string;
  type: SectionType;
  index: number;
  label: string;
  count: number;
  // Offset into the lektion's vocabulary array — set for both vocabulary and
  // vocabulary-reverse sections (the latter mirrors the same word ranges,
  // just quizzed in the opposite direction), used to slice out the section's
  // words.
  start?: number;
}

export type MistakeCategory =
  | 'vocabulary'
  | 'akkusativ'
  | 'dativ'
  | 'negation'
  | 'fragewoerter'
  | 'trennbare-verben'
  | 'possessivpronomen'
  | 'modalverben'
  | 'praepositionen';

export interface GrammarDrillExercise {
  id: string;
  category: MistakeCategory;
  // Contains a single "___" placeholder for the blank.
  template: string;
  options: string[];
  answer: string;
  he: string;
  en: string;
}

// What the practice quiz actually runs on — a grammar drill's fill-in-blank
// sentence, or a vocabulary word turned into the same multiple-choice shape
// (built on the fly from VocabularyEntry, not authored content).
export interface PracticeItem {
  id: string;
  category: MistakeCategory;
  prompt: string;
  isCloze: boolean;
  options: string[];
  answer: string;
  he?: string;
  en?: string;
}

export interface CategorySummary {
  category: MistakeCategory;
  label: string;
  mistakeCount: number;
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
