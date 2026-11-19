'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const scripts = ['config.js', 'utils.js', 'weapons.js', 'core.js'].map(file =>
  new vm.Script(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), { filename: file }));

function start(charId, oldSave = null) {
  const context = vm.createContext({
    localStorage: { getItem: () => JSON.stringify(oldSave) },
    Input: { x: 0, y: 0 },
    Sfx: { play() {} },
  });
  for (const script of scripts) script.runInContext(context);
  const { Game, Save, CHARS } = vm.runInContext('({ Game, Save, CHARS })', context);
  Save.load();
  Game.start(charId ?? Save.data.lastChar);
  return { Game, Save, CHARS };
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

const desserts = ['ricecake', 'icecream', 'candy'];

test('开心的升级优先给一个未习得的甜点，其他角色抽不到甜点', () => {
  const { Game } = start('echo');
  const first = Game.buildChoices(3)[0];
  assert.ok(desserts.includes(first.id) && first.lv === 1);
  Game.applyChoice(first);
  const second = Game.buildChoices(3)[0];
  assert.ok(desserts.includes(second.id) && second.lv === 1 && second.id !== first.id);
  assert.equal(start('tuan').Game.buildChoices(100).some(c => desserts.includes(c.id)), false);
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

test('果果的升级优先给土豆或番茄，其他角色抽不到这两种武器', () => {
  const { Game } = start('tuan');
  const first = Game.buildChoices(3)[0];
  assert.ok(['potato', 'tomato'].includes(first.id) && first.lv === 1);
  Game.applyChoice(first);
  const second = Game.buildChoices(3)[0];
  assert.equal(second.id, first.id === 'potato' ? 'tomato' : 'potato');
  assert.equal(start('echo').Game.buildChoices(100).some(c => ['potato', 'tomato'].includes(c.id)), false);
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
