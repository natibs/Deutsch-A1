import { CanDeactivateFn } from '@angular/router';

export interface ConfirmsExit {
  canDeactivate(): boolean | Promise<boolean>;
}

// Applied to the quiz routes so that any exit — the header's back-link,
// the hardware/gesture back button, browser back, or any other in-app
// navigation — funnels through the same "unsaved progress?" prompt, instead
// of each exit path needing its own confirmation logic.
export const confirmQuizExitGuard: CanDeactivateFn<ConfirmsExit> = (component) => component.canDeactivate();
