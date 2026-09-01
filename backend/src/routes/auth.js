import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { db, loadDb } from '../db/store.js';
import { requireAuth } from '../middleware/require-auth.js';
import { hashPassword, signToken, verifyPassword } from '../lib/auth.js';

export const authRouter = Router();

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
// 8+ chars, any characters allowed. Capped at 72 since bcrypt silently
// ignores bytes past that length.
const PASSWORD_PATTERN = /^.{8,72}$/;
const THEMES = ['light', 'dark'];

function publicUser(user) {
  return { id: user.id, username: user.username, theme: user.theme ?? 'light' };
}

authRouter.post('/signup', async (req, res) => {
  await loadDb();
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-32 characters (letters, numbers, _ . -).' });
  }
  if (typeof password !== 'string' || !PASSWORD_PATTERN.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  db.data.users ||= [];
  if (db.data.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const user = {
    id: randomUUID(),
    username,
    passwordHash: await hashPassword(password),
    theme: 'light',
    createdAt: new Date().toISOString(),
  };
  db.data.users.push(user);
  await db.write();

  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  await loadDb();
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = (db.data.users ?? []).find((u) => u.username.toLowerCase() === username.toLowerCase());
  const valid = user && (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  res.json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.patch('/theme', requireAuth, async (req, res) => {
  await loadDb();
  const { theme } = req.body ?? {};

  if (!THEMES.includes(theme)) {
    return res.status(400).json({ error: 'theme must be "light" or "dark".' });
  }

  const user = (db.data.users ?? []).find((u) => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  user.theme = theme;
  await db.write();
  res.json(publicUser(user));
});
