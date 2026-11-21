'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

test('战报奖励按来源拆分，和一次性入账完全一致', () => {
  const scope = vm.createContext({});
  loadGame(scope, f => battleScript(f) || f.endsWith('/save.js'));
  const { createBattle, Save } = vm.runInContext('({ createBattle, Save })', scope);
  const save = { data: Save.defaults(), writes: 0, write() { this.writes++; } };
  save.data.selectedContract = 'eliteHunt';
  const g = createBattle({ save });
  g.start('ella');
  g.player.coins = 19.95;
  g.time = 900;
  g.bossesDefeated = 2;
  for (let i = 0; i < 3; i++) g.trackContract('eliteHunt');
  g.finish(true);
  assert.deepEqual({ ...g.result.rewards.coins }, { loot: 19, time: 90, victory: 200, contract: 85 });
  assert.deepEqual({ ...g.result.rewards.seals }, { time: 10, bosses: 4, victory: 2, contract: 1 });
  assert.equal(g.result.earned, save.data.coins);
  assert.equal(g.result.earnedSeals, save.data.seals);
  g.finish(true);
  assert.equal(save.writes, 1);
  for (const pair of ['zhu', null]) {
    g.start('ella', pair);
    if (!pair) g.assisted = true;
    g.finish(true);
    assert.equal(g.result.rewards, null);
    assert.equal(g.result.earned, 0);
  }
  assert.equal(save.writes, 1);
});

test('黎明演出可跳过、到时自动收尾，同一战报不会重复演出', () => {
  const Game = { stage: 'dusk', result: { win: true } };
  let reduced = false;
  const scope = vm.createContext({ Game, STAGES: { dusk: { name: '松灯古道' } }, window: { matchMedia: () => ({ matches: reduced }) } });
  loadGame(scope, f => f.endsWith('/result.js'));
  const ui = { ...vm.runInContext('ResultUI', scope), $: () => ({}), show(id) { this.overlayId = id; }, showResult() { this.show('result'); } };
  ui.presentResult(0);
  assert.equal(ui.overlayId, 'dawn');
  ui.presentResult(200);
  ui.tickDawn(1000);
  assert.equal(ui.overlayId, 'dawn');
  ui.finishDawn();
  ui.presentResult(2000);
  assert.equal(ui.overlayId, 'result');

  Game.result = { win: true };
  ui.presentResult(2000);
  ui.tickDawn(6000);
  assert.equal(ui.overlayId, 'result');
  reduced = true;
  Game.result = { win: true };
  ui.presentResult(7000);
  assert.equal(ui.overlayId, 'result');
  reduced = false;
  Game.result = { win: false };
  ui.presentResult(8000);
  assert.equal(ui.overlayId, 'result');
});
