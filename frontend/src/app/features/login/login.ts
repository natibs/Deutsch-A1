import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NatiUiToastService } from 'ui-components';
import { AuthService } from '../../core/auth.service';
import { PageHeaderService } from '../../core/page-header.service';
import { ThemeService } from '../../core/theme.service';
import { MarketBackground } from '../../shared/market-background/market-background';

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
// 8+ chars, any characters allowed — mirrors the backend rule.
const PASSWORD_PATTERN = /^.{8,72}$/;

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, MarketBackground],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(NatiUiToastService);
  protected readonly theme = inject(ThemeService);

  private readonly routeData = toSignal(inject(ActivatedRoute).data, { initialValue: {} as Record<string, unknown> });
  protected readonly isSignup = computed(() => this.routeData()['mode'] === 'signup');

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly submitting = signal(false);
  protected readonly errorText = signal<string | null>(null);

  // Password/confirm-password errors reveal on blur (not while still typing),
  // then stay live so they clear as soon as the field becomes valid.
  private readonly passwordTouched = signal(false);
  private readonly confirmTouched = signal(false);

  protected readonly passwordError = computed(() => {
    if (!this.passwordTouched() || !this.isSignup()) return null;
    return PASSWORD_PATTERN.test(this.password())
      ? null
      : 'Password must be at least 8 characters.';
  });

  protected readonly confirmPasswordError = computed(() => {
    if (!this.confirmTouched() || !this.isSignup()) return null;
    return this.password() === this.confirmPassword() ? null : 'Passwords do not match.';
  });

  constructor() {
    inject(PageHeaderService).set({
      title: 'German A1',
      subtitle: this.isSignup() ? 'Create your account' : 'Sign in to continue',
      hideAccountMenu: true,
    });
  }

  protected onPasswordBlur(): void {
    this.passwordTouched.set(true);
  }

  protected onConfirmPasswordBlur(): void {
    this.confirmTouched.set(true);
  }

  protected submit(): void {
    this.errorText.set(null);
    this.passwordTouched.set(true);
    this.confirmTouched.set(true);
    const username = this.username().trim();
    const password = this.password();

    if (this.isSignup() && !USERNAME_PATTERN.test(username)) {
      this.errorText.set('Username must be 3-32 characters (letters, numbers, _ . -).');
      return;
    }
    if (this.passwordError() || this.confirmPasswordError()) {
      return;
    }

    this.submitting.set(true);
    const request$ = this.isSignup() ? this.auth.signup(username, password) : this.auth.login(username, password);
    request$.subscribe({
      next: () => {
        this.toastService.success(this.isSignup() ? 'Account created — welcome!' : 'Welcome back!');
        this.router.navigateByUrl('/');
      },
      error: (err: { error?: { error?: string } }) => {
        this.submitting.set(false);
        this.errorText.set(err.error?.error ?? 'Something went wrong. Please try again.');
      },
    });
  }
}
