'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
const test = require('node:test');
const { loadGame } = require('./fixtures/load-game');

class AudioParamStub {
  events = [];
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value, time) { this.events.push([value, time]); this.value = value; }
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
  loadGame(context, file => file.startsWith('js/audio/'));
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

test('两条音量线路相互独立，滑杆归零不会改动另一条', () => {
  const { Sfx, save } = setup();
  Sfx.configure({ muted: false, musicVolume: 28, effectsVolume: 67 });
  Sfx.unlock();
  assert.equal(Sfx.musicGain.gain.value, 0.28);
  assert.equal(Sfx.effectsGain.gain.value, 0.67);
  Sfx.setVolume('effects', 0);
  Sfx.syncMusic('playing', false);
  const count = Sfx.ctx.starts.length;
  Sfx.play('boss');
  assert.equal(Sfx.ctx.starts.length, count);
  assert.equal(Sfx.music.track, 'battle');
  assert.equal(Sfx.musicGain.gain.value, 0.28);
  assert.equal(Sfx.arrivalUntil, -Infinity);
  Sfx.setVolume('music', 0);
  Sfx.syncMusic('playing', false);
  assert.equal(Sfx.music.track, null);
  Sfx.setVolume('effects', 55, true);
  Sfx.play('shoot');
  assert.ok(Sfx.ctx.starts.length > count);
  assert.equal(Sfx.effectsGain.gain.value, 0.55);
  assert.equal(Sfx.musicGain.gain.value, 0);
  assert.equal(save.data.effectsVolume, 55);
  assert.equal(save.count, 1);
});

test('旧档的总静音被保留，缺失或无效的滑杆值回到安全默认值', () => {
  const { Sfx } = setup();
  Sfx.configure({ muted: true, musicVolume: '坏掉了', effectsVolume: 135 });
  Sfx.unlock();
  assert.equal(Sfx.master.gain.value, 0);
  assert.equal(Sfx.levels.music, 80);
  assert.equal(Sfx.levels.effects, 100);
  Sfx.setMuted(false);
  assert.ok(Sfx.master.gain.value > 0);
  assert.equal(Sfx.musicGain.gain.value, 0.8);
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

test('解锁期间的常规音效不挤掉登场声，试听也不消耗实际登场的冷却', async () => {
  class SuspendedContext extends AudioContextStub {
    constructor() { super(); this.state = 'suspended'; }
    async resume() { await Promise.resolve(); this.state = 'running'; }
  }
  const { Sfx } = setup(SuspendedContext);
  Sfx.unlock();
  Sfx.play('sampleArrival');
  Sfx.play('hit');
  assert.equal(Sfx.pendingCue[0], 'sampleArrival');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(Sfx.last.sampleArrival, 0);
  const before = Sfx.ctx.starts.length;
  Sfx.play('paperChildArrival');
  assert.ok(Sfx.ctx.starts.length > before);
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

test('小怪与 Boss 的重要登场声压低配乐和常规音效，但不重启曲目', () => {
  const { Sfx } = setup();
  Sfx.unlock();
  for (const [name, isBoss] of [['paperChildArrival', false], ['boss', true]]) {
    Sfx.syncMusic('playing', isBoss);
    const bus = Sfx.music.bus, full = Sfx.music.volume, count = Sfx.ctx.starts.length;
    Sfx.play(name);
    assert.ok(Sfx.ctx.starts.length > count);
    Sfx.syncMusic('playing', isBoss);
    assert.ok(Sfx.music.volume < full * 0.3);
    assert.ok(Sfx.routineGain.gain.events.some(([value, time]) => value < 0.5 && time === Sfx.ctx.currentTime));
    Sfx.ctx.currentTime = Sfx.arrivalUntil + 0.05;
    Sfx.syncMusic('playing', isBoss);
    assert.equal(Sfx.music.bus, bus);
    assert.equal(Sfx.music.volume, full);
  }
});
