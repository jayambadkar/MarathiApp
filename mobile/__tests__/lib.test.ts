import {XP_CORRECT, normEn, normMr, shuffle, shuffleOptions, splitSentences} from '../src/lib';

test('shuffleOptions remaps the answer to the shuffled position', () => {
  for (let a = 0; a < 4; a++) {
    const r = shuffleOptions(['a', 'b', 'c', 'd'], a);
    expect([...r.options].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(r.options[r.answer]).toBe(['a', 'b', 'c', 'd'][a]);
  }
});

test('shuffleOptions spreads the answer across positions', () => {
  const seen = new Set<number>();
  for (let i = 0; i < 200; i++) seen.add(shuffleOptions(['a', 'b', 'c', 'd'], 0).answer);
  expect(seen.size).toBe(4);
});

test('shuffle keeps all elements', () => {
  expect(shuffle([1, 2, 3]).sort()).toEqual([1, 2, 3]);
});

test('norm strips punctuation and whitespace', () => {
  expect(normEn('Hello!  How?')).toBe('hello how');
  expect(normMr('नमस्कार!')).toBe('नमस्कार');
});

test('XP constant matches web', () => {
  expect(XP_CORRECT).toBe(10);
});

test('splitSentences splits on danda and ASCII marks', () => {
  expect(splitSentences('राम घरी गेला। सीता आली।')).toEqual(['राम घरी गेला।', 'सीता आली।']);
  expect(splitSentences('Hello! How are you? Fine.')).toEqual(['Hello!', 'How are you?', 'Fine.']);
  expect(splitSentences('no punctuation')).toEqual(['no punctuation']);
  expect(splitSentences('')).toEqual([]);
  expect(splitSentences('  एक।  दोन।  ')).toEqual(['एक।', 'दोन।']);
});
