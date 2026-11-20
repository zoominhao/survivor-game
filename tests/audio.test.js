'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const scripts = ['music.js', 'audio.js'].map(name =>
  new vm.Script(fs.readFileSync(path.join(__dirname, '..', 'js', name), 'utf8')));

class AudioParamStub {
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}

class AudioContextStub {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
    this.starts = [];
    this.panners = [];
  }
  createGain() { return { gain: new AudioParamStub(), connect() {}, disconnect() {} }; }
  createBiquadFilter() { return { frequency: new AudioParamStub(), connect() {}, disconnect() {} }; }
  createStereoPanner() {
    const node = { pan: new AudioParamStub(), connect() {}, disconnect() {} };
    this.panners.push(node); return node;
  }
  createOscillator() {
    return {
      frequency: new AudioParamStub(), connect() {}, disconnect() {}, stop() {},
      start: time => this.starts.push(time),
    };
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

function setup(AudioContext = AudioContextStub) {
  const save = { data: {}, count: 0, write() { this.count++; } };
  const context = vm.createContext({ window: { AudioContext }, Save: save, setTimeout() {} });
  for (const script of scripts) script.runInContext(context);
  return { Sfx: vm.runInContext('Sfx', context), save };
}

test('音乐等待解锁，开场、战斗和夜魇使用对应段落', () => {
  const { Sfx } = setup();
  Sfx.syncMusic('menu');
  assert.equal(Sfx.ctx, null);
  Sfx.unlock();
  Sfx.syncMusic('menu');
  assert.equal(Sfx.music.track, 'menu');
  assert.ok(Sfx.ctx.starts.length > 0);
  Sfx.syncMusic('intro');
  assert.equal(Sfx.music.track, null);
  Sfx.syncMusic('playing', false);
  assert.equal(Sfx.music.track, 'battle');
  const bus = Sfx.music.bus, full = bus.gain.value;
  Sfx.syncMusic('levelup', false);
  assert.equal(Sfx.music.bus, bus);
  assert.ok(bus.gain.value < full);
  Sfx.syncMusic('playing', true);
  assert.equal(Sfx.music.track, 'boss');
  Sfx.syncMusic('paused', true);
  assert.equal(Sfx.music.track, null);
});

test('静音存档和后台状态都会停止排程并压低总音量', () => {
  const { Sfx, save } = setup();
  Sfx.unlock();
  Sfx.syncMusic('playing', false);
  Sfx.setMuted(true);
  const before = Sfx.ctx.starts.length;
  Sfx.play('paper');
  Sfx.syncMusic('playing', false);
  assert.equal(Sfx.ctx.starts.length, before);
  assert.equal(Sfx.master.gain.value, 0);
  assert.equal(save.data.muted, true);
  assert.equal(save.count, 1);
  Sfx.setMuted(false);
  Sfx.setHidden(true);
  Sfx.syncMusic('menu');
  assert.equal(Sfx.music.track, null);
  assert.equal(Sfx.master.gain.value, 0);
  Sfx.setHidden(false);
  Sfx.syncMusic('menu');
  assert.equal(Sfx.music.track, 'menu');
  assert.ok(Sfx.master.gain.value > 0);
});

test('层叠音效限制重复触发，卡顿后不一次补播大量音符', () => {
  const { Sfx } = setup();
  Sfx.unlock();
  Sfx.play('bounce');
  const beforeRepeat = Sfx.ctx.starts.length;
  assert.equal(beforeRepeat, 2);
  Sfx.play('bounce');
  assert.equal(Sfx.ctx.starts.length, beforeRepeat);
  Sfx.syncMusic('playing', false);
  const beforeStall = Sfx.ctx.starts.length;
  Sfx.ctx.currentTime = 45;
  Sfx.syncMusic('playing', false);
  const after = Sfx.ctx.starts.slice(beforeStall);
  assert.ok(after.length > 0 && after.length <= 4);
  assert.ok(after.every(at => at >= 45));
});

test('从浏览器挂起状态解锁时补播最近的一个开场音效', async () => {
  class SuspendedContext extends AudioContextStub {
    constructor() { super(); this.state = 'suspended'; }
    async resume() { await Promise.resolve(); this.state = 'running'; }
  }
  const { Sfx } = setup(SuspendedContext);
  Sfx.unlock();
  Sfx.play('click');
  Sfx.play('intro');
  assert.equal(Sfx.ctx.starts.length, 0);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(Sfx.ctx.starts.length, 2);
  assert.equal(Sfx.pendingCue, null);
});

test('民俗音效能合成多层声音，落地声声道偏移且限制连发', () => {
  const { Sfx } = setup();
  Sfx.unlock();
  Sfx.play('corpseHop', 0.6, -0.65);
  Sfx.play('corpseHop', 0.7, 0.6);
  assert.equal(Sfx.ctx.starts.length, 2);
  assert.deepEqual(Sfx.ctx.panners.map(p => p.pan.value), [-0.65, -0.65]);
  Sfx.play('bridalBell');
  Sfx.play('weddingPaper', 0.5, 0.7);
  Sfx.play('bridalFade');
  assert.equal(Sfx.ctx.starts.length, 9);
  assert.deepEqual(Sfx.ctx.panners.map(p => p.pan.value), [-0.65, -0.65, 0.7, 0.7]);
});
