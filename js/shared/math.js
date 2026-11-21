'use strict';

const TAU = Math.PI * 2;

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
