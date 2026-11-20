'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const scripts = ['config', 'utils', 'terrain', 'environment', 'weapons', 'core'].map(name =>
  new vm.Script(fs.readFileSync(path.join(__dirname, '..', 'js', name + '.js'), 'utf8')));

function setup() {
  const input = { x: 0, y: 0 };
  const context = vm.createContext({ Input: input, Sfx: { play() {} }, localStorage: { getItem: () => null } });
  for (const script of scripts) script.runInContext(context);
  const { Game, Terrain, Environment, Save, CFG } = vm.runInContext('({ Game, Terrain, Environment, Save, CFG })', context);
  Save.load();
  Game.start('ella');
  return { Game, Terrain, Environment, input, radius: CFG.PLAYER_R };
}

test('区块移出缓存后重建一致，开局中心没有障碍', () => {
  const { Terrain, radius } = setup();
  const initial = JSON.stringify(Terrain.chunk(-5, 9).props);
  for (let i = 10; i < 220; i++) Terrain.chunk(i, i);
  assert.ok(Terrain.cache.size <= 192);
  assert.equal(JSON.stringify(Terrain.chunk(-5, 9).props), initial);
  for (const [x, y] of [[0, 0], [100, 0], [0, -100], [0, 100], [-100, 0]]) {
    assert.equal(Terrain.obstacleAt(x, y, radius), null);
  }
});

test('玩家正面撞山石会停下，沿边移动可以绕过去', () => {
  const { Terrain, Game, radius, input } = setup();
  const rock = Terrain.chunk(0, 0).solid, p = Game.player;
  p.x = rock.x - 65; p.y = rock.y;
  input.x = 1;
  for (let i = 0; i < 14; i++) Game.update(1 / 60);
  assert.ok(Math.abs(p.x - (rock.x - rock.r - radius)) < 0.1);
  assert.equal(p.moving, false);
  input.y = 1;
  for (let i = 0; i < 16; i++) Game.update(1 / 60);
  assert.ok(p.y > rock.y + 22);
  assert.equal(Terrain.obstacleAt(p.x, p.y, radius), null);
});

test('普通夜兽出生时避开山石，并能主动绕过正前方的山石', () => {
  const { Terrain, Game } = setup();
  const rock = Terrain.chunk(0, 0).solid;
  const e = Game.spawnEnemy('shade', rock.x, rock.y);
  assert.equal(Terrain.obstacleAt(e.x, e.y, e.r), null);
  Game.player.x = rock.x - 120; Game.player.y = rock.y;
  e.x = rock.x + 180; e.y = rock.y; e.speed = 70; e.side = 1;
  let deviated = false;
  for (let i = 0; i < 220; i++) {
    Game.updateEnemies(1 / 60);
    assert.equal(Terrain.obstacleAt(e.x, e.y, e.r), null);
    deviated ||= Math.abs(e.y - rock.y) > 22;
  }
  assert.ok(deviated && e.x < rock.x - 20);
});

test('石灯不会挡人，幽魂和投射物可以穿过山石', () => {
  const { Terrain, Game, radius } = setup();
  const rock = Terrain.chunk(0, 0).solid;
  const lamp = Terrain.chunk(0, 0).props.find(p => p.kind === 'lantern' && p.x === 78);
  assert.equal(Terrain.obstacleAt(lamp.x, lamp.y, radius), null);
  Game.player.x = rock.x - 140; Game.player.y = rock.y;
  const ghost = Game.spawnEnemy('wraith', rock.x, rock.y);
  assert.equal(ghost.x, rock.x);
  Game.updateEnemies(1 / 60);
  assert.ok(Terrain.obstacleAt(ghost.x, ghost.y, ghost.r));
  Game.addProj({ x: rock.x - 70, y: rock.y, vx: 440, vy: 0, r: 7, life: 1 });
  for (let i = 0; i < 21; i++) Game.updateProjs(1 / 60);
  assert.equal(Game.projs.length, 1);
  assert.ok(Game.projs[0].x > rock.x + rock.r);
});

test('战场由暮色入夜并经过风、雨、雪，最后逐步天亮', () => {
  const { Environment } = setup();
  const at = t => Environment.sceneAt(t);
  assert.deepEqual([0, 32, 61, 111, 183, 899].map(t => at(t).id), ['dusk', 'night', 'bamboo', 'rain', 'snow', 'dawn']);
  assert.equal(at(105).from, 'bamboo');
  assert.equal(at(105).mix, 0);
  assert.equal(at(107.5).mix, 0.5);
  assert.equal(at(855).mix, 0.5);
  assert.equal(at(900).mix, 1);
});

test('走近点灯，满血不浪费治疗，每局每盏灯只恢复一次', () => {
  const { Game, Environment } = setup();
  const lamp = { x: 78, y: 103 }, key = Environment.key(lamp);
  const p = Game.player;
  p.x = lamp.x; p.y = lamp.y;
  Game.update(1 / 60);
  assert.ok(Game.environment.lit.has(key));
  assert.ok(!Game.environment.healed.has(key));
  p.hp = 68;
  Game.update(1 / 60);
  assert.equal(p.hp, 80);
  assert.ok(Game.environment.healed.has(key));
  Game.update(1 / 60);
  assert.equal(p.hp, 80);
  Game.start('ella');
  assert.ok(!Game.environment.lit.has(key) && !Game.environment.healed.has(key));
});

test('起点附近三类光源默认熄灭，走近点亮并在离开后保留，只有石灯回血', () => {
  const { Game, Terrain, Environment, radius } = setup();
  const targets = [];
  Terrain.forEachProp(-140, -140, 140, 140, prop => {
    if (Object.hasOwn(Environment.lights, prop.kind)) targets.push(prop);
  });
  assert.deepEqual([...new Set(targets.map(prop => prop.kind))].sort(), ['brazier', 'lantern', 'paperLamp']);
  assert.ok(Environment.lights.brazier.radius > Environment.lights.lantern.radius);
  Game.update(1 / 60);
  assert.equal(Game.environment.lit.size, 0);
  for (const prop of targets) {
    const p = Game.player, key = Environment.key(prop);
    assert.equal(Terrain.obstacleAt(prop.x, prop.y, radius), null);
    Object.assign(p, { x: prop.x, y: prop.y, hp: 75 });
    Game.update(1 / 60);
    assert.ok(Game.environment.lit.has(key));
    assert.equal(p.hp, prop.kind === 'lantern' ? 87 : 75);
    p.x = p.y = 0;
    Game.update(1 / 60);
    assert.ok(Game.environment.lit.has(key));
  }
});

test('穿过芦苇会留下短暂摆动，静止时不会触发', () => {
  const { Game, Terrain, Environment, input } = setup();
  const reed = Terrain.chunk(0, 0).props.find(p => p.kind === 'reeds');
  const key = Environment.key(reed);
  Object.assign(Game.player, { x: reed.x, y: reed.y });
  Game.update(1 / 60);
  assert.equal(Game.environment.reeds.has(key), false);
  input.x = 1;
  Game.update(1 / 60);
  assert.equal(Game.environment.reeds.has(key), true);
  input.x = 0;
  for (let i = 0; i < 60; i++) Game.update(1 / 60);
  assert.equal(Game.environment.reeds.has(key), false);
});
