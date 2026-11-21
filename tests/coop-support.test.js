'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup() {
  const scope = vm.createContext({});
  loadGame(scope, f => battleScript(f) || f.endsWith('/lan-state.js') || f.endsWith('/save.js'));
  return vm.runInContext(`(() => {
    const events = [], save = { data: Save.defaults(), write() { throw new Error('双人和机器人都不能写单人档'); } };
    const g = createBattle({ save, emit: (event, data) => events.push([event, data]) });
    return { g, events, LanState, RobotPartner, recommendUpgrade };
  })()`, scope);
}

test('机器人主动跟随，且会横移绕开夜魇的冲锋预警', () => {
  const { g, RobotPartner } = setup();
  g.start('ella', 'zhu', { robot: true });
  g.player.x = 230; g.player.y = 0;
  const before = g.partner.x;
  for (let i = 0; i < 10; i++) g.update(0.05);
  assert.ok(g.partner.x > before + 30);
  g.partner.x = 110; g.partner.y = 0; g.robotBrain.next = 0;
  g.boss = { x: 0, y: 0, r: 44, phase: 'wind', cx: 1, cy: 0 };
  const move = RobotPartner.input(g);
  assert.ok(Math.abs(move.y) > 0.5);
});

test('跟随路线被近处山石挡住时，机器人会先向侧面绕开', () => {
  const { g, RobotPartner } = setup();
  g.start('ella', 'zhu', { robot: true });
  // 松灯古道出生区右下方的大石横在两人之间。
  Object.assign(g.player, { x: 300, y: 142 });
  Object.assign(g.partner, { x: 128, y: 142 });
  assert.ok(Math.abs(RobotPartner.input(g).y) > 0.5);
  g.spawn = () => {};
  for (let i = 0; i < 32; i++) g.update(0.05);
  assert.ok(Math.hypot(g.partner.x - g.player.x, g.partner.y - g.player.y) < 125);
});

test('机器人自动选卡，不会替玩家选卡或卡住升级暂停', () => {
  const { g, events } = setup();
  g.start('ella', 'zhu', { robot: true });
  g.gainXp(5);
  g.nextLevelUp();
  assert.equal(g.state, 'levelup');
  assert.equal(g.levelPlayer, g.player);
  assert.equal(g.partner.pending, 1);
  g.choose(0);
  assert.equal(g.state, 'playing');
  assert.equal(g.partner.pending, 0);
  assert.equal(events.filter(([event]) => event === 'levelup').length, 1);
  g.finish(true); // write() 会抛异常，证明没有写入单人进度。
  assert.equal(g.result.earned, 0);
});

test('扶救需要站稳且连续，受击或走开会打断，整局只消耗一次', () => {
  const { g } = setup();
  g.start('ella', 'zhu');
  const p = g.player, q = g.partner;
  g.hurtPlayer(1e3, null, q);
  assert.equal(q.hp, 0);
  g.stepRescue(1);
  assert.equal(g.rescue.progress, 1);
  p.moving = true; g.stepRescue(0.2); p.moving = false;
  assert.equal(g.rescue.progress, 0);
  g.stepRescue(1);
  g.hurtPlayer(5, null, p); g.stepRescue(0.05);
  assert.equal(g.rescue.progress, 0);
  g.time += 0.05;
  g.stepRescue(1.99);
  assert.equal(q.hp, 0);
  g.stepRescue(0.01);
  assert.equal(q.hp, 24);
  assert.ok(q.iframe > 0 && g.rescue.used);
  q.iframe = 0; g.hurtPlayer(1e3, null, q); g.stepRescue(3);
  assert.equal(q.hp, 0);
  const boss = g.summonBoss('nightmare', 0, 120, 0, 'night');
  g.killEnemy(boss);
  assert.ok(q.hp > 0); // 保留击败 Boss 后复起的路线。
});

test('机器人会站在倒下玩家附近扶救，双方快照只读有效信号', () => {
  const { g, LanState } = setup();
  g.start('ella', 'zhu', { robot: true });
  g.hurtPlayer(1e3, null, g.player);
  assert.ok(g.sendSignal(0, 'help'));
  assert.ok(!g.sendSignal(0, 'cheer'));
  assert.ok(!g.sendSignal(1, '__proto__'));
  for (let i = 0; i < 44; i++) g.update(0.05);
  assert.ok(g.player.hp > 0 && g.rescue.used);
  const wire = JSON.parse(JSON.stringify(LanState.packFrame(g)));
  assert.equal(LanState.readFrame(wire).signals[0].id, 'help');
  assert.equal(LanState.readFrame(wire).rescue.used, true);
  wire.signals[0][0] = '<img>';
  assert.equal(LanState.readFrame(wire).signals[0], null);
  g.time += 3;
  assert.ok(g.sendSignal(0, 'cheer'));
});

test('军师能指出真实的进化搭配，紧急时优先建议回血', () => {
  const { g, recommendUpgrade } = setup();
  g.start('zhu');
  for (let lv = 2; lv <= 6; lv++) g.applyChoice({ kind: 'weapon', id: 'codeShard', lv });
  const choices = [{ kind: 'coins' }, { kind: 'passive', id: 'haste', lv: 1 }, { kind: 'heal' }];
  const healthy = recommendUpgrade(choices, g.player);
  assert.equal(healthy.index, 1);
  assert.match(healthy.reason, /代码连发.*进化/);
  g.player.hp = 8;
  assert.equal(recommendUpgrade(choices, g.player).index, 2);
  assert.equal(g.player.hp, 8);
});
