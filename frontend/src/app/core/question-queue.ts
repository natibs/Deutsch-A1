import { signal } from '@angular/core';
import { shuffle } from './quiz-utils';

/**
 * Drives a step-by-step quiz: one question at a time. A wrong answer stays in
 * the deck and gets reinserted a few questions later (not immediately, not
 * always at the very end) instead of just being appended, so it comes back
 * around while the deck is still moving.
 */
export class QuestionQueue<T> {
  readonly total: number;
  readonly masteredCount = signal(0);
  readonly current = signal<T | null>(null);

  private queue: T[];

  constructor(items: readonly T[]) {
    this.total = items.length;
    this.queue = shuffle(items);
    this.current.set(this.queue[0] ?? null);
  }

  get isComplete(): boolean {
    return this.queue.length === 0;
  }

  submit(wasCorrect: boolean): void {
    const item = this.queue.shift();
    if (item === undefined) return;

    if (wasCorrect) {
      this.masteredCount.update((count) => count + 1);
    } else {
      this.queue.splice(this.reinsertIndex(), 0, item);
    }
    this.current.set(this.queue[0] ?? null);
  }

  private reinsertIndex(): number {
    const length = this.queue.length;
    if (length === 0) return 0;
    const minPos = Math.min(2, length);
    return minPos + Math.floor(Math.random() * (length - minPos + 1));
  }
}
