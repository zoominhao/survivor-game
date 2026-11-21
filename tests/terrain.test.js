'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
const test = require('node:test');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup(stage = 'dusk') {
  const input = { x: 0, y: 0 };
  const banners = [];
  const cues = [];
  const context = vm.createContext({ localStorage: { getItem: () => null } });
  loadGame(context, file => battleScript(file) || file.endsWith('/save.js'));
  const { createBattle, Terrain, Environment, WorldInteractions, Save, CFG } = vm.runInContext(
    '({ createBattle, Terrain, Environment, WorldInteractions, Save, CFG })', context);
  Save.load();
  const startStage = id => {
    Save.data.routes[id] = true;
    Save.data.stageSelection = [id];
    Game.start('ella');
  };
  const Game = createBattle({ save: Save, play: (...args) => cues.push(args), emit: (event, text) => { if (event === 'banner') banners.push(text); } });
  startStage(stage);
  return { Game, Terrain, Environment, WorldInteractions, startStage, input, banners, cues, radius: CFG.PLAYER_R };
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
  for (let i = 0; i < 14; i++) Game.update(1 / 60, input);
  assert.ok(Math.abs(p.x - (rock.x - rock.r - radius)) < 0.1);
  assert.equal(p.moving, false);
  input.y = 1;
  for (let i = 0; i < 16; i++) Game.update(1 / 60, input);
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

test('石灯不会挡人，黑无常和投射物可以穿过山石', () => {
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

test('黎明只改变光照，地形整局不切换', () => {
  const { Environment, Game } = setup('blizzard');
  assert.deepEqual([0, 810, 840, 900].map(t => Environment.dawnlight(t)), [0, 0, 0.5, 1]);
  for (const time of [0, 180, 480, 840, 899]) {
    Game.time = time;
    assert.equal(Environment.forBattle(Game).id, 'blizzard');
  }
});

test('走近点灯，满血不浪费治疗，每局每盏灯只恢复一次', () => {
  const { Game, WorldInteractions } = setup();
  const lamp = { x: 78, y: 103 }, key = WorldInteractions.key(lamp);
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

test('各图在起点附近布置本地灯具，默认熄灭且可以安全靠近', () => {
  const { Game, Terrain, Environment, WorldInteractions, startStage, radius } = setup();
  for (const [scene, { lamp: kind }] of Object.entries(Environment.scenes)) {
    startStage(scene);
    const targets = [];
    Terrain.forEachProp(-140, -140, 140, 140, prop => {
      if (Object.hasOwn(Environment.lights, prop.kind)) targets.push(prop);
    }, scene);
    assert.ok(targets.length >= 3);
    assert.ok(targets.every(prop => prop.kind === kind && !Terrain.obstacleAt(prop.x, prop.y, radius, scene)));
    const prop = targets[0], p = Game.player, key = WorldInteractions.key(prop, scene);
    assert.ok(!Game.environment.lit.has(key));
    Object.assign(p, { x: prop.x, y: prop.y, hp: 75 });
    WorldInteractions.step(Game);
    assert.ok(Game.environment.lit.has(key));
    assert.equal(p.hp, prop.kind === 'lantern' ? 87 : 75);
    p.x = p.y = 0;
    WorldInteractions.step(Game);
    assert.ok(Game.environment.lit.has(key));
  }
});

test('穿过芦苇会留下短暂摆动，静止时不会触发', () => {
  const { Game, Terrain, WorldInteractions, input } = setup('bamboo');
  const reed = Terrain.chunk(0, 0, 'bamboo').props.find(p => p.kind === 'reeds');
  const key = WorldInteractions.key(reed, 'bamboo');
  Object.assign(Game.player, { x: reed.x, y: reed.y });
  Game.update(1 / 60);
  assert.equal(Game.environment.reeds.has(key), false);
  input.x = 1;
  Game.update(1 / 60, input);
  assert.equal(Game.environment.reeds.has(key), true);
  input.x = 0;
  for (let i = 0; i < 60; i++) Game.update(1 / 60);
  assert.equal(Game.environment.reeds.has(key), false);
});

test('同坐标的不同地图灯具有独立标记，留在同一张地图不会重复点灯', () => {
  const { Game, Terrain, WorldInteractions, startStage, cues } = setup('night');
  const lamp = Terrain.chunk(0, 0, 'night').props.find(o => o.kind === 'ghostLamp' && o.x === 78);
  const nightKey = WorldInteractions.key(lamp, 'night'), bambooKey = WorldInteractions.key(lamp, 'bamboo');
  Object.assign(Game.player, { x: lamp.x, y: lamp.y });
  WorldInteractions.step(Game);
  assert.ok(Game.environment.lit.has(nightKey) && !Game.environment.lit.has(bambooKey));
  Game.time = 234; WorldInteractions.step(Game);
  assert.equal(cues.filter(([name]) => name === 'lantern').length, 1);
  startStage('bamboo');
  Object.assign(Game.player, { x: lamp.x, y: lamp.y });
  WorldInteractions.step(Game);
  assert.ok(Game.environment.lit.has(bambooKey) && !Game.environment.lit.has(nightKey));
  assert.equal(cues.filter(([name]) => name === 'lantern').length, 2);
});

test('地图地形布局独立，对受阻的角色、夜兽和宝箱保留避障处理', () => {
  const { Game, Terrain, radius } = setup();
  const chunk = Terrain.chunk(2, 2, 'bamboo');
  assert.notDeepEqual(chunk.solid, Terrain.chunk(2, 2, 'night').solid);
  const { x, y } = chunk.solid;
  const enemy = Game.spawnEnemy('shade', x + 80, y);
  const ghost = Game.spawnEnemy('wraith', x, y);
  ghost.speed = 0;
  const chest = { type: 'chest', x: x - 1, y };
  for (const body of [Game.player, enemy]) Object.assign(body, { x, y });
  Game.pickups.push(chest);
  Game.enterLandscape('bamboo');
  assert.equal(Game.landscape, 'bamboo');
  assert.equal(Terrain.obstacleAt(Game.player.x, Game.player.y, radius, 'bamboo'), null);
  assert.equal(Terrain.obstacleAt(enemy.x, enemy.y, enemy.r, 'bamboo'), null);
  assert.equal(Terrain.obstacleAt(chest.x, chest.y, 4, 'bamboo'), null);
  assert.deepEqual([ghost.x, ghost.y], [x, y]);
});

test('定时出现僵尸合围和鬼新娘，僵尸按起跳节奏移动', () => {
  const { Game, banners, cues, startStage } = setup('bamboo');
  Game.eliteT = Infinity; // 单独检查定时事件，不计随机刷出的精英。
  Game.time = 70; Game.spawn(0);
  assert.equal(Game.enemies.filter(e => e.type === 'jiangshi').length, 11);
  startStage('rain'); Game.eliteT = Infinity;
  Game.time = 168; Game.spawn(0);
  assert.equal(Game.enemies.filter(e => e.type === 'bride').length, 1);
  assert.ok(banners.includes('黄符僵尸围了上来') && banners.some(text => text.includes('我冤呐')));
  assert.deepEqual(cues.map(args => args[0]), ['corpseAmbush', 'corpseAmbush', 'umbrellaOpen', 'umbrellaOpen', 'siegeArrival', 'brideArrival']);
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
  assert.ok(cues.some(([name]) => name === 'weddingPaper'));
  assert.ok(Game.ebullets.every(b => b.look === 'weddingPaper' && Math.abs(Math.hypot(b.vx, b.vy) - 128) < 0.001));
  assert.equal(new Set(Game.ebullets.map(b => b.vx)).size, 3);
  Game.ebullets = Array(79).fill(null);
  bride.shootT = 0; Game.updateEnemies(1 / 60);
  assert.equal(Game.ebullets.length, 80);
});

test('画皮妖改射碎面，仍保持原有的射程节奏与弹速', () => {
  const { Game } = setup();
  const demon = Game.spawnEnemy('spitter', 200, 0);
  demon.shootT = 0; Game.updateEnemies(1 / 60);
  assert.equal(Game.ebullets.length, 1);
  const [shot] = Game.ebullets;
  assert.equal(shot.look, 'maskShard');
  assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 150) < 0.001);
  assert.equal(demon.shootT, 2.8);
});

test('定时合围同时使用民俗怪物的造型和提示名称', () => {
  for (const [stage, time, id, count, notice] of [
    ['rain', 150, 'swarm', 26, '灯笼小鬼正在合围！'], ['dusk', 390, 'moth', 34, '招魂纸鸢正在合围！'],
    ['night', 630, 'wraith', 30, '黑无常正在合围！'], ['dusk', 840, 'brute', 36, '镇墓石兽合围，天色将明'],
  ]) {
    const { Game, banners } = setup(stage);
    Game.eliteT = Infinity;
    Game.bossClearAt = time; // 保留本次合围，跳过提前累计的 Boss 登场。
    Game.time = time; Game.spawn(0);
    assert.equal(Game.enemies.filter(e => e.type === id).length, count);
    assert.ok(banners.includes(notice), notice);
  }
});

test('黄符僵尸落地声随距离和方位变化，远处或冻结时不响', () => {
  const { Game, cues } = setup();
  Game.spawnEnemy('jiangshi', -100, 0).t = 0.89;
  Game.spawnEnemy('jiangshi', 190, 0).t = 0.89;
  Game.spawnEnemy('jiangshi', 410, 85).t = 0.89;
  const frozen = Game.spawnEnemy('jiangshi', 85, 0);
  frozen.frozen = 1; frozen.t = 0.89;
  Game.updateEnemies(1 / 60);
  const hops = cues.filter(([name]) => name === 'corpseHop');
  assert.equal(hops.length, 2);
  assert.ok(hops[0][1] > hops[1][1]);
  assert.ok(hops[0][2] < 0 && hops[1][2] > 0);
});

test('鬼怪靠近时才喊叫，同种与不同种的叫声都限频，不把怪潮混成噪声', () => {
  const { Game, cues } = setup();
  const zombie = Game.spawnEnemy('jiangshi', 90, 0);
  const nextZombie = Game.spawnEnemy('jiangshi', -92, 0);
  const bride = Game.spawnEnemy('bride', 380, 0);
  zombie.frozen = nextZombie.frozen = 1;
  Game.updateEnemies(0.02);
  const calls = () => cues.filter(([name]) => name === 'corpseSnarl' || name === 'brideAccuse');
  assert.equal(calls().length, 0);
  zombie.frozen = nextZombie.frozen = 0;
  Game.updateEnemies(0.02);
  assert.equal(calls().length, 1);
  assert.equal(calls()[0][0], 'corpseSnarl');
  assert.ok(calls()[0][1] > 0.62 && calls()[0][2] > 0);
  bride.x = 200;
  Game.time += 1;
  Game.updateEnemies(0.02);
  assert.equal(calls().length, 1);
  Game.time += 2;
  Game.updateEnemies(0.02);
  assert.equal(calls().length, 2);
  assert.equal(calls()[1][0], 'brideAccuse');
});

test('每张地图有自己的刷怪池，开局与后期随时间切换但不换图', () => {
  const { Environment } = setup();
  const pool = (t, stage) => Environment.enemyPoolAt(t, stage);
  assert.equal(pool(0), Environment.scenes.dusk.opening);
  assert.equal(pool(20), Environment.scenes.dusk.enemies);
  assert.equal(pool(704), Environment.scenes.dusk.late);
  for (const stage of ['storm', 'blizzard', 'burial']) {
    assert.equal(pool(0, stage), Environment.scenes[stage].opening);
    assert.equal(pool(184, stage), Environment.scenes[stage].enemies);
    assert.equal(pool(704, stage), Environment.scenes[stage].late);
  }
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

test('镇魂钟只在附近有敌人时触发，冷却后才能再次击退', () => {
  const { Game, Terrain, WorldInteractions, cues } = setup('night');
  Game.time = 32; Game.update(0);
  const bell = Terrain.chunk(0, 0, 'night').props.find(o => o.kind === 'wardBell');
  Object.assign(Game.player, { x: bell.x, y: bell.y });
  const key = WorldInteractions.key(bell, 'night');
  assert.equal(Terrain.obstacleAt(bell.x, bell.y, 11, 'night'), null);
  Game.update(1 / 60);
  assert.equal(Game.environment.landmarkReady.has(key), false);
  const near = Game.spawnEnemy('shade', bell.x + 70, bell.y);
  const far = Game.spawnEnemy('shade', bell.x + 180, bell.y);
  Game.update(1 / 60);
  assert.ok(near.kx > 0 && near.slow > 0);
  assert.equal(far.slow, 0);
  assert.equal(near.hp, near.maxHp);
  Game.update(1 / 60);
  assert.equal(cues.filter(c => c[0] === 'wardBell').length, 1);
  assert.ok(Game.environment.landmarkReady.get(key) > Game.time);
  Game.time = 234; // 已自然冷却。
  WorldInteractions.step(Game);
  assert.equal(cues.filter(c => c[0] === 'wardBell').length, 2);
});

test('引星符阵只吸引范围内的经验，空触发不进入冷却', () => {
  const { Game, Terrain, WorldInteractions } = setup('rain');
  Game.time = 111; Game.update(0);
  const sigil = Terrain.chunk(0, 0, 'rain').props.find(o => o.kind === 'starSigil');
  Object.assign(Game.player, { x: sigil.x, y: sigil.y });
  const key = WorldInteractions.key(sigil, 'rain');
  Game.update(1 / 60);
  assert.equal(Game.environment.landmarkReady.has(key), false);
  Game.dropGem(sigil.x - 180, sigil.y, 2);
  Game.dropGem(sigil.x - 346, sigil.y, 2);
  Game.update(1 / 60);
  assert.equal(Game.gems[0].mag, true);
  assert.equal(Game.gems[1].mag, false);
  assert.ok(Game.environment.landmarkReady.get(key) > Game.time);
});

test('竹径镇纸符只减速不击退，空触发不消耗；雪岭暖龛有伤才用且只用一次', () => {
  const { Game, Terrain, WorldInteractions, startStage } = setup('bamboo');
  Game.time = 61;
  const ward = Terrain.chunk(0, 0, 'bamboo').props.find(o => o.kind === 'paperWard');
  const wardKey = WorldInteractions.key(ward, 'bamboo');
  Object.assign(Game.player, { x: ward.x, y: ward.y });
  Game.update(0);
  assert.ok(!Game.environment.landmarkReady.has(wardKey));
  const enemy = Game.spawnEnemy('shade', ward.x - 65, ward.y);
  Game.update(0);
  assert.equal(enemy.slow, 0.65);
  assert.deepEqual([enemy.kx, enemy.ky], [0, 0]);
  assert.ok(Game.environment.landmarkReady.has(wardKey));

  startStage('snow'); Game.time = 185;
  const shrine = Terrain.chunk(0, 0, 'snow').props.find(o => o.kind === 'warmingShrine');
  const shrineKey = WorldInteractions.key(shrine, 'snow'), p = Game.player;
  Object.assign(p, { x: shrine.x, y: shrine.y });
  WorldInteractions.step(Game);
  assert.ok(!Game.environment.landmarkReady.has(shrineKey));
  p.hp = 55; WorldInteractions.step(Game);
  assert.equal(p.hp, 73);
  Game.time = 452; WorldInteractions.step(Game);
  assert.equal(p.hp, 73);
  assert.equal(Game.environment.landmarkReady.get(shrineKey), Infinity);
});

test('补给木匣整局只发放一次奖励，新开局会重置', () => {
  const { Game, Terrain, WorldInteractions } = setup();
  const box = Terrain.chunk(0, -1).props.find(o => o.kind === 'supplyBox');
  const key = WorldInteractions.key(box);
  for (const time of [0, 61, 111, 192]) {
    Object.assign(Game.player, { x: box.x, y: box.y });
    Game.time = time;
    WorldInteractions.step(Game);
    assert.equal(Game.player.coins, 5);
    assert.equal(Game.player.xp, 4);
  }
  assert.equal(Game.environment.landmarkReady.get(key), Infinity);
  Game.start('ella');
  assert.equal(Game.environment.landmarkReady.has(key), false);
});

test('破晓香台有敌人靠近才会触发短暂无敌，而且只可使用一次', () => {
  const { Game, Terrain, WorldInteractions } = setup('dawn');
  Game.time = 830;
  const altar = Terrain.chunk(0, 0, 'dawn').props.find(o => o.kind === 'dawnAltar');
  const key = WorldInteractions.key(altar, 'dawn');
  Object.assign(Game.player, { x: altar.x, y: altar.y });
  WorldInteractions.step(Game);
  assert.ok(!Game.environment.landmarkReady.has(key));
  Game.spawnEnemy('brute', altar.x + 68, altar.y);
  WorldInteractions.step(Game);
  assert.equal(Game.player.iframe, 2.4);
  assert.equal(Game.environment.landmarkReady.get(key), Infinity);
  Game.time += 3; Game.player.iframe = 0; WorldInteractions.step(Game);
  assert.equal(Game.player.iframe, 0);
});

test('荒祠雷声只在雷电时间点触发，其他地图不会响', () => {
  const { Game, cues, startStage, Environment } = setup('storm');
  Game.spawn = () => {}; // 不计开局事件中的那一声雷。
  for (const time of [7, 25]) {
    Game.time = time - 0.01;
    Game.update(1 / 60); Game.update(1 / 60);
  }
  assert.equal(Environment.stormFlash(7), 1);
  assert.equal(Environment.stormFlash(8), 0);
  startStage('rain'); Game.time = 6.99; Game.update(0.02);
  assert.equal(cues.filter(([name]) => name === 'stormThunder').length, 2);
});

test('纸童与白无常发出方位声，伞鬼射雨滴时不复用普通霜环音', () => {
  const { Game, cues } = setup();
  Game.spawnEnemy('paperChild', -95, 0).t = 1.29;
  Game.spawnEnemy('snowEnvoy', 95, 0).t = 1.64;
  Game.spawnEnemy('umbrellaGhost', 118, 96).shootT = 0;
  Game.updateEnemies(1 / 60);
  assert.deepEqual(cues.map(([name]) => name), ['paperChild', 'envoyChain', 'umbrellaDrip']);
  assert.ok(cues[0][2] < 0 && cues[1][2] > 0 && cues[2][2] > 0);
});

test('夜魇入场保留三阶属性，蓄力和冲锋发出不同提示音', () => {
  const { Game, banners, cues } = setup();
  Game.time = 480;
  const boss = Game.summonBoss('nightmare', 1, 205, 0);
  assert.equal(boss.arrivedAt, 480);
  assert.equal(boss.hp, 6000);
  assert.equal(boss.r, 50);
  assert.equal(boss.dmg, 21);
  assert.equal(banners.at(-1), '夜魇降临');
  boss.cd = 0.01;
  Game.updateEnemies(1 / 60);
  assert.equal(boss.phase, 'wind');
  assert.equal(boss.cx, -1);
  assert.equal(boss.cd, 0.8);
  assert.equal(Game.ebullets.length, 0);
  Game.player.y = 50;
  boss.cd = 0.01;
  Game.updateEnemies(1 / 60);
  assert.equal(boss.phase, 'charge');
  assert.equal(boss.cx, -1);
  assert.equal(Game.ebullets.length, 14);
  assert.deepEqual(cues.map(([name]) => name), ['boss', 'bossWind', 'bossCharge']);
});

test('夜魇倒下收齐全图宝石并回血，宝箱和选卡让出短暂的奖励演出', () => {
  const { Game, banners, cues } = setup();
  Game.time = 10;
  const p = Game.player;
  p.hp = 89;
  p.iframe = 1.5;
  Game.dropGem(1800, 900, 7);
  Game.dropGem(-2400, -700, 3);
  const boss = Game.summonBoss('nightmare', 0, p.x, p.y);
  Game.killEnemy(boss);
  Game.killEnemy(boss); // 重复命中不再次发奖。
  assert.equal(Game.gems.length, 0);
  assert.equal(Game.bossClearAt, 10);
  assert.equal(p.hp, 100);
  assert.equal(p.iframe, 1.5);
  assert.equal(p.kills, 1);
  assert.equal(Game.pickups.filter(k => k.type === 'chest' && k.boss).length, 1);
  const earnedXp = p.xp + Array.from({ length: p.level - 1 }, (_, i) => Game.xpFor(i + 1)).reduce((a, b) => a + b, 0);
  assert.equal(earnedXp, 106);
  assert.equal(banners.at(-1), '夜魇已散 · 破晓余光');
  assert.equal(cues.filter(([name]) => name === 'nightmareClear').length, 1);

  Game.update(1 / 60);
  assert.equal(Game.state, 'playing');
  assert.ok(Game.pending > 0 && Game.pickups.some(k => k.type === 'chest' && k.boss));
  p.x = 90;
  Game.time = 11.15;
  Game.update(1 / 60);
  assert.equal(Game.state, 'levelup');
  assert.ok(Game.pickups.some(k => k.type === 'chest' && k.boss));
  Game.start('ella');
  assert.equal(Game.bossClearAt, -Infinity);
});

test('三位 Boss 按分钟顺序登场，上一位未击败时后一位排队', () => {
  const { Game, Environment, banners, cues } = setup();
  const activeMap = () => Environment.forBattle(Game).id;
  Game.eliteT = Infinity;
  Game.time = 240; Game.spawn(0);
  assert.equal(Game.state, 'decision');
  Game.chooseBossPlan('normal');
  assert.equal(Game.boss.kind, 'nightmare');
  assert.equal(activeMap(), 'dusk');
  Game.time = 480; Game.spawn(0);
  assert.equal(Game.boss.kind, 'nightmare');
  assert.equal(activeMap(), 'dusk');
  assert.equal(Game.pendingBosses.length, 1);
  Game.killEnemy(Game.boss);
  Game.spawn(0);
  assert.equal(Game.boss, null);
  Game.time = 482; Game.spawn(0);
  assert.equal(Game.state, 'decision');
  Game.chooseBossPlan('normal');
  assert.equal(Game.boss.name, '棺山尸王');
  assert.equal(Game.boss.arena.id, 'dusk');
  Game.time = 488;
  assert.equal(activeMap(), 'dusk');
  Game.killEnemy(Game.boss);
  Game.time = 720; Game.spawn(0);
  Game.chooseBossPlan('normal');
  assert.equal(Game.boss.name, '冥轿鬼后');
  assert.equal(activeMap(), 'dusk');
  assert.equal(Game.boss.hp, 16000);
  assert.ok(banners.includes('棺山尸王降临') && banners.includes('冥轿鬼后降临'));
  assert.ok(cues.some(c => c[0] === 'coffinKingArrival') && cues.some(c => c[0] === 'bridalQueenArrival'));
  Game.time = 823;
  assert.equal(activeMap(), 'dusk');
  Game.killEnemy(Game.boss);
  assert.equal(activeMap(), 'dusk');
  Game.time = 829;
  assert.equal(activeMap(), 'dusk');
});

test('棺山尸王的震圈锁定位置，离开圈后不会受伤', () => {
  const { Game } = setup();
  const boss = Game.summonBoss('coffinKing', 1, 179, 0), p = Game.player;
  boss.cd = 0;
  Game.updateEnemies(1 / 60);
  assert.equal(boss.phase, 'sealWind');
  assert.equal(boss.seals.length, 3);
  assert.equal(boss.seals[1].x, 0);
  p.x = -160;
  boss.cd = 0;
  Game.updateEnemies(1 / 60);
  assert.equal(p.hp, p.st.maxHp);
  assert.equal(boss.seals.length, 0);
  assert.equal(Game.fx.filter(f => f.type === 'boom').length, 3);
  p.x = 0;
  boss.cd = 0; Game.updateEnemies(1 / 60);
  boss.cd = 0; Game.updateEnemies(1 / 60);
  assert.ok(p.hp < p.st.maxHp);
});

test('冥轿鬼后按预警扇面射九张喜帖，不会锁定玩家新位置', () => {
  const { Game } = setup();
  const boss = Game.summonBoss('bridalQueen', 2, 200, 0);
  boss.cd = 0; Game.updateEnemies(1 / 60);
  assert.equal(boss.phase, 'fanWind');
  assert.equal(Game.ebullets.length, 0);
  assert.equal(boss.attackAngle, Math.PI);
  Game.player.y = 90;
  boss.cd = 0; Game.updateEnemies(1 / 60);
  assert.equal(Game.ebullets.length, 9);
  assert.ok(Game.ebullets.every(b => b.look === 'weddingPaper'));
  assert.ok(Game.ebullets[4].vx < 0 && Math.abs(Game.ebullets[4].vy) < 0.001);
});
