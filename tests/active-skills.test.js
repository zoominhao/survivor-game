'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup(partner) {
  const scope = vm.createContext({});
  loadGame(scope, f => battleScript(f) || f.endsWith('/save.js') || f.endsWith('/lan-state.js'));
  const data = vm.runInContext('({ g: createBattle({ save: { data: Save.defaults() } }), ACTIVE_SKILLS, LanState })', scope);
  data.g.start('ella', partner);
  return data;
}

test('疾步按方向短冲，期间不受伤，冷却结束才能再用', () => {
  const { g, ACTIVE_SKILLS } = setup();
  const p = g.player;
  assert.equal(g.useActive(0, 'dash', { x: 0, y: -1 }), true);
  assert.equal(g.useActive(0, 'dash', { x: -1, y: 0 }), false);
  for (let i = 0; i < 4; i++) g.movePlayer(p, { x: 1 }, 0.05);
  assert.equal(p.x, 0);
  assert.ok(Math.abs(p.y + 93.6) < 1e-6);
  assert.equal(p.dash, null);
  assert.equal(g.fx[0].y2, p.y);
  g.hurtPlayer(20, null, p);
  assert.equal(p.hp, p.st.maxHp);
  g.movePlayer(p, {}, 0.13);
  g.hurtPlayer(20, null, p);
  assert.equal(p.hp, p.st.maxHp - 20);
  g.time = ACTIVE_SKILLS.dash.cooldown;
  assert.equal(g.useActive(0, 'dash'), true);
  assert.ok(p.dash.y < 0);
});

test('疾步不会穿过山石；暂停期间不可施放', () => {
  const { g } = setup();
  Object.assign(g.player, { x: 80, y: 142 });
  g.state = 'paused';
  assert.equal(g.useActive(0, 'dash'), false);
  g.state = 'playing';
  assert.equal(g.useActive(0, 'dash'), true);
  for (let i = 0; i < 6; i++) g.movePlayer(g.player, {}, 0.03);
  assert.ok(g.player.x > 80 && g.player.x < 130);
});

test('镇夜符只清附近敌弹并减速，不造成伤害或打断 Boss 阶段', () => {
  const { g } = setup();
  const near = g.spawnEnemy('shade', 90, 0), far = g.spawnEnemy('shade', 240, 0);
  const boss = g.summonBoss('nightmare', 0, 114, 0);
  boss.phase = 'wind';
  const other = { x: 270, y: 0, r: 7 };
  g.ebullets.push({ x: 90, y: 0, r: 6 }, { x: 140, y: 0, r: 6 }, other);
  assert.equal(g.player.wardCharges, 1);
  assert.equal(g.useActive(0, 'ward'), true);
  assert.equal(g.player.wardCharges, 0);
  assert.equal(g.useActive(0, 'ward'), false);
  assert.equal(g.ebullets.length, 1);
  assert.equal(g.ebullets[0], other);
  assert.ok(near.slow > 0);
  assert.equal(near.hp, near.maxHp);
  assert.equal(far.slow, 0);
  assert.equal(boss.slow, near.slow / 2);
  assert.equal(boss.phase, 'wind');
  g.time += 60;
  assert.equal(g.useActive(0, 'ward'), false);
});

test('引魂符只引普通近战鬼，耗纸且不碰弹幕，纸人消失时不造成伤害', () => {
  const { g } = setup();
  Object.assign(g.save.data, { paperSkills: { lure: true }, paperSkill: 'lure' });
  g.start('ella');
  const p = g.player, ghost = g.spawnEnemy('shade', 85, 0), elite = g.spawnEnemy('shade', 65, 0, true);
  const ranged = g.spawnEnemy('spitter', 80, 0), distant = g.spawnEnemy('shade', 250, 0);
  const boss = g.summonBoss('nightmare', 0, 90, 0);
  g.ebullets.push({ x: 12, y: 0, r: 5 });
  assert.equal(g.useActive(0, 'lure'), false); // 输入的键位是固定 E 槽，不能指定招式。
  p.wardCharges = 2;
  assert.ok(g.useActive(0, 'ward'));
  assert.equal(p.wardCharges, 1);
  assert.equal(g.ebullets.length, 1);
  const [lure] = g.zones;
  assert.equal(g.enemyTarget(ghost), lure);
  for (const e of [elite, ranged, distant, boss]) assert.equal(g.enemyTarget(e), p);
  assert.equal(g.useActive(0, 'ward'), false);
  g.updateZones(3);
  assert.equal(g.zones.length, 0);
  assert.equal(ghost.hp, ghost.maxHp);
});

test('朱砂印留在原地延时爆发，只伤圈内夜兽且不消弹', () => {
  const { g } = setup();
  Object.assign(g.save.data, { paperSkills: { seal: true }, paperSkill: 'seal' });
  g.start('ella');
  const p = g.player, near = g.spawnEnemy('brute', 80, 0), far = g.spawnEnemy('brute', -200, 0);
  g.grid.insert(near); g.grid.insert(far);
  g.ebullets.push({ x: 12, y: 0, r: 5 });
  assert.ok(g.useActive(0, 'ward'));
  assert.equal(p.wardCharges, 0);
  p.x = 200;
  g.updateZones(1);
  assert.equal(g.zones[0].x, 0);
  assert.equal(near.hp, near.maxHp);
  g.updateZones(0.5);
  assert.equal(g.zones.length, 0);
  assert.ok(near.hp < near.maxHp && p.dmgBy.seal > 0);
  assert.equal(far.hp, far.maxHp);
  assert.equal(g.ebullets.length, 1);
});

test('每位守夜人独立计算冷却，倒下不能施法，局域网快照只读房主时间戳', () => {
  const { g, LanState } = setup('zhu');
  g.time = 40;
  assert.equal(g.useActive(5, 'dash'), false);
  assert.equal(g.useActive(1, 'constructor'), false);
  assert.equal(g.useActive(1, 'dash'), true);
  assert.equal(g.useActive(0, 'ward'), true);
  assert.equal(g.player.activeReady.dash, 0);
  g.partner.hp = 0;
  assert.equal(g.useActive(1, 'ward'), false);
  const packet = JSON.parse(JSON.stringify(LanState.packFrame(g)));
  const frame = LanState.readFrame(packet);
  assert.equal(frame.player.activeReady.dash, 46);
  assert.equal(frame.partner.activeReady.ward, 40.8);
  assert.equal(frame.partner.wardCharges, 0);
  assert.equal(frame.player.wardCharges, 1);
  assert.equal(frame.player.dash, undefined);
  assert.ok(frame.fx.some(f => f.type === 'activeWard'));
  packet.players[1][5] = [9900, 'bad'];
  assert.equal(LanState.readFrame(packet).player.activeReady.dash, undefined);
  packet.players[1][0][packet.players[1][0].length - 1] = 4;
  assert.equal(LanState.readFrame(packet), null);
  g.start('ella');
  assert.equal(g.player.activeReady.ward, 0);
  assert.equal(g.useActive(1, 'ward'), false);
});

test('精英和 Boss 各掉一张镇夜符纸，普通怪不掉，也不会自动入库存', () => {
  const { g } = setup();
  const count = () => g.pickups.filter(item => item.type === 'wardPaper').length;
  g.killEnemy(g.spawnEnemy('shade', 90, 0));
  assert.equal(count(), 0);
  g.killEnemy(g.spawnEnemy('shade', 140, 0, true));
  assert.equal(count(), 1);
  g.killEnemy(g.summonBoss('nightmare', 0, 180, 0));
  assert.equal(count(), 2);
  assert.equal(g.player.wardCharges, 1);
});

test('符纸可囤三张，满额或倒下不会拿走符纸，队友有空位可以拾取', () => {
  const { g } = setup('zhu');
  const p = g.player, q = g.partner;
  Object.assign(p, { x: 0, y: 0, wardCharges: 3 });
  Object.assign(q, { x: 15, y: 0, wardCharges: 2 });
  const item = { x: 0, y: 0, type: 'wardPaper' };
  g.pickups.push(item);
  g.updatePickups(0.02);
  assert.equal(p.wardCharges, 3);
  assert.equal(q.wardCharges, 3);
  assert.equal(g.pickups.length, 0);
  assert.equal(g.useActive(0, 'ward'), true);
  assert.equal(g.useActive(0, 'ward'), false);
  assert.equal(p.wardCharges, 2);
  p.hp = 0;
  g.pickups.push(item);
  g.updatePickups(0.02);
  assert.equal(g.pickups.length, 1);
  p.hp = 1;
  g.updatePickups(0.02);
  assert.equal(g.pickups.length, 0);
  assert.equal(p.wardCharges, 3);
  g.start('ella', 'zhu', { robot: true });
  g.pickups.push({ type: 'wardPaper', x: g.partner.x, y: g.partner.y });
  g.updatePickups(0.02);
  assert.equal(g.partner.wardCharges, 1);
  assert.equal(g.pickups.length, 1);
});
