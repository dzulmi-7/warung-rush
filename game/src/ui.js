// The heads-up display: the order board of customer tickets, the day clock, the score, the
// combo flame and the little toasts a served dish or a burnt pan pops up. The HUD is drawn on
// the same canvas above the kitchen band.

import { HUD_HEIGHT, MISSED_LIMIT, PALETTE, VIEW_WIDTH } from './config.js';
import { patienceColor, patienceFraction } from './orders.js';
import { drawIngredient, drawPlate } from './sprites.js';

/** The clock bar that drains across the day, with the served/target counter beside it. */
function drawClock(g, hud) {
  const barX = VIEW_WIDTH / 2 - 150;
  const barW = 300;
  g.fillStyle = 'rgba(20,12,8,0.55)';
  roundRect(g, barX, 14, barW, 16, 8);
  g.fill();
  const fraction = hud.dayFraction;
  g.fillStyle = fraction > 0.35 ? PALETTE.accent2 : PALETTE.accent;
  roundRect(g, barX + 2, 16, (barW - 4) * fraction, 12, 6);
  g.fill();
  g.fillStyle = PALETTE.paper;
  g.font = 'bold 15px sans-serif';
  g.textAlign = 'center';
  g.fillText(`Day ${hud.day} — serve ${hud.served}/${hud.target}`, barX + barW / 2, 46);
}

/** The score and combo flame on the right of the HUD. */
function drawScore(g, hud) {
  g.textAlign = 'right';
  g.fillStyle = PALETTE.paper;
  g.font = 'bold 26px sans-serif';
  g.fillText(`$${hud.score}`, VIEW_WIDTH - 26, 38);
  if (hud.combo > 1) {
    g.fillStyle = PALETTE.accent2;
    g.font = 'bold 15px sans-serif';
    g.fillText(`combo x${hud.combo}`, VIEW_WIDTH - 26, 60);
  }
  // Missed-customer hearts, filled for those already lost.
  for (let i = 0; i < MISSED_LIMIT; i += 1) {
    drawHeart(g, VIEW_WIDTH - 30 - i * 22, 78, i < hud.misses);
  }
}

/** A small heart: empty grey when the slot is unused, red when a customer was lost. */
function drawHeart(g, cx, cy, lost) {
  g.fillStyle = lost ? PALETTE.accent : 'rgba(255,255,255,0.25)';
  g.beginPath();
  g.moveTo(cx, cy + 4);
  g.bezierCurveTo(cx - 7, cy - 3, cx - 3, cy - 8, cx, cy - 3);
  g.bezierCurveTo(cx + 3, cy - 8, cx + 7, cy - 3, cx, cy + 4);
  g.fill();
}

/** The order board: up to five ticket cards, oldest first, each with dish art and patience. */
function drawOrderBoard(g, hud, time) {
  const shown = hud.orders.slice(0, 5);
  shown.forEach((order, i) => {
    const x = 16 + i * 128;
    const y = 12;
    const fraction = patienceFraction(order, hud.now);
    const urgent = fraction < 0.22;
    const shake = urgent ? Math.sin(time * 22) * 1.6 : 0;
    g.fillStyle = urgent && Math.sin(time * 14) > 0 ? PALETTE.accent : PALETTE.paper;
    roundRect(g, x + shake, y, 116, 78, 8);
    g.fill();
    g.strokeStyle = 'rgba(60,40,20,0.4)';
    g.stroke();
    g.fillStyle = PALETTE.ink;
    g.font = 'bold 12px sans-serif';
    g.textAlign = 'left';
    g.fillText(order.dish.name, x + 8, y + 18);
    g.font = '9px sans-serif';
    g.fillStyle = 'rgba(60,45,25,0.85)';
    g.fillText(order.dish.hint, x + 8, y + 30);
    // Dish parts preview, drawn in order along the card.
    order.dish.parts.forEach((part, j) => {
      drawIngredient(g, x + 16 + j * 26, y + 46, part.ingredient, part.kind, 0.62);
    });
    // Patience bar with a tiny clock face.
    g.fillStyle = 'rgba(0,0,0,0.18)';
    roundRect(g, x + 8, y + 62, 100, 8, 4);
    g.fill();
    g.fillStyle = patienceColor(order, hud.now);
    roundRect(g, x + 8, y + 62, Math.max(2, 100 * fraction), 8, 4);
    g.fill();
  });
}

/** Floating toast lines: served points, burnt pans, lost customers. */
function drawToasts(g, toasts) {
  toasts.forEach((toast) => {
    const age = (Date.now() - toast.born) / 1000;
    const alpha = Math.max(0, 1.6 - age);
    if (alpha <= 0) return;
    g.globalAlpha = Math.min(1, alpha);
    g.fillStyle = toast.color;
    g.font = 'bold 17px sans-serif';
    g.textAlign = 'center';
    g.fillText(toast.text, toast.x, toast.y - age * 26);
    g.globalAlpha = 1;
  });
}

/** One toast pushed by world events; the caller feeds back only the alive ones. */
export function makeToast(text, color, x, y) {
  return { text, color, x, y, born: Date.now() };
}

/** Round-rect helper shared with sprites via a local copy (canvas path, no return value). */
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Draw the whole HUD band. hud comes from world.hudState(), toasts from main's collector. */
export function drawHud(g, hud, toasts, time) {
  g.fillStyle = PALETTE.ink;
  g.fillRect(0, 0, VIEW_WIDTH, HUD_HEIGHT);
  g.fillStyle = PALETTE.wood;
  g.fillRect(0, HUD_HEIGHT - 6, VIEW_WIDTH, 6);
  drawOrderBoard(g, hud, time);
  drawClock(g, hud);
  drawScore(g, hud);
  drawToasts(g, toasts);
  if (hud.lastServed && hud.now - hud.lastServed.at < 1.2) {
    const dish = hud.lastServed.dish;
    drawPlate(g, VIEW_WIDTH / 2, HUD_HEIGHT - 14, { plate: true, parts: dish.parts }, 0.9);
  }
}
