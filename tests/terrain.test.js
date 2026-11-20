'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const scripts = ['config', 'utils', 'terrain', 'weapons', 'core'].map(name =>
  new vm.Script(fs.readFileSync(path.join(__dirname, '..', 'js', name + '.js'), 'utf8')));

function setup() {
  const input = { x: 0, y: 0 };
  const context = vm.createContext({ Input: input, Sfx: { play() {} }, localStorage: { getItem: () => null } });
  for (const script of scripts) script.runInContext(context);
  const { Game, Terrain, Save, CFG } = vm.runInContext('({ Game, Terrain, Save, CFG })', context);
  Save.load();
  Game.start('ella');
  return { Game, Terrain, input, radius: CFG.PLAYER_R };
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
