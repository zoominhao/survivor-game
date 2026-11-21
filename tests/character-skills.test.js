'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
const test = require('node:test');
const { battleScript, loadGame } = require('./fixtures/load-game');

function start(charId, oldSave = null) {
  const context = vm.createContext({
    localStorage: { getItem: () => JSON.stringify(oldSave) },
  });
  loadGame(context, file => battleScript(file) || file.endsWith('/save.js') || file.endsWith('/wardrobe.js'));
  const { Game, Save, CHARS, Wardrobe } = vm.runInContext('({ Game: createBattle({ save: Save }), Save, CHARS, Wardrobe })', context);
  Save.load();
  Game.start(charId ?? Save.data.lastChar);
  return { Game, Save, CHARS, Wardrobe };
}

test('旧存档选择仍指向开心，开局携带鼠伴出击', () => {
  const { Game, Save, CHARS } = start(undefined, { lastChar: 'echo', chars: { echo: true }, coins: 38 });
  assert.equal(Game.player.char, 'echo');
  assert.equal(CHARS.echo.name, '小老鼠·开心');
  assert.equal(Game.player.weapons[0].id, 'mouse');
  assert.equal(Save.data.coins, 38);
});

test('鼠伴在附近没有敌人时不出击，出现敌人后追击最近目标', () => {
  const { Game } = start('echo');
  Game.update(1 / 60);
  assert.equal(Game.projs.length, 0);
  const near = Game.spawnEnemy('brute', 85, 0);
  const far = Game.spawnEnemy('brute', 185, 50);
  const initialHp = near.hp;
  for (let i = 0; i < 30; i++) Game.update(1 / 60);
  const damage = Game.player.dmgBy.mouse;
  assert.ok(damage >= 11 && damage <= 13);
  assert.equal(near.hp, initialHp - damage);
  assert.equal(far.hp, far.maxHp);
});

test('其他角色的升级池不含鼠伴出击或百鼠夜行', () => {
  const { Game } = start('ella');
  assert.equal(Game.buildChoices(100).some(choice => ['mouse', 'nightmice'].includes(choice.id)), false);
});

test('六级鼠伴和疾风靴可进化为百鼠夜行并派出五只鼠伴', () => {
  const { Game } = start('echo');
  for (let lv = 2; lv <= 6; lv++) Game.applyChoice({ kind: 'weapon', id: 'mouse', lv });
  assert.equal(Game.buildChoices(3).some(choice => choice.kind === 'evo'), false);
  Game.applyChoice({ kind: 'passive', id: 'swift', lv: 1 });
  const evolution = Game.buildChoices(3)[0];
  assert.equal(evolution.to, 'nightmice');
  Game.applyChoice(evolution);
  Game.spawnEnemy('brute', 220, 60);
  Game.spawnEnemy('brute', 100, -80);
  Game.update(1 / 60);
  assert.equal(Game.projs.length, 5);
  assert.ok(Game.projs.every(b => b.wid === 'nightmice' && b.pierce === 3));
  assert.equal(new Set(Game.projs.map(b => b.tg)).size, 2);
});

test('旧存档选择仍指向果果，开局携带灵猴踏枝', () => {
  const { Game, Save, CHARS } = start(undefined, { lastChar: 'tuan', chars: { tuan: true }, wins: 2 });
  assert.equal(Game.player.char, 'tuan');
  assert.equal(CHARS.tuan.name, '小啾咪·果果');
  assert.equal(Game.player.weapons[0].id, 'monkey');
  assert.equal(Game.player.st.amount, 1);
  assert.equal(Game.player.hp, 90);
  assert.equal(Save.data.wins, 2);
});

test('灵猴落地才造成范围伤害，不会命中远处敌人', () => {
  const { Game } = start('tuan');
  const far = Game.spawnEnemy('brute', 500, 0);
  Game.update(1 / 60);
  assert.equal(Game.zones.length, 0);
  const target = Game.spawnEnemy('brute', 89, 0);
  Game.spawnEnemy('brute', 103, 20);
  const bystander = Game.spawnEnemy('brute', 103, -34);
  for (let i = 0; i < 15; i++) Game.update(1 / 60);
  assert.equal(Game.zones.filter(z => z.type === 'monkey').length, 2);
  assert.equal(target.hp, target.maxHp);
  assert.equal(bystander.hp, bystander.maxHp);
  for (let i = 0; i < 28; i++) Game.update(1 / 60);
  assert.ok(target.hp < target.maxHp);
  assert.ok(bystander.hp < bystander.maxHp);
  assert.equal(far.hp, far.maxHp);
  assert.ok(Game.player.dmgBy.monkey > 0);
});

test('六级灵猴搭配广域透镜后进化为群猴闹山', () => {
  const { Game } = start('tuan');
  for (let lv = 2; lv <= 6; lv++) Game.applyChoice({ kind: 'weapon', id: 'monkey', lv });
  assert.equal(Game.buildChoices(3).some(choice => choice.kind === 'evo'), false);
  Game.applyChoice({ kind: 'passive', id: 'area', lv: 1 });
  const evolution = Game.buildChoices(3)[0];
  assert.equal(evolution.to, 'monkeytroop');
  Game.applyChoice(evolution);
  Game.spawnEnemy('brute', 120, 0);
  Game.update(1 / 60);
  assert.equal(Game.zones.length, 4);
  assert.ok(Game.zones.every(z => z.wid === 'monkeytroop' && z.r > 73));
});

test('其他角色不能在升级中抽到果果专属技能，环绕萤火仍可获得', () => {
  const { Game } = start('echo');
  const choices = Game.buildChoices(100);
  assert.equal(choices.some(choice => ['monkey', 'monkeytroop'].includes(choice.id)), false);
  assert.ok(choices.some(choice => choice.id === 'orbit'));
});

const echoExtras = ['ricecake', 'icecream', 'candy', 'watermelon', 'basketball', 'bubbletea', 'drumstick'];

test('开心升级优先获得未习得的专属武器，其他角色抽不到这些武器', () => {
  const { Game } = start('echo');
  const pool = Game.buildChoices(100);
  assert.ok(echoExtras.every(id => pool.some(c => c.id === id)));
  const first = Game.buildChoices(3)[0];
  assert.ok(echoExtras.includes(first.id) && first.lv === 1);
  Game.applyChoice(first);
  const second = Game.buildChoices(3)[0];
  assert.ok(echoExtras.includes(second.id) && second.lv === 1 && second.id !== first.id);
  assert.equal(start('tuan').Game.buildChoices(100).some(c => echoExtras.includes(c.id)), false);
});

test('开心的回血鸡腿只在低血量时自动触发，升级会提高回复并缩短冷却', () => {
  const Game = foodRun('echo', 'drumstick');
  const p = Game.player, w = p.weapons[0];
  p.hp = 63;
  Game.update(1 / 60);
  assert.equal(p.hp, 63);
  assert.equal(w.timer, 0);
  p.hp = 54;
  Game.update(1 / 60);
  assert.ok(Math.abs(p.hp - 68.4) < 0.001);
  assert.equal(w.timer, 12);
  assert.ok(Game.fx.some(f => f.type === 'drumstickHeal'));
  p.hp = 45;
  Game.update(1 / 60);
  assert.equal(p.hp, 45);
  for (let lv = 2; lv <= 6; lv++) Game.applyChoice({ kind: 'weapon', id: 'drumstick', lv });
  w.timer = 0;
  Game.update(1 / 60);
  assert.ok(Math.abs(p.hp - 67.5) < 0.001);
  assert.equal(w.timer, 9.5);
});

test('珍珠奶茶命中后留下减速区，后来踩进来的敌人也会受伤', () => {
  const Game = foodRun('echo', 'bubbletea');
  const target = stationaryEnemy(Game, 126, 0);
  for (let i = 0; i < 28; i++) Game.update(1 / 60);
  assert.ok(target.hp < target.maxHp);
  const tea = Game.zones.find(z => z.look === 'bubbletea');
  assert.ok(tea && tea.life > 2);
  const late = stationaryEnemy(Game, tea.x, tea.y + 30);
  const far = stationaryEnemy(Game, tea.x, tea.y + 146);
  for (let i = 0; i < 40; i++) Game.update(1 / 60);
  assert.ok(late.hp < late.maxHp && late.slowT > 0);
  assert.equal(late.slow, 0.38);
  assert.equal(far.hp, far.maxHp);
  for (let i = 0; i < 104; i++) Game.update(1 / 60);
  assert.equal(Game.zones.some(z => z.look === 'bubbletea'), false);
  assert.match(Game.describe({ kind: 'weapon', id: 'bubbletea', lv: 4 }).desc, /持续 \+0\.7 秒/);
});

function foodRun(charId, id) {
  const { Game } = start(charId);
  Game.player.weapons = [];
  Game.addWeapon(id);
  return Game;
}

function stationaryEnemy(Game, x, y) {
  const e = Game.spawnEnemy('brute', x, y);
  e.speed = 0;
  return e;
}

test('年糕留在原地，踩中才伤害并减速附近敌人', () => {
  const Game = foodRun('echo', 'ricecake');
  const trigger = stationaryEnemy(Game, 140, 0);
  const nearby = stationaryEnemy(Game, 53, 0);
  const far = stationaryEnemy(Game, 120, 90);
  Game.update(1 / 60);
  assert.equal(Game.zones.length, 1);
  assert.equal(nearby.hp, nearby.maxHp);
  Game.player.x = -90;
  trigger.x = 0;
  Game.update(1 / 60);
  assert.equal(Game.zones.length, 0);
  for (const e of [trigger, nearby]) {
    assert.ok(e.hp < e.maxHp);
    assert.equal(e.slow, 0.55);
  }
  assert.equal(far.hp, far.maxHp);
});

test('甜筒碰撞造成伤害和减速，不伤害远处敌人', () => {
  const Game = foodRun('echo', 'icecream');
  const nearby = stationaryEnemy(Game, 64, 0);
  const far = stationaryEnemy(Game, 220, 0);
  Game.update(1 / 60);
  assert.ok(nearby.hp < nearby.maxHp);
  assert.equal(nearby.slow, 0.32);
  assert.equal(far.hp, far.maxHp);
});

test('彩糖连发射出三种颜色，命中后记录糖果的伤害', () => {
  const Game = foodRun('echo', 'candy');
  const target = stationaryEnemy(Game, 245, 0);
  for (let i = 0; i < 12; i++) Game.update(1 / 60);
  assert.equal(Game.projs.length, 3);
  assert.equal(new Set(Game.projs.map(b => b.color)).size, 3);
  assert.ok(Game.projs.every(b => b.look === 'candy'));
  for (let i = 0; i < 30; i++) Game.update(1 / 60);
  assert.ok(target.hp < target.maxHp && Game.player.dmgBy.candy > 0);
});

test('果果的升级优先给未习得的专属技能，其他角色不能抽到', () => {
  const { Game } = start('tuan');
  const extras = ['potato', 'tomato', 'mango', 'exampaper'];
  const pool = Game.buildChoices(100);
  assert.ok(extras.every(id => pool.some(choice => choice.id === id)));
  const first = Game.buildChoices(3)[0];
  assert.ok(extras.includes(first.id) && first.lv === 1);
  Game.applyChoice(first);
  const second = Game.buildChoices(3)[0];
  assert.ok(extras.includes(second.id) && second.id !== first.id && second.lv === 1);
  assert.equal(start('echo').Game.buildChoices(100).some(c => extras.includes(c.id)), false);
});

test('土豆朝上滚动，可以连续撞中多只夜兽但不会打到身后', () => {
  const Game = foodRun('tuan', 'potato');
  const front = [stationaryEnemy(Game, 0, -92), stationaryEnemy(Game, 0, -174)];
  const behind = stationaryEnemy(Game, 0, 85);
  Game.player.dirx = 0; Game.player.diry = -1;
  Game.update(1 / 60);
  assert.equal(Game.projs.length, 2);
  assert.ok(Game.projs.every(b => b.look === 'potato' && b.y < 0));
  for (let i = 0; i < 32; i++) Game.update(1 / 60);
  assert.ok(front.every(e => e.hp < e.maxHp && e.y < -90));
  assert.equal(behind.hp, behind.maxHp);
});

test('番茄命中留下番茄酱，随后进入的夜兽也受伤，酱汁按时消散', () => {
  const Game = foodRun('tuan', 'tomato');
  const target = stationaryEnemy(Game, 128, 0);
  for (let i = 0; i < 30; i++) Game.update(1 / 60);
  assert.ok(target.hp < target.maxHp);
  assert.equal(Game.projs.length, 0);
  const sauce = Game.zones.find(z => z.look === 'tomato');
  assert.ok(sauce);
  const late = stationaryEnemy(Game, sauce.x, sauce.y + 24);
  for (let i = 0; i < 35; i++) Game.update(1 / 60);
  assert.ok(late.hp < late.maxHp && Game.player.dmgBy.tomato > 0);
  for (let i = 0; i < 75; i++) Game.update(1 / 60);
  assert.equal(Game.zones.some(z => z.look === 'tomato'), false);
  assert.match(Game.describe({ kind: 'weapon', id: 'tomato', lv: 4 }).desc, /持续 \+0\.8 秒/);
});

test('西瓜落地后才炸开，同时伤害落点附近的夜兽', () => {
  const Game = foodRun('echo', 'watermelon');
  const target = stationaryEnemy(Game, 125, 0);
  const nearby = stationaryEnemy(Game, 142, 48);
  const far = stationaryEnemy(Game, 225, 92);
  for (let i = 0; i < 12; i++) Game.update(1 / 60);
  assert.ok(Game.zones.some(z => z.type === 'watermelon'));
  assert.equal(target.hp, target.maxHp);
  for (let i = 0; i < 25; i++) Game.update(1 / 60);
  assert.ok(target.hp < target.maxHp && nearby.hp < nearby.maxHp);
  assert.equal(far.hp, far.maxHp);
  assert.equal(Game.zones.some(z => z.type === 'watermelon'), false);
});

test('一级篮球弹向下一只夜兽，不会重复命中或继续弹射', () => {
  const Game = foodRun('echo', 'basketball');
  const first = stationaryEnemy(Game, 82, 0);
  const second = stationaryEnemy(Game, 133, 76);
  const third = stationaryEnemy(Game, 209, 73);
  for (let i = 0; i < 32; i++) Game.update(1 / 60);
  const damage = [first, second].map(e => e.maxHp - e.hp);
  assert.ok(damage.every(d => d >= 11 && d <= 13));
  assert.equal(third.hp, third.maxHp);
  assert.equal(Game.projs.length, 0);
  assert.match(Game.describe({ kind: 'weapon', id: 'basketball', lv: 3 }).desc, /弹射次数 \+1/);
});

test('芒果干只在低于阈值时回血，不在冷却期间重复触发', () => {
  const Game = foodRun('tuan', 'mango');
  const p = Game.player, w = p.weapons[0];
  p.hp = 77;
  Game.update(1 / 60);
  assert.equal(p.hp, 77);
  assert.equal(w.timer, 0);
  p.hp = 62;
  Game.update(1 / 60);
  assert.equal(p.hp, 71);
  assert.ok(Game.fx.some(f => f.type === 'mangoHeal'));
  p.hp = 55;
  Game.update(1 / 60);
  assert.equal(p.hp, 55);
  w.timer = 0.01;
  Game.update(1 / 60);
  assert.equal(p.hp, 64);
});

test('试卷挡下致命攻击并减速附近夜兽，用完后才开始充能', () => {
  const Game = foodRun('tuan', 'exampaper');
  const p = Game.player, w = p.weapons[0];
  const near = stationaryEnemy(Game, 45, 0), far = stationaryEnemy(Game, 205, 2);
  for (const e of [near, far]) Game.grid.insert(e);
  Game.hurtPlayer(99, null);
  assert.equal(p.hp, 90);
  assert.equal(w.guards, 0);
  assert.equal(w.timer, 9);
  assert.equal(near.slow, 0.4);
  assert.equal(far.slow, 0);
  p.iframe = 0;
  Game.hurtPlayer(12, null);
  assert.equal(p.hp, 78);
  w.timer = 0.01;
  Game.update(1 / 60);
  assert.equal(w.guards, 1);
});

test('四级试卷有两层，第一张用掉后不提前充能', () => {
  const Game = foodRun('tuan', 'exampaper');
  for (let lv = 2; lv <= 4; lv++) Game.applyChoice({ kind: 'weapon', id: 'exampaper', lv });
  const p = Game.player, w = p.weapons[0];
  assert.equal(w.guards, 2);
  Game.hurtPlayer(10, null);
  assert.equal(w.guards, 1);
  assert.equal(w.timer, 0);
  p.iframe = 0;
  Game.hurtPlayer(10, null);
  assert.equal(p.hp, 90);
  assert.equal(w.guards, 0);
  assert.ok(w.timer > 0);
});

test('成长装饰在二、五、十级分别进入下一阶段', () => {
  const { Wardrobe } = start('echo');
  assert.deepEqual([1, 2, 4, 5, 9, 10, 50].map(level => Wardrobe.stage(level)), [0, 1, 1, 2, 2, 3, 3]);
});

test('只有已选完的升级才点亮装饰，重开后恢复初始造型', () => {
  const { Game, Wardrobe } = start('tuan');
  Game.player.level = 10;
  Game.pending = 2;
  Game.state = 'levelup';
  Game.choices = [{ kind: 'coins' }];
  Game.choose(0);
  assert.equal(Wardrobe.stage(Game.player.level, Game.pending), 2);
  assert.equal(Game.fx.length, 0);
  Game.choices = [{ kind: 'coins' }];
  Game.choose(0);
  assert.equal(Wardrobe.stage(Game.player.level, Game.pending), 3);
  assert.equal(Game.fx.filter(f => f.type === 'outfitPulse').length, 1);
  Game.start('tuan');
  assert.equal(Wardrobe.stage(Game.player.level, Game.pending), 0);
});

test('川妹·霄霄保留角色 ID 和专属武器，其他角色不能抽到她的武器', () => {
  const { Game, Save, CHARS } = start('xiaoxiao', { lastChar: 'echo', coins: 34 });
  assert.equal(CHARS.xiaoxiao.name, '川妹·霄霄');
  assert.equal(start(undefined, { lastChar: 'xiaoxiao' }).Game.player.char, 'xiaoxiao');
  assert.equal(Game.player.weapons[0].id, 'latiao');
  assert.equal(Game.player.hp, 110);
  assert.equal(Game.player.st.armor, 1);
  assert.equal(Save.data.chars.xiaoxiao, true);
  assert.equal(Save.data.lastChar, 'echo');
  assert.equal(Save.data.coins, 34);
  const skills = ['latiao', 'gallop', 'momroar', 'skincare', 'goldIngot'];
  assert.ok(skills.every(id => Game.buildChoices(100).some(c => c.id === id)));
  assert.ok(skills.includes(Game.buildChoices(3)[0].id));
  assert.equal(start('echo').Game.buildChoices(100).some(c => skills.includes(c.id)), false);
});

test('香辣连发朝夜兽投出两条辣条', () => {
  const { Game } = start('xiaoxiao');
  stationaryEnemy(Game, 240, 0);
  for (let i = 0; i < 10; i++) Game.update(1 / 60);
  assert.equal(Game.projs.length, 2);
  assert.ok(Game.projs.every(b => b.look === 'latiao' && b.vx > 0));
});

test('金元宝落地后伤害并震退落点附近的夜兽', () => {
  const Game = foodRun('xiaoxiao', 'goldIngot');
  const target = stationaryEnemy(Game, 125, 0);
  const nearby = stationaryEnemy(Game, 163, 25);
  const far = stationaryEnemy(Game, 240, 0);
  for (let i = 0; i < 12; i++) Game.update(1 / 60);
  assert.ok(Game.zones.some(z => z.type === 'goldIngot'));
  assert.equal(target.hp, target.maxHp);
  for (let i = 0; i < 23; i++) Game.update(1 / 60);
  assert.ok(target.hp < target.maxHp && nearby.hp < nearby.maxHp && nearby.kx > 0);
  assert.equal(far.hp, far.maxHp);
  assert.ok(Game.player.dmgBy.goldIngot > 0);
  for (let lv = 2; lv <= 5; lv++) Game.applyChoice({ kind: 'weapon', id: 'goldIngot', lv });
  Game.player.weapons[0].timer = 0;
  Game.update(1 / 60);
  assert.equal(Game.zones.filter(z => z.type === 'goldIngot').length, 2);
});

test('万马奔腾朝移动方向派出三匹能穿透的小马', () => {
  const Game = foodRun('xiaoxiao', 'gallop');
  Game.player.dirx = 0; Game.player.diry = -1;
  Game.update(1 / 60);
  assert.equal(Game.projs.length, 3);
  assert.ok(Game.projs.every(b => b.look === 'pony' && b.vy < 0 && b.pierce === 3));
  assert.ok(Game.projs[0].vx < Game.projs[2].vx);
});

test('妈妈怒吼伤害并震退附近夜兽，不会打到远处目标', () => {
  const Game = foodRun('xiaoxiao', 'momroar');
  const near = stationaryEnemy(Game, 72, 0), far = stationaryEnemy(Game, 235, 0);
  for (let i = 0; i < 23; i++) Game.update(1 / 60);
  assert.ok(near.hp < near.maxHp && near.x > 72);
  assert.equal(far.hp, far.maxHp);
  assert.ok(Game.player.dmgBy.momroar > 0);
});

test('水润护肤在需要时回复生命，并且只在护肤时间内减伤', () => {
  const Game = foodRun('xiaoxiao', 'skincare');
  const p = Game.player, w = p.weapons[0];
  Game.update(1 / 60);
  assert.equal(w.on, 0);
  p.hp = 90;
  Game.update(1 / 60);
  assert.equal(p.hp, 96.6);
  assert.equal(w.on, 3);
  Game.hurtPlayer(31, null);
  assert.equal(p.hp, 75.6);
  w.on = 0.02;
  Game.update(1 / 60); Game.update(1 / 60);
  assert.equal(w.on, 0);
  p.iframe = 0;
  Game.hurtPlayer(31, null);
  assert.ok(Math.abs(p.hp - 45.6) < 0.001);
});

test('工程师·竹默认解锁，旧存档不切角色，代码、机票、面条和 AI 为专属技能', () => {
  const { Game, Save, CHARS } = start('zhu', { lastChar: 'tuan', chars: { tuan: true }, coins: 52 });
  assert.equal(CHARS.zhu.name, '工程师·竹');
  assert.equal(Save.data.chars.zhu, true);
  assert.equal(Save.data.lastChar, 'tuan');
  assert.equal(Save.data.coins, 52);
  assert.equal(Game.player.weapons[0].id, 'codeShard');
  assert.equal(Game.player.st.cd, 0.94);
  const exclusive = ['codeShard', 'boardingPass', 'noodleRing', 'aiIntercept'];
  const pool = Game.buildChoices(100);
  assert.ok(exclusive.every(id => pool.some(c => c.id === id)));
  assert.ok(exclusive.slice(1).includes(Game.buildChoices(3)[0].id));
  assert.ok(!start('ella').Game.buildChoices(100).some(c => exclusive.includes(c.id) || c.id === 'fullBuild'));
});

test('代码连发自动瞄准最近的怪，六级加急速沙漏可进化并溅射', () => {
  const { Game } = start('zhu');
  const near = stationaryEnemy(Game, 76, 0);
  const side = stationaryEnemy(Game, 84, 34);
  stationaryEnemy(Game, -190, 0);
  Game.update(1 / 60);
  assert.equal(Game.projs[0].look, 'code');
  assert.ok(Game.projs[0].vx > 0 && Math.abs(Game.projs[0].vy) < 40);
  for (let lv = 2; lv <= 6; lv++) Game.applyChoice({ kind: 'weapon', id: 'codeShard', lv });
  assert.ok(!Game.buildChoices(3).some(c => c.to === 'fullBuild'));
  Game.applyChoice({ kind: 'passive', id: 'haste', lv: 1 });
  const evo = Game.buildChoices(3)[0];
  assert.equal(evo.to, 'fullBuild');
  Game.projs.length = 0;
  Game.applyChoice(evo);
  const hp = [near.hp, side.hp];
  for (let i = 0; i < 10; i++) Game.update(1 / 60);
  assert.ok(near.hp < hp[0] && side.hp < hp[1]);
  assert.ok(Game.player.dmgBy.fullBuild > 0);
});

test('机票沿最近的移动方向飞，不追向相反一侧的敌人，并能穿透多个目标', () => {
  const Game = foodRun('zhu', 'boardingPass');
  Game.player.dirx = -1; Game.player.diry = 0;
  const near = stationaryEnemy(Game, -50, 0), behind = stationaryEnemy(Game, -90, 0);
  const opposite = stationaryEnemy(Game, 45, 0);
  Game.update(1 / 60);
  assert.equal(Game.projs[0].look, 'ticket');
  assert.ok(Game.projs[0].vx < 0 && Game.projs[0].pierce > 2);
  for (let i = 0; i < 14; i++) Game.update(1 / 60);
  assert.ok(near.hp < near.maxHp && behind.hp < behind.maxHp);
  assert.equal(opposite.hp, opposite.maxHp);
});

test('面条只在夜兽靠近时出手，短暂牵制近处的怪，不波及远处', () => {
  const Game = foodRun('zhu', 'noodleRing');
  const far = stationaryEnemy(Game, 230, 0);
  Game.update(1 / 60);
  assert.ok(!Game.zones.length);
  Game.player.weapons[0].timer = 0;
  const near = stationaryEnemy(Game, 64, 0);
  Game.update(1 / 60);
  assert.equal(Game.zones[0].look, 'noodles');
  for (let i = 0; i < 22; i++) Game.update(1 / 60);
  assert.ok(near.hp < near.maxHp && near.slow > 0.4 && near.slowT > 0);
  assert.equal(far.hp, far.maxHp);
  assert.equal(far.slow, 0);
});

test('AI 拦截等待来敌，预测怪群走向并优先打中更密的一群', () => {
  const Game = foodRun('zhu', 'aiIntercept');
  Game.update(0.02);
  assert.equal(Game.zones.length, 0);
  assert.ok(Game.player.weapons[0].timer < 0.4);
  const single = stationaryEnemy(Game, 55, 0);
  const crowd = [[205, 6], [222, -16], [230, 22]].map(([x, y]) => stationaryEnemy(Game, x, y));
  for (const e of crowd) e.speed = 41;
  Game.player.weapons[0].timer = 0;
  Game.update(0.02);
  const [scan] = Game.zones;
  assert.equal(scan.look, 'aiScan');
  assert.ok(scan.x > 165 && scan.x < 200);
  assert.ok(crowd.every(e => e.hp === e.maxHp));
  for (let i = 0; i < 29; i++) Game.update(0.02);
  assert.ok(crowd.every(e => e.hp < e.maxHp));
  assert.equal(single.hp, single.maxHp);
  assert.ok(Game.player.dmgBy.aiIntercept > 0);
});

test('每名角色各有四档衣色，六景穿不同外套，联机按各自选完的卡判定', () => {
  const { Game, CHARS, Wardrobe } = start('zhu');
  const looks = Object.values(CHARS).map(c => c.look);
  assert.equal(new Set(looks).size, looks.length);
  for (const look of looks) {
    assert.equal(new Set([0, 1, 2, 3].map(t => Wardrobe.style(look, t).main)).size, 4);
  }
  assert.equal(new Set(['dusk', 'night', 'bamboo', 'rain', 'snow', 'dawn'].map(s => Wardrobe.style('zhu', 1, s).layer)).size, 6);
  Game.start('zhu', 'xiaoxiao');
  Game.player.level = Game.partner.level = 5;
  Game.pending = 1;
  assert.equal(Wardrobe.forPlayer(Game, Game.player, 'zhu', 'rain').tier, 1);
  assert.equal(Wardrobe.forPlayer(Game, Game.partner, 'xiaoxiao', 'rain').tier, 2);
  assert.equal(Wardrobe.forPlayer(Game, Game.partner, 'xiaoxiao', 'snow').layer, 'snow');
});
