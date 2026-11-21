'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
const test = require('node:test');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup() {
  const scope = vm.createContext({});
  loadGame(scope, battleScript);
  const { createBattle, EVENTS, meta } = vm.runInContext('({ createBattle, EVENTS, meta: Object.keys(META) })', scope);
  const events = [];
  const data = { coins: 0, runs: 0, kills: 0, wins: 0, best: 0, meta: Object.fromEntries(meta.map(key => [key, 0])) };
  const game = createBattle({ save: { data, write() {} }, emit: (event, payload) => events.push([event, payload]) });
  game.start('ella');
  return { game, events, encounter: kind => EVENTS.find(e => e.variant === kind) };
}

test('Boss 登场前冻结时间，余额不足不能镇守，照常迎战不扣钱或清空待选升级', () => {
  const { game, events } = setup();
  game.time = 239.99;
  game.player.coins = 11;
  game.pending = 1;
  game.update(0.02);
  assert.equal(game.state, 'decision');
  assert.equal(game.boss, null);
  assert.equal(events.at(-1)[0], 'decision');
  const t = game.time;
  game.update(1, { x: 1, y: 0 });
  assert.equal(game.time, t);
  assert.equal(game.chooseBossPlan('ward'), false);
  assert.equal(game.chooseBossPlan('toString'), false);
  assert.equal(game.state, 'decision');
  assert.equal(game.player.coins, 11);
  assert.equal(game.chooseBossPlan('normal'), true);
  assert.equal(game.boss.kind, 'nightmare');
  assert.equal(game.boss.arrivedAt, t);
  assert.equal(game.pending, 1);
  assert.equal(game.player.coins, 11);
  assert.equal(game.chooseBossPlan('normal'), false);
  game.update(0.02);
  assert.equal(game.state, 'levelup');
});

test('同一 Boss 的镇守和悬赏实际减慢、加快冲锋，只扣除本局金币', () => {
  const strides = {};
  for (const plan of ['ward', 'normal', 'challenge']) {
    const { game, encounter } = setup();
    game.player.coins = 12;
    game.offerBossDecision(encounter('nightmare'));
    assert.ok(game.chooseBossPlan(plan));
    const boss = game.boss;
    Object.assign(boss, { x: 160, y: 0, cd: 0.8, phase: 'charge', cx: -1, cy: 0, speed: 60 });
    game.updateEnemies(0.05);
    strides[plan] = 160 - boss.x;
    assert.equal(game.player.coins, plan === 'ward' ? 0 : 12);
    assert.equal(game.save.data.coins, 0);
  }
  assert.ok(Math.abs(strides.ward / strides.normal - 0.75) < 1e-9);
  assert.ok(Math.abs(strides.challenge / strides.normal - 1.25) < 1e-9);
});

test('尸王镇守和悬赏改变实际危险范围，额外赏金仅在击败后发放一次', () => {
  for (const [plan, radius] of [['ward', 40], ['normal', 52], ['challenge', 64]]) {
    const { game, encounter } = setup();
    game.player.coins = 24;
    game.offerBossDecision(encounter('coffinKing'));
    assert.ok(game.chooseBossPlan(plan));
    assert.equal(game.player.coins, plan === 'ward' ? 0 : 24);
    const boss = game.boss;
    Object.assign(boss, { x: 170, y: 0, cd: 0 });
    game.updateEnemies(0);
    assert.ok(boss.seals.every(seal => seal.r === radius));
    game.player.x = 69;
    boss.cd = 0; game.updateEnemies(0);
    assert.equal(game.player.hp < 100, plan === 'challenge');
    const before = game.player.coins;
    game.killEnemy(boss); game.killEnemy(boss);
    assert.equal(game.player.coins - before, plan === 'challenge' ? 50 : 0);
    assert.equal(game.pickups.filter(p => p.type === 'chest' && p.boss).length, 1);
  }
});

test('鬼后改动喜帖密度，扇面总角度不变，重开清理未确认抉择', () => {
  for (const [plan, count] of [['ward', 5], ['normal', 9], ['challenge', 13]]) {
    const { game, encounter } = setup();
    game.player.coins = 36;
    game.offerBossDecision(encounter('bridalQueen'));
    assert.ok(game.chooseBossPlan(plan));
    const boss = game.boss;
    Object.assign(boss, { x: 200, y: 0, cd: 0 });
    game.updateEnemies(0);
    boss.cd = 0; game.updateEnemies(0);
    assert.equal(game.ebullets.length, count);
    const angle = b => Math.atan2(b.vy, b.vx);
    assert.ok(Math.abs(Math.abs(angle(game.ebullets[0]) - angle(game.ebullets.at(-1))) + 1.36 - 2 * Math.PI) < 1e-9);
  }
  const { game, encounter } = setup();
  game.offerBossDecision(encounter('nightmare'));
  game.start('echo');
  assert.equal(game.bossDecision, null);
  assert.equal(game.state, 'playing');
});
