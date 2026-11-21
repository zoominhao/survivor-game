'use strict';

const CONTRACTS = {
  rainLights: { name: '雨庭添灯', group: 'map', stage: 'rain', icon: 'rainRoute', goal: 3, unit: '盏', coins: 60, seals: 1,
    desc: '点亮雨落石庭的 3 盏不同喜灯。' },
  snowVigil: { name: '雪岭禁暖', group: 'map', stage: 'snow', icon: 'winter', goal: 30, unit: '秒', coins: 75, seals: 1,
    desc: '在霜封山径连续坚持 30 秒。用取暖龛回血会重新计时。' },
  bambooWards: { name: '竹径镇纸', group: 'map', stage: 'bamboo', icon: 'exampaper', goal: 2, unit: '处', coins: 70, seals: 1,
    desc: '在风过竹径引动两处不同的镇纸符。附近有夜兽才会触发。' },
  pineBell: { name: '松林暮钟', group: 'map', stage: 'night', icon: 'moon', goal: 4, unit: '只', coins: 65, seals: 1,
    desc: '一次敲响镇魂钟，至少震到 4 只夜兽。不同次敲钟不累加。' },
  rainSigil: { name: '引星归灯', group: 'map', stage: 'rain', icon: 'starlance', goal: 6, unit: '颗', coins: 80, seals: 1,
    desc: '在雨庭用一次引星符阵吸引至少 6 颗经验宝石。已经飞向你的不算。' },
  eliteHunt: { name: '精英夜猎', group: 'fight', icon: 'kills', goal: 3, unit: '只', coins: 85, seals: 1,
    desc: '击败 3 只带精英标记的夜兽。不计 Boss，也不要求拾取宝箱。' },
  nightmareBounty: { name: '揭符破魇', group: 'fight', icon: 'kills', goal: 1, unit: '', coins: 120, seals: 2,
    desc: '夜魇战前选择「揭符悬赏」，再击败强化后的夜魇。' },
  bossChest: { name: '余光寻宝', group: 'fight', icon: 'growth', goal: 1, unit: '个', coins: 95, seals: 1,
    desc: '击败任意 Boss 后，在战场上找到并打开它掉落的宝箱。精英宝箱不算。' },
  triad: { name: '三关破夜', group: 'fight', icon: 'watchSeal', goal: 3, unit: '位', coins: 180, seals: 3,
    desc: '同一局击败夜魇、棺山尸王和冥轿鬼后。三场交战不限战前抉择。' },
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
    if (this.coop || !contractAvailable(data, id)) return null;
    const required = CONTRACTS[id].stage;
    return !required || required === this.stage ? { id, progress: 0, done: false } : null;
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
    if (kind === 'weddingLamp') this.trackContract('rainLights');
  },

  trackContract(id, key = null) {
    const c = this.contract;
    if (c?.id !== id || c.done) return;
    if (key !== null) {
      const seen = c.seen ??= new Set();
      if (seen.has(key)) return;
      seen.add(key);
    }
    this.advanceContract(1);
  },

  contractLandmark(kind, key, affected) {
    if (kind === 'warmingShrine') this.contractWarmed();
    if (kind === 'paperWard') this.trackContract('bambooWards', key);
    const peak = kind === 'wardBell' ? 'pineBell' : kind === 'starSigil' ? 'rainSigil' : null;
    if (peak && this.contract?.id === peak && affected > this.contract.progress) {
      this.advanceContract(affected - this.contract.progress);
    }
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
    if (c.resetAt !== this.time) this.advanceContract(dt);
  },

  contractBoss(boss) {
    if (boss.kind === 'nightmare' && boss.plan === 'challenge') this.trackContract('nightmareBounty');
    if (['nightmare', 'coffinKing', 'bridalQueen'].includes(boss.kind)) this.trackContract('triad', boss.kind);
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
