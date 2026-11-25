// The kitchen's art, drawn in code: every station, ingredient and plate is a canvas routine, so
// the game ships no image files and the look stays one palette. Each function draws centred in
// an 80px tile with a small ground shadow; render.js and ui.js call them.

import { PALETTE, TILE_PX } from './config.js';

const T = TILE_PX;

/** Round the corners of a rect path helper. */
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Soft ellipse shadow under everything drawn on the floor. */
function shadow(g, cx, cy, rx, ry) {
  g.fillStyle = 'rgba(30, 18, 10, 0.28)';
  g.beginPath();
  g.ellipse(cx, cy + 6, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

/** A clay tile wall block, the back row behind the serve window. */
export function drawWallBlock(g, x, y) {
  g.fillStyle = PALETTE.wall;
  g.fillRect(x, y, T, T);
  g.fillStyle = PALETTE.wallShade;
  g.fillRect(x, y + T - 10, T, 10);
  g.strokeStyle = 'rgba(0,0,0,0.14)';
  g.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
}

/** A wooden counter tile with a banana-leaf top. */
export function drawCounter(g, x, y) {
  shadow(g, x + T / 2, y + T / 2, T / 2 - 4, T / 2 - 6);
  g.fillStyle = PALETTE.woodDark;
  roundRect(g, x + 3, y + 6, T - 6, T - 12, 7);
  g.fill();
  g.fillStyle = PALETTE.counter;
  roundRect(g, x + 5, y + 4, T - 10, T - 16, 6);
  g.fill();
  g.fillStyle = PALETTE.counterTop;
  roundRect(g, x + 9, y + 7, T - 18, T - 26, 5);
  g.fill();
  g.strokeStyle = 'rgba(20,40,20,0.35)';
  g.beginPath();
  g.moveTo(x + 12, y + 16);
  g.quadraticCurveTo(x + T / 2, y + 22, x + T - 12, y + 16);
  g.stroke();
}

/** A crate bin holding one ingredient kind, drawn with a label swatch of the food. */
export function drawBin(g, x, y, ingredient, cooked) {
  drawCounter(g, x, y);
  g.fillStyle = PALETTE.wood;
  roundRect(g, x + 12, y + 14, T - 24, T - 34, 5);
  g.fill();
  g.strokeStyle = PALETTE.woodDark;
  g.lineWidth = 2;
  g.stroke();
  drawIngredient(g, x + T / 2, y + T / 2 + 2, ingredient, 'raw', 0.9);
  g.fillStyle = PALETTE.paper;
  g.fillRect(x + 14, y + 8, T - 28, 9);
  g.fillStyle = PALETTE.ink;
  g.font = '8px sans-serif';
  g.textAlign = 'center';
  g.fillText(ingredient.slice(0, 7).toUpperCase(), x + T / 2, y + 15);
  g.lineWidth = 1;
}

/** The knife board: a pale board with a cleaver; progress shown as chop marks. */
export function drawKnifeBoard(g, x, y, item, progress) {
  drawCounter(g, x, y);
  g.fillStyle = '#e8dcc3';
  roundRect(g, x + 8, y + 10, T - 16, T - 24, 5);
  g.fill();
  g.strokeStyle = PALETTE.woodDark;
  g.stroke();
  if (item) drawIngredient(g, x + T / 2, y + T / 2, item.ingredient, item.kind, 1);
  if (progress > 0) {
    g.strokeStyle = 'rgba(60,30,10,0.55)';
    for (let i = 0; i < Math.floor(progress * 5); i += 1) {
      g.beginPath();
      g.moveTo(x + 16 + i * 10, y + 18);
      g.lineTo(x + 20 + i * 10, y + 30);
      g.stroke();
    }
  }
  g.fillStyle = PALETTE.metal;
  g.fillRect(x + T - 22, y + 8, 6, 26);
  g.fillStyle = PALETTE.metalDark;
  g.fillRect(x + T - 21, y + 4, 4, 6);
}

/** A wok over a burner. state: idle, cooking, done, burnt — flames and steam follow it. */
export function drawWok(g, x, y, station, time) {
  drawCounter(g, x, y);
  g.fillStyle = PALETTE.metalDark;
  g.beginPath();
  g.arc(x + T / 2, y + T / 2 + 4, T / 2 - 10, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = station.state === 'burnt' ? '#1d1712' : '#2f333b';
  g.beginPath();
  g.arc(x + T / 2, y + T / 2 + 2, T / 2 - 14, 0, Math.PI * 2);
  g.fill();
  if (station.state === 'cooking' || station.state === 'done') {
    const flame = station.state === 'cooking' ? 1 : 0.35;
    for (let i = 0; i < 5; i += 1) {
      const fx = x + 18 + i * 11;
      const fh = (6 + Math.sin(time * 14 + i * 1.7) * 3) * flame;
      g.fillStyle = i % 2 ? PALETTE.fire : PALETTE.ember;
      g.beginPath();
      g.moveTo(fx - 4, y + T - 16);
      g.quadraticCurveTo(fx, y + T - 16 - fh * 2.4, fx + 4, y + T - 16);
      g.fill();
    }
  }
  if (station.items.length > 0) {
    const n = station.items.length;
    station.items.forEach((item, i) => {
      const ox = n === 1 ? 0 : i === 0 ? -10 : 10;
      drawIngredient(g, x + T / 2 + ox, y + T / 2 - 4, item.ingredient, item.kind, 0.8);
    });
  }
  if (station.state === 'cooking') {
    g.fillStyle = 'rgba(250,240,220,0.5)';
    for (let i = 0; i < 3; i += 1) {
      const sx = x + T / 2 + Math.sin(time * 3 + i * 2) * 8;
      const sy = y + 14 - ((time * 30 + i * 18) % 30);
      g.beginPath();
      g.arc(sx, sy, 3 + i, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** A stock pot, bubbling when cooking. */
export function drawPot(g, x, y, station, time) {
  drawCounter(g, x, y);
  g.fillStyle = PALETTE.metal;
  roundRect(g, x + 14, y + 18, T - 28, T - 34, 6);
  g.fill();
  g.fillStyle = PALETTE.metalDark;
  g.fillRect(x + 12, y + 16, T - 24, 7);
  g.fillStyle = station.state === 'burnt' ? '#241a10' : '#e9e2d2';
  g.beginPath();
  g.ellipse(x + T / 2, y + 22, T / 2 - 20, 6, 0, 0, Math.PI * 2);
  g.fill();
  if (station.state === 'cooking') {
    g.fillStyle = 'rgba(255,255,255,0.65)';
    for (let i = 0; i < 3; i += 1) {
      const bx = x + 30 + i * 10;
      const by = y + 20 - Math.abs(Math.sin(time * 5 + i)) * 8;
      g.beginPath();
      g.arc(bx, by, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (station.items.length > 0) {
    station.items.forEach((item, i) => {
      drawIngredient(g, x + T / 2 + (i === 0 ? -9 : 9), y + T / 2 + 4, item.ingredient, item.kind, 0.7);
    });
  }
}

/** The rice cooker: a rounded metal drum with a warm light when cooking. */
export function drawRiceCooker(g, x, y, station) {
  drawCounter(g, x, y);
  g.fillStyle = PALETTE.teal;
  roundRect(g, x + 14, y + 12, T - 28, T - 26, 12);
  g.fill();
  g.fillStyle = PALETTE.metalDark;
  g.fillRect(x + 12, y + T - 26, T - 24, 8);
  g.fillStyle = station.state === 'cooking' ? PALETTE.ember : '#20303a';
  g.beginPath();
  g.arc(x + T / 2, y + 30, 7, 0, Math.PI * 2);
  g.fill();
  if (station.items.length > 0) {
    drawIngredient(g, x + T / 2, y + T / 2 + 2, 'rice', station.items[0].kind, 0.75);
  }
}

/** The plate stack: clean plates waiting to be taken. */
export function drawPlateStack(g, x, y, held) {
  drawCounter(g, x, y);
  for (let i = 0; i < 3; i += 1) {
    g.fillStyle = i === 2 ? PALETTE.plate : PALETTE.plateShade;
    g.beginPath();
    g.ellipse(x + T / 2, y + T / 2 + 8 - i * 5, T / 2 - 16, T / 3 - 10, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (held) {
    g.fillStyle = PALETTE.ink;
    g.font = 'bold 11px sans-serif';
    g.textAlign = 'center';
    g.fillText('E', x + T / 2, y + 18);
  }
}

/** The trash bin: dented metal with a lid ajar. */
export function drawTrash(g, x, y) {
  shadow(g, x + T / 2, y + T / 2, T / 2 - 8, T / 2 - 10);
  g.fillStyle = PALETTE.metalDark;
  roundRect(g, x + 18, y + 22, T - 36, T - 34, 4);
  g.fill();
  g.fillStyle = PALETTE.metal;
  roundRect(g, x + 14, y + 14, T - 28, 10, 4);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.beginPath();
  g.moveTo(x + 26, y + 28);
  g.lineTo(x + 24, y + T - 20);
  g.moveTo(x + T / 2, y + 28);
  g.lineTo(x + T / 2, y + T - 20);
  g.moveTo(x + T - 26, y + 28);
  g.lineTo(x + T - 24, y + T - 20);
  g.stroke();
}

/** The serve window: a hatch in the wall with a bell; served plates leave here. */
export function drawServeWindow(g, x, y, time) {
  g.fillStyle = PALETTE.wall;
  g.fillRect(x, y, T, T);
  g.fillStyle = PALETTE.woodDark;
  g.fillRect(x + 4, y + 12, T - 8, T - 30);
  g.fillStyle = PALETTE.night;
  g.fillRect(x + 8, y + 16, T - 16, T - 40);
  g.fillStyle = PALETTE.accent2;
  g.beginPath();
  g.arc(x + T / 2, y + T - 22, 8 + Math.sin(time * 3) * 1.2, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PALETTE.ink;
  g.beginPath();
  g.moveTo(x + T / 2, y + T - 30);
  g.lineTo(x + T / 2, y + T - 14);
  g.stroke();
  g.fillStyle = PALETTE.paper;
  g.font = 'bold 10px sans-serif';
  g.textAlign = 'center';
  g.fillText('SERVE', x + T / 2, y + 30);
}

/** The chef: a round-faced cook in a white apron and peci cap, with a walking bob. */
export function drawChef(g, cx, cy, chef, time) {
  const bob = chef.walking ? Math.abs(Math.sin(chef.bob)) * 3 : Math.sin(time * 2) * 1;
  shadow(g, cx, cy + 12, 16, 7);
  const y = cy - bob;
  // legs
  g.strokeStyle = '#31445c';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(cx - 6, y + 8);
  g.lineTo(cx - 6 - (chef.walking ? Math.sin(chef.bob) * 3 : 0), y + 14);
  g.moveTo(cx + 6, y + 8);
  g.lineTo(cx + 6 + (chef.walking ? Math.sin(chef.bob) * 3 : 0), y + 14);
  g.stroke();
  g.lineWidth = 1;
  // body: white jacket
  g.fillStyle = '#f2ede2';
  roundRect(g, cx - 13, y - 6, 26, 18, 6);
  g.fill();
  g.strokeStyle = 'rgba(60,50,40,0.5)';
  g.stroke();
  // apron stripe
  g.fillStyle = PALETTE.accent;
  g.fillRect(cx - 8, y + 2, 16, 4);
  // head
  g.fillStyle = '#e8b98a';
  g.beginPath();
  g.arc(cx, y - 14, 10, 0, Math.PI * 2);
  g.fill();
  // peci cap (black felt cap)
  g.fillStyle = '#1c1c22';
  g.beginPath();
  g.ellipse(cx, y - 20, 9, 6, 0, Math.PI, 0);
  g.fill();
  g.fillRect(cx - 9, y - 21, 18, 4);
  // face: eyes look toward facing
  g.fillStyle = PALETTE.ink;
  const ex = chef.facingX * 2.5;
  const ey = chef.facingY * 2.5;
  g.beginPath();
  g.arc(cx - 3.5 + ex, y - 13 + ey, 1.6, 0, Math.PI * 2);
  g.arc(cx + 3.5 + ex, y - 13 + ey, 1.6, 0, Math.PI * 2);
  g.fill();
  // held item above the head
  if (chef.held) {
    g.save();
    g.translate(cx, y - 34);
    if (chef.held.plate) drawPlate(g, 0, 0, chef.held, 0.85);
    else drawIngredient(g, 0, 0, chef.held.ingredient, chef.held.kind, 1);
    g.restore();
  }
}

/** Draw one ingredient by kind: raw, chopped (slices), cooked (browned) or burnt. */
export function drawIngredient(g, cx, cy, ingredient, kind, scale) {
  g.save();
  g.translate(cx, cy);
  g.scale(scale, scale);
  shadow(g, 0, 8, 10, 4);
  if (kind === 'chopped') {
    drawChopped(g, ingredient);
    g.restore();
    return;
  }
  const tone = kind === 'burnt' ? 0 : kind === 'cooked' ? 1 : 0.5;
  switch (ingredient) {
    case 'rice':
      g.fillStyle = kind === 'cooked' ? '#f8f4ea' : '#efe9dc';
      g.beginPath();
      g.ellipse(0, 2, 12, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.08)';
      for (let i = 0; i < 4; i += 1) {
        g.fillRect(-8 + i * 4, -1, 2, 4);
      }
      break;
    case 'noodle':
      g.strokeStyle = kind === 'cooked' ? '#e8c766' : '#f0dda4';
      g.lineWidth = 2.4;
      for (let i = 0; i < 4; i += 1) {
        g.beginPath();
        g.arc(0, 2, 8 - i * 2, 0.4, Math.PI * 1.6);
        g.stroke();
      }
      g.lineWidth = 1;
      break;
    case 'egg':
      g.fillStyle = '#f7f2e2';
      g.beginPath();
      g.ellipse(0, 2, 10, 7, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = PALETTE.accent2;
      g.beginPath();
      g.arc(0, 1, 4, 0, Math.PI * 2);
      g.fill();
      break;
    case 'chicken':
      g.fillStyle = tone === 1 ? '#c98a4b' : '#e5b98a';
      roundRect(g, -10, -4, 20, 12, 5);
      g.fill();
      g.fillStyle = '#f4e6d4';
      g.beginPath();
      g.arc(9, 4, 3.4, 0, Math.PI * 2);
      g.fill();
      if (tone === 1) {
        g.strokeStyle = 'rgba(90,45,10,0.5)';
        g.beginPath();
        g.moveTo(-6, -1);
        g.lineTo(4, 4);
        g.stroke();
      }
      break;
    case 'tofu':
      g.fillStyle = tone === 1 ? '#d8b06a' : '#f3e7c8';
      roundRect(g, -9, -6, 18, 13, 3);
      g.fill();
      g.strokeStyle = 'rgba(120,90,30,0.35)';
      g.strokeRect(-5, -3, 4, 4);
      g.strokeRect(1, 1, 4, 4);
      break;
    case 'chili':
      g.strokeStyle = tone === 1 ? '#7a2c14' : '#c8402c';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-9, 4);
      g.quadraticCurveTo(0, -8, 10, 2);
      g.stroke();
      g.lineWidth = 1;
      g.fillStyle = '#3f7d4e';
      g.beginPath();
      g.ellipse(10, 2, 3, 2, 0.6, 0, Math.PI * 2);
      g.fill();
      break;
    case 'garlic':
      g.fillStyle = '#f1e9dc';
      g.beginPath();
      g.moveTo(0, -8);
      g.quadraticCurveTo(9, -2, 7, 6);
      g.lineTo(-7, 6);
      g.quadraticCurveTo(-9, -2, 0, -8);
      g.fill();
      g.strokeStyle = 'rgba(120,100,70,0.4)';
      g.beginPath();
      g.moveTo(0, -7);
      g.lineTo(0, 6);
      g.stroke();
      break;
    case 'cabbage':
      g.fillStyle = '#a8c66c';
      g.beginPath();
      g.arc(0, 2, 10, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#7fa24a';
      g.beginPath();
      g.arc(0, 2, 6, 0.5, Math.PI * 1.7);
      g.stroke();
      break;
    default:
      g.fillStyle = '#cbb';
      g.beginPath();
      g.arc(0, 0, 8, 0, Math.PI * 2);
      g.fill();
  }
  if (tone === 0) {
    g.fillStyle = 'rgba(25,18,10,0.75)';
    g.beginPath();
    g.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
    g.fill();
  } else if (tone === 1) {
    g.fillStyle = 'rgba(180,110,40,0.2)';
    g.beginPath();
    g.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** Chopped form: a little pile of slices, tinted by the ingredient. */
function drawChopped(g, ingredient) {
  const colors = {
    chicken: '#e0a468',
    chili: '#c8402c',
    garlic: '#efe6d4',
    cabbage: '#a8c66c',
    tofu: '#f3e7c8',
  };
  g.fillStyle = colors[ingredient] ?? '#d8ccb0';
  for (let i = 0; i < 5; i += 1) {
    const px = -8 + (i % 3) * 7;
    const py = i < 3 ? 2 : -4;
    roundRect(g, px, py, 6, 4, 2);
    g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,0.15)';
  g.fillRect(-9, 7, 18, 2);
}

/** A plate with its stacked parts drawn as a little tower of food. */
export function drawPlate(g, cx, cy, plate, scale) {
  g.save();
  g.translate(cx, cy);
  g.scale(scale, scale);
  shadow(g, 0, 8, 13, 5);
  g.fillStyle = PALETTE.plate;
  g.beginPath();
  g.ellipse(0, 3, 15, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PALETTE.plateShade;
  g.stroke();
  plate.parts.forEach((part, i) => {
    drawIngredient(g, -6 + i * 7, -2 - i * 4, part.ingredient, part.kind, 0.62);
  });
  g.restore();
}
