import { TranslationHint } from './models';

export interface HintSegment {
  text: string;
  hint?: string;
}

// Splits `text` into a sequence of plain-text and hintable segments, walking
// `hints` in order and matching each one against the next unconsumed part of
// the string. A hint whose Hebrew substring can't be found (e.g. stale data)
// is simply skipped rather than breaking the whole sentence.
export function segmentHintText(text: string, hints: readonly TranslationHint[]): HintSegment[] {
  const segments: HintSegment[] = [];
  let cursor = 0;

  for (const hint of hints) {
    const index = text.indexOf(hint.he, cursor);
    if (index === -1) continue;

    if (index > cursor) segments.push({ text: text.slice(cursor, index) });
    segments.push({ text: hint.he, hint: hint.de });
    cursor = index + hint.he.length;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });

  return segments;
}
