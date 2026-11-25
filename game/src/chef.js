// The chef the player drives: position in tile units, facing, what they carry and the little
// bob that makes walking feel alive. Movement is continuous with collision against station
// tiles; actions.js decides what the facing tile means, chef.js only knows how to walk.

import { CHEF_SPEED, GRID_COLS, GRID_ROWS } from './config.js';

/** True when a grid tile blocks the chef (walls are off-grid; stations block). */
function tileBlocks(map, col, row) {
  if (col < 0 || row < 0 || col >= GRID_COLS || row >= GRID_ROWS) return true;
  const cell = map[row][col];
  return cell !== '.' && cell !== 'c';
}

/** Create the chef standing at the middle of the floor. */
export function createChef() {
  return {
    x: 4.5,
    y: 3.5,
    facingX: 0,
    facingY: 1,
    walking: false,
    bob: 0,
    held: null,
  };
}

/**
 * Advance the chef by an input vector (each component -1..1), sliding along blocked tiles.
 * With both axes pressed the vector is normalised so diagonal speed matches straight speed.
 */
export function moveChef(chef, map, inputX, inputY, seconds) {
  const length = Math.hypot(inputX, inputY);
  if (length === 0) {
    chef.walking = false;
    chef.bob = 0;
    return;
  }
  const step = CHEF_SPEED * seconds;
  const dx = (inputX / length) * step;
  const dy = (inputY / length) * step;
  chef.facingX = inputX;
  chef.facingY = inputY;

  if (dx !== 0) {
    const probe = chef.x + dx + Math.sign(dx) * 0.32;
    if (!tileBlocks(map, Math.floor(probe), Math.floor(chef.y))) chef.x += dx;
  }
  if (dy !== 0) {
    const probe = chef.y + dy + Math.sign(dy) * 0.32;
    if (!tileBlocks(map, Math.floor(chef.x), Math.floor(probe))) chef.y += dy;
  }
  chef.walking = true;
  chef.bob += seconds * 11;
}

/**
 * The tile the chef is interacting with: the station one tile ahead of them, or the tile they
 * stand on when nothing is ahead. Returns { col, row, cell } or null off the board.
 */
export function facingTile(chef, map) {
  const aheadCol = Math.floor(chef.x + chef.facingX * 0.85);
  const aheadRow = Math.floor(chef.y + chef.facingY * 0.85);
  if (aheadRow >= 0 && aheadRow < GRID_ROWS && aheadCol >= 0 && aheadCol < GRID_COLS) {
    const cell = map[aheadRow][aheadCol];
    if (cell !== '.') return { col: aheadCol, row: aheadRow, cell };
  }
  const col = Math.floor(chef.x);
  const row = Math.floor(chef.y);
  if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
    return { col, row, cell: map[row][col] };
  }
  return null;
}

/** Drop what the chef holds back into their hands' null state. */
export function clearHands(chef) {
  chef.held = null;
}
