// Screenshot staging: ?shot=<name> builds a hand-set scene of the game and paints it twice, so
// the screenshots in screenshots/ are true renders of this game's own code at a fixed moment.
// The scenes stage real play states — orders up, food mid-assembly, woks running — never mocks.

import { SCREEN_DAY_END, SCREEN_TITLE } from './config.js';
import { startDay } from './world.js';
import { createOrder } from './orders.js';
import { dishesForDay } from './recipes.js';

/** Stage the named scene into the world; returns the screen the renderer should paint. */
export function stageShot(name, world) {
  if (name === 'start' || name === 'title') {
    world.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play' || name === 'rush') {
    const rush = name === 'rush';
    startDay(world, rush ? 2 : 1);
    world.dayTime = rush ? 128 : 55;
    world.score = rush ? 210 : 46;
    world.dayScore = world.score;
    world.served = rush ? 7 : 2;
    world.combo = rush ? 3 : 2;
    // Two to four tickets on the board, spread across their patience bars.
    const dishes = dishesForDay(world.day);
    const spread = rush ? [0.75, 0.5, 0.3, 0.15] : [0.9, 0.55, 0.25];
    spread.forEach((fraction, i) => {
      const order = createOrder(world.random, world.day, world.dayTime);
      order.dish = dishes[i % dishes.length];
      order.arrivedAt = world.dayTime - order.patience * (1 - fraction);
      world.orders.push(order);
    });
    // The kitchen mid-service: a wok frying rice and garlic, a pot of noodles, chili mid-chop,
    // raw ingredients waiting on the counters, and the chef carrying a finished plate to serve.
    const stations = world.stations;
    const wokA = stations.get('2,1');
    wokA.items = [{ ingredient: 'rice', kind: 'raw' }, { ingredient: 'garlic', kind: 'chopped' }];
    wokA.state = 'cooking';
    wokA.timer = 2.4;
    const pot = stations.get('3,1');
    pot.items = [{ ingredient: 'noodle', kind: 'raw' }];
    pot.state = 'cooking';
    pot.timer = 1.1;
    const board = stations.get('2,4');
    board.item = { ingredient: 'chili', kind: 'raw' };
    board.progress = 0.6;
    // Raw ingredients parked on the counters and a second plate mid-assembly.
    stations.get('4,2').item = { ingredient: 'egg', kind: 'raw' };
    stations.get('6,2').item = { ingredient: 'chicken', kind: 'raw' };
    stations.get('2,2').item = {
      plate: true,
      parts: [
        { ingredient: 'rice', kind: 'cooked' },
        { ingredient: 'egg', kind: 'raw' },
      ],
    };
    // The chef stands at the serve window holding the complete dish, ready to ring the bell.
    world.chef.x = 1.5;
    world.chef.y = 1.5;
    world.chef.facingX = 0;
    world.chef.facingY = -1;
    world.chef.held = {
      plate: true,
      parts: [
        { ingredient: 'rice', kind: 'cooked' },
        { ingredient: 'garlic', kind: 'chopped' },
        { ingredient: 'egg', kind: 'raw' },
      ],
    };
    return { screen: 'play' };
  }
  if (name === 'end') {
    startDay(world, 3);
    world.victory = true;
    world.screen = SCREEN_DAY_END;
    world.served = 11;
    world.misses = 2;
    world.dayScore = 340;
    world.score = 795;
    return { screen: SCREEN_DAY_END };
  }
  startDay(world, 1);
  return { screen: 'play' };
}
