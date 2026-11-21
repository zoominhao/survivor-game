'use strict';

// 本地存档:金币、永久强化、角色解锁、战绩
const Save = {
  KEY: 'nightwatch.save.v1',
  data: null,
  defaults() {
    const meta = {};
    for (const k in META) meta[k] = 0;
    return { coins: 0, meta, chars: { ella: true }, lastChar: 'ella', best: 0, kills: 0, runs: 0, wins: 0, muted: false };
  },
  load() {
    const d = this.defaults();
    try {
      const raw = JSON.parse(localStorage.getItem(this.KEY) || 'null');
      if (raw && typeof raw === 'object') {
        Object.assign(d, raw);
        d.meta = Object.assign(this.defaults().meta, raw.meta || {});
        d.chars = Object.assign({ ella: true }, raw.chars || {});
      }
    } catch (e) { /* 存档损坏或环境不支持时使用默认值 */ }
    // 免费角色始终视为已解锁(包括后续版本新增的)
    for (const id in CHARS) if (!CHARS[id].cost) d.chars[id] = true;
    if (!CHARS[d.lastChar] || !d.chars[d.lastChar]) d.lastChar = 'ella';
    this.data = d;
  },
  write() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* 忽略写入失败 */ }
  },
};
