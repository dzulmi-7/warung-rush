// The menu: every dish a customer can ask for, written as steps over the ingredient set.
// A dish is built by carrying ingredients and prepared parts on plates and pans; recipes.js is
// the one place that knows what "cooked", "chopped" and "assembled" mean for each item.

/** Kinds an ingredient item can be in while it moves through the kitchen. */
export const KIND_RAW = 'raw';
export const KIND_CHOPPED = 'chopped';
export const KIND_COOKED = 'cooked';
export const KIND_BURNT = 'burnt';

/** How long chopping an ingredient takes, in seconds of hold at the board. */
export const CHOP_SECONDS = 1.6;

/** How long frying or boiling takes once the pan or pot holds its items. */
export const COOK_SECONDS = 3.2;

/** Ingredients that may be chopped; everything else goes straight to a pan or pot. */
export const CHOPPABLE = new Set(['chicken', 'chili', 'garlic', 'cabbage', 'tofu']);

/**
 * The dishes, in the order the days unlock them.
 * steps: the item kinds the assembled plate must hold, in any stacking order;
 * the names of the parts use ingredient ids plus their prepared kind.
 */
export const DISHES = [
  {
    id: 'nasi_goreng',
    name: 'Nasi Goreng',
    price: 12,
    day: 1,
    parts: [
      { ingredient: 'rice', kind: KIND_COOKED },
      { ingredient: 'garlic', kind: KIND_CHOPPED },
      { ingredient: 'egg', kind: KIND_RAW },
    ],
    hint: 'rice + garlic, fried, egg on top',
  },
  {
    id: 'mie_goreng',
    name: 'Mie Goreng',
    price: 14,
    day: 1,
    parts: [
      { ingredient: 'noodle', kind: KIND_COOKED },
      { ingredient: 'cabbage', kind: KIND_CHOPPED },
    ],
    hint: 'noodles boiled, fried with cabbage',
  },
  {
    id: 'ayam_sambal',
    name: 'Ayam Sambal',
    price: 18,
    day: 2,
    parts: [
      { ingredient: 'chicken', kind: KIND_COOKED },
      { ingredient: 'chili', kind: KIND_CHOPPED },
      { ingredient: 'garlic', kind: KIND_CHOPPED },
    ],
    hint: 'fried chicken with sambal on the side',
  },
  {
    id: 'tahu_cecek',
    name: 'Tahu Cecek',
    price: 15,
    day: 2,
    parts: [
      { ingredient: 'tofu', kind: KIND_COOKED },
      { ingredient: 'chili', kind: KIND_CHOPPED },
      { ingredient: 'cabbage', kind: KIND_CHOPPED },
    ],
    hint: 'fried tofu, sambal cabbage salad',
  },
  {
    id: 'nasi_campur',
    name: 'Nasi Campur',
    price: 24,
    day: 3,
    parts: [
      { ingredient: 'rice', kind: KIND_COOKED },
      { ingredient: 'chicken', kind: KIND_COOKED },
      { ingredient: 'tofu', kind: KIND_COOKED },
      { ingredient: 'cabbage', kind: KIND_CHOPPED },
    ],
    hint: 'the full plate: rice, chicken, tofu, veg',
  },
];

/** The dishes a given day (1-based) may draw orders from. */
export function dishesForDay(day) {
  return DISHES.filter((dish) => dish.day <= day);
}

/** True when a plate's stacked parts exactly satisfy a dish's recipe. */
export function plateMatchesDish(parts, dish) {
  if (parts.length !== dish.parts.length) return false;
  const want = [...dish.parts];
  for (const part of parts) {
    const at = want.findIndex(
      (w) => w.ingredient === part.ingredient && w.kind === part.kind,
    );
    if (at === -1) return false;
    want.splice(at, 1);
  }
  return true;
}

/** The dish a plate satisfies, or null. orders.js calls this the moment a plate is served. */
export function matchPlateToDish(parts, day) {
  for (const dish of dishesForDay(day)) {
    if (plateMatchesDish(parts, dish)) return dish;
  }
  return null;
}
