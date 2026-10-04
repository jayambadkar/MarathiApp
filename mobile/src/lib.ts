export const XP_CORRECT = 10;

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/**
 * Shuffle stored MCQ options, remapping the answer index to the new order.
 * Stored content skews hard (stories/grammar pile the answer at index 0),
 * so every stored-order quiz must render through this. Index-based remap
 * stays correct even with duplicate option labels.
 */
export function shuffleOptions(
  options: string[],
  answer: number,
): {options: string[]; answer: number} {
  const order = shuffle(options.map((_, i) => i));
  return {options: order.map(i => options[i]), answer: order.indexOf(answer)};
}

export function normEn(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[?!.,;:'"“”‘’।]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normMr(s: string): string {
  return (s || '')
    .replace(/[?!.,;:'"“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
