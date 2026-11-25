// A tiny deterministic PRNG (mulberry32) so a day's order deck is replayable from one seed.
// The title screen draws the seed in the corner; a run's whole order stream follows from it.

/** Return a function that yields floats in [0, 1) from a 32-bit seed. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of an array with a random function. */
export function pickOne(random, items) {
  return items[Math.floor(random() * items.length)];
}
