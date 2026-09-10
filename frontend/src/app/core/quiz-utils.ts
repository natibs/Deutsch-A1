const ARTICLE_PATTERN = /\((der|die|das)(?:,\s*(?:Pl|Sing)\.?)?\)/;

// Pulls the definite article out of a noun's dictionary fullForm, e.g.
// "Haus /-\"er (das)" -> "das", "Freundin /-nen (die)" -> "die". Non-nouns
// (verbs, adjectives...) have no article in their fullForm and return null —
// as do a handful of fullForm entries whose parens hold something else
// entirely (an irregular conjugation, a case marker), not an article.
export function germanArticle(fullForm: string): string | null {
  return fullForm.match(ARTICLE_PATTERN)?.[1] ?? null;
}

// "Haus" + "Haus /-\"er (das)" -> "Haus (das)"; unchanged for non-nouns.
export function withArticle(de: string, fullForm: string): string {
  const article = germanArticle(fullForm);
  return article ? `${de} (${article})` : de;
}

// Strips a trailing disambiguation tag like "ihr (Poss., sg.)" -> "ihr" —
// used for the reverse-quiz's German answer, which should show the real
// word a learner would write, not the grammatical-role tag that exists only
// to keep otherwise-identical forms (e.g. "es (Nom.)" vs "es (Akk.)")
// distinct as separate flashcards. A no-op for words that carry no such tag.
export function stripParenthetical(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// Splits a cloze template on its "___" placeholder so the template can be
// rendered as text-before / [blank] / text-after. A template with no
// placeholder renders as plain text with nothing after it.
export function splitCloze(template: string): [string, string] {
  const index = template.indexOf('___');
  if (index === -1) return [template, ''];
  return [template.slice(0, index), template.slice(index + 3)];
}

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
