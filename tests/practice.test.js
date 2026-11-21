'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
const test = require('node:test');
const { battleScript, loadGame } = require('./fixtures/load-game');

function start() {
  const scope = vm.createContext({});
  loadGame(scope, battleScript);
  const { createBattle, metaKeys } = vm.runInContext('({ createBattle, metaKeys: Object.keys(META) })', scope);
  const data = { coins: 5, runs: 2, kills: 100, best: 60, wins: 1, chars: { ella: true }, lastChar: 'ella',
    meta: Object.fromEntries(metaKeys.map(key => [key, 0])) };
  const save = { data, writes: 0, write() { this.writes++; } };
  const game = createBattle({ save });
  game.start('ella');
  return { game, save };
}

test('作弊操作仅在面板内生效，回血、金币与经验只进入本局', () => {
  const { game, save } = start(), p = game.player;
  assert.equal(game.usePractice('coins'), false);
  game.state = 'practice';
  assert.equal(game.usePractice('unknown'), false);
  assert.equal(game.usePractice('heal'), false);
  assert.equal(game.assisted, false);
  p.hp = 10;
  assert.ok(game.usePractice('heal'));
  assert.equal(p.hp, p.st.maxHp);
  assert.ok(game.usePractice('coins'));
  assert.equal(p.coins, 100);
  assert.ok(game.usePractice('xp'));
  assert.ok(p.level > 1 && game.pending > 0);
  assert.equal(save.data.coins, 5);
});

test('无敌可关闭，但使用过作弊的整局不发奖，不写战绩，重开后恢复正常', () => {
  const { game, save } = start();
  const before = JSON.stringify(save.data);
  game.state = 'practice';
  game.usePractice('invincible');
  game.state = 'playing';
  game.hurtPlayer(99);
  assert.equal(game.player.hp, 100);
  game.state = 'practice';
  game.usePractice('invincible');
  game.state = 'playing';
  game.hurtPlayer(25);
  assert.equal(game.player.hp, 75);
  game.player.coins = 100; game.time = 900;
  game.finish(true);
  assert.equal(game.result.assisted, true);
  assert.equal(game.result.earned, 0);
  assert.equal(game.result.newBest, false);
  assert.equal(JSON.stringify(save.data), before);
  assert.equal(save.writes, 0);
  game.start('ella');
  assert.equal(game.assisted, false);
  assert.equal(game.practiceInvincible, false);
  game.state = 'practice'; game.state = 'playing'; // 仅查看面板不影响正常结算。
  game.finish(false);
  assert.equal(save.data.runs, 3);
  assert.equal(save.writes, 1);
});

test('临时解锁能在名册切换未拥有角色，试玩不写档，关闭后恢复原选择', () => {
  const { game, save } = start();
  const before = JSON.stringify(save.data);
  assert.equal(game.usePractice('roster'), false);
  game.state = 'practice';
  assert.equal(game.usePractice('roster'), true);
  assert.equal(game.practiceRoster, true);
  assert.equal(game.assisted, true);
  assert.equal(game.selectPracticeChar('bron'), false); // 只在名册中可选角。
  game.state = 'menu';
  assert.equal(game.selectPracticeChar('constructor'), false);
  assert.equal(game.selectPracticeChar('ella'), false);
  for (const id of ['bron', 'nova', 'sain']) {
    game.state = 'menu';
    assert.equal(game.selectPracticeChar(id), true);
    game.start(game.practiceChar);
    assert.equal(game.player.char, id);
    assert.equal(game.assisted, true);
    game.finish(false);
    assert.equal(game.result.earned, 0);
  }
  assert.equal(save.writes, 0);
  assert.equal(JSON.stringify(save.data), before);

  game.state = 'practice';
  assert.equal(game.usePractice('roster'), true);
  assert.equal(game.practiceRoster, false);
  game.state = 'menu';
  assert.equal(game.selectPracticeChar('sain'), false);
  game.start(game.practiceChar ?? save.data.lastChar);
  assert.equal(game.player.char, 'ella');
  assert.equal(game.assisted, false);
});

test('保留试玩开关不影响已拥有角色的正式对局，也不能从双人面板解锁', () => {
  const { game, save } = start();
  game.start('ella', 'zhu', { robot: true });
  game.state = 'practice';
  assert.equal(game.usePractice('roster'), false);
  assert.equal(game.practiceRoster, false);
  game.start('ella');
  game.state = 'practice';
  game.usePractice('roster');
  game.state = 'menu';
  game.selectPracticeChar('nova');
  game.selectPracticeChar(null);
  game.start(save.data.lastChar);
  assert.equal(game.practiceRoster, true);
  assert.equal(game.assisted, false);
  game.finish(false);
  assert.equal(save.writes, 1);
});
