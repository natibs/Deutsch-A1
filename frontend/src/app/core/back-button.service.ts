import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NatiUiToastService } from 'ui-components';
import { PageHeaderService } from './page-header.service';

const EXIT_CONFIRM_WINDOW_MS = 2000;
const ROOT_PATH = '/';

// Makes the hardware/gesture back button mirror whatever the page's own
// header back-link already does — same destination as tapping "Back to
// Lesson" / "All Lessons" — instead of Capacitor's default raw WebView
// history.back(). At the lesson list (the app's true home, no back-link of
// its own) it instead requires a second press within a short window to exit,
// with a toast nudge on the first press.
@Injectable({ providedIn: 'root' })
export class BackButtonService {
  private readonly router = inject(Router);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly toastService = inject(NatiUiToastService);

  private awaitingExitConfirm = false;
  private exitConfirmTimer?: ReturnType<typeof setTimeout>;

  init(): void {
    if (!Capacitor.isNativePlatform()) return;

    App.addListener('backButton', () => {
      const backLink = this.pageHeader.info().backLink;

      if (backLink) {
        this.awaitingExitConfirm = false;
        if (Array.isArray(backLink)) this.router.navigate(backLink);
        else this.router.navigateByUrl(backLink);
        return;
      }

      if (this.router.url === ROOT_PATH) {
        this.handleRootBack();
        return;
      }

      // Pages with no back-link of their own (login/signup) — home is the
      // one sensible fallback destination.
      this.router.navigateByUrl(ROOT_PATH);
    });
  }

  private handleRootBack(): void {
    if (this.awaitingExitConfirm) {
      this.awaitingExitConfirm = false;
      clearTimeout(this.exitConfirmTimer);
      App.exitApp();
      return;
    }

    this.awaitingExitConfirm = true;
    this.toastService.info('Press back again to exit', EXIT_CONFIRM_WINDOW_MS);
    clearTimeout(this.exitConfirmTimer);
    this.exitConfirmTimer = setTimeout(() => {
      this.awaitingExitConfirm = false;
    }, EXIT_CONFIRM_WINDOW_MS);
  }
}
