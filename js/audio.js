'use strict';
// ===== Web Audio 混音与程序音效，不依赖音频文件 =====

// 每层为 [波形, 起始频率, 结束频率, 时长, 音量, 延迟, 可选低通]。
const SOUNDS = {
  click: [0.05, ['triangle', 670, 480, 0.06, 0.11]],
  shoot: [0.085, ['triangle', 660, 300, 0.08, 0.13], ['sine', 950, 570, 0.045, 0.065]],
  mouse: [0.13, ['sine', 690, 1060, 0.065, 0.13], ['sine', 880, 650, 0.10, 0.11, 0.045]],
  candy: [0.075, ['sine', 580, 280, 0.075, 0.18], ['triangle', 1000, 780, 0.037, 0.055]],
  toss: [0.11, ['triangle', 290, 520, 0.10, 0.15], ['sine', 540, 340, 0.09, 0.09, 0.045]],
  roll: [0.13, ['triangle', 160, 83, 0.12, 0.19], ['sine', 138, 67, 0.1, 0.1, 0.06]],
  bounce: [0.095, ['sine', 170, 76, 0.13, 0.24], ['triangle', 450, 235, 0.048, 0.085]],
  splash: [0.16, ['sine', 154, 65, 0.23, 0.25], ['sawtooth', 355, 83, 0.14, 0.12, 0.012, 560]],
  land: [0.15, ['triangle', 224, 103, 0.14, 0.18], ['sine', 415, 341, 0.08, 0.09]],
  hit: [0.087, ['triangle', 245, 121, 0.055, 0.12]],
  kill: [0.09, ['sine', 270, 107, 0.085, 0.12]],
  gem: [0.065, ['sine', 880, 980, 0.085, 0.11], ['sine', 1320, 1370, 0.075, 0.055, 0.036]],
  coin: [0.085, ['triangle', 932, 932, 0.13, 0.17], ['sine', 1397, 1397, 0.16, 0.08, 0.05]],
  level: [0.28, ['triangle', 440, 440, 0.23, 0.15], ['triangle', 587, 587, 0.28, 0.14, 0.08], ['sine', 880, 880, 0.4, 0.21, 0.16]],
  hurt: [0.18, ['sawtooth', 174, 62, 0.18, 0.22, 0, 520], ['sine', 135, 54, 0.22, 0.16]],
  boom: [0.16, ['sine', 132, 35, 0.34, 0.27], ['sawtooth', 194, 46, 0.22, 0.18, 0, 440]],
  zap: [0.12, ['square', 1050, 260, 0.12, 0.13, 0, 1350], ['triangle', 470, 165, 0.15, 0.09, 0.05]],
  frost: [0.20, ['sine', 834, 460, 0.25, 0.12], ['sine', 1210, 810, 0.28, 0.095, 0.05]],
  chest: [0.26, ['triangle', 392, 396, 0.23, 0.14], ['triangle', 587, 590, 0.28, 0.17, 0.07], ['sine', 784, 784, 0.32, 0.18, 0.14]],
  boss: [0.95, ['triangle', 126, 64, 0.58, 0.29, 0, 620], ['sine', 114, 50, 0.68, 0.23, 0.21]],
  intro: [0.42, ['triangle', 164, 82, 0.62, 0.24], ['sine', 293, 289, 0.65, 0.15, 0.16]],
  mango: [0.24, ['sine', 587, 590, 0.18, 0.17], ['sine', 784, 790, 0.24, 0.19, 0.075]],
  paper: [0.22, ['triangle', 700, 230, 0.13, 0.18], ['square', 930, 514, 0.055, 0.075, 0.019, 1150]],
  roar: [0.3, ['sawtooth', 163, 83, 0.28, 0.16, 0, 630], ['triangle', 282, 113, 0.21, 0.14, 0.026, 840]],
  victory: [0.45, ['triangle', 392, 392, 0.33, 0.17], ['sine', 587, 587, 0.38, 0.18, 0.14], ['triangle', 784, 784, 0.62, 0.21, 0.28]],
  defeat: [0.45, ['triangle', 330, 310, 0.31, 0.17], ['sine', 196, 145, 0.66, 0.23, 0.16]],
};

function audioTone(ctx, destination, at, wave, from, to, dur, volume, cutoff) {
  const osc = ctx.createOscillator(), env = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.linearRampToValueAtTime(volume, at + Math.min(0.009, dur * 0.22));
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let filter;
  if (cutoff) {
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff;
    osc.connect(filter); filter.connect(env);
  } else osc.connect(env);
  env.connect(destination);
  osc.onended = () => { osc.disconnect(); filter?.disconnect(); env.disconnect(); };
  osc.start(at);
  osc.stop(at + dur + 0.012);
}

const Sfx = {
  ctx: null,
  muted: false,
  hidden: false,
  last: {},

  // 浏览器要求用户手势后才能出声,在首次点击/按键时调用
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted || this.hidden ? 0 : 0.56;
        this.master.connect(this.ctx.destination);
        this.music = new NightMusic(this.ctx, this.master);
      } catch (e) { this.ctx = null; return; }
    }
    this.resumeAudio();
  },

  resumeAudio() {
    if (!this.ctx || this.resuming || !['suspended', 'interrupted'].includes(this.ctx.state)) return;
    this.resuming = true;
    this.ctx.resume().then(() => {
      const cue = this.pendingCue;
      this.resuming = false; this.pendingCue = null;
      if (cue) this.play(cue);
    }, () => {
      // 无法解除浏览器挂起时，下一次用户手势可以重试。
      this.resuming = false; this.pendingCue = null;
    });
  },

  play(name) {
    const cue = SOUNDS[name];
    if (!cue || this.muted || this.hidden || !this.ctx) return;
    if (this.ctx.state !== 'running') {
      if (this.resuming) this.pendingCue = name;
      return;
    }
    const now = this.ctx.currentTime;
    if (now - (this.last[name] ?? -Infinity) < cue[0]) return;
    this.last[name] = now;
    for (let i = 1; i < cue.length; i++) {
      const [wave, from, to, dur, volume, delay = 0, cutoff] = cue[i];
      audioTone(this.ctx, this.master, now + delay, wave, from, to, dur, volume, cutoff);
    }
  },

  syncMusic(state, bossActive) {
    if (!this.music) return;
    const quiet = state === 'levelup' || state === 'chest';
    const track = this.muted || this.hidden || this.ctx.state !== 'running' ? null :
      state === 'menu' ? 'menu' : state === 'playing' || quiet ? (bossActive ? 'boss' : 'battle') : null;
    this.music.sync(track, quiet);
  },

  applyMix() {
    if (!this.ctx) return;
    const silent = this.muted || this.hidden, now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(silent ? 0 : 0.56, now, 0.025);
    if (silent) { this.pendingCue = null; this.music.stop(); }
  },

  setHidden(hidden) {
    this.hidden = hidden;
    this.applyMix();
    if (!hidden && !this.muted && this.ctx?.state === 'interrupted') this.resumeAudio();
  },

  setMuted(m) {
    this.muted = m;
    this.applyMix();
    Save.data.muted = m;
    Save.write();
  },
};
