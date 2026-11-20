'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const scripts = ['config', 'utils', 'terrain', 'environment', 'weapons', 'core', 'main'].map(name =>
  new vm.Script(fs.readFileSync(path.join(__dirname, '..', 'js', name + '.js'), 'utf8')));

function startIntro({ reducedMotion = false } = {}) {
  const document = { hidden: false, getElementById: () => ({ classList: { add() {} } }) };
  const ui = { showIntro(charId, duration) { this.intro = { charId, duration }; }, show(id) { this.overlay = id; }, updateHud() {} };
  const sfx = { cues: [], play(name) { this.cues.push(name); }, syncMusic() {} };
  const context = vm.createContext({
    document, window: { addEventListener() {}, matchMedia: () => ({ matches: reducedMotion }) },
    localStorage: { getItem: () => JSON.stringify({ lastChar: 'echo' }) },
    performance: { now: () => 100 }, requestAnimationFrame() {},
    UI: ui, Sfx: sfx, Render: { draw() {} },
  });
  for (const script of scripts) script.runInContext(context);
  const { App, Game, Save } = vm.runInContext('({ App, Game, Save })', context);
  Save.load();
  App.startRun();
  return { App, Game, document, ui, sfx };
}

test('开场使用当前存档里的角色，直到展示结束才开始战斗计时', () => {
  const { App, Game, ui, sfx } = startIntro();
  assert.equal(Game.state, 'intro');
  assert.deepEqual(ui.intro, { charId: 'echo', duration: 2200 });
  assert.deepEqual(sfx.cues, ['intro']);
  App.frame(2299);
  assert.equal(Game.time, 0);
  assert.equal(Game.enemies.length, 0);
  App.frame(2300);
  assert.equal(Game.state, 'playing');
  assert.equal(Game.time, 0);
  App.frame(2316);
  assert.ok(Game.time > 0);
});

test('按 Esc 可直接跳过角色开场', () => {
  const { App, Game, ui } = startIntro();
  App.onKey('Escape');
  assert.equal(Game.state, 'playing');
  assert.equal(Game.time, 0);
  assert.equal(ui.overlay, null);
});

test('开启减少动态后展示更短，后台不会开启战斗', () => {
  const { App, Game, document, ui } = startIntro({ reducedMotion: true });
  assert.equal(ui.intro.duration, 900);
  document.hidden = true;
  App.frame(1200);
  assert.equal(Game.state, 'intro');
  assert.equal(Game.time, 0);
  document.hidden = false;
  App.frame(1210);
  assert.equal(Game.state, 'playing');
  assert.equal(Game.time, 0);
});
