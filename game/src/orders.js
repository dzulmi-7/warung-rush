// The order board: customer tickets with their dish, patience bar and price. Orders arrive on a
// ramping clock, expire into misses, and are matched served plates first-come. world.js owns the
// queue; this module creates and advances the tickets and knows the reward maths.

import { COMBO_MAX_BONUS, COMBO_STEP, ORDER_PATIENCE, PALETTE } from './config.js';
import { dishesForDay } from './recipes.js';
import { pickOne } from './random.js';

/** Seconds between new orders at pressure p in [0, 1] for a day, day 1-based. */
export function orderGap(day, pressure) {
  const base = Math.max(8, 16 - day * 2.2);
  return base + (1 - pressure) * 10;
}

/** Patience seconds an order starts with on a day; later days read the clock faster. */
export function patienceForDay(day) {
  return ORDER_PATIENCE - (day - 1) * 9;
}

/** Create an order ticket for a dish, stamped with when it arrived (seconds since day start). */
export function createOrder(random, day, now) {
  const dish = pickOne(random, dishesForDay(day));
  return {
    id: `${dish.id}-${Math.floor(now * 1000)}-${Math.floor(random() * 9999)}`,
    dish,
    arrivedAt: now,
    patience: patienceForDay(day),
  };
}

/** The fraction of patience an order has left, 0 to 1. */
export function patienceFraction(order, now) {
  return Math.max(0, 1 - (now - order.arrivedAt) / order.patience);
}

/** True when the order has outlived its patience. */
export function isExpired(order, now) {
  return now - order.arrivedAt >= order.patience;
}

/** Score for serving an order: base price plus a tip for patience left and a combo bonus. */
export function scoreFor(order, now, combo) {
  const price = order.dish.price;
  const tip = Math.round(price * 0.5 * patienceFraction(order, now));
  const bonus = Math.min(COMBO_MAX_BONUS, combo * COMBO_STEP);
  return Math.max(1, Math.round(price * (1 + bonus))) + tip;
}

/** The color a patience bar should draw at its current fraction. */
export function patienceColor(order, now) {
  const fraction = patienceFraction(order, now);
  if (fraction > 0.5) return PALETTE.counterTop;
  if (fraction > 0.22) return PALETTE.accent2;
  return PALETTE.accent;
}
