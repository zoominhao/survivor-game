'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup(initial = {}) {
  let saved = JSON.stringify(initial);
  const scope = vm.createContext({ localStorage: { getItem: () => saved, setItem: (_, value) => { saved = value; } } });
  loadGame(scope, f => battleScript(f) || f.endsWith('/save.js'));
  const { Save, Environment, createBattle } = vm.runInContext('({ Save, Environment, createBattle })', scope);
  const cues = [];
  Save.load();
  return { Save, Environment, game: createBattle({ save: Save, play: cue => cues.push(cue) }), cues };
}

test('免费路线仍会到雪山，购买的是可切换的开局路线，不会重复扣款', () => {
  const { Save, Environment, game: g, cues } = setup({ coins: 175, seals: 3, lastChar: 'zhu' });
  assert.equal(Save.data.startScene, 'dusk');
  assert.equal(Environment.scenes.snow.weather, 'snow');
  assert.equal(Environment.landscape(Environment.sceneAt(182)), 'snow');
  assert.ok(!Save.selectRoute('snow'));
  assert.ok(!Save.buyRoute('constructor'));
  assert.ok(Save.buyRoute('snow'));
  assert.ok(!Save.buyRoute('snow'));
  assert.equal(Save.data.coins, 15);
  assert.equal(Save.data.seals, 3);
  Save.load();
  assert.equal(Save.data.startScene, 'snow');
  assert.equal(Save.data.lastChar, 'zhu');
  g.start('zhu');
  assert.equal(g.landscape, 'snow');
  assert.equal(Environment.forBattle(g).id, 'snow');
  g.time = 16;
  g.spawn(0);
  assert.ok(g.enemies.some(e => e.type === 'snowEnvoy'));
  assert.ok(cues.includes('envoyCall'));
  g.time = 59.99;
  assert.equal(Environment.forBattle(g).id, 'snow');
  g.time = 65;
  assert.equal(Environment.landscape(Environment.forBattle(g)), 'bamboo');
  g.time = 480;
  g.summonBoss('coffinKing', 1, 300, 0, 'snow');
  assert.equal(Environment.forBattle(g).id, 'snow');
  g.start('zhu', 'ella');
  assert.equal(g.openingScene, 'dusk');
  assert.equal(Save.data.startScene, 'snow');
  assert.ok(Save.selectRoute('dusk'));
  assert.ok(Save.selectRoute('snow'));
  assert.equal(Save.data.coins, 15);
});

test('守夜印只用于已解锁英雄的个人修炼，可预览并叠加到单人初始属性', () => {
  const { Save, game: g } = setup({ coins: 32, seals: 13, lastChar: 'zhu' });
  assert.ok(!Save.trainHero('bron', 'vital'));
  assert.ok(!Save.trainHero('zhu', 'constructor'));
  for (let i = 0; i < 3; i++) assert.ok(Save.trainHero('zhu', 'vital'));
  assert.ok(!Save.trainHero('zhu', 'vital'));
  assert.ok(Save.trainHero('zhu', 'might'));
  assert.ok(Save.trainHero('ella', 'swift'));
  assert.ok(!Save.trainHero('zhu', 'swift'));
  assert.equal(Save.data.coins, 32);
  assert.equal(Save.data.seals, 0);
  Save.load();
  assert.equal(g.statsFor('zhu').maxHp, 113);
  assert.equal(g.statsFor('ella').maxHp, 100);
  g.start('zhu');
  assert.equal(g.player.hp, 113);
  assert.equal(g.player.st.might, 1.03);
  g.start('ella');
  assert.equal(g.player.st.speed, 153);
  g.start('zhu', 'ella');
  assert.equal(g.player.hp, 95);
  g.partner.x = 250;
  g.stepBond();
  assert.equal(g.partner.st.speed, 150);
});

test('守夜印在正式单人结算按时长和 Boss 发放，不重复发、不计练习和双人', () => {
  const { Save, game: g } = setup();
  g.start('ella');
  g.time = 89.99;
  g.finish(false);
  assert.equal(g.result.earnedSeals, 0);
  g.start('ella');
  g.time = 244;
  const boss = g.summonBoss('nightmare', 0, 300, 0, 'night');
  g.killEnemy(boss);
  g.finish(false);
  assert.equal(g.result.earnedSeals, 4);
  assert.equal(Save.data.seals, 4);
  g.finish(false);
  assert.equal(Save.data.seals, 4);
  g.start('ella');
  g.assisted = true; g.time = 900; g.finish(true);
  assert.equal(g.result.earnedSeals, 0);
  g.start('ella', 'zhu');
  g.time = 900; g.finish(true);
  assert.equal(g.result.earnedSeals, 0);
  g.start('ella');
  g.time = 900; g.finish(true);
  assert.equal(g.result.earnedSeals, 12);
  Save.load();
  assert.equal(Save.data.seals, 16);
});

test('旧存档和异常字段回到安全默认值，不赠送未购买的场景或修炼', () => {
  const { Save, game: g } = setup({ coins: 20, seals: -7, startScene: 'snow', routes: { snow: 1 },
    training: { zhu: { vital: 8, might: '1', swift: 1, haste: 1 }, other: { vital: 1 } } });
  assert.equal(Save.data.seals, 0);
  assert.equal(Save.data.startScene, 'dusk');
  assert.deepEqual(Object.keys(Save.data.training), ['zhu']);
  assert.deepEqual(Object.keys(Save.data.training.zhu), ['swift']);
  assert.equal(Save.data.coins, 20);
  g.start('zhu');
  assert.equal(g.landscape, 'dusk');
  assert.equal(g.player.hp, 95);
  assert.equal(g.player.st.might, 1);
});
