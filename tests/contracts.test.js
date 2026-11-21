'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup(seed = {}) {
  let store = JSON.stringify(seed), writes = 0;
  const context = vm.createContext({ localStorage: { getItem: () => store, setItem: (_, value) => { store = value; writes++; } } });
  loadGame(context, f => battleScript(f) || f.endsWith('/save.js'));
  const { Save, WorldInteractions, createBattle, CONTRACTS } = vm.runInContext('({ Save, WorldInteractions, createBattle, CONTRACTS })', context);
  Save.load();
  const cues = [];
  const g = createBattle({ save: Save, play: cue => cues.push(cue) });
  return { Save, g, world: WorldInteractions, CONTRACTS, cues, writes: () => writes };
}

test('委托可不接、改选、取消，开局锁定当前选择，旧档不会自动报名', () => {
  const { Save, g } = setup({ coins: 28 });
  assert.equal(Save.data.selectedContract, null);
  g.start('ella');
  assert.equal(g.contract, null);
  assert.ok(!Save.selectContract('constructor'));
  assert.ok(Save.selectContract('rainLights'));
  assert.ok(Save.selectContract('snowVigil'));
  Save.load();
  assert.equal(Save.data.selectedContract, 'snowVigil');
  g.start('ella');
  assert.ok(Save.selectContract(null));
  assert.equal(g.contract.id, 'snowVigil');
  assert.equal(Save.data.coins, 28);
  g.start('ella');
  assert.equal(g.contract, null);
});

test('雨庭按不同喜灯计数，重访不清零，阵亡结算仍给一次奖励', () => {
  const { Save, g, world, CONTRACTS, cues, writes } = setup({ selectedContract: 'rainLights', coins: 7, seals: 2 });
  const visit = x => world.visitLight(g, { kind: 'weddingLamp', x, y: 0 }, `rain:${x}:0`);
  const reward = CONTRACTS.rainLights;
  g.start('ella');
  world.visitLight(g, { kind: 'brazier', x: 0, y: 5 }, 'snow:0:5');
  visit(0); visit(0);
  assert.equal(g.contract.progress, 1);
  g.enterLandscape('snow'); g.enterLandscape('rain');
  visit(0); visit(220);
  assert.equal(g.contract.progress, 2);
  visit(390); visit(630);
  assert.equal(g.contract.progress, 3);
  assert.equal(g.contract.done, true);
  assert.equal(cues.filter(c => c === 'contractDone').length, 1);
  assert.equal(writes(), 0);
  g.time = 115;
  g.hurtPlayer(999, null);
  assert.equal(g.result.win, false);
  assert.equal(g.result.earned, 11 + reward.coins);
  assert.equal(g.result.earnedSeals, 1 + reward.seals);
  assert.equal(Save.data.coins, 7 + 11 + reward.coins);
  assert.equal(Save.data.seals, 2 + 1 + reward.seals);
  g.finish(false);
  assert.equal(writes(), 1);
  Save.load();
  assert.equal(Save.data.claimedContracts.rainLights, true);
  assert.equal(Save.data.selectedContract, null);
  assert.ok(!Save.selectContract('rainLights'));
  g.start('ella');
  assert.equal(g.contract, null);
});

test('雪岭连续计时，只有实际取暖或离开才重置，进度不会在暂停中走动', () => {
  const { g, world } = setup({ selectedContract: 'snowVigil' });
  const shrine = { kind: 'warmingShrine', x: 30, y: 3 };
  g.start('zhu');
  g.time = 194;
  g.enterLandscape('snow');
  g.stepContract(12);
  g.state = 'paused';
  g.update(20);
  assert.equal(g.contract.progress, 12);
  g.state = 'playing';
  world.visitLandmark(g, shrine, 'snow:30:3');
  assert.equal(g.contract.progress, 12); // 满血没有实际用掉取暖龛。
  g.player.hp -= 25;
  world.visitLandmark(g, shrine, 'snow:30:3');
  assert.equal(g.contract.progress, 0);
  g.stepContract(0.02);
  assert.equal(g.contract.progress, 0);
  g.time++;
  g.stepContract(15);
  g.enterLandscape('night'); g.stepContract(0.05);
  assert.equal(g.contract.progress, 0);
  g.enterLandscape('snow'); g.stepContract(29.99);
  assert.equal(g.contract.done, false);
  g.stepContract(0.01);
  assert.equal(g.contract.done, true);
  g.enterLandscape('night'); g.stepContract(0.05);
  assert.equal(g.contract.progress, 30);
});

test('揭符破魇只认夜魇的悬赏打法，未完成可重试，奖励叠加原有悬赏金', () => {
  const { Save, g, CONTRACTS } = setup({ selectedContract: 'nightmareBounty' });
  const fight = (variant, plan) => {
    g.start('ella');
    g.time = 245;
    g.offerBossDecision({ variant, tier: 0, scene: 'night' });
    assert.ok(g.chooseBossPlan(plan));
    g.killEnemy(g.boss);
  };
  fight('nightmare', 'normal');
  g.finish(false);
  assert.equal(g.result.contract.coins, 0);
  assert.equal(g.result.contract.done, false);
  assert.equal(Save.data.selectedContract, 'nightmareBounty');
  fight('coffinKing', 'challenge');
  assert.equal(g.contract.progress, 0);
  fight('nightmare', 'challenge');
  const oldBounty = g.player.coins;
  assert.ok(oldBounty > 0);
  g.finish(false);
  assert.equal(g.result.earned, oldBounty + 24 + CONTRACTS.nightmareBounty.coins);
  assert.equal(g.result.contract.seals, CONTRACTS.nightmareBounty.seals);
});

test('练习局和双人局不发委托奖励，也不消费首次结算资格', () => {
  const { Save, g, writes } = setup({ selectedContract: 'rainLights', coins: 10 });
  g.start('ella');
  g.contractLit('weddingLamp'); g.contractLit('weddingLamp'); g.contractLit('weddingLamp');
  g.state = 'practice';
  assert.ok(g.usePractice('invincible'));
  g.finish(false);
  assert.equal(g.result.contract.coins, 0);
  assert.equal(g.result.contract.done, true);
  assert.equal(writes(), 0);
  assert.deepEqual(Object.keys(Save.data.claimedContracts), []);
  g.start('ella', 'zhu');
  assert.equal(g.contract, null);
  g.finish(true);
  assert.equal(g.result.contract, null);
  assert.equal(writes(), 0);
  assert.equal(Save.data.selectedContract, 'rainLights');
});
