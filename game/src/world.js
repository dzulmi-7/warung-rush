// The world: the kitchen map, every station on it, the chef, the order queue and the day clock.
// One call per tick, world.advance(), moves everything; screens and day flow live here so the
// loop in main.js stays thin. The map is a string grid — W wall, B bin, C counter, K board,
// w wok, p pot, r rice cooker, P plate stack, T trash, S serve window, . open floor.

import { GRID_COLS, GRID_ROWS, DAY_SECONDS, DAY_TARGETS, FIRST_ORDER_DELAY, MISSED_LIMIT, SCREEN_DAY_END, SCREEN_GAME_OVER, SCREEN_PLAY, SCREEN_TITLE, TOTAL_DAYS } from './config.js';
import { createChef, facingTile, moveChef } from './chef.js';
import { advanceStations, interact, stationKey } from './actions.js';
import { createOrder, isExpired, orderGap } from './orders.js';
import { createRandom } from './random.js';

/** The kitchen, rows top to bottom (verified reachable by scripts/check-map.mjs): woks, pot,
 * rice cooker and the rice bin along row 1 with a floor gap under each, tofu and chili bins at
 * the counter row's ends, the chef corridor row 3, and bins, boards, plates and trash row 4.
 * The serve window sits in the top wall above the row-1 gap at column 2. */
export const KITCHEN_MAP = [
  'WSWWWWWWWW',
  'w.wp.r.B..',
  'B.C.C.C..B',
  'B........B',
  '.BKPBCTKB.',
  'WWWWWWWWWW',
];

/** The ingredient each bin holds, by column and row. */
const BIN_INGREDIENTS = {
  '7,1': 'rice',
  '0,2': 'tofu',
  '9,2': 'chili',
  '0,3': 'garlic',
  '9,3': 'egg',
  '1,4': 'cabbage',
  '4,4': 'chicken',
  '8,4': 'noodle',
};

/** Build a station object for one map cell, or null for plain floor and walls. */
function makeStation(cell, col, row) {
  const binIngredient = BIN_INGREDIENTS[`${col},${row}`];
  switch (cell) {
    case 'B':
      return { type: 'bin', ingredient: binIngredient ?? 'rice' };
    case 'C':
      return { type: 'counter', item: null };
    case 'K':
      return { type: 'knife', item: null, progress: 0 };
    case 'w':
      return { type: 'wok', items: [], state: 'idle', timer: 0 };
    case 'p':
      return { type: 'pot', items: [], state: 'idle', timer: 0 };
    case 'r':
      return { type: 'rice', items: [], state: 'idle', timer: 0 };
    case 'P':
      return { type: 'plates' };
    case 'T':
      return { type: 'trash' };
    case 'S':
      return { type: 'serve' };
    default:
      return null;
  }
}

/** All stations of a fresh kitchen, keyed "col,row". */
export function createStations(map) {
  const stations = new Map();
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const station = makeStation(map[row][col], col, row);
      if (station) stations.set(stationKey(col, row), station);
    }
  }
  return stations;
}

/** Create a world at the title screen; startDay() resets the day state in place. */
export function createWorld(seed) {
  const map = KITCHEN_MAP.map((row) => row.split(''));
  const world = {
    map,
    stations: createStations(map),
    chef: createChef(),
    screen: SCREEN_TITLE,
    day: 1,
    dayTime: 0,
    score: 0,
    dayScore: 0,
    served: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    orders: [],
    events: [],
    nextOrderAt: FIRST_ORDER_DELAY,
    lastServed: null,
    victory: false,
    paused: false,
    seed,
    random: createRandom(seed),
  };
  return world;
}

/** Reset the day counters and spawn the first order clock; called on each day start. */
export function startDay(world, day) {
  world.day = day;
  world.dayTime = 0;
  world.dayScore = 0;
  world.served = 0;
  world.missed = 0;
  world.combo = 0;
  world.orders = [];
  world.events = [];
  world.nextOrderAt = FIRST_ORDER_DELAY;
  world.lastServed = null;
  world.victory = false;
  world.paused = false;
  world.chef.held = null;
  for (const station of world.stations.values()) {
    if (station.type === 'counter') station.item = null;
    if (station.type === 'knife') {
      station.item = null;
      station.progress = 0;
    }
    if (station.type === 'wok' || station.type === 'pot' || station.type === 'rice') {
      station.items = [];
      station.state = 'idle';
      station.timer = 0;
    }
  }
  world.screen = SCREEN_PLAY;
  world.events.push({ type: 'day_start', day });
}

/** How much of the day clock is left, 0 to 1. */
export function dayFraction(world) {
  return Math.max(0, 1 - world.dayTime / DAY_SECONDS);
}

/** The served-order count that clears the current day. */
export function dayTarget(day) {
  return DAY_TARGETS[Math.min(day, DAY_TARGETS.length) - 1];
}

/** The tile the chef is facing, exposed for actions.js and the renderer's highlight. */
export function wireWorldHelpers(world) {
  world.facingTile = () => facingTile(world.chef, world.map);
  world.facingStationIs = (station) => {
    const tile = facingTile(world.chef, world.map);
    return tile ? world.stations.get(stationKey(tile.col, tile.row)) === station : false;
  };
  world.interact = () => interact(world);
}

/**
 * Advance the world one fixed step. input carries the movement axes, whether the action button
 * is held (chopping) and a click target in tile units, if the mouse is driving.
 */
export function advance(world, input, seconds) {
  if (world.screen !== SCREEN_PLAY || world.paused) {
    world.events.length = 0;
    return;
  }
  world.dayTime += seconds;

  // Click-to-walk: steer toward the target tile until the chef stands on it.
  let ix = input.inputX;
  let iy = input.inputY;
  if (ix === 0 && iy === 0 && input.clickTarget) {
    const dx = input.clickTarget.x - world.chef.x;
    const dy = input.clickTarget.y - world.chef.y;
    if (Math.hypot(dx, dy) < 0.15) input.clickTarget = null;
    else {
      ix = dx;
      iy = dy;
    }
  }
  moveChef(world.chef, world.map, ix, iy, seconds);

  advanceStations(world, input.actionHeld, seconds);
  if (input.actionPressed) interact(world);

  // Orders: spawn on the ramping gap, expire into misses.
  const pressure = Math.min(1, world.served / Math.max(1, dayTarget(world.day)));
  if (world.dayTime >= world.nextOrderAt && world.orders.length < 5) {
    world.orders.push(createOrder(world.random, world.day, world.dayTime));
    const gap = orderGap(world.day, pressure);
    world.nextOrderAt = world.dayTime + gap * (0.8 + world.random() * 0.4);
  }
  for (let i = world.orders.length - 1; i >= 0; i -= 1) {
    if (isExpired(world.orders[i], world.dayTime)) {
      world.orders.splice(i, 1);
      world.missed += 1;
      world.combo = 0;
      world.events.push({ type: 'miss' });
    }
  }

  if (world.missed >= MISSED_LIMIT) {
    world.screen = SCREEN_GAME_OVER;
    world.events.push({ type: 'game_over' });
    return;
  }
  if (world.dayTime >= DAY_SECONDS || world.served >= dayTarget(world.day)) {
    world.victory = world.day >= TOTAL_DAYS;
    world.screen = SCREEN_DAY_END;
    world.score += Math.max(0, Math.round(dayFraction(world) * 60));
    world.events.push({ type: 'day_end' });
  }
}

/** Take and return the events queued this tick; audio and HUD read them. */
export function drainEvents(world) {
  const events = world.events;
  world.events = [];
  return events;
}

/** The day's HUD readout, everything ui.js needs in one object. */
export function hudState(world) {
  return {
    day: world.day,
    dayScore: world.dayScore,
    score: world.score,
    served: world.served,
    target: dayTarget(world.day),
    misses: world.missed,
    combo: world.combo,
    dayFraction: dayFraction(world),
    orders: world.orders,
    lastServed: world.lastServed,
  };
}

/** Start the run from the title screen: day one, score zero. */
export function beginRun(world) {
  world.score = 0;
  startDay(world, 1);
}

/** Move to the next day after a cleared one. */
export function nextDay(world) {
  startDay(world, world.day + 1);
}
