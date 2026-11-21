'use strict';
// 现场合成的夜巡配乐。MIDI 音符 0 表示休止；八步为一小节。
const NIGHT_SCORE = {
  menu: {
    bpm: 67, gain: 0.66,
    lead: [0, 0, 62, 0, 0, 0, 0, 0, 0, 0, 61, 0, 0, 0, 55, 0],
    roots: [38, 37], drum: [], tick: [5], drone: 1.018, tone: 'sine', bend: 0.96,
  },
  battle: {
    bpm: 91, gain: 0.65, lead: [50, 0, 0, 51, 0, 0, 44, 0, 0, 50, 0, 0, 49, 0, 44, 0],
    roots: [38, 37], drum: [0, 4], tick: [1, 6], drone: 1.013, bend: 0.987,
  },
  night: {
    bpm: 78, gain: 0.66, lead: [55, 0, 0, 0, 54, 0, 61, 0, 0, 0, 55, 51, 0, 0, 0, 0],
    roots: [31, 37], drum: [0, 6], tick: [2, 5], drone: 1.414, tone: 'sine', bend: 0.976,
  },
  rain: {
    bpm: 75, gain: 0.66, lead: [66, 0, 0, 65, 0, 0, 59, 0, 61, 0, 0, 60, 0, 0, 54, 0],
    roots: [42, 41], drum: [0], tick: [3, 6], drone: 1.02, tone: 'sine', bend: 0.949,
  },
  snow: {
    bpm: 70, gain: 0.67, lead: [45, 0, 0, 0, 46, 0, 0, 0, 51, 0, 0, 0, 45, 0, 0, 0],
    roots: [33, 34], drum: [0, 1, 5], tick: [6], drone: 1.011, bend: 0.975, pulse: 94,
  },
  paper: {
    bpm: 108, gain: 0.67, lead: [71, 0, 70, 0, 65, 0, 0, 69, 0, 0, 72, 0, 66, 0, 70, 0],
    roots: [35, 34], drum: [1, 4], tick: [0, 3, 7], drone: 1.414, bend: 0.94,
  },
  corpses: {
    bpm: 100, gain: 0.67, lead: [48, 0, 0, 0, 49, 0, 43, 0, 49, 0, 0, 0, 48, 0, 43, 0],
    roots: [36, 37], drum: [0, 2, 5, 7], tick: [4], drone: 1.02, bend: 0.92, pulse: 104,
  },
  bride: {
    bpm: 80, gain: 0.69, lead: [74, 0, 73, 0, 0, 67, 0, 0, 68, 0, 67, 0, 62, 0, 0, 0],
    roots: [38, 37], drum: [0, 5], tick: [7], drone: 1.42, tone: 'sine', bend: 0.947,
  },
  boss: {
    bpm: 136, gain: 0.72,
    lead: [62, 0, 65, 62, 67, 0, 65, 62, 60, 62, 67, 0, 69, 67, 65, 0,
           62, 65, 69, 72, 74, 72, 69, 0, 67, 69, 65, 62, 60, 62, 65, 0],
    roots: [38, 36, 38, 33], drum: [0, 3, 4, 6], tick: [2, 5, 7],
  },
  nightmare: {
    bpm: 144, gain: 0.73, lead: [50, 51, 0, 44, 50, 0, 49, 0, 50, 0, 56, 0, 44, 45, 0, 49],
    roots: [38, 32], drum: [0, 2, 3, 5, 7], tick: [1, 6], drone: 1.414, bend: 0.924, pulse: 138,
  },
  coffinKing: {
    bpm: 102, gain: 0.72, lead: [48, 0, 0, 54, 49, 0, 0, 47, 48, 0, 0, 42, 49, 0, 42, 0],
    roots: [36, 37], drum: [0, 1, 4, 6], tick: [2, 7], drone: 1.014, bend: 0.935, pulse: 102,
  },
  bridalQueen: {
    bpm: 118, gain: 0.71, lead: [77, 0, 76, 70, 0, 76, 0, 69, 75, 0, 74, 0, 69, 0, 68, 0],
    roots: [41, 40], drum: [0, 4, 7], tick: [2, 5], drone: 1.414, tone: 'sine', bend: 0.96, pulse: 119,
  },
};

const BOSS_SCORES = new Set(['nightmare', 'coffinKing', 'bridalQueen']);
const LANDSCAPE_SCORES = new Set(['night', 'rain', 'snow']);
// 同一条底床跨场景接续播放，场景和 Boss 的合成主题仍然独立。
const HORROR_BED_LEVEL = {
  menu: 0.52, battle: 1.1, night: 1.1, rain: 0.76, snow: 0.76,
  paper: 0.75, corpses: 0.75, bride: 0.65, boss: 0.58, nightmare: 0.65, coffinKing: 0.64, bridalQueen: 0.56,
};
// [曲目, 保持秒数, 优先级]：重要登场压过普通近身叫声，不按每只怪物所在帧切曲。
const MUSIC_OMENS = {
  paperChildArrival: ['paper', 7, 2], corpseAmbush: ['corpses', 8, 2], corpseSnarl: ['corpses', 6.5, 1],
  brideArrival: ['bride', 11, 3], brideAccuse: ['bride', 10.8, 1], umbrellaOpen: ['rain', 7, 2],
  envoyCall: ['snow', 7, 2], siegeArrival: ['corpses', 7, 2],
};

const noteHz = note => 440 * 2 ** ((note - 69) / 12);

class NightMusic {
  constructor(ctx, output) {
    this.ctx = ctx;
    this.output = output;
    this.track = null;
  }

  stop(fade = 0.035) {
    this.stopScore(fade);
    this.syncBed(null);
  }

  stopScore(fade) {
    if (!this.track) return;
    const bus = this.bus, now = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(0, now, fade);
    // 淡出这一路已排程的音符，新场景使用独立线路。
    setTimeout(() => bus.disconnect(), Math.ceil(fade * 6000));
    this.track = null;
    this.bus = null;
  }

  sync(track, mix = 1) {
    const now = this.ctx.currentTime;
    const hasBed = this.syncBed(track, mix);
    if (track !== this.track) {
      this.stopScore(track ? 0.13 : 0.035);
      if (!track) return;
      this.track = track;
      this.bus = this.ctx.createGain();
      this.bus.gain.value = 0;
      this.bus.connect(this.output);
      this.volume = -1;
      this.step = 0;
      this.next = now + 0.045;
    }
    if (!track) return;
    const score = NIGHT_SCORE[track];
    const volume = score.gain * mix * (hasBed && (track === 'battle' || track === 'night') ? 0.49 : 1);
    if (volume !== this.volume) {
      const fade = this.volume >= 0 && volume < this.volume ? 0.033 : 0.15;
      this.volume = volume;
      this.bus.gain.cancelScheduledValues(now);
      this.bus.gain.setTargetAtTime(volume, now, fade);
    }
    // 用音频时钟提前少量排程；卡顿恢复不补播已经错过的音符。
    if (this.next < now) this.next = now + 0.025;
    const interval = 30 / score.bpm;
    while (this.next < now + 0.13) {
      this.playStep(score, interval);
      this.step = (this.step + 1) % score.lead.length;
      this.next += interval;
    }
  }

  syncBed(track, mix = 1) {
    const now = this.ctx.currentTime;
    let bed = this.bed;
    const level = (HORROR_BED_LEVEL[track] ?? 0) * mix;
    if (!level) {
      if (!bed) return false;
      bed.bus.gain.cancelScheduledValues(now);
      bed.bus.gain.setTargetAtTime(0, now, 0.035);
      bed.source.stop(now + 0.21);
      this.bed = null;
      return false;
    }
    if (!bed) {
      const buffer = horrorSample(this.ctx, 'nightBed');
      if (!buffer) return false;
      const source = this.ctx.createBufferSource(), bus = this.ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      bus.gain.value = 0;
      source.connect(bus);
      bus.connect(this.output);
      source.onended = () => { source.disconnect(); bus.disconnect(); };
      source.start(now);
      bed = this.bed = { source, bus, level: -1 };
    }
    if (level !== bed.level) {
      bed.level = level;
      bed.bus.gain.cancelScheduledValues(now);
      bed.bus.gain.setTargetAtTime(level, now, 0.19);
    }
    return true;
  }

  playStep(score, interval) {
    const withinBar = this.step % 8;
    const root = score.roots[Math.floor(this.step / 8) % score.roots.length];
    const note = score.lead[this.step];
    const play = (wave, from, to, dur, vol, cutoff, attack) => audioTone(this.ctx, this.bus, this.next, wave, from, to, dur, vol, cutoff, 0, attack);
    if (note) {
      const f = noteHz(note);
      const bend = score.bend ?? 0.998;
      play(score.tone || 'triangle', f, f * bend, interval * 2.25, 0.14, score.drone ? 1450 : 2300);
      play('sine', f * 2.014, f * (score.drone ? 1.994 : 2), interval * 0.86, 0.035);
    }
    if (withinBar === 0 || withinBar === 4) {
      const f = noteHz(withinBar === 0 ? root : root + 7);
      play(score.drone ? 'triangle' : 'sine', f, f, interval * 4, withinBar === 0 ? 0.14 : 0.08, 720);
      if (score.drone && withinBar === 0) play('triangle', f * score.drone, f * score.drone * 0.994, interval * 8, 0.105, 830, 0.19);
    }
    if (score.drum.includes(withinBar)) play('sine', score.pulse || 113, 43, 0.19, 0.19);
    if (score.tick.includes(withinBar)) play('triangle', 510, 231, 0.063, 0.044, 1600);
  }
}
