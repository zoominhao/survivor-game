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
    this.sampleRate = 44100;
    this.starts = [];
    this.panners = [];
    this.bufferSources = [];
  }
  createGain() { return { gain: new AudioParamStub(), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() { return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {} }; }
  createBiquadFilter() { return { frequency: new AudioParamStub(), Q: new AudioParamStub(), connect() {}, disconnect() {} }; }
  createBuffer(channels, length, rate) {
    const samples = new Float32Array(length);
    return { duration: length / rate, getChannelData: () => samples };
  }
  createBufferSource() {
    const node = { playbackRate: {}, connect() {}, disconnect() {}, start: at => this.starts.push(at), stop(at) { this.endsAt = at; } };
    this.bufferSources.push(node);
    return node;
  }
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
  const context = vm.createContext({ window: { AudioContext }, Save: save, setTimeout() {}, atob });
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

test('登场声立即压低配乐和常规音效，尾声结束后回升，不重启曲目', () => {
  const { Sfx } = setup();
  Sfx.unlock();
  for (const [name, isBoss] of [['sampleArrival', false], ['boss', true]]) {
    Sfx.syncMusic('playing', isBoss);
    const bus = Sfx.music.bus, full = Sfx.music.volume, count = Sfx.ctx.starts.length;
    const now = Sfx.ctx.currentTime;
    Sfx.play(name);
    assert.ok(Sfx.ctx.starts.length > count);
    assert.ok(Sfx.arrivalUntil >= Sfx.ctx.bufferSources.at(-1).endsAt - 0.012);
    for (const [duck, maximum] of [[Sfx.musicDuck, 0.2], [Sfx.routineGain, 0.27]]) {
      const [drop, restore] = duck.gain.events.slice(-2);
      assert.ok(drop[0] <= maximum);
      assert.equal(drop[1], now);
      assert.deepEqual(restore, [1, Sfx.arrivalUntil]);
    }
    Sfx.syncMusic('playing', isBoss);
    assert.equal(Sfx.music.bus, bus);
    assert.equal(Sfx.music.volume, full);
    Sfx.ctx.currentTime = Sfx.arrivalUntil + 0.05;
  }
});

test('鬼怪换曲与音效音量独立，切曲后不逐帧重启，Boss 主题优先', () => {
  const { Sfx } = setup();
  Sfx.unlock();
  Sfx.syncMusic('playing', null, 'rain');
  assert.equal(Sfx.music.track, 'rain');
  const base = Sfx.music.bus;
  Sfx.setVolume('effects', 0);
  const before = Sfx.ctx.starts.length;
  Sfx.play('brideArrival');
  assert.equal(Sfx.ctx.starts.length, before);
  Sfx.syncMusic('playing', null, 'rain');
  assert.equal(Sfx.music.track, 'bride');
  assert.deepEqual(base.gain.events.at(-1), [0, 0]);
  const omen = Sfx.music.bus;
  Sfx.ctx.currentTime = 0.4;
  Sfx.play('corpseSnarl'); // 次要近身声不能立刻抢掉特殊登场。
  Sfx.syncMusic('playing', null, 'rain');
  assert.equal(Sfx.music.bus, omen);
  for (const boss of ['nightmare', 'coffinKing', 'bridalQueen']) {
    Sfx.syncMusic('playing', boss, 'rain');
    assert.equal(Sfx.music.track, boss);
  }
  Sfx.ctx.currentTime = 12;
  Sfx.syncMusic('playing', null, 'snow');
  assert.equal(Sfx.music.track, 'snow');
});

test('作弊面板的配乐试听会到期或随返回停止，试听鬼叫不触发实战换曲', () => {
  const { Sfx } = setup();
  Sfx.unlock();
  Sfx.play('sampleBride');
  Sfx.syncMusic('playing', null, 'night');
  assert.equal(Sfx.music.track, 'night');
  assert.equal(Sfx.previewTrack('invalid'), false);
  assert.ok(Sfx.previewTrack('coffinKing'));
  Sfx.syncMusic('practice');
  assert.equal(Sfx.music.track, 'coffinKing');
  Sfx.syncMusic('playing', null, 'night');
  assert.equal(Sfx.music.track, 'night');
  assert.ok(Sfx.previewTrack('nightmare'));
  Sfx.syncMusic('practice');
  Sfx.ctx.currentTime = 8.01;
  Sfx.syncMusic('practice');
  assert.equal(Sfx.music.track, null);
});

test('试听与鬼怪共用噪声素材，重叠登场不会让混音提早回升', () => {
  const { Sfx } = setup();
  Sfx.unlock();
  Sfx.play('boss');
  const until = Sfx.arrivalUntil;
  const first = Sfx.ctx.bufferSources[0];
  const samples = first.buffer.getChannelData(0);
  assert.ok(samples.some(v => v > 0.5) && samples.some(v => v < -0.5));
  assert.equal(first.loop, true);
  Sfx.play('sampleArrival');
  assert.equal(Sfx.ctx.bufferSources.at(-1).buffer, first.buffer);
  assert.equal(Sfx.arrivalUntil, until);
  Sfx.setMuted(true);
  assert.equal(Sfx.arrivalUntil, -Infinity);
  assert.deepEqual(Sfx.musicDuck.gain.events.at(-1), [1, 0]);
  assert.deepEqual(Sfx.routineGain.gain.events.at(-1), [1, 0]);
});

test('鬼新娘喊冤播放预制台词并覆盖整段尾音，试听不吃掉实战喊声', () => {
  const { Sfx } = setup();
  Sfx.unlock();
  Sfx.play('sampleBride');
  const [preview] = Sfx.ctx.bufferSources;
  assert.equal(preview.playbackRate.value, 1);
  assert.ok(preview.buffer.duration >= 1 && preview.buffer.duration < 3.5);
  assert.ok(preview.buffer.getChannelData(0).some(v => Math.abs(v) > 0.4));
  assert.ok(Sfx.arrivalUntil >= preview.buffer.duration + 0.07);
  assert.equal(Sfx.last.brideAccuse, undefined);
  Sfx.play('brideAccuse', 0.8, -0.6);
  assert.equal(Sfx.ctx.bufferSources.at(-1).buffer, preview.buffer);
  assert.equal(Sfx.ctx.panners.at(-1).pan.value, -0.6);
  Sfx.play('bridalQueenArrival');
  assert.equal(Sfx.ctx.bufferSources.at(-1).playbackRate.value, 0.86);
});

test('僵尸嘶吼不是落地声，合围叠放吼叫，近身嘶吼有单独的冷却', () => {
  const { Sfx } = setup();
  Sfx.unlock();
  Sfx.play('corpseHop');
  assert.equal(Sfx.ctx.bufferSources.length, 0);
  Sfx.play('corpseAmbush');
  const [primary, behind] = Sfx.ctx.bufferSources;
  assert.equal(primary.buffer, behind.buffer);
  assert.ok(primary.buffer.getChannelData(0).some(v => Math.abs(v) > 0.46));
  assert.ok(behind.playbackRate.value < primary.playbackRate.value);
  Sfx.play('corpseSnarl');
  Sfx.play('corpseSnarl');
  assert.equal(Sfx.ctx.bufferSources.length, 3);
  assert.equal(Sfx.ctx.bufferSources[2].buffer, primary.buffer);
});
