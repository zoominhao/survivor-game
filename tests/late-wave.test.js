'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup() {
  const context = vm.createContext({});
  loadGame(context, f => battleScript(f) || f.endsWith('/save.js') || f.endsWith('/lan-state.js'));
  return vm.runInContext('({ g: createBattle({ save: { data: Save.defaults() } }), CFG, EVENTS, LanState, Grid })', context);
}

test('满场单人和双人都有 Boss 席位，最后一分钟照常出现完整合围', () => {
  const { g, CFG, EVENTS, LanState } = setup();
  for (const mate of [null, 'zhu']) {
    g.start('ella', mate);
    g.time = 839.98;
    g.enterLandscape('dawn');
    g.eliteT = Infinity;
    g.evIdx = EVENTS.findIndex(e => e.t === 840);
    const near = g.spawnEnemy('shade', 25, 0), elite = g.spawnEnemy('shade', 1800, 0, true);
    for (let i = 0; i < CFG.MAX_ENEMIES + 50; i++) g.spawnEnemy('shade', 300 + i, 0);
    assert.equal(g.enemies.length, CFG.MAX_ENEMIES - 1);
    assert.equal(g.spawnEnemy('moth', 0, 0), null);
    g.time = 840.01;
    g.spawnAcc = 12.4;
    g.spawn(0.04);
    assert.equal(g.enemies.length, CFG.MAX_ENEMIES - 1);
    assert.equal(g.enemies.filter(e => e.type === 'brute').length, 36);
    assert.ok(g.enemies.includes(near) && g.enemies.includes(elite));
    assert.ok(g.spawnAcc < 1);
    const boss = g.summonBoss('bridalQueen', 2, 350, 0, 'rain');
    assert.equal(g.enemies.length, CFG.MAX_ENEMIES);
    assert.equal(g.reserveEnemySlots(5), 5);
    assert.ok(g.enemies.includes(boss) && g.enemies.includes(elite));
    if (mate) assert.equal(LanState.readFrame(LanState.packFrame(g)).boss.kind, 'bridalQueen');
  }
});

test('密集刷怪时定时精英仍能入场，近身怪不让位给远处的新怪', () => {
  const { g, CFG, EVENTS } = setup();
  g.start('ella', 'zhu');
  g.time = 856;
  g.evIdx = EVENTS.length;
  g.eliteT = 855;
  const near = g.spawnEnemy('shade', 27, 0);
  for (let i = 0; i < CFG.MAX_ENEMIES; i++) g.spawnEnemy('shade', 100 + i, 0);
  g.spawn(0.02);
  assert.ok(g.enemies.includes(near));
  assert.equal(g.enemies.filter(e => e.elite).length, 1);
  assert.equal(g.enemies.length, CFG.MAX_ENEMIES - 1);
});

test('空间格可重用；最近多目标查询保持距离与同距离顺序', () => {
  const { g, Grid } = setup();
  const grid = new Grid(64), a = { x: 1, y: 0 }, b = { x: 2, y: 0 };
  grid.insert(a); grid.insert(b);
  assert.equal(grid.active.length, 1);
  grid.clear();
  assert.equal(grid.get(0, 0).length, 0);
  grid.insert(b);
  assert.equal(grid.get(0, 0)[0], b);
  g.start('ella');
  const foes = [g.spawnEnemy('shade', 100, 0), g.spawnEnemy('shade', 30, 0), g.spawnEnemy('shade', -30, 0)];
  assert.deepEqual(Array.from(g.nearestEnemies(0, 0, 180, 2)), [foes[1], foes[2]]);
});
