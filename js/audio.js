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
  corpseHop: [0.23, ['sine', 114, 52, 0.17, 0.235], ['triangle', 206, 97, 0.09, 0.10, 0.015, 420]],
  corpseAmbush: [1.2, ['triangle', 124, 81, 0.6, 0.19, 0, 380], ['sine', 96, 58, 0.33, 0.17, 0.19]],
  bridalBell: [1, ['sine', 625, 608, 0.78, 0.21], ['sine', 948, 930, 0.53, 0.12, 0.11], ['triangle', 319, 306, 0.37, 0.105, 0.23]],
  weddingPaper: [0.26, ['sawtooth', 877, 235, 0.19, 0.135, 0, 1160], ['triangle', 1470, 650, 0.105, 0.105, 0.022, 1680]],
  bridalFade: [0.38, ['sine', 782, 437, 0.3, 0.12], ['sine', 1145, 901, 0.24, 0.08, 0.055]],
  paperChild: [0.42, ['sawtooth', 1410, 410, 0.085, 0.105, 0, 1620], ['triangle', 962, 1280, 0.13, 0.095, 0.06, 1800], ['sawtooth', 1080, 350, 0.09, 0.06, 0.15, 1250]],
  umbrellaOpen: [0.85, ['sawtooth', 240, 650, 0.21, 0.13, 0, 1050], ['triangle', 520, 187, 0.15, 0.15, 0.145, 1800], ['sine', 771, 633, 0.29, 0.09, 0.19]],
  umbrellaDrip: [0.29, ['sine', 430, 788, 0.14, 0.155], ['sine', 1320, 848, 0.11, 0.08, 0.029]],
  envoyChain: [0.57, ['triangle', 399, 322, 0.16, 0.11, 0, 900], ['sine', 832, 691, 0.12, 0.075, 0.05], ['triangle', 281, 208, 0.23, 0.12, 0.14, 740]],
  envoyCall: [0.9, ['triangle', 155, 139, 0.62, 0.16, 0, 610], ['sine', 284, 253, 0.65, 0.14, 0.16], ['sine', 721, 497, 0.32, 0.065, 0.18]],
  bambooPass: [1, ['triangle', 474, 247, 0.12, 0.11], ['triangle', 391, 230, 0.17, 0.1, 0.16], ['sawtooth', 250, 445, 0.32, 0.06, 0.11, 670]],
  rainPass: [1, ['sine', 670, 530, 0.23, 0.095], ['sine', 903, 665, 0.22, 0.07, 0.16], ['sine', 448, 410, 0.24, 0.095, 0.36]],
  snowPass: [1, ['sawtooth', 226, 307, 0.75, 0.065, 0, 590], ['sine', 538, 386, 0.74, 0.1, 0.16]],
  roar: [0.3, ['sawtooth', 163, 83, 0.28, 0.16, 0, 630], ['triangle', 282, 113, 0.21, 0.14, 0.026, 840]],
  lantern: [0.18, ['sine', 690, 704, 0.19, 0.10], ['triangle', 1020, 1030, 0.12, 0.07, 0.05]],
  wardBell: [0.35, ['triangle', 224, 217, 0.78, 0.24], ['sine', 527, 516, 0.55, 0.15, 0.021]],
  sigilGather: [0.32, ['sine', 485, 603, 0.2, 0.14], ['sine', 683, 815, 0.26, 0.12, 0.096]],
  rustle: [0.22, ['sawtooth', 617, 224, 0.1, 0.065, 0, 690]],
  victory: [0.45, ['triangle', 392, 392, 0.33, 0.17], ['sine', 587, 587, 0.38, 0.18, 0.14], ['triangle', 784, 784, 0.62, 0.21, 0.28]],
  defeat: [0.45, ['triangle', 330, 310, 0.31, 0.17], ['sine', 196, 145, 0.66, 0.23, 0.16]],
};

function audioTone(ctx, destination, at, wave, from, to, dur, volume, cutoff, pan = 0) {
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
  const stereo = pan ? ctx.createStereoPanner?.() : null;
  if (stereo) { stereo.pan.value = pan; env.connect(stereo); stereo.connect(destination); }
  else env.connect(destination);
  osc.onended = () => { osc.disconnect(); filter?.disconnect(); env.disconnect(); stereo?.disconnect(); };
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
      if (cue) this.play(...cue);
    }, () => {
      // 无法解除浏览器挂起时，下一次用户手势可以重试。
      this.resuming = false; this.pendingCue = null;
    });
  },

  play(name, gain = 1, pan = 0) {
    const cue = SOUNDS[name];
    if (!cue || gain <= 0 || this.muted || this.hidden || !this.ctx) return;
    if (this.ctx.state !== 'running') {
      if (this.resuming) this.pendingCue = [name, gain, pan];
      return;
    }
    const now = this.ctx.currentTime;
    if (now - (this.last[name] ?? -Infinity) < cue[0]) return;
    this.last[name] = now;
    for (let i = 1; i < cue.length; i++) {
      const [wave, from, to, dur, volume, delay = 0, cutoff] = cue[i];
      audioTone(this.ctx, this.master, now + delay, wave, from, to, dur, volume * gain, cutoff, pan);
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
