import { animate, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, ViewChild, effect, input, output } from '@angular/core';

const HIDDEN = 'translateY(100%)';
const SHOWN = 'translateY(0)';
const DURATION_MS = 220;

@Component({
  selector: 'app-quiz-controls',
  templateUrl: './quiz-controls.html',
  styleUrl: './quiz-controls.scss',
  animations: [
    // Only :leave — handles the component being truly unmounted by the router
    // (navigating away from the page entirely). The question <-> completion
    // toggle keeps the component mounted and is animated separately below via
    // the Web Animations API, since that internal case doesn't go through
    // Angular's structural removal at all and this trigger never fires for it.
    trigger('routeLeave', [transition(':leave', [animate(`${DURATION_MS}ms ease-in`, style({ transform: HIDDEN }))])]),
  ],
})
export class QuizControls {
  total = input.required<number>();
  mastered = input.required<number>();
  checked = input<boolean>(false);
  correct = input<boolean>(false);
  canCheck = input<boolean>(true);
  // Stays mounted across the question <-> completion toggle; driven imperatively
  // via the Web Animations API rather than a CSS class + transition, since that
  // was unreliable here.
  visible = input<boolean>(true);

  @ViewChild('bar', { static: true }) private barRef!: ElementRef<HTMLElement>;

  private previousVisible = false;
  private currentAnimation?: Animation;

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const from = this.previousVisible;
      this.previousVisible = isVisible;
      if (from === isVisible) return;

      // A `fill: 'forwards'` animation keeps "running" indefinitely after it
      // completes, so the previous one has to be cancelled — otherwise it
      // keeps competing with (and can visually override) the new one.
      this.currentAnimation?.cancel();
      const el = this.barRef.nativeElement;
      const target = isVisible ? SHOWN : HIDDEN;
      const anim = el.animate([{ transform: from ? SHOWN : HIDDEN }, { transform: target }], {
        duration: DURATION_MS,
        easing: 'ease-in',
        fill: 'forwards',
      });
      this.currentAnimation = anim;

      // Once it naturally finishes, bake the result into a plain style and
      // drop the WAAPI animation object entirely — a lingering "finished but
      // still fill:forwards" animation is what was silently overriding
      // Angular's own :leave animation if the component got unmounted later
      // (e.g. navigating away mid-quiz, before any internal toggle had run).
      anim.finished
        .then(() => {
          el.style.transform = target;
          anim.cancel();
          if (this.currentAnimation === anim) this.currentAnimation = undefined;
        })
        .catch(() => {}); // cancelled mid-flight by a later toggle — nothing to bake
    });
  }

  check = output<void>();
  continueNext = output<void>();
  reset = output<void>();
}
