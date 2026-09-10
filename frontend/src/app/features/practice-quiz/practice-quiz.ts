import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderService } from '../../core/page-header.service';
import { QuizSession } from '../../core/quiz-session';
import { MistakeCategory, PracticeItem } from '../../core/models';
import { splitCloze } from '../../core/quiz-utils';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal';
import { GuestNotice } from '../../shared/guest-notice/guest-notice';
import { QuizControls } from '../../shared/quiz-controls/quiz-controls';

const CATEGORY_LABELS: Record<MistakeCategory, string> = {
  vocabulary: 'Vocabulary',
  akkusativ: 'Akkusativ',
  dativ: 'Dativ',
  negation: 'Negation (nicht / kein)',
  fragewoerter: 'Question Words',
  'trennbare-verben': 'Separable Verbs',
  possessivpronomen: 'Possessive Pronouns',
  modalverben: 'Modal Verbs',
  praepositionen: 'Prepositions',
};

// QuizSession reads the route's "id" param as its lektionId — reusing that
// same param name for the category here means this quiz gets the whole
// shared session/exit-confirmation machinery for free, with no base-class
// changes. The lektionId-shaped progress record it writes on completion
// (lektionId: category, sectionId: "practice") is otherwise unused; nothing
// reads it back.
@Component({
  selector: 'app-practice-quiz',
  imports: [RouterLink, QuizControls, GuestNotice, ConfirmModal],
  templateUrl: './practice-quiz.html',
  styleUrl: './practice-quiz.scss',
})
export class PracticeQuiz extends QuizSession<PracticeItem> {
  protected readonly category = this.lektionId as MistakeCategory;
  protected readonly sectionId = 'practice';

  private allItems: PracticeItem[] = [];

  protected readonly selected = signal<string | null>(null);
  protected readonly clozeParts = computed(() => {
    const item = this.runner()?.current();
    return item ? splitCloze(item.prompt) : ['', ''];
  });

  constructor() {
    super();
    inject(PageHeaderService).set({
      title: 'AI Practice',
      part: `· ${CATEGORY_LABELS[this.category] ?? this.category}`,
      backLink: '/practice',
      backLabel: '‹ All Categories',
      subtitle: 'Extra practice built from what tripped you up',
    });

    this.api.getPracticeItems(this.category).subscribe((items) => {
      this.allItems = items;
      this.startOrWarn();
    });
  }

  protected pickExercises(): PracticeItem[] {
    return this.allItems;
  }

  protected onPresentCurrent(): void {
    this.selected.set(null);
  }

  protected select(option: string): void {
    if (this.checked()) return;
    this.selected.set(option);
  }

  protected check(): void {
    const item = this.runner()?.current();
    const selected = this.selected();
    if (!item || !selected) return;
    const correct = selected === item.answer;
    this.wasCorrect.set(correct);
    this.checked.set(true);
    if (correct) this.api.resolveMistake(item.category, item.id);
    else this.api.recordMistake(item.category, item.id);
  }

  protected override hasCurrentInput(): boolean {
    return this.selected() !== null;
  }
}
