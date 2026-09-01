import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Theme } from './models';

// Guests get a live, in-memory-only theme (their toggle applies immediately
// but is never persisted, so a fresh visit always starts from 'light'). Once
// signed in, the choice is saved to the account (DB) and follows the user
// across devices/sessions via the cached user object.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly auth = inject(AuthService);

  private readonly theme = signal<Theme>(this.auth.currentUser()?.theme ?? 'light');
  readonly currentTheme = this.theme.asReadonly();

  constructor() {
    // A newly logged-in (or logged-out) user's saved preference overrides
    // whatever a signed-out visitor may have toggled locally.
    effect(() => {
      const user = this.auth.currentUser();
      if (user) this.theme.set(user.theme);
    });

    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
    });
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    if (this.auth.isAuthenticated()) {
      this.auth.updateTheme(theme).subscribe();
    }
  }
}
