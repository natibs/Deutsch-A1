// Local-only password hashing via the browser's built-in Web Crypto API — no
// server to send credentials to, so bcrypt-on-a-server isn't the threat model
// here; PBKDF2 with a per-user random salt is a reasonable, dependency-free
// way to avoid storing plaintext passwords on the device itself.
const PBKDF2_ITERATIONS = 150_000;
const HASH_BITS = 256;
const SALT_BYTES = 16;

async function deriveBits(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BITS,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, saltBytes);
  return { hash, salt: bytesToBase64(saltBytes) };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const candidate = await deriveBits(password, base64ToBytes(salt));
  return candidate === hash;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
