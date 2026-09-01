export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pickRandom<T>(items: readonly T[], count: number): T[] {
  return shuffle(items).slice(0, count);
}

export function normalizeAnswer(value: string): string {
  return foldUmlauts(stripPunctuation(value)).toLowerCase();
}

const UMLAUT_FOLD: Record<string, string> = { ä: 'a', ö: 'o', ü: 'u', Ä: 'A', Ö: 'O', Ü: 'U' };

// Lets ä/ö/ü be typed as plain a/o/u (common when the keyboard has no umlauts).
export function foldUmlauts(value: string): string {
  return value.replace(/[äöüÄÖÜ]/g, (ch) => UMLAUT_FOLD[ch]);
}

// Same as normalizeAnswer but case-preserving, so it can be compared against
// normalizeAnswer's result to detect an answer that's only wrong on casing.
// Also folds ß to ss (and its rare uppercase form) so either spelling grades
// the same, since ß is optional/deprecated in Swiss and simplified usage.
export function stripPunctuation(value: string): string {
  return value
    .trim()
    .replace(/[.,!?;:]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ß/g, 'ss')
    .replace(/ẞ/g, 'SS');
}
