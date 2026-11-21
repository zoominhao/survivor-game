'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
const test = require('node:test');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup(char = 'ruo', mate, data = { coins: 37, lastChar: 'zhu' }) {
  let stored = JSON.stringify(data);
  const scope = vm.createContext({ localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } } });
  loadGame(scope, f => battleScript(f) || f.endsWith('/save.js') || f.endsWith('/lan-state.js'));
  const session = vm.runInContext(`(() => {
    Save.load();
    return { Game: createBattle({ save: Save }), Save, CHARS, WEAPONS, LanState };
  })()`, scope);
  session.Game.start(char, mate);
  session.Game.spawn = () => {};
  return session;
}

function dummy(g, x, y, type = 'brute') {
  const e = g.spawnEnemy(type, x, y);
  e.speed = 0; e.hp = e.maxHp = 750;
  return e;
}

test('六位江湖客默认锁定，仍携带各自的独占起手武器', () => {
  const { Game: g, CHARS, Save, WEAPONS } = setup();
  const folk = Object.entries(CHARS).filter(([, c]) => c.group === 'folk');
  assert.equal(folk.length, 6);
  assert.equal(new Set(folk.map(([, c]) => c.weapon)).size, 6);
  assert.equal(Save.data.lastChar, 'zhu');
  assert.equal(Save.data.coins, 37);
  for (const [id, c] of folk) {
    assert.ok(c.cost > 0);
    assert.equal(Save.data.chars[id], undefined);
    assert.equal(WEAPONS[c.weapon].exclusive, id);
    g.start(id);
    assert.equal(g.player.weapons[0].id, c.weapon);
    assert.ok(!g.buildChoices(100).some(choice => folk.some(([other, ch]) => other !== id && choice.id === ch.weapon)));
    for (let lv = 2; lv <= 6; lv++) g.applyChoice({ kind: 'weapon', id: c.weapon, lv });
    assert.equal(g.player.weapons[0].lv, 6);
    assert.ok(Object.values(g.player.weapons[0].s).every(Number.isFinite));
  }
});

test('江湖客用金币一次性解锁，读档保留已拥有角色，余额不足不改变存档', () => {
  const { Save } = setup('ella', null, { coins: 260, chars: { wen: true }, lastChar: 'wen' });
  assert.equal(Save.data.lastChar, 'wen');
  assert.equal(Save.buyChar('wen'), false);
  assert.equal(Save.buyChar('yan'), false);
  assert.equal(Save.data.coins, 260);
  assert.equal(Save.buyChar('shao'), true);
  assert.equal(Save.buyChar('shao'), false);
  Save.load();
  assert.equal(Save.data.coins, 0);
  assert.equal(Save.data.chars.wen, true);
  assert.equal(Save.data.chars.shao, true);
  assert.equal(Save.data.lastChar, 'shao');
});

test('折鹤命中时分成两枚纸刃，纸刃沿用施放者且不重复撞同一目标', () => {
  const { Game: g } = setup('ruo');
  const e = dummy(g, 86, 0);
  for (let i = 0; i < 13; i++) g.update(1 / 60);
  const flakes = g.projs.filter(b => b.look === 'paperFlake');
  assert.equal(flakes.length, 2);
  assert.notEqual(Math.sign(flakes[0].vy), Math.sign(flakes[1].vy));
  assert.ok(flakes.every(f => f.owner === g.player && f.hit.has(e.id)));
  const hp = e.hp;
  assert.ok(hp < e.maxHp);
  for (let i = 0; i < 20; i++) g.update(1 / 60);
  assert.equal(e.hp, hp);
});

test('梆子分三拍扩圈，后出的两圈不会在第一拍提前命中', () => {
  const { Game: g } = setup('wen');
  const foe = dummy(g, 56, 0);
  g.update(0.02);
  const rings = g.zones.filter(z => z.look === 'watchClack');
  assert.equal(rings.length, 3);
  assert.ok(rings[0].r > rings[1].r && rings[2].t > rings[1].t && rings[2].kb > rings[0].kb);
  for (let i = 0; i < 7; i++) g.update(0.02);
  assert.deepEqual(Array.from(rings, ring => ring.hit.has(foe.id)), [true, false, false]);
  for (let i = 0; i < 38; i++) g.update(0.02);
  assert.deepEqual(Array.from(rings, ring => ring.hit.has(foe.id)), [true, true, true]);
});

test('药雾持续伤怪，为圈内两位活人补血，但不能把倒下的人治起来', () => {
  const { Game: g } = setup('shao', 'ella');
  g.player.hp = 53; g.partner.hp = 44;
  const e = dummy(g, 65, 0);
  for (let i = 0; i < 37; i++) g.update(0.02);
  assert.ok(g.player.hp > 53 && g.partner.hp > 44 && e.hp < e.maxHp && e.slow > 0);
  g.partner.hp = 0; g.rescue.used = true;
  for (let i = 0; i < 60; i++) g.update(0.02);
  assert.equal(g.partner.hp, 0);
});

test('船桨前方水路向两边分流，不打身后和水路外的怪', () => {
  const { Game: g } = setup('du');
  const a = dummy(g, 86, -22), b = dummy(g, 130, 23), back = dummy(g, -75, 0), outside = dummy(g, 100, 89);
  for (const e of [a, b, back, outside]) g.grid.insert(e);
  g.stepLoadout(g.player, 0.02);
  assert.ok(a.hp < a.maxHp && b.hp < b.maxHp && a.ky < 0 && b.ky > 0);
  assert.equal(back.hp, back.maxHp);
  assert.equal(outside.hp, outside.maxHp);
  assert.equal(g.fx.at(-1).type, 'tideOar');
});

test('绣娘的线连接两只目标，沿线的第三只也减速，线外不受影响', () => {
  const { Game: g } = setup('su');
  const a = dummy(g, 88, -32), b = dummy(g, 88, 32), over = dummy(g, 106, 0), outside = dummy(g, 88, 115);
  for (const e of [a, b, over, outside]) g.grid.insert(e);
  g.stepLoadout(g.player, 0.02);
  for (const target of [a, b, over]) assert.ok(target.hp < target.maxHp && target.slow > 0);
  assert.equal(outside.hp, outside.maxHp);
  assert.equal(g.fx.at(-1).type, 'scarletThread');
});

test('傩面改变近战怪的追踪而不诱走远程怪或 Boss，到期会在原地炸开', () => {
  const { Game: g } = setup('yan');
  const bait = dummy(g, 164, 0);
  g.stepLoadout(g.player, 0.02);
  const [mask] = g.zones;
  assert.equal(mask.type, 'decoy');
  const melee = g.spawnEnemy('shade', 50, 0), ranged = g.spawnEnemy('spitter', 200, 0);
  assert.equal(g.enemyTarget(melee), mask);
  assert.equal(g.enemyTarget(ranged), g.player);
  assert.equal(g.enemyTarget({ ...melee, boss: true }), g.player);
  ranged.shootT = 30;
  g.updateEnemies(0.03);
  assert.ok(melee.x > 50);
  assert.ok(Math.abs(ranged.x - 200) < 0.01 && Math.abs(ranged.y) > 0);
  g.grid.insert(bait);
  mask.life = 0.01;
  g.updateZones(0.02);
  assert.ok(bait.hp < bait.maxHp);
  assert.ok(g.zones.every(z => z.type !== 'decoy'));
});

test('六位角色均可作为来客，战斗快照保留其技能的投射物、场地或效果', () => {
  const { Game: g, LanState } = setup();
  const fx = { ruo: 'paperCrane', wen: 'watchClack', shao: 'herbalFog', du: 'tideOar', su: 'scarletThread', yan: 'maskEcho' };
  for (const [id, signature] of Object.entries(fx)) {
    g.start('ella', id);
    dummy(g, 96, 0);
    g.update(0.02);
    const frame = LanState.readFrame(JSON.parse(JSON.stringify(LanState.packFrame(g))));
    assert.equal(frame.player.char, id);
    assert.ok([...frame.projs, ...frame.zones, ...frame.fx].some(a => (a.look || a.type) === signature), id);
  }
});

test('六位江湖客满级加指定被动才出现进化，可应用且能同步来客的装备', () => {
  const { Game: g, CHARS, WEAPONS, LanState } = setup();
  for (const [id, char] of Object.entries(CHARS).filter(([, c]) => c.group === 'folk')) {
    g.start('ella', id);
    const p = g.partner, { to, need } = WEAPONS[char.weapon].evo;
    g.applyChoice({ kind: 'passive', id: need, lv: 1 }, p);
    assert.ok(!g.buildChoices(3, p).some(c => c.kind === 'evo'));
    for (let lv = 2; lv <= 6; lv++) g.applyChoice({ kind: 'weapon', id: char.weapon, lv }, p);
    p.passives.length = 0;
    assert.ok(!g.buildChoices(3, p).some(c => c.kind === 'evo'));
    g.applyChoice({ kind: 'passive', id: need, lv: 1 }, p);
    const choice = g.buildChoices(3, p).find(c => c.kind === 'evo');
    assert.equal(choice.to, to);
    g.applyChoice(choice, p);
    assert.equal(p.weapons[0].id, to);
    assert.equal(LanState.readFrame(LanState.packFrame(g)).player.weapons[0].id, to);
  }
});

test('百鹤回巢的纸刃会再折小鹤，继承命中名单并停止分裂', () => {
  const { Game: g } = setup('ruo');
  const a = dummy(g, 80, 0), b = dummy(g, 98, 42), c = dummy(g, 173, -40);
  const flake = { x: b.x, y: b.y, vx: 0, vy: 0, dmg: 18, wid: 'paperFlock', color: '#fff0bd',
    r: 4, life: 0.5, pierce: 1, look: 'paperFlake', refold: 0.82 };
  g.addProj(flake);
  flake.hit.add(a.id);
  for (const e of [a, b, c]) g.grid.insert(e);
  g.updateProjs(0.01);
  assert.equal(g.projs.length, 1);
  const [crane] = g.projs;
  assert.equal(crane.look, 'paperKite');
  assert.equal(crane.tg, c);
  assert.ok(crane.hit.has(a.id) && crane.hit.has(b.id) && !crane.refold && !crane.split);
});

test('逐风回生随主人缓慢移动仍能治疗，回更音浪往原先的位置拉怪', () => {
  const { Game: g } = setup('shao');
  g.player.weapons.length = 0;
  g.addWeapon('driftingMist');
  g.player.hp = 70;
  g.stepLoadout(g.player, 0.02);
  const [fog] = g.zones;
  const origin = fog.x;
  g.player.x += 135;
  g.updateZones(0.4);
  assert.ok(fog.x > origin && fog.x < g.player.x && g.player.hp > 70);
  g.start('wen');
  g.player.weapons.length = 0;
  g.addWeapon('returnClack');
  const foe = dummy(g, 90, 0);
  g.grid.insert(foe);
  g.stepLoadout(g.player, 0.02);
  const wave = g.zones.find(z => z.recall);
  assert.ok(wave && wave.t > 0);
  for (let i = 0; i < 5; i++) g.updateZones(0.16);
  foe.kx = 0;
  for (let i = 0; i < 4; i++) g.updateZones(0.16);
  assert.ok(wave.hit.has(foe.id) && foe.kx < 0);
});

test('逆潮留痕影响后来才踏入的怪，三才红阵不重复命中，双傩分两边爆开', () => {
  const { Game: g } = setup('du');
  const equip = id => { g.player.weapons.length = 0; g.addWeapon(id); g.grid.clear(); };
  equip('undertow');
  const front = dummy(g, 102, 0), late = dummy(g, 143, 98);
  g.grid.insert(front);
  g.stepLoadout(g.player, 0.02);
  late.y = 12;
  g.grid.insert(late);
  g.updateZones(0.02);
  assert.ok(late.slow > 0 && late.hp === late.maxHp);
  g.start('su');
  equip('threadNet');
  const corners = [dummy(g, 80, 0), dummy(g, 110, 65), dummy(g, 110, -65)];
  for (const e of corners) g.grid.insert(e);
  g.stepLoadout(g.player, 0.02);
  assert.equal(g.fx.filter(f => f.type === 'scarletThread').length, 3);
  for (const e of corners) assert.ok(e.maxHp - e.hp > 38 && e.maxHp - e.hp < 54);
  g.start('yan');
  equip('twinMasks');
  dummy(g, 170, 0);
  g.stepLoadout(g.player, 0.02);
  const [one, two] = g.zones;
  assert.ok(one.y < 0 && two.y > 0 && one.life < two.life);
  g.updateZones(one.life + 0.01);
  assert.equal(g.zones.length, 1);
});
