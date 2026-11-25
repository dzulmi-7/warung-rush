// Input: the keyboard and the mouse, reduced to the three things the world wants — the movement
// axes, the action edge/hold and a click target in tile units. Mouse aim also turns the chef to
// face the pointer when the keys are idle, so clicking a bin picks from it.

import { GRID_COLS, GRID_ROWS, HUD_HEIGHT, TILE_PX } from './config.js';

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

const ACTION_KEYS = new Set(['KeyE', 'Space', 'Enter']);

/** Create the input reader; it owns its listeners and never mutates the world. */
export function createInput(canvas) {
  const state = {
    keys: new Set(),
    actionPressed: false,
    actionHeld: false,
    pausePressed: false,
    restartPressed: false,
    nextPressed: false,
    pointer: { x: 0, y: 0, inside: false },
    clickTarget: null,
  };

  function toView(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const offsetX = (rect.width - canvas.width * scale) / 2;
    const offsetY = (rect.height - canvas.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    state.keys.add(event.code);
    if (ACTION_KEYS.has(event.code)) state.actionPressed = true;
    if (event.code === 'KeyP' || event.code === 'Escape') state.pausePressed = true;
    if (event.code === 'KeyR') state.restartPressed = true;
    if (event.code === 'Enter' || event.code === 'Space') state.nextPressed = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => state.keys.delete(event.code));

  canvas.addEventListener('pointermove', (event) => {
    const view = toView(event);
    state.pointer.x = view.x;
    state.pointer.y = view.y;
    state.pointer.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    state.pointer.inside = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const view = toView(event);
    state.pointer.x = view.x;
    state.pointer.y = view.y;
    state.pointer.inside = true;
    state.pointer.down = true;
    const col = Math.floor(view.x / TILE_PX);
    const row = Math.floor((view.y - HUD_HEIGHT) / TILE_PX);
    if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      state.clickTarget = { x: col + 0.5, y: row + 0.5, cell: true };
      state.actionPressed = true;
    }
  });
  window.addEventListener('pointerup', () => {
    state.pointer.down = false;
  });

  /** Read this frame's input, clearing edge flags; the world receives the returned object. */
  function read() {
    let inputX = 0;
    let inputY = 0;
    for (const code of state.keys) {
      const move = MOVE_KEYS[code];
      if (move) {
        inputX += move[0];
        inputY += move[1];
      }
    }
    inputX = Math.max(-1, Math.min(1, inputX));
    inputY = Math.max(-1, Math.min(1, inputY));
    const frame = {
      inputX,
      inputY,
      actionPressed: state.actionPressed,
      actionHeld: state.actionHeld,
      pausePressed: state.pausePressed,
      restartPressed: state.restartPressed,
      nextPressed: state.nextPressed,
      pointer: state.pointer,
      clickTarget: state.clickTarget,
    };
    state.actionHeld = state.keys.has('KeyE') || state.keys.has('Space') || state.pointer.down === true;
    state.actionPressed = false;
    state.pausePressed = false;
    state.restartPressed = false;
    state.nextPressed = false;
    return frame;
  }

  return { read, state };
}
