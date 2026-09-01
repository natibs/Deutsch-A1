import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderService } from '../../core/page-header.service';
import { QuizSession } from '../../core/quiz-session';
import { VocabularyEntry } from '../../core/models';
import { pickRandom, shuffle } from '../../core/quiz-utils';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { GuestNotice } from '../../shared/guest-notice/guest-notice';
import { QuizControls } from '../../shared/quiz-controls/quiz-controls';

const OPTIONS_PER_QUESTION = 6;

interface Option {
  he: string;
  en: string;
}

@Component({
  selector: 'app-vocabulary-quiz',
  imports: [RouterLink, QuizControls, GuestNotice, ConfirmModal],
  templateUrl: './vocabulary-quiz.html',
  styleUrl: './vocabulary-quiz.scss',
})
export class VocabularyQuiz extends QuizSession<VocabularyEntry> {
  protected readonly sectionIndex = this.route.snapshot.paramMap.get('sectionIndex')!;
  protected readonly sectionId = `vocabulary-${this.sectionIndex}`;

  private allVocab: VocabularyEntry[] = [];
  private sectionVocab: VocabularyEntry[] = [];

  protected readonly options = signal<Option[]>([]);
  protected readonly selected = signal<string | null>(null);

  constructor() {
    super();
    inject(PageHeaderService).set({
      title: 'Vocabulary',
      part: `· Part ${this.sectionIndex}`,
      backLink: ['/lektion', this.lektionId],
      backLabel: '‹ Back to Lesson',
      subtitle: 'Choose the correct translation for each word',
    });

    this.api.getVocabulary(this.lektionId, this.sectionId).subscribe((vocab) => {
      this.sectionVocab = vocab;
      if (this.allVocab.length) this.startOrWarn();
    });
    this.api.getAllVocabulary().subscribe((vocab) => {
      this.allVocab = vocab;
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
    const distractorPool = this.allVocab.filter((v) => v.id !== word.id && v.he !== word.he);
    const distractors = pickRandom(distractorPool, OPTIONS_PER_QUESTION - 1).map((v) => ({ he: v.he, en: v.en }));
    return shuffle([{ he: word.he, en: word.en }, ...distractors]);
  }

  protected select(option: Option): void {
    if (this.checked()) return;
    this.selected.set(option.he);
  }

  protected check(): void {
    const word = this.runner()?.current();
    if (!word || !this.selected()) return;
    this.wasCorrect.set(this.selected() === word.he);
    this.checked.set(true);
  }
}
