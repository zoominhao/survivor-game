'use strict';
// ===== 通用工具、空间网格、存档 =====

const U = {
  rand(a, b) { return a + Math.random() * (b - a); },
  randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  // 按权重表 {key: weight} 随机取一个 key
  weighted(table) {
    let sum = 0;
    for (const k in table) sum += table[k];
    let r = Math.random() * sum;
    for (const k in table) { r -= table[k]; if (r <= 0) return k; }
    return Object.keys(table)[0];
  },
  fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  },
};

// 均匀空间网格:每帧重建,用于敌人的邻近查询
class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  clear() {
    // 玩家在无限地图上移动会不断产生新格子,过多时整体丢弃
    if (this.map.size > 3000) { this.map.clear(); return; }
    for (const a of this.map.values()) a.length = 0;
  }
  key(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }
  insert(e) {
    const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
    let a = this.map.get(k);
    if (!a) { a = []; this.map.set(k, a); }
    a.push(e);
  }
  get(cx, cy) { return this.map.get(this.key(cx, cy)); }
}

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
