'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup(mate) {
  const context = vm.createContext({});
  loadGame(context, f => battleScript(f) || f.endsWith('/save.js') || f.endsWith('/lan-state.js'));
  const { createBattle, Save, Environment, WorldInteractions, LanState, EVENTS } = vm.runInContext(
    '({ createBattle, Save, Environment, WorldInteractions, LanState, EVENTS })', context);
  const events = [], g = createBattle({ save: { data: Save.defaults() }, emit: (name, v) => events.push([name, v]) });
  g.start('ella', mate);
  g.time = 359.98;
  g.eliteT = 450;
  g.evIdx = EVENTS.findIndex(e => e.t > g.time);
  g.update(0.03);
  return { g, Environment, WorldInteractions, LanState, events };
}

test('六分钟的岔路暂停一次；雨庭换遭遇和经验加成，七分二十五平滑接回雪岭', () => {
  const { g, Environment, WorldInteractions, events } = setup();
  assert.equal(g.state, 'route');
  assert.equal(g.chooseFork('constructor'), false);
  assert.equal(g.chooseFork('rain'), true);
  assert.equal(g.chooseFork('bamboo'), false);
  assert.equal(g.fork.from, 'rain');
  assert.equal(g.landscape, 'rain');
  g.gainXp(2);
  assert.equal(g.player.xp, 2.3);
  g.gems.push({ x: 320, y: 0, v: 1 });
  WorldInteractions.visitLandmark(g, { kind: 'starSigil', x: 0, y: 0 }, 'rain:0:0');
  assert.equal(g.gems[0].mag, true);
  g.time = 375;
  g.update(0);
  assert.equal(g.enemies.filter(e => e.type === 'umbrellaGhost').length, 16);
  g.update(0);
  assert.equal(g.enemies.filter(e => e.type === 'umbrellaGhost').length, 16);
  assert.equal(events.filter(([name]) => name === 'route').length, 1);
  g.time = 445.5;
  let scene = Environment.forBattle(g);
  assert.equal(scene.from, 'rain'); assert.equal(scene.id, 'snow');
  g.gainXp(1);
  assert.equal(g.player.xp, 3.3);
  g.time = 451;
  scene = Environment.forBattle(g);
  assert.equal(Environment.landscape(scene), 'snow');
  g.start('ella');
  assert.equal(g.fork, null);
});

test('竹径镇纸覆盖更远，伏兵替代原定怪潮，房主路线能在来客快照安全还原', () => {
  const { g, Environment, WorldInteractions, LanState } = setup('zhu');
  assert.equal(g.chooseFork('bamboo'), true);
  g.time = 375;
  g.update(0);
  assert.equal(g.landscape, 'bamboo');
  assert.equal(g.enemies.filter(e => e.type === 'jiangshi').length, 26);
  const foe = g.spawnEnemy('brute', 200, 0);
  Object.assign(foe, { x: 200, y: 0 });
  g.grid.insert(foe);
  WorldInteractions.visitLandmark(g, { kind: 'paperWard', x: 0, y: 0 }, 'bamboo:0:0');
  assert.ok(foe.slow > 0);
  g.time = 390;
  g.update(0);
  assert.ok(g.enemies.every(e => e.type !== 'moth'));
  const packet = JSON.parse(JSON.stringify(LanState.packFrame(g)));
  const guest = LanState.readFrame(packet);
  assert.equal(guest.fork.id, 'bamboo');
  assert.equal(Environment.landscape(Environment.forBattle(guest)), 'bamboo');
  packet.fork[0] = 'constructor';
  assert.equal(LanState.readFrame(packet).fork, null);
});

test('第一位 Boss 战延长时不弹出岔路，过了窗口不会打断下一位 Boss', () => {
  const { g } = setup();
  g.state = 'playing';
  g.summonBoss('nightmare', 0, 150, 0, 'night');
  g.stepRouteFork();
  assert.equal(g.state, 'playing');
  g.boss = null;
  g.time = 415;
  g.stepRouteFork();
  assert.equal(g.state, 'playing');
  assert.equal(g.fork, null);
});
