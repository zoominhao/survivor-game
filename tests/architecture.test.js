'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { root, scriptPaths, battleScript, loadGame } = require('./fixtures/load-game');

function filesUnder(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

test('HTML 入口引用所有浏览器模块，每个文件只加载一次', () => {
  assert.deepEqual([...scriptPaths].sort(), filesUnder('js').filter(file => file.endsWith('.js')).sort());
  assert.equal(scriptPaths.at(-1), 'js/app/main.js');
});

test('战斗模块不直接读写界面、输入或浏览器存储', () => {
  for (const file of scriptPaths.filter(battleScript)) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(text, /\b(?:document|window|UI|Render|Input|Save|Sfx)\s*\.|\blocalStorage\b/, file);
  }
});

test('普通怪潮、场景怪和 Boss 都有各自的贴图绘制函数', () => {
  const scope = vm.createContext({ Path2D: class {} });
  loadGame(scope, file => battleScript(file) || file.startsWith('js/render/enemies/'));
  const { ENEMIES, EVENTS, STAGES, BOSS_TYPES, EnemyRendering } = vm.runInContext(
    '({ ENEMIES, EVENTS, STAGES, BOSS_TYPES, EnemyRendering })', scope);
  const spriteRegistry = { ...EnemyRendering, sprites: {}, makeSprite: (_, paint) => paint };
  spriteRegistry.buildEnemySprites();
  const regularIds = Object.keys(ENEMIES).filter(id => id !== 'boss');
  const encounterIds = new Set([
    ...Object.values(STAGES).flatMap(({ opening, enemies, late, arrival }) => [
      ...Object.keys(opening || {}), ...Object.keys(enemies), ...Object.keys(late || {}), arrival.enemy,
    ]),
    ...EVENTS.filter(event => event.enemy).map(event => event.enemy),
  ]);
  assert.deepEqual(encounterIds, new Set(regularIds));
  assert.deepEqual(Object.keys(spriteRegistry.bossSprites).sort(), Object.keys(BOSS_TYPES).sort());
  const painters = [...regularIds.map(id => spriteRegistry.sprites[id]), ...Object.values(spriteRegistry.bossSprites)];
  assert.ok(painters.every(paint => typeof paint === 'function'));
  assert.equal(new Set(painters).size, painters.length);
});

test('地图的灯、机关、地貌与定时遭遇都绑定在正确场景', () => {
  const scope = vm.createContext({});
  loadGame(scope, file => battleScript(file) || file.startsWith('js/render/world/'));
  const { Environment, STAGES, DEFAULT_STAGE, TerrainArt, WorldInteractions, EVENTS } = vm.runInContext(
    '({ Environment, STAGES, DEFAULT_STAGE, TerrainArt, WorldInteractions, EVENTS })', scope);
  assert.deepEqual(Array.from(Environment.stagePool({})), [DEFAULT_STAGE]);
  assert.equal(new Set(Object.values(STAGES).map(map => map.seed)).size, Object.keys(STAGES).length);
  for (const map of Object.values(STAGES)) {
    assert.ok(Object.hasOwn(Environment.lights, map.lamp));
    assert.ok(Object.hasOwn(WorldInteractions.landmarks, map.landmark));
    for (const prop of [map.lamp, map.landmark, map.decor, ...map.solids]) assert.equal(typeof TerrainArt[prop], 'function', prop);
  }
  for (const event of EVENTS) if (event.scene) assert.ok(Environment.isStage(event.scene));
  const bosses = EVENTS.filter(event => event.kind === 'boss');
  assert.deepEqual(Array.from(bosses, event => event.t), [240, 480, 720]);
  assert.ok(bosses.every(event => !event.scene));
});

test('无浏览器的战斗可以升级、开箱和结算，两个本局状态互不影响', () => {
  const scope = vm.createContext({});
  loadGame(scope, battleScript);
  const { createBattle, metaKeys } = vm.runInContext('({ createBattle, metaKeys: Object.keys(META) })', scope);
  const events = [], cues = [];
  function makeSave() {
    return { writes: 0, data: { meta: Object.fromEntries(metaKeys.map(key => [key, 0])), coins: 0, runs: 0, kills: 0, wins: 0, best: 0 },
      write() { this.writes++; } };
  }
  const save = makeSave(), otherSave = makeSave();
  const battle = createBattle({ save, emit: event => events.push(event), play: cue => cues.push(cue) });
  const other = createBattle({ save: otherSave });
  battle.start('echo'); other.start('tuan');
  battle.gainXp(battle.player.xpNeed);
  battle.update(1 / 60, { x: 1, y: 0 });
  assert.equal(battle.state, 'levelup');
  assert.ok(battle.player.x > 0);
  battle.choose(0);
  battle.openChest(false);
  battle.closeChest();
  battle.finish(false);
  assert.deepEqual(events, ['levelup', 'resume', 'chest', 'resume', 'result']);
  assert.deepEqual(cues, ['level', 'chest', 'defeat']);
  assert.equal(save.writes, 1);
  assert.equal(otherSave.writes, 0);
  assert.equal(other.state, 'playing');
  assert.equal(other.player.char, 'tuan');
  assert.equal(other.player.x, 0);
  assert.equal(other.player.level, 1);
});
