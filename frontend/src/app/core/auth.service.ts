import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, defer } from 'rxjs';
import { LocalStore, StoredUser } from './local-store';
import { AuthResponse, Theme, User } from './models';
import { hashPassword, verifyPassword } from './password-hash';
import { randomUUID } from './uuid';

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
// 8+ chars, any characters allowed.
const PASSWORD_PATTERN = /^.{8,72}$/;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly store = inject(LocalStore);

  private readonly user = signal<User | null>(this.loadCurrentUser());
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  login(username: string, password: string): Observable<AuthResponse> {
    return defer(() => this.doLogin(username, password));
  }

  signup(username: string, password: string): Observable<AuthResponse> {
    return defer(() => this.doSignup(username, password));
  }

  logout(): void {
    this.store.setCurrentUserId(null);
    this.user.set(null);
  }

  updateTheme(theme: Theme): Observable<User> {
    return defer(() => this.doUpdateTheme(theme));
  }

  private async doSignup(username: string, password: string): Promise<AuthResponse> {
    if (!USERNAME_PATTERN.test(username)) {
      throw localError('Username must be 3-32 characters (letters, numbers, _ . -).');
    }
    if (!PASSWORD_PATTERN.test(password)) {
      throw localError('Password must be at least 8 characters.');
    }
    if (this.store.findUserByUsername(username)) {
      throw localError('That username is already taken.');
    }

    const { hash, salt } = await hashPassword(password);
    const stored: StoredUser = {
      id: randomUUID(),
      username,
      passwordHash: hash,
      passwordSalt: salt,
      theme: 'light',
      createdAt: new Date().toISOString(),
    };
    this.store.addUser(stored);
    this.store.setCurrentUserId(stored.id);
    const user = toPublicUser(stored);
    this.user.set(user);
    return { user };
  }

  private async doLogin(username: string, password: string): Promise<AuthResponse> {
    const stored = this.store.findUserByUsername(username);
    const valid = stored && (await verifyPassword(password, stored.passwordHash, stored.passwordSalt));
    if (!stored || !valid) {
      throw localError('Invalid username or password.');
    }

    this.store.setCurrentUserId(stored.id);
    const user = toPublicUser(stored);
    this.user.set(user);
    return { user };
  }

  private async doUpdateTheme(theme: Theme): Promise<User> {
    const current = this.user();
    const stored = current && this.store.findUserById(current.id);
    if (!current || !stored) throw localError('Not signed in.');

    const updated: StoredUser = { ...stored, theme };
    this.store.updateUser(updated);
    const user = toPublicUser(updated);
    this.user.set(user);
    return user;
  }

  private loadCurrentUser(): User | null {
    const id = this.store.getCurrentUserId();
    const stored = id ? this.store.findUserById(id) : undefined;
    return stored ? toPublicUser(stored) : null;
  }
}

function toPublicUser(stored: StoredUser): User {
  return { id: stored.id, username: stored.username, theme: stored.theme };
}

// Shaped like an HttpErrorResponse (`err.error.error`) so callers that were
// written against the old server-backed API don't need to change.
function localError(message: string): { error: { error: string } } {
  return { error: { error: message } };
}
