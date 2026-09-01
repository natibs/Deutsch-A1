import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';
import { AuthService } from './auth.service';
import { LocalStore, StoredProgress } from './local-store';
import {
  Lektion,
  ProgressRecord,
  SectionDescriptor,
  SentenceExercise,
  TranslationExercise,
  VocabularyEntry,
} from './models';
import { buildLektionSections } from './sections.util';

interface ContentBundle {
  lektionen: Omit<Lektion, 'sectionCount'>[];
  vocabulary: VocabularyEntry[];
  sentenceExercises: SentenceExercise[];
  translationExercises: TranslationExercise[];
}

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
        if (!section || section.type !== 'vocabulary') return [];
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
