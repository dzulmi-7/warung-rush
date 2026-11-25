// A headless smoke test (dev tooling, runs in Node with no browser): drives the real world
// module through one full order — take rice, cook it, plate it, chop garlic, add it, serve —
// and checks the score moved and no station stranded an item. Run: node scripts/smoke.mjs

import { beginRun, createWorld, startDay, wireWorldHelpers, advance } from '../game/src/world.js';
import { createOrder } from '../game/src/orders.js';

const world = createWorld(7);
wireWorldHelpers(world);
startDay(world, 1);

let failures = 0;
function expect(condition, label) {
  if (condition) console.log(`ok  ${label}`);
  else {
    console.error(`FAIL ${label}`);
    failures += 1;
  }
}

/** Teleport the chef onto a tile centre and face a direction. */
function place(col, row, faceX, faceY) {
  world.chef.x = col + 0.5;
  world.chef.y = row + 0.5;
  world.chef.facingX = faceX;
  world.chef.facingY = faceY;
}

const idle = { inputX: 0, inputY: 0, actionHeld: false, actionPressed: false };
const hold = { ...idle, actionHeld: true };

// Take rice from the bin at (7,1) and cook it in the rice cooker at (5,1).
place(7, 2, 0, -1);
world.interact();
expect(world.chef.held?.ingredient === 'rice', 'took raw rice from the bin');
place(5, 2, 0, -1);
world.interact();
expect(world.stations.get('5,1').state === 'cooking', 'rice cooker started cooking');
for (let i = 0; i < 200; i += 1) advance(world, idle, 1 / 60);
expect(world.stations.get('5,1').state === 'done', 'rice cooked done');
world.interact();
expect(world.chef.held?.kind === 'cooked', 'took cooked rice out');

// Park the cooked rice on the counter, take a plate, then slide the rice onto the plate.
place(4, 3, 0, -1);
world.interact();
expect(world.stations.get('4,2').item?.ingredient === 'rice', 'rice parked on the counter');
place(3, 3, 0, 1);
world.interact();
expect(world.chef.held?.plate === true, 'took a clean plate');
place(4, 3, 0, -1);
world.interact();
expect(world.chef.held?.parts?.length === 1, 'rice stacked onto the plate in hand');

// Park the part-built plate, chop garlic at the board (2,4), then slide it on too.
place(4, 3, 0, -1);
world.interact();
expect(world.stations.get('4,2').item?.parts?.length === 1, 'part-built plate parked');
place(0, 3, 1, 0);
world.interact();
expect(world.chef.held?.ingredient === 'garlic', 'took raw garlic');
place(2, 3, 0, 1);
world.interact();
expect(world.stations.get('2,4').item?.ingredient === 'garlic', 'garlic on the board');
for (let i = 0; i < 120; i += 1) advance(world, hold, 1 / 60);
expect(world.stations.get('2,4').item?.kind === 'chopped', 'garlic chopped');
world.interact();
place(4, 3, 0, -1);
world.interact();
expect(world.stations.get('4,2').item.parts.length === 2, 'garlic joined the plate on the counter');

// A customer orders nasi goreng; an incomplete plate must not serve.
const order = createOrder(world.random, 1, world.dayTime);
order.dish = { id: 'nasi_goreng', name: 'Nasi Goreng', price: 12, day: 1, parts: [
  { ingredient: 'rice', kind: 'cooked' },
  { ingredient: 'garlic', kind: 'chopped' },
  { ingredient: 'egg', kind: 'raw' },
], hint: '' };
order.patience = 75;
world.orders.push(order);
place(4, 3, 0, -1);
world.interact();
place(1, 2, 0, -1);
world.interact();
place(1, 1, 0, -1);
world.interact();
expect(world.served === 0, 'incomplete plate did not serve');
expect(world.score === 0, 'an empty plate costs nothing');
// The egg is missing: take one from the bin at (9,3), add it at the counter, serve for real.
place(4, 2, 0, -1);
world.interact();
place(8, 3, 1, 0);
world.interact();
place(4, 2, 0, -1);
world.interact();
expect(world.stations.get('4,2').item?.parts?.length === 3, 'egg joined the plate on the counter');
place(4, 3, 0, -1);
world.interact();
place(1, 1, 0, -1);
world.interact();
expect(world.served === 1, 'complete plate served the order');
expect(world.score > 0, `score moved (now $${world.score})`);

// A burnt pan: cook chicken in the wok at (0,1), walk away, come back to cinders.
place(4, 3, 0, 1);
world.interact();
place(1, 1, -1, 0);
world.interact();
expect(world.stations.get('0,1').state === 'cooking', 'chicken frying in the wok');
for (let i = 0; i < 1300; i += 1) advance(world, idle, 1 / 60);
expect(world.stations.get('0,1').state === 'burnt', 'unattended wok burnt');
place(1, 1, -1, 0);
world.interact();
expect(world.chef.held?.kind === 'burnt', 'took the burnt food');
place(6, 3, 0, 1);
world.interact();
expect(world.chef.held === null, 'burnt food trashed');

if (failures > 0) {
  console.error(`${failures} smoke failure(s)`);
  process.exit(1);
}
console.log('smoke ok: one order cooked, plated and served; burning and trash behave');
