import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NatiUiToastService, NatiUiTooltipComponent } from 'ui-components';
import { segmentHintText } from '../../core/hint-segments';
import { TranslationExercise } from '../../core/models';
import { PageHeaderService } from '../../core/page-header.service';
import { QuizSession } from '../../core/quiz-session';
import { foldUmlauts, normalizeAnswer, pickRandom, stripPunctuation } from '../../core/quiz-utils';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { GuestNotice } from '../../shared/guest-notice/guest-notice';
import { QuizControls } from '../../shared/quiz-controls/quiz-controls';

const QUESTIONS_PER_SECTION = 20;
const IDLE_HINT_DELAY_MS = 10_000;

@Component({
  selector: 'app-translation-quiz',
  imports: [RouterLink, FormsModule, QuizControls, NatiUiTooltipComponent, GuestNotice, ConfirmModal],
  templateUrl: './translation-quiz.html',
  styleUrl: './translation-quiz.scss',
})
export class TranslationQuiz extends QuizSession<TranslationExercise> {
  protected readonly sectionId = 'translation-1';

  private readonly toastService = inject(NatiUiToastService);
  private allExercises: TranslationExercise[] = [];

  private readonly answerInput = viewChild<ElementRef<HTMLTextAreaElement>>('answerInput');

  protected readonly answer = signal('');
  protected readonly capitalizationWarning = signal(false);
  protected readonly umlautWarning = signal(false);

  protected readonly hintSegments = computed(() => {
    const exercise = this.runner()?.current();
    return exercise ? segmentHintText(exercise.he, exercise.hints) : [];
  });

  // Whether *any* hint has been used so far in this attempt — kept locally so
  // repeated hovers don't keep re-hitting the API once it's already recorded.
  private hintUsedThisAttempt = false;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private idleToastId?: number;

  constructor() {
    super();
    inject(PageHeaderService).set({
      title: 'Translation from Hebrew',
      backLink: ['/lektion', this.lektionId],
      backLabel: '‹ Back to Lesson',
      subtitle: 'Translate each sentence into German',
    });

    inject(DestroyRef).onDestroy(() => {
      this.clearIdleTimer();
      this.dismissIdleToast();
    });

    this.api.getTranslations(this.lektionId).subscribe((exercises) => {
      this.allExercises = exercises;
      this.startOrWarn();
    });
  }

  protected pickExercises(): TranslationExercise[] {
    return pickRandom(this.allExercises, Math.min(QUESTIONS_PER_SECTION, this.allExercises.length));
  }

  protected override start(): void {
    this.hintUsedThisAttempt = false;
    super.start();
  }

  protected onPresentCurrent(): void {
    this.capitalizationWarning.set(false);
    this.umlautWarning.set(false);
    this.answer.set('');
    this.scheduleIdleToast();
    // The textarea element persists across questions, so its auto-grown
    // height from a previous long answer would otherwise carry over.
    const el = this.answerInput()?.nativeElement;
    if (el) el.style.height = 'auto';
    // Deferred: on the very first question the textarea hasn't rendered yet
    // (this runs right after runner.set(), before Angular flushes this
    // render pass), so the viewChild is only populated a tick later.
    setTimeout(() => this.answerInput()?.nativeElement.focus(), 0);
  }

  protected autoResize(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  protected onEnterKey(event: Event): void {
    event.preventDefault();
    this.onEnter();
  }

  protected updateAnswer(value: string): void {
    this.answer.set(value);
    if (value.trim()) {
      this.clearIdleTimer();
      this.dismissIdleToast();
    }
  }

  protected onHintShown(): void {
    this.clearIdleTimer();
    this.dismissIdleToast();
    if (this.hintUsedThisAttempt) return;
    this.hintUsedThisAttempt = true;
    this.api.markHintUsed(this.lektionId, this.sectionId).subscribe();
  }

  protected onEnter(): void {
    if (this.checked()) {
      this.continueNext();
    } else if (this.answer().trim()) {
      this.check();
    }
  }

  protected check(): void {
    const exercise = this.runner()?.current();
    if (!exercise || !this.answer().trim()) return;
    const answer = this.answer();
    const normalized = normalizeAnswer(answer);
    const matchedSolution = exercise.solutions.find((solution) => normalizeAnswer(solution) === normalized);
    const correct = !!matchedSolution;
    this.wasCorrect.set(correct);

    if (matchedSolution) {
      const answerCased = stripPunctuation(answer);
      const solutionCased = stripPunctuation(matchedSolution);
      const answerLower = answerCased.toLowerCase();
      const solutionLower = solutionCased.toLowerCase();
      // Correct once case is ignored, but not when it's preserved — i.e. the only
      // thing wrong is capitalization. Still counts as correct, just flagged.
      this.capitalizationWarning.set(answerCased !== solutionCased && answerLower === solutionLower);
      // Correct once ä/ö/ü are folded to a/o/u, but not when they're kept as-is —
      // i.e. an umlaut was typed as its plain vowel. Still counts as correct, just flagged.
      this.umlautWarning.set(foldUmlauts(answerLower) === foldUmlauts(solutionLower) && answerLower !== solutionLower);
    } else {
      this.capitalizationWarning.set(false);
      this.umlautWarning.set(false);
    }
    this.checked.set(true);
  }

  private scheduleIdleToast(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.idleTimer = undefined;
      this.idleToastId = this.toastService.info(
        'Stuck? Hover over a highlighted Hebrew word for a hint.',
        0,
      );
    }, IDLE_HINT_DELAY_MS);
  }

  private clearIdleTimer(): void {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
  }

  private dismissIdleToast(): void {
    if (this.idleToastId === undefined) return;
    this.toastService.dismiss(this.idleToastId);
    this.idleToastId = undefined;
  }
}
