import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';
import { AuthService } from './auth.service';
import { LocalStore, StoredMistake, StoredProgress } from './local-store';
import {
  CategorySummary,
  GrammarDrillExercise,
  Lektion,
  MistakeCategory,
  PracticeItem,
  ProgressRecord,
  SectionDescriptor,
  SentenceExercise,
  TranslationExercise,
  VocabularyEntry,
} from './models';
import { pickRandom, shuffle, withArticle } from './quiz-utils';
import { buildLektionSections } from './sections.util';

interface ContentBundle {
  lektionen: Omit<Lektion, 'sectionCount'>[];
  vocabulary: VocabularyEntry[];
  sentenceExercises: SentenceExercise[];
  translationExercises: TranslationExercise[];
  grammarDrills: GrammarDrillExercise[];
}

// Every category the AI Practice hub can build a session from — 'vocabulary'
// is generated on the fly from missed VocabularyEntry ids, the rest come
// from authored GrammarDrillExercise content.
const PRACTICE_CATEGORIES: { category: MistakeCategory; label: string }[] = [
  { category: 'vocabulary', label: 'Vocabulary' },
  { category: 'akkusativ', label: 'Akkusativ' },
  { category: 'dativ', label: 'Dativ' },
  { category: 'negation', label: 'Negation (nicht / kein)' },
  { category: 'fragewoerter', label: 'Question Words' },
  { category: 'trennbare-verben', label: 'Separable Verbs' },
  { category: 'possessivpronomen', label: 'Possessive Pronouns' },
  { category: 'modalverben', label: 'Modal Verbs' },
  { category: 'praepositionen', label: 'Prepositions' },
];

// A practice session is padded up to this many items when there aren't
// enough tracked mistakes yet, so it's never a one-question session.
const PRACTICE_SESSION_SIZE = 10;
const VOCAB_OPTIONS_PER_QUESTION = 6;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly store = inject(LocalStore);

  // The curriculum is static content bundled with the app (see public/content.json)
  // — fetched once, cached for the rest of the session, no network involved.
  private readonly content$ = this.http.get<ContentBundle>('content.json').pipe(shareReplay(1));

  getLektionen(): Observable<Lektion[]> {
    return this.content$.pipe(
      map((content) =>
        [...content.lektionen]
          .sort((a, b) => a.number - b.number)
          .map((l) => ({ ...l, sectionCount: this.sectionsFor(content, l.id).length })),
      ),
    );
  }

  getLektion(id: string): Observable<Lektion> {
    return this.content$.pipe(
      map((content) => {
        const lektion = content.lektionen.find((l) => l.id === id);
        if (!lektion) throw new Error(`Lektion ${id} not found`);
        return { ...lektion, sectionCount: this.sectionsFor(content, id).length };
      }),
    );
  }

  getSections(lektionId: string): Observable<SectionDescriptor[]> {
    return this.content$.pipe(map((content) => this.sectionsFor(content, lektionId)));
  }

  getVocabulary(lektionId: string, sectionId: string): Observable<VocabularyEntry[]> {
    return this.content$.pipe(
      map((content) => {
        const section = this.sectionsFor(content, lektionId).find((s) => s.id === sectionId);
        if (!section || (section.type !== 'vocabulary' && section.type !== 'vocabulary-reverse')) return [];
        const vocab = content.vocabulary.filter((v) => v.lektionId === lektionId);
        const start = section.start ?? 0;
        return vocab.slice(start, start + section.count);
      }),
    );
  }

  getAllVocabulary(): Observable<VocabularyEntry[]> {
    return this.content$.pipe(map((content) => content.vocabulary));
  }

  getSentences(lektionId: string): Observable<SentenceExercise[]> {
    return this.content$.pipe(map((content) => content.sentenceExercises.filter((s) => s.lektionId === lektionId)));
  }

  getTranslations(lektionId: string): Observable<TranslationExercise[]> {
    return this.content$.pipe(
      map((content) => content.translationExercises.filter((t) => t.lektionId === lektionId)),
    );
  }

  // Guests can use every exercise, but nothing persists without an account —
  // these three no-op locally instead of writing progress with no owner.
  getProgress(): Observable<ProgressRecord[]> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return of([]);
    return of(this.store.getProgress().filter((p) => p.userId === userId).map(toProgressRecord));
  }

  setProgress(lektionId: string, sectionId: string, completed: boolean): Observable<ProgressRecord | null> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return of(null);
    const record = this.upsertProgress(userId, lektionId, sectionId, (r) => {
      r.completed = completed;
      // Marking a section incomplete is how the app invites a hint-free redo
      // — clear the flag here so a fresh attempt starts with a clean slate.
      if (!completed) r.usedHint = false;
    });
    return of(toProgressRecord(record));
  }

  markHintUsed(lektionId: string, sectionId: string): Observable<ProgressRecord | null> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return of(null);
    const record = this.upsertProgress(userId, lektionId, sectionId, (r) => {
      r.usedHint = true;
    });
    return of(toProgressRecord(record));
  }

  // Every practice category with how many tracked mistakes it currently has,
  // most-missed first — what the AI Practice hub renders as its list.
  getCategorySummaries(): Observable<CategorySummary[]> {
    const mistakes = this.mistakesForCurrentUser();
    const summaries = PRACTICE_CATEGORIES.map(({ category, label }) => ({
      category,
      label,
      mistakeCount: mistakes.filter((m) => m.category === category).reduce((sum, m) => sum + m.count, 0),
    }));
    return of(summaries.sort((a, b) => b.mistakeCount - a.mistakeCount));
  }

  // The session pool for one category: previously-missed items first, padded
  // out with fresh ones so there's always a real session even with no
  // mistakes tracked yet (e.g. the first time a category is opened).
  getPracticeItems(category: MistakeCategory): Observable<PracticeItem[]> {
    const missedIds = new Set(this.mistakesForCurrentUser(category).map((m) => m.itemId));
    if (category === 'vocabulary') {
      return this.content$.pipe(map((content) => this.buildVocabularyPracticeItems(content, missedIds)));
    }
    return this.content$.pipe(
      map((content) => {
        const drills = content.grammarDrills.filter((d) => d.category === category);
        const missed = drills.filter((d) => missedIds.has(d.id));
        const rest = shuffle(drills.filter((d) => !missedIds.has(d.id)));
        const pool = [...shuffle(missed), ...rest].slice(0, Math.max(PRACTICE_SESSION_SIZE, missed.length));
        return pool.map((d) => toPracticeItem(d));
      }),
    );
  }

  // Wrong answer in a normal quiz or a practice session — grows the weakness
  // that got it there in the first place.
  recordMistake(category: MistakeCategory, itemId: string): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    const all = this.store.getMistakes();
    let record = all.find((m) => m.userId === userId && m.category === category && m.itemId === itemId);
    if (!record) {
      record = { userId, category, itemId, count: 0, lastMissedAt: '' };
      all.push(record);
    }
    record.count += 1;
    record.lastMissedAt = new Date().toISOString();
    this.store.saveMistakes(all);
  }

  // Answered correctly during a practice session — this is the deliberate
  // "prove you've got it now" moment, so the item clears from the weak list
  // (a normal lesson quiz never calls this; getting it right there doesn't
  // erase that it was once a struggle).
  resolveMistake(category: MistakeCategory, itemId: string): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    const remaining = this.store
      .getMistakes()
      .filter((m) => !(m.userId === userId && m.category === category && m.itemId === itemId));
    this.store.saveMistakes(remaining);
  }

  private mistakesForCurrentUser(category?: MistakeCategory): StoredMistake[] {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return [];
    return this.store.getMistakes().filter((m) => m.userId === userId && (!category || m.category === category));
  }

  private buildVocabularyPracticeItems(content: ContentBundle, missedIds: Set<string>): PracticeItem[] {
    const missedVocab = content.vocabulary.filter((v) => missedIds.has(v.id));
    const freshVocab = pickRandom(
      content.vocabulary.filter((v) => !missedIds.has(v.id)),
      Math.max(0, PRACTICE_SESSION_SIZE - missedVocab.length),
    );
    const pool = [...shuffle(missedVocab), ...freshVocab];

    return pool.map((word) => {
      const seenHe = new Set([word.he]);
      const distractors: VocabularyEntry[] = [];
      for (const v of shuffle(content.vocabulary)) {
        if (v.id === word.id || seenHe.has(v.he)) continue;
        seenHe.add(v.he);
        distractors.push(v);
        if (distractors.length >= VOCAB_OPTIONS_PER_QUESTION - 1) break;
      }
      const options = shuffle([word.he, ...distractors.map((d) => d.he)]);
      return {
        id: word.id,
        category: 'vocabulary',
        prompt: withArticle(word.de, word.fullForm),
        isCloze: false,
        options,
        answer: word.he,
        en: word.en,
      };
    });
  }

  private sectionsFor(content: ContentBundle, lektionId: string): SectionDescriptor[] {
    const vocabCount = content.vocabulary.filter((v) => v.lektionId === lektionId).length;
    const sentenceCount = content.sentenceExercises.filter((s) => s.lektionId === lektionId).length;
    const translationCount = content.translationExercises.filter((t) => t.lektionId === lektionId).length;
    return buildLektionSections(vocabCount, sentenceCount, translationCount);
  }

  private upsertProgress(
    userId: string,
    lektionId: string,
    sectionId: string,
    mutate: (record: StoredProgress) => void,
  ): StoredProgress {
    const all = this.store.getProgress();
    let record = all.find((p) => p.userId === userId && p.lektionId === lektionId && p.sectionId === sectionId);
    if (!record) {
      record = { userId, lektionId, sectionId, completed: false, usedHint: false, updatedAt: new Date().toISOString() };
      all.push(record);
    }
    mutate(record);
    record.updatedAt = new Date().toISOString();
    this.store.saveProgress(all);
    return record;
  }
}

function toProgressRecord(stored: StoredProgress): ProgressRecord {
  return {
    lektionId: stored.lektionId,
    sectionId: stored.sectionId,
    completed: stored.completed,
    usedHint: stored.usedHint,
    updatedAt: stored.updatedAt,
  };
}

function toPracticeItem(drill: GrammarDrillExercise): PracticeItem {
  return {
    id: drill.id,
    category: drill.category,
    prompt: drill.template,
    isCloze: true,
    options: drill.options,
    answer: drill.answer,
    he: drill.he,
    en: drill.en,
  };
}
