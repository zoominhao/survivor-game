'use strict';
// 原创五声旋律。每个数字是一枚 MIDI 音符，0 是休止；八步为一小节。
const NIGHT_SCORE = {
  menu: {
    bpm: 80, gain: 0.66,
    lead: [69, 0, 71, 74, 0, 71, 69, 0, 66, 0, 64, 66, 69, 0, 64, 0,
           62, 0, 66, 69, 0, 71, 74, 0, 76, 74, 0, 69, 66, 0, 62, 0],
    roots: [50, 47, 43, 45], drum: [], tick: [4],
  },
  battle: {
    bpm: 110, gain: 0.67,
    lead: [62, 65, 67, 0, 69, 67, 65, 0, 60, 62, 65, 67, 0, 69, 72, 0,
           74, 0, 72, 69, 67, 65, 67, 0, 69, 72, 69, 67, 65, 0, 62, 0],
    roots: [38, 36, 43, 45], drum: [0, 4], tick: [2, 6, 7],
  },
  boss: {
    bpm: 136, gain: 0.72,
    lead: [62, 0, 65, 62, 67, 0, 65, 62, 60, 62, 67, 0, 69, 67, 65, 0,
           62, 65, 69, 72, 74, 72, 69, 0, 67, 69, 65, 62, 60, 62, 65, 0],
    roots: [38, 36, 38, 33], drum: [0, 3, 4, 6], tick: [2, 5, 7],
  },
};

const noteHz = note => 440 * 2 ** ((note - 69) / 12);

class NightMusic {
  constructor(ctx, output) {
    this.ctx = ctx;
    this.output = output;
    this.track = null;
  }

  stop() {
    if (!this.track) return;
    const bus = this.bus, now = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(0, now, 0.035);
    // 淡出这一路已排程的音符，新场景使用独立线路。
    setTimeout(() => bus.disconnect(), 210);
    this.track = null;
    this.bus = null;
  }

  sync(track, mix = 1) {
    const now = this.ctx.currentTime;
    if (track !== this.track) {
      this.stop();
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
    const volume = score.gain * mix;
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

  playStep(score, interval) {
    const withinBar = this.step % 8;
    const root = score.roots[Math.floor(this.step / 8)];
    const note = score.lead[this.step];
    const play = (wave, from, to, dur, vol, cutoff) => audioTone(this.ctx, this.bus, this.next, wave, from, to, dur, vol, cutoff);
    if (note) {
      const f = noteHz(note);
      play('triangle', f, f * 0.998, interval * 1.9, 0.14, 2300);
      play('sine', f * 2.014, f * 2, interval * 0.72, 0.035);
    }
    if (withinBar === 0 || withinBar === 4) {
      const f = noteHz(withinBar === 0 ? root : root + 7);
      play('sine', f, f, interval * 4, withinBar === 0 ? 0.14 : 0.08);
    }
    if (score.drum.includes(withinBar)) play('sine', 113, 43, 0.19, 0.19);
    if (score.tick.includes(withinBar)) play('triangle', 510, 231, 0.063, 0.044, 1600);
  }
}
