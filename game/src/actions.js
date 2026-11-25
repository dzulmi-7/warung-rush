// The one interact verb: the single action the chef performs at the tile they face. Pick up from
// bins, plates and counters; put down on counters, boards and cook stations; chop at the board;
// assemble on a plate; serve at the window; trash a mistake. world.js calls interact() and
// advanceBoard() each tick; the rules of "what a station accepts" live here.

import { BURN_SECONDS } from './config.js';
import { CHOPPABLE, CHOP_SECONDS, COOK_SECONDS, KIND_BURNT, KIND_CHOPPED, KIND_COOKED, KIND_RAW, plateMatchesDish } from './recipes.js';
import { scoreFor } from './orders.js';

/** True when the item is an ingredient in raw or prepared form (never a plate). */
function isIngredient(item) {
  return item && !item.plate;
}

/** A fresh raw ingredient picked from a bin. */
function rawItem(ingredient) {
  return { ingredient, kind: KIND_RAW };
}

/** An empty plate waiting for parts. */
function emptyPlate() {
  return { plate: true, parts: [] };
}

/** The key a station sits under in world.stations. */
export function stationKey(col, row) {
  return `${col},${row}`;
}

/**
 * Perform the chef's action at the tile they face. Emits events into world.events for the
 * audio layer and HUD toasts: pick, drop, chop_tick, cook_start, serve, wrong_serve, trash.
 */
export function interact(world) {
  const tile = world.facingTile();
  if (!tile) return;
  const station = world.stations.get(stationKey(tile.col, tile.row));
  if (!station) return;
  const chef = world.chef;
  const held = chef.held;

  if (station.type === 'bin') {
    if (!held) {
      chef.held = rawItem(station.ingredient);
      world.events.push({ type: 'pick' });
    }
    return;
  }

  if (station.type === 'plates') {
    if (!held) {
      chef.held = emptyPlate();
      world.events.push({ type: 'pick' });
    }
    return;
  }

  if (station.type === 'counter') {
    if (!held && station.item) {
      chef.held = station.item;
      station.item = null;
      world.events.push({ type: 'pick' });
    } else if (held && !station.item) {
      station.item = held;
      chef.held = null;
      world.events.push({ type: 'drop' });
    } else if (held && station.item) {
      // Combine: item onto a plate on the counter, or a plate onto an item held above it.
      if (held.plate && isIngredient(station.item)) {
        addToPlate(world, held, station.item);
        station.item = null;
      } else if (station.item.plate && isIngredient(held)) {
        addToPlate(world, station.item, held);
        chef.held = null;
      }
    }
    return;
  }

  if (station.type === 'knife') {
    if (!held && station.item) {
      chef.held = station.item;
      station.item = null;
      station.progress = 0;
      world.events.push({ type: 'pick' });
    } else if (held && isIngredient(held) && !station.item && CHOPPABLE.has(held.ingredient) && held.kind === KIND_RAW) {
      station.item = held;
      station.progress = 0;
      chef.held = null;
      world.events.push({ type: 'drop' });
    }
    return;
  }

  if (station.type === 'wok' || station.type === 'pot' || station.type === 'rice') {
    if (!held && station.items.length > 0) {
      chef.held = station.items.pop();
      station.state = 'idle';
      station.timer = 0;
      world.events.push({ type: 'pick' });
      if (chef.held.kind === KIND_BURNT) world.events.push({ type: 'burnt_taken' });
    } else if (held && isIngredient(held) && acceptsInto(station, held) && station.items.length < 2) {
      station.items.push(held);
      chef.held = null;
      if (station.state === 'idle') {
        station.state = 'cooking';
        station.timer = 0;
        world.events.push({ type: 'cook_start' });
      } else if (station.state === 'burnt') {
        station.state = 'cooking';
        station.timer = 0;
        station.items = [held];
        world.events.push({ type: 'cook_start' });
      }
    }
    return;
  }

  if (station.type === 'trash') {
    if (held) {
      chef.held = null;
      world.events.push({ type: 'trash' });
    }
    return;
  }

  if (station.type === 'serve') {
    if (held && held.plate && held.parts.length > 0) {
      servePlate(world, held);
    }
    return;
  }
}

/** Whether a cook station takes this item: the rice cooker only takes raw rice. */
function acceptsInto(station, item) {
  if (item.kind === KIND_BURNT) return false;
  if (station.type === 'rice') return item.ingredient === 'rice' && item.kind === KIND_RAW;
  return true;
}

/** Put one prepared ingredient onto a plate, oldest stack order preserved for the sprite. */
function addToPlate(world, plate, item) {
  if (item.kind === KIND_BURNT) {
    world.events.push({ type: 'burnt_refused' });
    return;
  }
  plate.parts.push({ ingredient: item.ingredient, kind: item.kind });
  world.events.push({ type: 'plate_add' });
}

/** Serve a plate at the window: match the oldest fitting order, else refuse and keep the plate. */
function servePlate(world, plate) {
  const now = world.dayTime;
  let orderIndex = -1;
  for (let i = 0; i < world.orders.length; i += 1) {
    const order = world.orders[i];
    if (plateMatchesDish(plate.parts, order.dish)) {
      orderIndex = i;
      break;
    }
  }
  if (orderIndex === -1) {
    world.events.push({ type: 'wrong_serve' });
    return;
  }
  world.chef.held = null;
  const [order] = world.orders.splice(orderIndex, 1);
  const gained = scoreFor(order, now, world.combo);
  world.score += gained;
  world.dayScore += gained;
  world.served += 1;
  world.combo += 1;
  world.lastServed = { dish: order.dish, points: gained, at: now };
  world.events.push({ type: 'served', dish: order.dish, points: gained });
}

/**
 * Advance every station one tick: chop progress while the chef holds the action at a board,
 * cook timers, and the slide from done into burnt. Returns nothing; events carry the sounds.
 */
export function advanceStations(world, acting, seconds) {
  for (const station of world.stations.values()) {
    if (station.type === 'knife' && station.item) {
      if (acting && world.facingStationIs(station)) {
        const before = station.progress;
        station.progress = Math.min(1, station.progress + seconds / CHOP_SECONDS);
        if (Math.floor(before * 4) !== Math.floor(station.progress * 4)) {
          world.events.push({ type: 'chop_tick' });
        }
        if (station.progress >= 1) {
          station.item = { ingredient: station.item.ingredient, kind: KIND_CHOPPED };
        }
      }
    } else if (station.state === 'cooking') {
      station.timer += seconds;
      if (station.timer >= COOK_SECONDS) {
        station.state = 'done';
        for (const item of station.items) item.kind = KIND_COOKED;
        world.events.push({ type: 'cook_done' });
      }
    } else if (station.state === 'done') {
      station.timer += seconds;
      if (station.timer >= BURN_SECONDS) {
        station.state = 'burnt';
        for (const item of station.items) item.kind = KIND_BURNT;
        world.events.push({ type: 'burnt' });
      }
    }
  }
}

/** Clear a knife board the chef walked away from mid-chop: the board keeps its progress. */
export function leaveBoard(world) {
  // Boards keep progress by design; a second chef would resume it. Single chef: nothing to do.
}
