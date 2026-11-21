'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup(mate) {
  const context = vm.createContext({});
  loadGame(context, f => battleScript(f) || f.endsWith('/save.js') || f.endsWith('/lan-state.js'));
  const { createBattle, Save, LanState, EVENTS } = vm.runInContext('({ createBattle, Save, LanState, EVENTS })', context);
  const events = [], g = createBattle({ save: { data: Save.defaults() }, emit: (name, v) => events.push([name, v]) });
  g.start('ella', mate);
  g.time = 359.98;
  g.eliteT = 450;
  g.evIdx = EVENTS.findIndex(e => e.t > g.time);
  g.update(0.03);
  return { g, LanState, events };
}

test('六分钟变阵只选一次；引星增加经验并引来伞鬼，不切换地图', () => {
  const { g, events } = setup();
  assert.equal(g.state, 'route');
  assert.equal(g.chooseFork('constructor'), false);
  assert.equal(g.chooseFork('rain'), true);
  assert.equal(g.chooseFork('bamboo'), false);
  assert.equal(g.stage, 'dusk');
  g.gainXp(2);
  assert.equal(g.player.xp, 2.3);
  g.time = 375;
  g.update(0);
  assert.equal(g.enemies.filter(e => e.type === 'umbrellaGhost').length, 16);
  g.update(0);
  assert.equal(g.enemies.filter(e => e.type === 'umbrellaGhost').length, 16);
  assert.equal(events.filter(([name]) => name === 'route').length, 1);
  g.time = 445.5;
  assert.equal(g.stage, 'dusk');
  g.gainXp(1);
  assert.equal(g.player.xp, 3.3);
  g.time = 451;
  assert.equal(g.stage, 'dusk');
  g.start('ella');
  assert.equal(g.fork, null);
});

test('布符镇守扩大镇夜符；伏兵替代原定怪潮，来客快照保留当前地图', () => {
  const { g, LanState } = setup('zhu');
  assert.equal(g.chooseFork('bamboo'), true);
  g.time = 375;
  g.update(0);
  assert.equal(g.stage, 'dusk');
  assert.equal(g.enemies.filter(e => e.type === 'jiangshi').length, 26);
  const p = g.player;
  g.ebullets.push({ x: p.x + 156, y: p.y, r: 5 });
  assert.ok(g.useActive(0, 'ward'));
  assert.equal(g.ebullets.length, 0);
  g.time = 390;
  g.update(0);
  assert.ok(g.enemies.every(e => e.type !== 'moth'));
  const packet = JSON.parse(JSON.stringify(LanState.packFrame(g)));
  const guest = LanState.readFrame(packet);
  assert.equal(guest.fork.id, 'bamboo');
  assert.equal(guest.stage, 'dusk');
  packet.fork[0] = 'constructor';
  assert.equal(LanState.readFrame(packet).fork, null);
});

test('第一位 Boss 战延长时不弹出岔路，过了窗口不会打断下一位 Boss', () => {
  const { g } = setup();
  g.state = 'playing';
  g.summonBoss('nightmare', 0, 150, 0);
  g.stepRouteFork();
  assert.equal(g.state, 'playing');
  g.boss = null;
  g.time = 415;
  g.stepRouteFork();
  assert.equal(g.state, 'playing');
  assert.equal(g.fork, null);
});
