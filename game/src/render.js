// The renderer: paints the kitchen (floor, stations, chef, facing highlight) and the non-play
// screens (title, paused, day end, game over). It reads world state only; nothing here mutates.

import { GRID_COLS, GRID_ROWS, HUD_HEIGHT, PALETTE, SCREEN_DAY_END, SCREEN_GAME_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, TILE_PX, TOTAL_DAYS, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { drawBin, drawChef, drawCounter, drawKnifeBoard, drawPlate, drawPlateStack, drawPot, drawRiceCooker, drawServeWindow, drawTrash, drawWallBlock, drawWok, drawIngredient } from './sprites.js';

const T = TILE_PX;

/** Letterbox scale and offset that fit the fixed view inside the window. */
export function fitTransform(canvas) {
  const scale = Math.min(canvas.width / VIEW_WIDTH, canvas.height / VIEW_HEIGHT);
  return {
    scale,
    offsetX: (canvas.width - VIEW_WIDTH * scale) / 2,
    offsetY: (canvas.height - VIEW_HEIGHT * scale) / 2,
  };
}

/** The warm checked floor of the warung, one rect per tile. */
function drawFloor(g) {
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      g.fillStyle = (row + col) % 2 ? PALETTE.floor : PALETTE.floorChecker;
      g.fillRect(col * T, HUD_HEIGHT + row * T, T, T);
    }
  }
}

/** Every station tile, dispatching to its sprite by the map cell. */
function drawStations(g, world, time) {
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const cell = world.map[row][col];
      if (cell === '.' || cell === 'W') continue;
      const x = col * T;
      const y = HUD_HEIGHT + row * T;
      const station = world.stations.get(`${col},${row}`);
      switch (cell) {
        case 'W':
          drawWallBlock(g, x, y);
          break;
        case 'B':
          drawBin(g, x, y, station.ingredient);
          break;
        case 'C':
          drawCounter(g, x, y);
          if (station.item) {
            if (station.item.plate) drawPlate(g, x + T / 2, y + T / 2, station.item, 1);
            else drawIngredient(g, x + T / 2, y + T / 2, station.item.ingredient, station.item.kind, 0.95);
          }
          break;
        case 'K':
          drawKnifeBoard(g, x, y, station.item, station.progress);
          break;
        case 'w':
          drawWok(g, x, y, station, time);
          break;
        case 'p':
          drawPot(g, x, y, station, time);
          break;
        case 'r':
          drawRiceCooker(g, x, y, station);
          break;
        case 'P':
          drawPlateStack(g, x, y);
          break;
        case 'T':
          drawTrash(g, x, y);
          break;
        case 'S':
          drawServeWindow(g, x, y, time);
          break;
        default:
          break;
      }
    }
  }
}

/** The highlight ring on the tile the chef faces, with a label of the station under it. */
function drawFacingHighlight(g, world) {
  const tile = world.facingTile();
  if (!tile) return;
  const x = tile.col * T;
  const y = HUD_HEIGHT + tile.row * T;
  g.strokeStyle = 'rgba(255,235,180,0.85)';
  g.lineWidth = 3;
  g.strokeRect(x + 3, y + 3, T - 6, T - 6);
  g.lineWidth = 1;
}

/** The whole play scene: floor, stations, highlight, chef. */
export function drawPlay(g, world, time) {
  drawFloor(g);
  drawStations(g, world, time);
  drawFacingHighlight(g, world);
  drawChef(g, world.chef.x * T, HUD_HEIGHT + world.chef.y * T, world.chef, time);
}

/** Centre a headline and a list of sub-lines on a dimmed backdrop. */
function centrePanel(g, title, lines, tint) {
  g.fillStyle = tint;
  g.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  g.textAlign = 'center';
  g.fillStyle = PALETTE.paper;
  g.font = 'bold 54px sans-serif';
  g.fillText(title, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 60);
  g.font = '20px sans-serif';
  lines.forEach((line, i) => {
    g.fillText(line, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + i * 30 + 6);
  });
}

/** The title screen: the warung banner, the menu and the keys. */
export function drawTitle(g, best) {
  const sky = g.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, '#2c1a12');
  sky.addColorStop(1, PALETTE.night);
  g.fillStyle = sky;
  g.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  // A string of warung pennants across the top.
  for (let i = 0; i < 16; i += 1) {
    g.fillStyle = [PALETTE.accent, PALETTE.accent2, PALETTE.teal, PALETTE.counterTop][i % 4];
    g.beginPath();
    g.moveTo(i * 82, 0);
    g.lineTo(i * 82 + 70, 0);
    g.lineTo(i * 82 + 35, 54);
    g.closePath();
    g.fill();
  }
  g.textAlign = 'center';
  g.fillStyle = PALETTE.accent2;
  g.font = 'bold 88px sans-serif';
  g.fillText('DAPUR KILAT', VIEW_WIDTH / 2, 220);
  g.fillStyle = PALETTE.paper;
  g.font = '24px sans-serif';
  g.fillText('the street-food kitchen that never slows down', VIEW_WIDTH / 2, 262);
  g.font = '18px sans-serif';
  g.fillText('WASD or arrows to move — E or Space to act — mouse to click a tile', VIEW_WIDTH / 2, 330);
  g.fillText('take orders, cook the dish, plate it, ring the bell before patience runs out', VIEW_WIDTH / 2, 360);
  g.fillStyle = PALETTE.accent;
  roundRectFill(g, VIEW_WIDTH / 2 - 130, 420, 260, 54, 12);
  g.fillStyle = PALETTE.paper;
  g.font = 'bold 26px sans-serif';
  g.fillText('Press Enter to cook', VIEW_WIDTH / 2, 456);
  if (best > 0) {
    g.font = '18px sans-serif';
    g.fillStyle = PALETTE.plateShade;
    g.fillText(`best day score: $${best}`, VIEW_WIDTH / 2, 520);
  }
  // A decorative plate of the signature dish.
  drawPlate(g, VIEW_WIDTH / 2, 640, {
    plate: true,
    parts: [
      { ingredient: 'rice', kind: 'cooked' },
      { ingredient: 'egg', kind: 'raw' },
      { ingredient: 'chili', kind: 'chopped' },
    ],
  }, 2.6);
}

/** The paused veil. */
export function drawPaused(g) {
  centrePanel(g, 'Paused', ['Press P to keep cooking', 'Press R to restart the day'], 'rgba(20,12,8,0.6)');
}

/** Day end: the bill — served, lost, tips and the total. */
export function drawDayEnd(g, world, best) {
  centrePanel(
    g,
    world.victory ? 'Dapur Legend!' : `Day ${world.day} closed`,
    [
      `served ${world.served} orders — ${world.misses} customers lost`,
      `day score $${world.dayScore}  •  total $${world.score}`,
      world.victory
        ? 'you cooked all three days — press R to run it again'
        : 'press Enter for the next day — R to retry',
      `best: $${best}`,
    ],
    'rgba(24,16,10,0.72)',
  );
}

/** Game over: too many lost customers. */
export function drawGameOver(g, world, best) {
  centrePanel(
    g,
    'The warung is closed',
    [
      `${world.misses} customers walked out on day ${world.day}`,
      `total $${world.score} — best $${best}`,
      'press R to try the day again',
    ],
    'rgba(40,10,10,0.75)',
  );
}

/** The play screen: HUD is drawn by main after this, on top of the kitchen. */
export function drawWorldScreen(g, world, time) {
  switch (world.screen) {
    case SCREEN_PLAY:
    case SCREEN_PAUSED:
      drawPlay(g, world, time);
      if (world.screen === SCREEN_PAUSED) drawPaused(g);
      break;
    case SCREEN_TITLE:
      drawTitle(g, world.best);
      break;
    case SCREEN_DAY_END:
      drawDayEnd(g, world, world.best);
      break;
    case SCREEN_GAME_OVER:
      drawGameOver(g, world, world.best);
      break;
    default:
      break;
  }
}

/** Filled rounded rect (the fill-and-stroke variant sprites use for buttons). */
function roundRectFill(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
}
