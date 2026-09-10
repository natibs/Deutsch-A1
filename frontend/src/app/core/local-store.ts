import { Injectable } from '@angular/core';
import { Theme } from './models';

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  theme: Theme;
  createdAt: string;
}

export interface StoredProgress {
  userId: string;
  lektionId: string;
  sectionId: string;
  completed: boolean;
  usedHint: boolean;
  updatedAt: string;
}

// A missed item, grouped by category (dativ, vocabulary, ...) so the AI
// Practice hub can surface what a user actually struggles with. itemId is a
// grammar-drill id or a vocabulary entry id, depending on category.
export interface StoredMistake {
  userId: string;
  category: string;
  itemId: string;
  count: number;
  lastMissedAt: string;
}

const USERS_KEY = 'deutscha1_users';
const PROGRESS_KEY = 'deutscha1_progress';
const CURRENT_USER_KEY = 'deutscha1_current_user_id';
const MISTAKES_KEY = 'deutscha1_mistakes';

// Everything the app needs to run — accounts and progress — lives in
// localStorage on the device itself. No server involved, so this is the
// entire persistence layer.
@Injectable({ providedIn: 'root' })
export class LocalStore {
  getUsers(): StoredUser[] {
    return readJson<StoredUser[]>(USERS_KEY, []);
  }

  saveUsers(users: StoredUser[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  findUserByUsername(username: string): StoredUser | undefined {
    const lower = username.toLowerCase();
    return this.getUsers().find((u) => u.username.toLowerCase() === lower);
  }

  findUserById(id: string): StoredUser | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  addUser(user: StoredUser): void {
    this.saveUsers([...this.getUsers(), user]);
  }

  updateUser(updated: StoredUser): void {
    this.saveUsers(this.getUsers().map((u) => (u.id === updated.id ? updated : u)));
  }

  getProgress(): StoredProgress[] {
    return readJson<StoredProgress[]>(PROGRESS_KEY, []);
  }

  saveProgress(progress: StoredProgress[]): void {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  getCurrentUserId(): string | null {
    return localStorage.getItem(CURRENT_USER_KEY);
  }

  setCurrentUserId(id: string | null): void {
    if (id) localStorage.setItem(CURRENT_USER_KEY, id);
    else localStorage.removeItem(CURRENT_USER_KEY);
  }

  getMistakes(): StoredMistake[] {
    return readJson<StoredMistake[]>(MISTAKES_KEY, []);
  }

  saveMistakes(mistakes: StoredMistake[]): void {
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes));
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
