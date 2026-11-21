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
  watchClack: [0.14, ['triangle', 490, 315, 0.085, 0.18], ['sine', 830, 810, 0.045, 0.09]],
  herbalMist: [0.3, ['sine', 320, 515, 0.25, 0.11], ['triangle', 630, 570, 0.2, 0.065, 0.065]],
  threadPluck: [0.18, ['triangle', 890, 545, 0.16, 0.13], ['sine', 1330, 870, 0.10, 0.07, 0.017]],
  maskFlare: [0.3, ['triangle', 227, 114, 0.25, 0.16], ['sine', 339, 218, 0.2, 0.075, 0.05]],
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
  bossWind: [0.48, ['triangle', 135, 285, 0.33, 0.12, 0, 590], ['sine', 243, 341, 0.24, 0.105, 0.16]],
  bossCharge: [0.45, ['sine', 128, 47, 0.32, 0.29], ['sawtooth', 324, 101, 0.26, 0.125, 0.025, 620]],
  coffinSeal: [0.45, ['triangle', 188, 305, 0.42, 0.13, 0, 800], ['sine', 421, 295, 0.34, 0.11, 0.22]],
  nightmareClear: [0.85, ['sine', 120, 49, 0.37, 0.28], ['triangle', 392, 392, 0.53, 0.15, 0.16],
    ['sine', 587, 587, 0.64, 0.135, 0.32], ['sine', 784, 784, 0.72, 0.15, 0.49]],
  intro: [0.42, ['triangle', 164, 82, 0.62, 0.24], ['sine', 293, 289, 0.65, 0.15, 0.16]],
  mango: [0.24, ['sine', 587, 590, 0.18, 0.17], ['sine', 784, 790, 0.24, 0.19, 0.075]],
  drumstick: [0.24, ['triangle', 270, 170, 0.085, 0.13, 0, 800], ['sine', 620, 775, 0.22, 0.14, 0.055]],
  goldDrop: [0.18, ['sine', 144, 48, 0.21, 0.28], ['triangle', 920, 612, 0.29, 0.15, 0.012], ['sine', 1420, 1113, 0.18, 0.08, 0.025]],
  compileTap: [0.09, ['triangle', 574, 396, 0.071, 0.15], ['sine', 1148, 822, 0.048, 0.055, 0.027]],
  ticketRush: [0.19, ['sawtooth', 1040, 270, 0.13, 0.09, 0, 1550], ['triangle', 465, 200, 0.10, 0.10, 0.035]],
  noodleTangle: [0.32, ['sine', 245, 440, 0.17, 0.14], ['triangle', 530, 260, 0.23, 0.10, 0.08], ['sine', 653, 790, 0.13, 0.065, 0.14]],
  aiScan: [0.34, ['triangle', 720, 1120, 0.11, 0.10], ['sine', 1310, 1500, 0.09, 0.09, 0.09]],
  aiStrike: [0.21, ['triangle', 580, 115, 0.21, 0.19, 0, 1300], ['sine', 1450, 640, 0.18, 0.09, 0.015]],
  soulCoin: [0.14, ['triangle', 1080, 682, 0.12, 0.13], ['sine', 1610, 1270, 0.085, 0.055, 0.027]],
  incenseSet: [0.3, ['triangle', 442, 255, 0.17, 0.095, 0, 1050], ['sine', 620, 600, 0.34, 0.081, 0.06]],
  mirrorChime: [0.24, ['sine', 1305, 877, 0.23, 0.17], ['triangle', 474, 350, 0.14, 0.1, 0.018]],
  contractDone: [0.45, ['triangle', 523, 523, 0.27, 0.17], ['sine', 784, 784, 0.37, 0.2, 0.09], ['sine', 1046, 1046, 0.29, 0.12, 0.19]],
  paper: [0.22, ['triangle', 700, 230, 0.13, 0.18], ['square', 930, 514, 0.055, 0.075, 0.019, 1150]],
  corpseHop: [0.23, ['sine', 114, 52, 0.17, 0.235], ['triangle', 206, 97, 0.09, 0.10, 0.015, 420]],
  bridalBell: [1, ['sine', 625, 608, 0.78, 0.21], ['sine', 948, 930, 0.53, 0.12, 0.11], ['triangle', 319, 306, 0.37, 0.105, 0.23]],
  weddingPaper: [0.26, ['sawtooth', 877, 235, 0.19, 0.135, 0, 1160], ['triangle', 1470, 650, 0.105, 0.105, 0.022, 1680]],
  bridalFade: [0.38, ['sine', 782, 437, 0.3, 0.12], ['sine', 1145, 901, 0.24, 0.08, 0.055]],
  paperChild: [0.42, ['sawtooth', 1410, 410, 0.085, 0.105, 0, 1620], ['triangle', 962, 1280, 0.13, 0.095, 0.06, 1800], ['sawtooth', 1080, 350, 0.09, 0.06, 0.15, 1250]],
  umbrellaDrip: [0.29, ['sine', 430, 788, 0.14, 0.155], ['sine', 1320, 848, 0.11, 0.08, 0.029]],
  envoyChain: [0.57, ['triangle', 399, 322, 0.16, 0.11, 0, 900], ['sine', 832, 691, 0.12, 0.075, 0.05], ['triangle', 281, 208, 0.23, 0.12, 0.14, 740]],
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

function audioTone(ctx, destination, at, wave, from, to, dur, volume, cutoff, pan = 0, attack) {
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  let filter;
  if (cutoff) {
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff;
  }
  playAudioVoice(ctx, destination, osc, filter, at, dur, volume, pan, attack);
}

function playAudioVoice(ctx, destination, source, filter, at, dur, volume, pan, attack = Math.min(0.009, dur * 0.22)) {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.linearRampToValueAtTime(volume, at + Math.min(attack, dur * 0.8));
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  if (filter) { source.connect(filter); filter.connect(env); }
  else source.connect(env);
  const stereo = pan ? ctx.createStereoPanner?.() : null;
  if (stereo) { stereo.pan.value = pan; env.connect(stereo); stereo.connect(destination); }
  else env.connect(destination);
  source.onended = () => { source.disconnect(); filter?.disconnect(); env.disconnect(); stereo?.disconnect(); };
  source.start(at);
  source.stop(at + dur + 0.012);
}

const AUDIO_LEVELS = { music: 80, effects: 100 };
const AUDIO_SAVE_KEYS = { music: 'musicVolume', effects: 'effectsVolume' };
const normalizeVolume = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback;

function connectAudioOutput(ctx, master) {
  // 只收住叠音时的峰值，正常战斗音量仍由各自的滑杆控制。
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -5;
  limiter.knee.value = 3;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.13;
  master.connect(limiter);
  limiter.connect(ctx.destination);
}

const Sfx = {
  ctx: null,
  muted: false,
  hidden: false,
  last: {},
  levels: { ...AUDIO_LEVELS },
  arrivalUntil: -Infinity,

  configure(save) {
    this.muted = save.muted === true;
    for (const channel of Object.keys(AUDIO_LEVELS)) {
      this.levels[channel] = normalizeVolume(save[AUDIO_SAVE_KEYS[channel]], AUDIO_LEVELS[channel]);
    }
    this.applyMix();
  },

  // 浏览器要求用户手势后才能出声,在首次点击/按键时调用
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted || this.hidden ? 0 : 0.56;
        connectAudioOutput(this.ctx, this.master);
        this.musicGain = this.makeGain(this.master, this.levels.music / 100);
        this.musicDuck = this.makeGain(this.musicGain, 1);
        this.effectsGain = this.makeGain(this.master, this.levels.effects / 100);
        this.routineGain = this.makeGain(this.effectsGain, 1);
        this.music = new NightMusic(this.ctx, this.musicDuck);
      } catch (e) { this.ctx = null; return; }
    }
    this.resumeAudio();
  },

  makeGain(to, value) {
    const bus = this.ctx.createGain();
    bus.gain.value = value;
    bus.connect(to);
    return bus;
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
    const arrival = Object.hasOwn(ARRIVAL_SOUNDS, name);
    const cue = arrival ? ARRIVAL_SOUNDS[name] : Object.hasOwn(SOUNDS, name) ? SOUNDS[name] : null;
    if (!cue || gain <= 0 || this.muted || this.hidden || !this.ctx) return;
    const now = this.ctx.currentTime;
    // 听不到音效时，遭遇仍然能改变背景曲目。
    if (gain >= 0.3 && Object.hasOwn(MUSIC_OMENS, name)) this.noteOmen(MUSIC_OMENS[name], now);
    if (!this.levels.effects) return;
    if (this.ctx.state !== 'running') {
      if (this.resuming && (arrival || !this.pendingCue || !Object.hasOwn(ARRIVAL_SOUNDS, this.pendingCue[0]))) {
        this.pendingCue = [name, gain, pan];
      }
      return;
    }
    if (now - (this.last[name] ?? -Infinity) < cue[0]) return;
    this.last[name] = now;
    if (arrival) {
      this.focusArrival(now, now + playArrival(this.ctx, this.effectsGain, now, cue, gain, pan));
      return;
    }
    for (let i = 1; i < cue.length; i++) {
      const [wave, from, to, dur, volume, delay = 0, cutoff] = cue[i];
      audioTone(this.ctx, this.routineGain, now + delay, wave, from, to, dur, volume * gain, cutoff, pan);
    }
  },

  noteOmen([track, duration, priority], now) {
    const current = this.musicOmen;
    if (current?.until > now) {
      if (current.track === track) {
        current.until = Math.max(current.until, now + duration);
        return;
      }
      if (now - current.start < 3 && priority <= current.priority) return;
    }
    this.musicOmen = { track, start: now, until: now + duration, priority };
  },

  focusArrival(now, until) {
    // 音频时钟直接压低两路声音，不等下一帧，也不随配乐切轨重置。
    this.arrivalUntil = Math.max(this.arrivalUntil, until);
    for (const [bus, level] of [[this.musicDuck, 0.14], [this.routineGain, 0.24]]) {
      const gain = bus.gain;
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(level, now, 0.012);
      gain.setTargetAtTime(1, this.arrivalUntil, 0.16);
    }
  },

  previewTrack(track) {
    if (!this.ctx || this.muted || this.hidden || !this.levels.music || !BOSS_SCORES.has(track)) return false;
    this.musicPreview = { track, until: this.ctx.currentTime + 8 };
    return true;
  },

  syncMusic(state, boss, landscape) {
    if (!this.music) return;
    const now = this.ctx.currentTime;
    if (state !== 'practice' || this.musicPreview?.until <= now) this.musicPreview = null;
    if (['menu', 'intro', 'victory', 'gameover'].includes(state) || this.musicOmen?.until <= now) this.musicOmen = null;
    const quiet = state === 'levelup' || state === 'chest' || state === 'decision';
    const field = LANDSCAPE_SCORES.has(landscape) ? landscape : 'battle';
    const encounter = boss ? (BOSS_SCORES.has(boss) ? boss : 'boss') : this.musicOmen?.track ?? field;
    const track = !this.levels.music || this.muted || this.hidden || this.ctx.state !== 'running' ? null :
      this.musicPreview?.track ?? (state === 'menu' ? 'menu' : state === 'playing' || quiet ? encounter : null);
    this.music.sync(track, quiet ? 0.5 : 1);
  },

  applyMix() {
    if (!this.ctx) return;
    const silent = this.muted || this.hidden, now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(silent ? 0 : 0.56, now, 0.025);
    for (const [bus, level] of [[this.musicGain, this.levels.music], [this.effectsGain, this.levels.effects]]) {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(level / 100, now, 0.025);
    }
    if (silent || !this.levels.music) {
      this.music.stop();
      this.musicPreview = null;
    }
    if (silent || !this.levels.effects) {
      this.pendingCue = null;
      this.arrivalUntil = -Infinity;
      for (const bus of [this.musicDuck, this.routineGain]) {
        bus.gain.cancelScheduledValues(now);
        bus.gain.setTargetAtTime(1, now, 0.025);
      }
    }
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

  setVolume(channel, value, persist = false) {
    if (!Object.hasOwn(AUDIO_LEVELS, channel)) return;
    const level = normalizeVolume(value, this.levels[channel]);
    if (level !== this.levels[channel]) {
      this.levels[channel] = level;
      this.applyMix();
    }
    if (persist) {
      Save.data[AUDIO_SAVE_KEYS[channel]] = level;
      Save.write();
    }
  },
};
