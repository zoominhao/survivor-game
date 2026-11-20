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
  const banners = [];
  const cues = [];
  const context = vm.createContext({ Input: input, Sfx: { play: (...args) => cues.push(args) }, UI: { banner: text => banners.push(text) }, localStorage: { getItem: () => null } });
  for (const script of scripts) script.runInContext(context);
  const { Game, Terrain, Environment, Save, CFG } = vm.runInContext('({ Game, Terrain, Environment, Save, CFG })', context);
  Save.load();
  Game.start('ella');
  return { Game, Terrain, Environment, input, banners, cues, radius: CFG.PLAYER_R };
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

test('灯具随场景切换但保留位置、点亮与回血消耗记录', () => {
  const { Game, Environment, Terrain } = setup();
  const lamp = Terrain.chunk(0, 0).props.find(o => o.kind === 'lantern' && o.x === 78);
  const key = Environment.key(lamp), p = Game.player;
  assert.equal(Environment.lightKind('lantern', 'bamboo'), 'paperLamp');
  assert.equal(Environment.lightKind('brazier', 'rain'), 'lantern');
  assert.equal(Environment.lightKind('lantern', 'snow'), 'brazier');
  assert.ok(Environment.sceneAt(106).mix < 0.2);
  Object.assign(p, { x: lamp.x, y: lamp.y, hp: 65 });
  Game.time = 60; Environment.step(Game);
  assert.equal(p.hp, 65);
  assert.ok(Game.environment.lit.has(key));
  Game.time = 111; Environment.step(Game);
  assert.equal(p.hp, 77);
  Game.time = 183; Environment.step(Game);
  Game.time = 260; Environment.step(Game);
  assert.equal(p.hp, 77);
  assert.ok(Game.environment.healed.has(key) && Game.environment.lit.has(key));
  assert.equal(lamp.kind, 'lantern');
});

test('定时出现僵尸合围和鬼新娘，僵尸按起跳节奏移动', () => {
  const { Game, banners, cues } = setup();
  Game.eliteT = Infinity; // 单独检查定时事件，不计随机刷出的精英。
  Game.time = 70; Game.spawn(0);
  assert.equal(Game.enemies.filter(e => e.type === 'jiangshi').length, 10);
  Game.time = 168; Game.spawn(0);
  assert.equal(Game.enemies.filter(e => e.type === 'bride').length, 1);
  assert.ok(banners.includes('黄符僵尸围了上来') && banners.includes('红盖头下，喜帖无声'));
  assert.deepEqual(cues.map(args => args[0]), ['rustle', 'corpseAmbush', 'frost', 'bridalBell']);
  const zombie = Game.spawnEnemy('jiangshi', 90, 0);
  zombie.t = 0; const before = zombie.x; Game.updateEnemies(1 / 60);
  const landSpeed = before - zombie.x;
  zombie.t = 0.44; const mid = zombie.x; Game.updateEnemies(1 / 60);
  assert.ok(mid - zombie.x > landSpeed * 3);
});

test('鬼新娘能穿障并射出三张扇形喜帖，弹幕继续遵守上限', () => {
  const { Game, Terrain, cues } = setup();
  const rock = Terrain.chunk(0, 0).solid;
  const bride = Game.spawnEnemy('bride', rock.x, rock.y);
  assert.equal(bride.x, rock.x);
  bride.shootT = 0; Game.updateEnemies(1 / 60);
  assert.equal(Game.ebullets.length, 3);
  assert.equal(cues[0][0], 'weddingPaper');
  assert.ok(Game.ebullets.every(b => b.look === 'weddingPaper' && Math.abs(Math.hypot(b.vx, b.vy) - 128) < 0.001));
  assert.equal(new Set(Game.ebullets.map(b => b.vx)).size, 3);
  Game.ebullets = Array(79).fill(null);
  bride.shootT = 0; Game.updateEnemies(1 / 60);
  assert.equal(Game.ebullets.length, 80);
});

test('黄符僵尸落地声随距离和方位变化，远处或冻结时不响', () => {
  const { Game, cues } = setup();
  Game.spawnEnemy('jiangshi', -100, 0).t = 0.89;
  Game.spawnEnemy('jiangshi', 190, 0).t = 0.89;
  Game.spawnEnemy('jiangshi', 410, 85).t = 0.89;
  const frozen = Game.spawnEnemy('jiangshi', 85, 0);
  frozen.frozen = 1; frozen.t = 0.89;
  Game.updateEnemies(1 / 60);
  assert.equal(cues.length, 2);
  assert.ok(cues.every(([name]) => name === 'corpseHop'));
  assert.ok(cues[0][1] > cues[1][1]);
  assert.ok(cues[0][2] < 0 && cues[1][2] > 0);
});

test('随场景和过渡进度替换特色刷怪池，开局仍保留普通影兽', () => {
  const { Environment } = setup();
  const keys = (t, roll = 0.01) => Object.keys(Environment.enemyPoolAt(t, roll) || {}).sort();
  assert.deepEqual(keys(0), []);
  assert.deepEqual(keys(20), ['paperChild']);
  assert.deepEqual(keys(65), ['jiangshi', 'paperChild']);
  assert.deepEqual(keys(105), ['jiangshi', 'paperChild']);
  assert.deepEqual(keys(107.5, 0.13), ['bride', 'umbrellaGhost']);
  assert.deepEqual(keys(107.5, 0.30), ['jiangshi', 'paperChild']);
  assert.deepEqual(keys(111), ['bride', 'umbrellaGhost']);
  assert.deepEqual(keys(184), ['snowEnvoy']);
  assert.deepEqual(keys(184, 0.75), []);
});

test('纸扎童子摆动逼近，伞鬼从障碍里放出雨滴，白无常抗击退', () => {
  const { Game, Terrain } = setup();
  const child = Game.spawnEnemy('paperChild', 125, 0);
  child.t = 0.22;
  const rock = Terrain.chunk(0, 0).solid;
  const ghost = Game.spawnEnemy('umbrellaGhost', rock.x, rock.y);
  assert.equal(ghost.x, rock.x);
  ghost.shootT = 0;
  const envoy = Game.spawnEnemy('snowEnvoy', -100, 70);
  Game.updateEnemies(1 / 60);
  assert.ok(child.x < 125 && Math.abs(child.y) > 0.5);
  assert.equal(Game.ebullets.length, 1);
  assert.equal(Game.ebullets[0].look, 'rainDrop');
  assert.ok(envoy.kbRes > 0.6);
});
