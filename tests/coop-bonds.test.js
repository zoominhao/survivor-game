'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { loadGame, battleScript } = require('./fixtures/load-game');

function setup() {
  const scope = vm.createContext({});
  loadGame(scope, f => battleScript(f) || f.endsWith('/save.js') || f.endsWith('/lan-state.js'));
  return vm.runInContext(`({ g: createBattle({ save: { data: Save.defaults() } }), CoopBonds, LanState, CHARS })`, scope);
}

test('全部角色可配出合契，交换房主和队友时组合不变；五种属性加成都给双方', () => {
  const { g, CoopBonds, CHARS } = setup();
  const chars = Object.keys(CHARS), seen = new Set();
  for (const a of chars) for (const b of chars) {
    const bond = CoopBonds.forPair(a, b);
    assert.equal(bond, CoopBonds.forPair(b, a));
    seen.add(bond);
  }
  assert.equal(seen.size, 6);
  for (const [a, b, stat, factor, add = 0] of [
    ['wen', 'du', 'might', 1.12], ['wen', 'ruo', 'area', 1.15], ['ruo', 'zhu', 'cd', 0.9],
    ['zhu', 'shao', 'speed', 1.1], ['shao', 'yan', 'regen', 1, 0.8],
  ]) {
    g.start(a, b);
    assert.equal(g.bondActive, true);
    for (const p of g.players) assert.equal(p.st[stat], g.statsFor(p.char)[stat] * factor + add);
  }
});

test('合契有距离缓冲，失效后回到基础属性，升级重算不会叠加；单人不带入合契', () => {
  const { g } = setup();
  g.start('zhu', 'ella', { robot: true });
  const [p, q] = g.players;
  const at = d => { q.x = p.x + d; q.y = p.y; g.stepBond(); return g.bondActive; };
  assert.equal(at(175), true);
  assert.equal(at(176), false);
  assert.equal(at(160), false);
  assert.equal(at(150), true);
  for (let i = 0; i < 3; i++) g.recalc(p);
  assert.equal(p.st.speed, 165);
  p.passives.push({ id: 'swift', lv: 1 });
  g.recalc(p);
  assert.equal(p.st.speed, g.statsFor(p.char, p.passives).speed * 1.1);
  at(200);
  assert.equal(p.st.speed, g.statsFor(p.char, p.passives).speed);
  g.start('zhu');
  assert.equal(g.bond, null);
  assert.equal(g.bondActive, false);
  assert.equal(g.player.st.speed, 150);
});

test('护灯合契实际减伤，倒地立即失效；扶救后重新开启，快照保持房主判断', () => {
  const { g, LanState } = setup();
  g.start('ella', 'wen');
  const [p, q] = g.players;
  assert.equal(g.bond.name, '护灯成阵');
  g.hurtPlayer(25, null, p);
  assert.equal(p.hp, 78);
  q.hp = 1;
  g.hurtPlayer(50, null, q);
  assert.equal(g.bondActive, false);
  assert.equal(LanState.readFrame(LanState.packFrame(g)).bondActive, false);
  p.iframe = 0;
  g.hurtPlayer(25, null, p);
  assert.equal(p.hp, 53);
  g.time++;
  g.stepRescue(2);
  assert.equal(g.rescue.used, true);
  assert.equal(g.bondActive, true);
  q.x = p.x + 164; q.y = p.y;
  g.stepBond();
  const packet = JSON.parse(JSON.stringify(LanState.packFrame(g)));
  const guest = LanState.readFrame(packet);
  assert.equal(guest.player.char, 'wen');
  assert.equal(guest.bond.name, g.bond.name);
  assert.equal(guest.bondActive, true);
  packet.bondActive = 'true';
  assert.equal(LanState.readFrame(packet).bondActive, false);
});

test('双人怪潮更快更硬，Boss 只加生命；机器人局与真人局相同，单人不变', () => {
  const { g } = setup();
  const sample = (mate, robot) => {
    g.start('ella', mate, { robot });
    g.time = 70;
    g.eliteT = Infinity;
    g.spawn(0.001);
    const { hp, dmg, xp } = g.spawnEnemy('shade', 90, 0);
    const elite = g.spawnEnemy('shade', 180, 0, true);
    const boss = g.summonBoss('coffinKing', 1, 250, 0);
    return { rate: g.spawnAcc, hp, dmg, xp, eliteHp: elite.hp, bossHp: boss.hp, bossDmg: boss.dmg, seal: boss.sealRadius };
  };
  const solo = sample(), duo = sample('zhu');
  assert.deepEqual(sample('zhu', true), duo);
  for (const [key, factor] of [['rate', 1.12], ['hp', 1.18], ['eliteHp', 1.18], ['dmg', 1.08], ['bossHp', 1.25]]) {
    assert.ok(Math.abs(duo[key] - solo[key] * factor) < 1e-9, key);
  }
  assert.equal(duo.xp, solo.xp);
  assert.equal(duo.bossDmg, solo.bossDmg);
  assert.equal(duo.seal, solo.seal);
});
