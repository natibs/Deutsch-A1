import { Directive, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ConfirmsExit } from './confirm-exit.guard';
import { QuestionQueue } from './question-queue';
import { ConfirmModal } from '../shared/confirm-modal/confirm-modal';

// Shared session lifecycle for the three quiz types (vocabulary, sentence
// building, translation) — picking a deck, presenting/advancing/completing
// questions, and the restart/exit confirmation. Each subclass supplies its
// own exercise data, per-question reset, and answer-checking; everything
// about *running the deck* lives here once instead of three times.
@Directive()
export abstract class QuizSession<T> implements ConfirmsExit {
  protected readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly route = inject(ActivatedRoute);
  private readonly confirmModal = viewChild.required(ConfirmModal);

  protected readonly lektionId = this.route.snapshot.paramMap.get('id')!;

  protected readonly runner = signal<QuestionQueue<T> | null>(null);
  protected readonly checked = signal(false);
  protected readonly wasCorrect = signal(false);
  protected readonly showGuestNotice = signal(false);

  // The progress-tracking id passed to the backend on completion, e.g.
  // "vocabulary-1", "sentence-1", "translation-1".
  protected abstract readonly sectionId: string;

  // The deck for a fresh attempt — a subclass may want every item every time
  // (vocabulary) or a random subset (sentence/translation).
  protected abstract pickExercises(): T[];

  // Per-question UI reset (selection, drag bank, answer text, warnings...).
  // Called after `checked`/scroll are already handled by presentCurrent().
  protected abstract onPresentCurrent(current: T | null): void;

  protected startOrWarn(): void {
    if (this.auth.isAuthenticated()) this.start();
    else this.showGuestNotice.set(true);
  }

  protected onGuestContinue(): void {
    this.showGuestNotice.set(false);
    this.start();
  }

  protected start(): void {
    this.runner.set(new QuestionQueue(this.pickExercises()));
    this.presentCurrent();
  }

  protected presentCurrent(): void {
    this.checked.set(false);
    this.onPresentCurrent(this.runner()?.current() ?? null);
    // Otherwise a scrolled-down user won't see the new question load in.
    window.scrollTo(0, 0);
  }

  protected continueNext(): void {
    const runner = this.runner();
    if (!runner) return;
    runner.submit(this.wasCorrect());
    if (runner.isComplete) {
      this.api.setProgress(this.lektionId, this.sectionId, true).subscribe();
    }
    this.presentCurrent();
  }

  protected async reset(): Promise<void> {
    if (this.hasUnsavedProgress() && !(await this.confirmLeave('Restart section?', 'Restart'))) return;
    this.start();
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedProgress()) return true;
    return this.confirmLeave('Leave section?', 'Leave');
  }

  private hasUnsavedProgress(): boolean {
    const runner = this.runner();
    return !!runner && !runner.isComplete;
  }

  private confirmLeave(title: string, confirmLabel: string): Promise<boolean> {
    return this.confirmModal().open({
      title,
      message: 'Your progress in this section will be lost.',
      confirmLabel,
    });
  }
}
