import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// A real secret only matters once this app is reachable over a network;
// for local personal use a fixed dev fallback is fine, but honor an env
// override so a future deployment isn't stuck with this constant.
const JWT_SECRET = process.env.JWT_SECRET || 'deutsch-a1-dev-secret';
const JWT_EXPIRES_IN = '30d';
const SALT_ROUNDS = 10;

export function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Returns the userId, or null if the token is missing/invalid/expired.
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET).sub;
  } catch {
    return null;
  }
}
