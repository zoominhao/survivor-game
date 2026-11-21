'use strict';

// 随机池与场景运行规则；地图内容和商店资料定义在 stages.js。
const Environment = {
  lights: {
    lantern: { name: '石灯', color: '#ffd282', radius: 118, height: 19, strength: 0.88 },
    brazier: { name: '火盆', color: '#ff9b58', radius: 161, height: 13, strength: 0.93 },
    paperLamp: { name: '纸灯笼', color: '#ffb3a0', radius: 103, height: 33, strength: 0.87 },
    ghostLamp: { name: '幽冥灯', color: '#86d7d0', radius: 124, height: 19, strength: 0.9 },
    weddingLamp: { name: '喜灯', color: '#ff777c', radius: 133, height: 33, strength: 0.92 },
    dawnLamp: { name: '晨灯', color: '#ffe0a0', radius: 140, height: 20, strength: 0.88 },
  },

  isStage(id) { return typeof id === 'string' && Object.hasOwn(STAGES, id); },

  canOpen(data, id) { return this.isStage(id) && (!STAGES[id].cost || data?.routes?.[id] === true); },

  ownedStages(data) { return Object.keys(STAGES).filter(id => this.canOpen(data, id)); },

  stagePool(data) {
    const owned = this.ownedStages(data);
    const preferred = Array.isArray(data?.stageSelection) ? owned.filter(id => data.stageSelection.includes(id)) : [];
    return preferred.length ? preferred : owned;
  },

  sharedStages(local, peer) {
    const shared = local.filter(id => this.isStage(id) && peer.includes(id));
    return shared.length ? shared : [DEFAULT_STAGE];
  },

  pickStage(pool, rng = Math.random) { return pool.length > 1 ? pool[Math.floor(rng() * pool.length)] : pool[0] ?? DEFAULT_STAGE; },

  dawnlight(time, duration = CFG.RUN_TIME) {
    const lead = Math.min(90, duration / 10);
    return U.clamp((time - (duration - lead)) / (lead * 2 / 3), 0, 1);
  },

  stormCycle(time) { return Math.floor((time - 7) / 18); },
  stormFlash(time) {
    const cycle = this.stormCycle(time);
    return cycle < 0 ? 0 : Math.max(0, 1 - (time - 7 - cycle * 18) / 0.45);
  },

  enemyPoolAt(time, stage = DEFAULT_STAGE) {
    const map = STAGES[stage];
    if (time < 12 && map.opening) return map.opening;
    return time >= 360 && map.late ? map.late : map.enemies;
  },
};
