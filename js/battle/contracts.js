'use strict';

const CONTRACTS = {
  rainLights: { name: '雨庭添灯', icon: 'rainRoute', goal: 3, unit: '盏', coins: 60, seals: 1,
    desc: '点亮雨落石庭的 3 盏不同喜灯。重访雨庭时保留进度。' },
  snowVigil: { name: '雪岭禁暖', icon: 'winter', goal: 30, unit: '秒', coins: 75, seals: 1,
    desc: '在霜封山径连续坚持 30 秒。离开雪岭或用取暖龛回血会重新计时。' },
  nightmareBounty: { name: '揭符破魇', icon: 'kills', goal: 1, unit: '', coins: 120, seals: 2,
    desc: '夜魇战前选择「揭符悬赏」，再击败强化后的夜魇。' },
};

function contractAvailable(data, id) {
  return typeof id === 'string' && Object.hasOwn(CONTRACTS, id) && data.claimedContracts?.[id] !== true;
}

function contractProgress(c) {
  const def = CONTRACTS[c.id];
  return `${Math.floor(c.progress)}/${def.goal}${def.unit}`;
}

const BattleContracts = {
  startContract(data) {
    const id = data.selectedContract;
    return !this.coop && contractAvailable(data, id) ? { id, progress: 0, done: false } : null;
  },

  advanceContract(amount) {
    const c = this.contract, goal = CONTRACTS[c.id].goal;
    if (c.done) return;
    c.progress += amount;
    if (c.progress + 1e-8 < goal) return;
    c.progress = goal;
    c.done = true;
    this.play('contractDone');
  },

  contractLit(kind) {
    if (kind === 'weddingLamp' && this.contract?.id === 'rainLights') this.advanceContract(1);
  },

  contractWarmed() {
    const c = this.contract;
    if (c?.id !== 'snowVigil' || c.done) return;
    c.progress = 0;
    c.resetAt = this.time;
  },

  stepContract(dt) {
    const c = this.contract;
    if (c?.id !== 'snowVigil' || c.done) return;
    if (this.landscape !== 'snow') c.progress = 0;
    else if (c.resetAt !== this.time) this.advanceContract(dt);
  },

  contractBoss(boss) {
    if (this.contract?.id === 'nightmareBounty' && boss.kind === 'nightmare' && boss.plan === 'challenge') {
      this.advanceContract(1);
    }
  },

  settleContract(ranked) {
    const c = this.contract, data = this.save.data;
    if (!c) return null;
    const paid = ranked && c.done && contractAvailable(data, c.id);
    if (paid) {
      (data.claimedContracts ??= {})[c.id] = true;
      if (data.selectedContract === c.id) data.selectedContract = null;
    }
    const def = CONTRACTS[c.id];
    return { id: c.id, progress: c.progress, done: c.done, coins: paid ? def.coins : 0, seals: paid ? def.seals : 0 };
  },
};
