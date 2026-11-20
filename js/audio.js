'use strict';
// ===== 音效:全部用 WebAudio 振荡器实时合成,不依赖音频文件 =====

// f0 → f1 为频率滑动,dur 为时长(秒),gap 为同名音效的最小触发间隔
const SOUNDS = {
  shoot: { type: 'square',   f0: 620,  f1: 320,  dur: 0.07, vol: 0.10, gap: 0.08 },
  hit:   { type: 'triangle', f0: 240,  f1: 120,  dur: 0.05, vol: 0.12, gap: 0.06 },
  kill:  { type: 'triangle', f0: 320,  f1: 80,   dur: 0.10, vol: 0.14, gap: 0.06 },
  gem:   { type: 'sine',     f0: 880,  f1: 1320, dur: 0.06, vol: 0.10, gap: 0.04 },
  coin:  { type: 'sine',     f0: 1200, f1: 1800, dur: 0.09, vol: 0.14, gap: 0.05 },
  level: { type: 'triangle', f0: 440,  f1: 1320, dur: 0.40, vol: 0.30, gap: 0.20 },
  hurt:  { type: 'sawtooth', f0: 200,  f1: 60,   dur: 0.20, vol: 0.28, gap: 0.15 },
  boom:  { type: 'sawtooth', f0: 120,  f1: 30,   dur: 0.35, vol: 0.30, gap: 0.10 },
  zap:   { type: 'square',   f0: 1400, f1: 200,  dur: 0.12, vol: 0.12, gap: 0.08 },
  frost: { type: 'sine',     f0: 1200, f1: 300,  dur: 0.30, vol: 0.18, gap: 0.20 },
  chest: { type: 'triangle', f0: 520,  f1: 1560, dur: 0.50, vol: 0.30, gap: 0.20 },
  boss:  { type: 'sawtooth', f0: 90,   f1: 45,   dur: 0.90, vol: 0.40, gap: 1.00 },
  intro: { type: 'triangle', f0: 164,  f1: 82,   dur: 0.62, vol: 0.24, gap: 0.40 },
  mango: { type: 'sine',     f0: 490,  f1: 940,  dur: 0.22, vol: 0.21, gap: 0.20 },
  paper: { type: 'triangle', f0: 700,  f1: 230,  dur: 0.16, vol: 0.22, gap: 0.22 },
  click: { type: 'sine',     f0: 700,  f1: 900,  dur: 0.05, vol: 0.15, gap: 0.03 },
};

const Sfx = {
  ctx: null,
  muted: false,
  last: {},

  // 浏览器要求用户手势后才能出声,在首次点击/按键时调用
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  play(name) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const d = SOUNDS[name];
    if (!d) return;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] || -1) < d.gap) return;
    this.last[name] = now;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = d.type;
    osc.frequency.setValueAtTime(d.f0, now);
    osc.frequency.exponentialRampToValueAtTime(d.f1, now + d.dur);
    gain.gain.setValueAtTime(d.vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + d.dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + d.dur + 0.02);
  },

  setMuted(m) {
    this.muted = m;
    Save.data.muted = m;
    Save.write();
  },
};
