import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderService } from '../../core/page-header.service';
import { QuizSession } from '../../core/quiz-session';
import { SentenceExercise } from '../../core/models';
import { pickRandom, shuffle } from '../../core/quiz-utils';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { GuestNotice } from '../../shared/guest-notice/guest-notice';
import { QuizControls } from '../../shared/quiz-controls/quiz-controls';

const QUESTIONS_PER_SECTION = 20;
const BANK_LIST_ID = 'bank-list';
const ANSWER_LIST_ID = 'answer-list';

@Component({
  selector: 'app-sentence-builder',
  imports: [RouterLink, DragDropModule, QuizControls, GuestNotice, ConfirmModal],
  templateUrl: './sentence-builder.html',
  styleUrl: './sentence-builder.scss',
})
export class SentenceBuilder extends QuizSession<SentenceExercise> {
  protected readonly sectionId = 'sentence-1';
  protected readonly bankListId = BANK_LIST_ID;
  protected readonly answerListId = ANSWER_LIST_ID;

  private allExercises: SentenceExercise[] = [];

  protected readonly bank = signal<string[]>([]);
  protected readonly answer = signal<string[]>([]);

  constructor() {
    super();
    inject(PageHeaderService).set({
      title: 'Sentence Building',
      backLink: ['/lektion', this.lektionId],
      backLabel: '‹ Back to Lesson',
      subtitle: 'Drag or click the words to arrange them into a correct sentence',
    });

    this.api.getSentences(this.lektionId).subscribe((exercises) => {
      this.allExercises = exercises;
      this.startOrWarn();
    });
  }

  protected pickExercises(): SentenceExercise[] {
    return pickRandom(this.allExercises, Math.min(QUESTIONS_PER_SECTION, this.allExercises.length));
  }

  protected onPresentCurrent(exercise: SentenceExercise | null): void {
    this.answer.set([]);
    this.bank.set(exercise ? shuffle(exercise.chunks) : []);
  }

  // Click-to-move fallback, still handy for quick single-tap placement.
  protected pickChunk(index: number): void {
    if (this.checked()) return;
    const bank = [...this.bank()];
    if (index < 0 || index >= bank.length) return;
    const [chunk] = bank.splice(index, 1);
    this.bank.set(bank);
    this.answer.set([...this.answer(), chunk]);
  }

  protected removeChunk(index: number): void {
    if (this.checked()) return;
    const answer = [...this.answer()];
    if (index < 0 || index >= answer.length) return;
    const [chunk] = answer.splice(index, 1);
    this.answer.set(answer);
    this.bank.set([...this.bank(), chunk]);
  }

  // Drag-and-drop: reorder within a list, or move a tile between bank and answer.
  protected drop(event: CdkDragDrop<string[]>): void {
    if (this.checked()) return;

    if (event.previousContainer === event.container) {
      const items = [...event.container.data];
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      this.applyList(event.container.id, items);
    } else {
      const previous = [...event.previousContainer.data];
      const current = [...event.container.data];
      transferArrayItem(previous, current, event.previousIndex, event.currentIndex);
      this.applyList(event.previousContainer.id, previous);
      this.applyList(event.container.id, current);
    }
  }

  private applyList(listId: string, items: string[]): void {
    if (listId === ANSWER_LIST_ID) this.answer.set(items);
    else this.bank.set(items);
  }

  protected check(): void {
    const exercise = this.runner()?.current();
    if (!exercise) return;
    const target = exercise.chunks;
    const answer = this.answer();
    const correct =
      answer.length === target.length && answer.every((chunk, i) => chunk.toLowerCase() === target[i].toLowerCase());
    this.wasCorrect.set(correct);
    this.checked.set(true);
  }

  protected override hasCurrentInput(): boolean {
    return this.answer().length > 0;
  }
}
