'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup(oldSave = {}) {
  let blob = JSON.stringify(oldSave), writes = 0;
  const context = vm.createContext({ localStorage: {
    getItem: () => blob, setItem: (_, value) => { writes++; blob = value; },
  } });
  loadGame(context, f => battleScript(f) || f.endsWith('/save.js'));
  const { Save, createBattle, WEAPONS, PASSIVES } = vm.runInContext('({ Save, createBattle, WEAPONS, PASSIVES })', context);
  Save.load();
  const game = createBattle({ save: Save });
  game.start('ella');
  return { Save, game, WEAPONS, PASSIVES, writes: () => writes };
}

const ids = ['soulCoin', 'incenseWard', 'boneMirror'];

test('主动技能购买和装备独立，旧档保留镇夜符，双人不继承局外装备', () => {
  const { Save, game, writes } = setup({ coins: 400, paperSkill: 'seal', paperSkills: { seal: 'true', fake: true } });
  assert.equal(game.player.paperSkill, 'ward');
  assert.equal(Save.selectPaperSkill('seal'), false);
  assert.equal(Save.buyPaperSkill('constructor'), false);
  assert.equal(Save.buyPaperSkill('ward'), false);
  assert.ok(Save.buyPaperSkill('lure'));
  assert.equal(Save.buyPaperSkill('lure'), false);
  assert.equal(Save.data.paperSkill, 'ward');
  assert.ok(Save.selectPaperSkill('lure'));
  assert.equal(writes(), 2);
  Save.load();
  game.start('ella');
  assert.equal(game.player.paperSkill, 'lure');
  assert.ok(!game.buildChoices(100).some(c => c.id === 'lure'));
  game.start('ella', 'zhu', { robot: true });
  assert.equal(game.player.paperSkill, 'ward');
  assert.equal(game.partner.paperSkill, 'ward');
  game.start('ella', 'zhu');
  assert.equal(game.player.paperSkill, 'ward');
  assert.equal(Save.data.paperSkill, 'lure');
  assert.ok(Save.buyPaperSkill('seal'));
  assert.ok(Save.selectPaperSkill('seal'));
  game.start('ella');
  assert.equal(game.player.paperSkill, 'seal');
  assert.equal(Save.data.coins, 400 - 160 - 220);
});

test('只允许购买商店技能，公用钱包扣款一次、重载后仍解锁', () => {
  const { Save, WEAPONS, writes } = setup({ coins: 200, lastChar: 'zhu', meta: { swift: 2 }, chars: { bron: true } });
  assert.equal(Save.buySkill('__proto__'), false);
  assert.equal(Save.buySkill('aiIntercept'), false);
  assert.ok(Save.buySkill('soulCoin'));
  assert.ok(!Save.buySkill('soulCoin'));
  assert.ok(!Save.buySkill('boneMirror'));
  assert.equal(Save.data.coins, 200 - WEAPONS.soulCoin.unlockCost);
  assert.equal(writes(), 1);
  Save.load();
  assert.equal(Save.data.skills.soulCoin, true);
  assert.equal(Save.data.lastChar, 'zhu');
  assert.equal(Save.data.meta.swift, 2);
  assert.equal(Save.data.chars.bron, true);
  assert.ok(!Save.buySkill('soulCoin'));
});

test('旧档默认未购，畸形值不会被当成购买记录', () => {
  assert.deepEqual(Object.keys(setup().Save.data.skills), []);
  const { Save } = setup({ skills: { soulCoin: true, incenseWard: 'true', boneMirror: 1, spark: true } });
  assert.deepEqual(Object.keys(Save.data.skills), ['soulCoin']);
});

test('购买只解锁单人升级和宝箱池，开局武器与双人池不变', () => {
  const { Save, game } = setup({ coins: 200 });
  assert.ok(!game.buildChoices(100).some(c => ids.includes(c.id)));
  Save.buySkill('soulCoin');
  game.start('ella');
  assert.deepEqual(Array.from(game.player.weapons, w => w.id), ['spark']);
  game.gainXp(5);
  game.nextLevelUp();
  assert.ok(game.choices.some(c => c.id === 'soulCoin' && c.lv === 1));
  assert.ok(!game.choices.some(c => ['incenseWard', 'boneMirror'].includes(c.id)));
  game.choose(game.choices.findIndex(c => c.id === 'soulCoin'));
  assert.ok(game.player.weapons.some(w => w.id === 'soulCoin'));
  assert.ok(game.buildChoices(100).some(c => c.id === 'soulCoin' && c.lv === 2));
  game.start('ella', 'zhu');
  assert.ok(!game.buildChoices(100).some(c => ids.includes(c.id)));
  assert.ok(!game.buildChoices(100, game.partner).some(c => ids.includes(c.id)));
});

test('香炉留在布置处持续伤害减速；照骨镜只反弹弹幕且会冷却', () => {
  const { game: g } = setup({ skills: { incenseWard: true, boneMirror: true } });
  g.player.weapons.length = 0;
  g.addWeapon('incenseWard'); g.addWeapon('boneMirror');
  g.update(0.02);
  assert.equal(g.zones.length, 0);
  g.player.weapons[0].timer = 0;
  const foe = g.spawnEnemy('brute', 58, 0); foe.speed = 0;
  g.update(0.02);
  const [ward] = g.zones;
  assert.equal(ward.look, 'incense');
  assert.ok(foe.hp < foe.maxHp && foe.slow > 0);
  g.player.x = -25;
  g.update(0.02);
  assert.equal(ward.x, 0);
  g.hurtPlayer(12, foe);
  assert.equal(g.player.hp, 88);
  g.player.iframe = 0;
  const shoot = () => g.ebullets.push({ x: -9, y: 0, vx: -200, vy: 0, r: 5, life: 2, dmg: 8 });
  shoot(); g.updateBullets(0.02);
  assert.equal(g.player.hp, 88);
  const reflected = g.projs.find(p => p.look === 'mirrorBolt');
  assert.ok(reflected.vx > 0 && reflected.owner === g.player);
  shoot(); g.updateBullets(0.02);
  assert.equal(g.player.hp, 80);
  for (let i = 0; i < 10; i++) g.updateProjs(0.02);
  assert.ok(g.player.dmgBy.boneMirror > 0);
});

test('宝箱能抽到已购技能，铜钱会转打第二个目标', () => {
  const { Save, game: g, WEAPONS, PASSIVES } = setup({ coins: 100 });
  Save.buySkill('soulCoin');
  g.player.weapons.length = 0;
  g.player.passives = Object.entries(PASSIVES).map(([id, d]) => ({ id, lv: d.max }));
  for (const id of Object.keys(WEAPONS)) if (id !== 'soulCoin' && !ids.includes(id)) g.player.evolved[id] = true;
  g.openChest(false);
  assert.equal(g.player.weapons[0].id, 'soulCoin');
  assert.equal(g.chest.got[0].name, '追魂铜钱');
  g.closeChest();
  const near = g.spawnEnemy('brute', 75, 0), next = g.spawnEnemy('brute', 140, 0);
  near.speed = next.speed = 0;
  for (let i = 0; i < 20; i++) g.update(0.02);
  assert.ok(near.hp < near.maxHp && next.hp < next.maxHp);
});
