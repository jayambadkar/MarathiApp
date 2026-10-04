/** Quiz fairness: stored options must render shuffled with the answer
 * index remapped, so the correct choice isn't pinned to one position.
 * Run: npm test  (from web/)
 */
import test from 'node:test'
import assert from 'node:assert/strict'

const { shuffleOptions } = await import('../src/lib/practice.js')

test('shuffleOptions remaps the answer to the shuffled position', () => {
  for (let a = 0; a < 4; a++) {
    const { options, answer } = shuffleOptions(['a', 'b', 'c', 'd'], a)
    assert.deepEqual([...options].sort(), ['a', 'b', 'c', 'd'])
    assert.equal(options[answer], ['a', 'b', 'c', 'd'][a])
  }
})

test('shuffleOptions stays correct with duplicate labels', () => {
  // Index-based remap: the right slot wins even when labels repeat.
  for (let i = 0; i < 50; i++) {
    const { options, answer } = shuffleOptions(['x', 'x', 'y'], 2)
    assert.equal(options[answer], 'y')
  }
})

test('shuffleOptions spreads the answer across positions', () => {
  const seen = new Set()
  for (let i = 0; i < 300; i++) seen.add(shuffleOptions(['a', 'b', 'c', 'd'], 0).answer)
  assert.equal(seen.size, 4, `answer stuck at ${[...seen]}`)
})
