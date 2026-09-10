import { SectionDescriptor } from './models';

const SECTION_SIZE = 20;
const MERGE_THRESHOLD = 10;

/**
 * Splits `total` items into vocabulary-section sizes of up to 20 each.
 * A final leftover of 10 or fewer is folded into the previous section
 * instead of becoming its own (too-small) section; a leftover above 10
 * becomes its own final section.
 */
export function bucketSizes(total: number): number[] {
  if (total <= SECTION_SIZE) return total > 0 ? [total] : [];

  const fullSections = Math.floor(total / SECTION_SIZE);
  const remainder = total % SECTION_SIZE;

  if (remainder === 0) {
    return Array(fullSections).fill(SECTION_SIZE);
  }
  if (remainder <= MERGE_THRESHOLD) {
    const sizes = Array(fullSections - 1).fill(SECTION_SIZE);
    sizes.push(SECTION_SIZE + remainder);
    return sizes;
  }
  return [...Array(fullSections).fill(SECTION_SIZE), remainder];
}

/** Full section descriptor list for a Lektion, in display order. */
export function buildLektionSections(
  vocabularyCount: number,
  sentenceCount: number,
  translationCount: number,
): SectionDescriptor[] {
  const sections: SectionDescriptor[] = [];

  const vocabSizes = bucketSizes(vocabularyCount);
  let start = 0;
  vocabSizes.forEach((count, i) => {
    sections.push({
      id: `vocabulary-${i + 1}`,
      type: 'vocabulary',
      index: i + 1,
      label: vocabSizes.length > 1 ? `Vocabulary ${i + 1}` : 'Vocabulary',
      count,
      start,
    });
    start += count;
  });

  // Same word groupings as the forward sections above (same bucket sizes,
  // same starts) — just quizzed in the opposite direction.
  start = 0;
  vocabSizes.forEach((count, i) => {
    sections.push({
      id: `vocabulary-reverse-${i + 1}`,
      type: 'vocabulary-reverse',
      index: i + 1,
      label: vocabSizes.length > 1 ? `Vocabulary ${i + 1} (reverse)` : 'Vocabulary (reverse)',
      count,
      start,
    });
    start += count;
  });

  if (sentenceCount > 0) {
    sections.push({ id: 'sentence-1', type: 'sentence', index: 1, label: 'Sentence Building', count: sentenceCount });
  }
  if (translationCount > 0) {
    sections.push({
      id: 'translation-1',
      type: 'translation',
      index: 1,
      label: 'Translation from Hebrew',
      count: translationCount,
    });
  }

  return sections;
}
