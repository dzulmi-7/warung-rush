// Constants every other module reads: the board layout, the day clock, scoring and the palette.
// Keeping the numbers here makes tuning a one-file change and gives the rest of the code one
// vocabulary for the kitchen's shape.

/** Canvas backing size in pixels; the renderer letterboxes this into the window. */
export const VIEW_WIDTH = 800;
export const VIEW_HEIGHT = 584;

/** Fixed simulation step, seconds. main.js advances the world this much per tick. */
export const STEP = 1 / 60;

/** Kitchen grid: 10 columns x 6 rows of tiles, each TILE_PX square, under a 104px HUD band. */
export const GRID_COLS = 10;
export const GRID_ROWS = 6;
export const TILE_PX = 80;
export const HUD_HEIGHT = 104;

/** Movement speed in tiles per second; diagonals are clamped to the same speed. */
export const CHEF_SPEED = 5.2;

/** Seconds the whole day runs; the clock bar in the HUD drains across it. */
export const DAY_SECONDS = 180;

/** Orders the day starts with and the fastest new orders arrive at full pressure. */
export const FIRST_ORDER_DELAY = 3.5;
export const RUSH_ORDER_GAP = 14;

/** Patience seconds per order: full at day 1, a little tighter each day after. */
export const ORDER_PATIENCE = 75;

/** Seconds of hold before a wok's contents burn once cooked, and the burn penalty. */
export const BURN_SECONDS = 14;
export const BURN_SCORE_PENALTY = 40;

/** Serving an order scores its base value; the combo adds up to +50% for a no-miss streak. */
export const COMBO_STEP = 0.1;
export const COMBO_MAX_BONUS = 0.5;

/** Day goals: serve this many orders to clear the day; misses cost lives up to the cap. */
export const DAY_TARGETS = [6, 9, 12];
export const MISSED_LIMIT = 4;

/** Days the campaign runs; recipes unlock at the start of each one. */
export const TOTAL_DAYS = 3;

/** Ingredient bins, as the kitchen map lays them out. Each holds one kind forever. */
export const INGREDIENTS = ['rice', 'noodle', 'egg', 'chicken', 'tofu', 'chili', 'garlic', 'cabbage'];

/** Warm street-food palette: clay walls, banana-leaf counters, charcoal wok. */
export const PALETTE = {
  wall: '#8a4a32',
  wallShade: '#6e3a26',
  floor: '#d9a05b',
  floorChecker: '#c98c48',
  counter: '#3f7d4e',
  counterTop: '#54995f',
  counterEdge: '#2c5c38',
  wood: '#8c5a2b',
  woodDark: '#6b4320',
  metal: '#5a6472',
  metalDark: '#39404a',
  fire: '#ff8c2e',
  ember: '#ffd23e',
  smoke: '#4a4038',
  plate: '#f4efe6',
  plateShade: '#d8d2c4',
  ink: '#2b2118',
  paper: '#fdf6e3',
  accent: '#e2554a',
  accent2: '#f4b41a',
  teal: '#2e8f83',
  night: '#1b1420',
};

/** The five screens the loop moves between; render.js draws each one. */
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_DAY_END = 'day_end';
export const SCREEN_GAME_OVER = 'game_over';

/** Storage key of the best day score. */
export const BEST_KEY = 'dapur-kilat-best';
