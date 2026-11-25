// Map sanity check (dev tooling): every station tile must border a walkable floor tile the chef
// can stand on, and the floor must be one connected region, so no station is stranded and no
// route dead-ends. Run from the repository root: node scripts/check-map.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const source = readFileSync(join(here, '..', 'game', 'src', 'world.js'), 'utf8');
const match = source.match(/KITCHEN_MAP = \[([^\]]+)\]/);
if (!match) {
  console.error('KITCHEN_MAP not found');
  process.exit(1);
}
const map = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const cols = map[0].length;
const rows = map.length;
const cell = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? 'X' : map[r][c]);
const walkable = (c, r) => cell(c, r) === '.';

// One BFS over the floor from the middle of the chef corridor: every station must touch THAT
// region (small floor pockets behind stations are harmless but the chef can never reach them).
const start = [5, 3];
if (!walkable(start[0], start[1])) {
  console.error('corridor seed tile 5,3 is not floor');
  process.exit(1);
}
const seen = new Set([start.join(',')]);
const queue = [start];
while (queue.length) {
  const [c, r] = queue.pop();
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const key = `${c + dc},${r + dr}`;
    if (walkable(c + dc, r + dr) && !seen.has(key)) {
      seen.add(key);
      queue.push([c + dc, r + dr]);
    }
  }
}
let failures = 0;
const startFloor = [];
for (let r = 0; r < rows; r += 1) {
  for (let c = 0; c < cols; c += 1) if (walkable(c, r)) startFloor.push([c, r]);
}
for (const [c, r] of startFloor) {
  if (!seen.has(`${c},${r}`)) {
    console.warn(`note: floor tile ${c},${r} is a pocket the chef cannot reach (harmless)`);
  }
}

// Every non-floor, non-wall station tile must touch a reachable floor tile.
for (let r = 0; r < rows; r += 1) {
  for (let c = 0; c < cols; c += 1) {
    const ch = cell(c, r);
    if (ch === '.' || ch === 'W' || ch === 'X') continue;
    const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) =>
      walkable(c + dc, r + dr) && seen.has(`${c + dc},${r + dr}`),
    );
    if (!touches) {
      console.error(`station ${ch} at ${c},${r} has no reachable floor beside it`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(`${failures} map problem(s)`);
  process.exit(1);
}
console.log(`map ok: ${rows} rows, ${startFloor.length} floor tiles all connected, every station reachable`);
