import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderService } from '../../core/page-header.service';
import { QuizSession } from '../../core/quiz-session';
import { VocabularyEntry } from '../../core/models';
import { shuffle, stripParenthetical, withArticle } from '../../core/quiz-utils';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { GuestNotice } from '../../shared/guest-notice/guest-notice';
import { QuizControls } from '../../shared/quiz-controls/quiz-controls';

const OPTIONS_PER_QUESTION = 6;

interface Option {
  // The value compared for correctness — he for the forward direction
  // (German -> Hebrew/English), de for reverse.
  key: string;
  primary: string;
  primaryIsHebrew: boolean;
  secondary?: string;
}

@Component({
  selector: 'app-vocabulary-quiz',
  imports: [RouterLink, QuizControls, GuestNotice, ConfirmModal],
  templateUrl: './vocabulary-quiz.html',
  styleUrl: './vocabulary-quiz.scss',
})
export class VocabularyQuiz extends QuizSession<VocabularyEntry> {
  protected readonly reverse = this.route.snapshot.data['reverse'] === true;
  protected readonly sectionIndex = this.route.snapshot.paramMap.get('sectionIndex')!;
  protected readonly sectionId = this.reverse
    ? `vocabulary-reverse-${this.sectionIndex}`
    : `vocabulary-${this.sectionIndex}`;

  private allVocab: VocabularyEntry[] = [];
  private sectionVocab: VocabularyEntry[] = [];

  protected readonly options = signal<Option[]>([]);
  protected readonly selected = signal<string | null>(null);

  constructor() {
    super();
    inject(PageHeaderService).set({
      title: this.reverse ? 'Vocabulary (Reverse)' : 'Vocabulary',
      part: `· Part ${this.sectionIndex}`,
      backLink: ['/lektion', this.lektionId],
      backLabel: '‹ Back to Lesson',
      subtitle: this.reverse
        ? 'Choose the correct German word for each translation'
        : 'Choose the correct translation for each word',
    });

    this.api.getVocabulary(this.lektionId, this.sectionId).subscribe((vocab) => {
      this.sectionVocab = vocab;
      if (this.allVocab.length) this.startOrWarn();
    });
    this.api.getAllVocabulary().subscribe((vocab) => {
      // Distractors are drawn only from the same lektion, so options stay
      // thematically related to what's being quizzed (e.g. lesson 17's
      // pronoun cards never pull in an unrelated noun like "lunch").
      this.allVocab = vocab.filter((v) => v.lektionId === this.lektionId);
      if (this.sectionVocab.length) this.startOrWarn();
    });
  }

  // The backend already sizes this section (up to 20, or a merged-in remainder
  // for a lesson's final section) — every word in it is used, none dropped.
  protected pickExercises(): VocabularyEntry[] {
    return this.sectionVocab;
  }

  protected onPresentCurrent(word: VocabularyEntry | null): void {
    this.selected.set(null);
    this.options.set(word ? this.buildOptions(word) : []);
  }

  private buildOptions(word: VocabularyEntry): Option[] {
    const correctKey = this.correctKey(word);
    // Some words share a translation across lessons/synonyms (e.g. two
    // German words both translating to the same Hebrew word) — dedupe by
    // key so the same answer never appears twice among the choices.
    const seenKeys = new Set<string>([correctKey]);
    const distractorPool: VocabularyEntry[] = [];
    for (const v of shuffle(this.allVocab)) {
      if (v.id === word.id) continue;
      const key = this.correctKey(v);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      distractorPool.push(v);
    }

    const entries = [word, ...distractorPool.slice(0, OPTIONS_PER_QUESTION - 1)];
    return shuffle(entries.map((v) => this.toOption(v)));
  }

  protected correctKey(word: VocabularyEntry): string {
    // Stripped so e.g. "es (Nom.)" and "es (Akk.)" — distinct cards for a
    // forward-direction prompt — collapse to the same "es" answer here,
    // which both dedupes them out of the same reverse question's options
    // and matches what the learner actually has to type/pick: the plain
    // German word, not its grammatical-role tag.
    return this.reverse ? stripParenthetical(word.de) : word.he;
  }

  private toOption(v: VocabularyEntry): Option {
    return this.reverse
      ? { key: stripParenthetical(v.de), primary: withArticle(stripParenthetical(v.de), v.fullForm), primaryIsHebrew: false }
      : { key: v.he, primary: v.he, primaryIsHebrew: true, secondary: v.en };
  }

  // For the forward direction's prompt, where the German word is the question
  // rather than an option.
  protected wordWithArticle(word: VocabularyEntry): string {
    return withArticle(word.de, word.fullForm);
  }

  protected select(option: Option): void {
    if (this.checked()) return;
    this.selected.set(option.key);
  }

  protected check(): void {
    const word = this.runner()?.current();
    if (!word || !this.selected()) return;
    const correct = this.selected() === this.correctKey(word);
    this.wasCorrect.set(correct);
    this.checked.set(true);
    if (!correct) this.api.recordMistake('vocabulary', word.id);
  }

  protected override hasCurrentInput(): boolean {
    return this.selected() !== null;
  }
}
