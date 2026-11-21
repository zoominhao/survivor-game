'use strict';

// 本地存档:金币、永久强化、角色和技能解锁、战绩
const Save = {
  KEY: 'nightwatch.save.v1',
  data: null,
  defaults() {
    const meta = {};
    for (const k in META) meta[k] = 0;
    return { coins: 0, seals: 0, meta, chars: { ella: true }, skills: {}, routes: {}, training: {}, startScene: 'dusk',
      selectedContract: null, claimedContracts: {},
      lastChar: 'ella', best: 0, kills: 0, runs: 0, wins: 0, muted: false };
  },
  load() {
    const d = this.defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(this.KEY) || 'null');
      if (raw && typeof raw === 'object') {
        Object.assign(d, raw);
        d.meta = Object.assign(this.defaults().meta, raw.meta || {});
        d.chars = Object.assign({ ella: true }, raw.chars || {});
        d.skills = {};
        for (const [id, item] of Object.entries(WEAPONS)) {
          if (item.unlockCost && raw.skills?.[id] === true) d.skills[id] = true;
        }
        d.seals = Number.isSafeInteger(raw.seals) && raw.seals >= 0 ? raw.seals : 0;
        d.routes = Object.fromEntries(Object.keys(OPENING_ROUTES).filter(id => raw.routes?.[id] === true).map(id => [id, true]));
        d.claimedContracts = Object.fromEntries(Object.keys(CONTRACTS).filter(id => raw.claimedContracts?.[id] === true).map(id => [id, true]));
        d.training = {};
        for (const char in CHARS) {
          const levels = raw.training?.[char];
          if (!levels || typeof levels !== 'object') continue;
          const clean = Object.entries(levels).filter(([id, rank]) => Object.hasOwn(HERO_TRAINING, id) &&
            Number.isInteger(rank) && rank > 0 && rank <= HERO_TRAINING_COSTS.length);
          if (clean.length) d.training[char] = Object.fromEntries(clean);
        }
      }
    } catch (e) { /* 存档损坏或环境不支持时使用默认值 */ }
    // 免费角色始终视为已解锁(包括后续版本新增的)
    for (const id in CHARS) if (!CHARS[id].cost) d.chars[id] = true;
    if (!Object.hasOwn(CHARS, d.lastChar) || !d.chars[d.lastChar]) d.lastChar = 'ella';
    if (!Environment.canOpen(d, d.startScene)) d.startScene = 'dusk';
    if (!contractAvailable(d, d.selectedContract)) d.selectedContract = null;
    this.data = d;
  },
  buySkill(id) {
    const cost = typeof id === 'string' && Object.hasOwn(WEAPONS, id) ? WEAPONS[id].unlockCost : null;
    const d = this.data;
    if (!cost || !d || d.skills[id] === true || !Number.isFinite(d.coins) || d.coins < cost) return false;
    d.coins -= cost;
    d.skills[id] = true;
    this.write();
    return true;
  },
  buyRoute(id) {
    const d = this.data;
    const cost = typeof id === 'string' && Object.hasOwn(OPENING_ROUTES, id) ? OPENING_ROUTES[id].cost : null;
    if (!d || !cost || Environment.canOpen(d, id) || !Number.isFinite(d.coins) || d.coins < cost) return false;
    d.coins -= cost;
    d.routes[id] = true;
    d.startScene = id;
    this.write();
    return true;
  },
  selectRoute(id) {
    if (!this.data || !Environment.canOpen(this.data, id) || this.data.startScene === id) return false;
    this.data.startScene = id;
    this.write();
    return true;
  },
  selectContract(id) {
    const d = this.data;
    if (!d || id === d.selectedContract || (id !== null && !contractAvailable(d, id))) return false;
    d.selectedContract = id;
    this.write();
    return true;
  },
  trainHero(char, stat) {
    const d = this.data;
    if (!d || typeof char !== 'string' || typeof stat !== 'string' || !Object.hasOwn(CHARS, char) ||
        !d.chars[char] || !Object.hasOwn(HERO_TRAINING, stat)) return false;
    const rank = d.training[char]?.[stat] ?? 0;
    const cost = HERO_TRAINING_COSTS[rank];
    if (!cost || !Number.isSafeInteger(d.seals) || d.seals < cost) return false;
    d.seals -= cost;
    (d.training[char] ??= {})[stat] = rank + 1;
    this.write();
    return true;
  },
  write() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* 忽略写入失败 */ }
  },
};
