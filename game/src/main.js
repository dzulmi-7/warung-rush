// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), the renderer paints, and world events are
// turned into sounds and HUD toasts. The game moves between five screens; the day flow lives
// in world.js, the drawing in render.js and ui.js.
//
// ?seed=N fixes the order deck. ?shot=start|play|rush|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, PALETTE, SCREEN_DAY_END, SCREEN_GAME_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, STEP, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { audio } from './audio.js';
import { createInput } from './input.js';
import { createRandom } from './random.js';
import { drawTitle, drawWorldScreen, fitTransform } from './render.js';
import { stageShot } from './shots.js';
import { advance, beginRun, createWorld, drainEvents, hudState, nextDay, startDay, wireWorldHelpers } from './world.js';
import { drawHud, makeToast } from './ui.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
wireWorldHelpers(world);
const input = createInput(canvas);
const toasts = [];

/** Keep the backing store at the window size and letterbox the fixed view into it. */
function resize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
}
window.addEventListener('resize', resize);
resize();

/** Read the best day score out of storage, if storage allows. */
function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

world.best = readBest();

/** Turn world events into sounds and floating HUD toasts at the chef's position. */
function reactToEvents(events) {
  for (const event of events) {
    switch (event.type) {
      case 'pick':
        audio.pick();
        break;
      case 'drop':
        audio.drop();
        break;
      case 'chop_tick':
        audio.chop();
        break;
      case 'cook_start':
        audio.sizzle();
        break;
      case 'plate_add':
        audio.plate();
        break;
      case 'served':
        audio.bell();
        audio.money();
        toasts.push(makeToast(`+$${event.points} ${event.dish.name}`, PALETTE.counterTop, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 40));
        break;
      case 'wrong_serve':
        audio.miss();
        toasts.push(makeToast('wrong dish!', PALETTE.accent, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 40));
        break;
      case 'burnt':
        audio.burn();
        toasts.push(makeToast('burnt!', PALETTE.accent, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 60));
        break;
      case 'miss':
        audio.miss();
        toasts.push(makeToast('customer left!', PALETTE.accent, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 90));
        break;
      case 'trash':
        audio.trash();
        break;
      case 'day_start':
        audio.day();
        break;
      default:
        break;
    }
  }
  // Toasts live for about 1.6 s; drop the dead ones so the list stays short.
  const now = Date.now();
  while (toasts.length && now - toasts[0].born > 1600) toasts.shift();
}

/** Handle the screens' edge-triggered keys: start, pause, next day, restart. */
function handleScreenKeys(frame) {
  if (world.screen === SCREEN_TITLE && (frame.nextPressed || frame.actionPressed)) {
    audio.unlock();
    beginRun(world);
  } else if (world.screen === SCREEN_PLAY && frame.pausePressed) {
    world.paused = !world.paused;
    world.screen = world.paused ? SCREEN_PAUSED : SCREEN_PLAY;
  } else if (world.screen === SCREEN_PAUSED && (frame.pausePressed || frame.nextPressed)) {
    world.paused = false;
    world.screen = SCREEN_PLAY;
  } else if (world.screen === SCREEN_DAY_END && frame.nextPressed) {
    if (world.victory) {
      saveBest(Math.max(world.best, world.score));
      world.best = Math.max(world.best, world.score);
      world.screen = SCREEN_TITLE;
    } else {
      nextDay(world);
    }
  } else if ((world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSED) && frame.restartPressed) {
    startDay(world, world.day);
  } else if (world.screen === SCREEN_GAME_OVER && frame.restartPressed) {
    startDay(world, world.day);
  }
}

/** One fixed simulation step, driven by the input read for this frame. */
function tick(frame) {
  handleScreenKeys(frame);
  if (world.screen === SCREEN_PLAY && !world.paused) {
    advance(world, frame, STEP);
  }
  reactToEvents(drainEvents(world));
}

/** Paint one frame: the world screen and, during play, the HUD over it. */
function paint(time) {
  const g = canvas.getContext('2d');
  const { scale, offsetX, offsetY } = fitTransform(canvas);
  g.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  g.fillStyle = PALETTE.night;
  g.fillRect(-offsetX / scale, -offsetY / scale, canvas.width / scale, canvas.height / scale);
  drawWorldScreen(g, world, time);
  if (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSED) {
    drawHud(g, hudState(world), toasts, time);
  }
}

/** The staged-screenshot path: build the scene, paint twice, signal the shooter. */
function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint2() {
    paint(scene.screen === SCREEN_TITLE ? 0 : world.dayTime);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint2);
    else window.__shotReady = true;
  }
  paint2();
}

/** The live path: the rAF loop with the fixed-step accumulator. */
function run() {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    acc += elapsed;
    const inputFrame = input.read();
    while (acc >= STEP) {
      tick(inputFrame);
      acc -= STEP;
    }
    paint(now / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else run();

// Announce the screen to screen readers, the starter's accessibility habit kept up.
setInterval(() => {
  if (world.screen === SCREEN_PLAY) {
    status.textContent = `Day ${world.day}, score $${world.score}, ${world.orders.length} orders waiting`;
  }
}, 2000);

// A read-only hook for scripts/smoke.mjs, which drives the world headlessly in Node.
window.__warung = world;
