'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { battleScript, loadGame } = require('./fixtures/load-game');

function setup() {
  const scope = vm.createContext({ window: { addEventListener() {} }, LanQrUI: {}, Save: {} });
  loadGame(scope, file => battleScript(file) || ['js/ui/lan.js', 'js/app/main.js'].includes(file));
  const state = { focus: '', leaves: 0 };
  const handlers = {};
  const elements = {};
  const ui = {
    ...vm.runInContext('LanUI', scope),
    $(id) { return elements[id] ??= { focus() { state.focus = id; } }; },
    show(id) { this.overlayId = id; },
    initLanQr() {},
  };
  scope.UI = ui;
  scope.Lan = { running: true, leave() { state.leaves++; this.running = false; ui.show('menu'); } };
  ui.initLan((id, fn) => { handlers[id] = fn; });
  vm.runInContext('Game.state = "levelup"', scope);
  ui.showLanWait('等候队友选卡', '队友正在选择自己的升级。');
  return { state, handlers, ui, app: vm.runInContext('App', scope) };
}

test('等候选卡时，首次点退出不离队，须再点确认', () => {
  const { state, handlers, ui } = setup();
  handlers.btnLanLeave();
  handlers.btnLanLeave();
  assert.equal(ui.overlayId, 'lanLeaveConfirm');
  assert.equal(state.leaves, 0);
  assert.equal(state.focus, 'btnLanStay');
  handlers.btnLanConfirmLeave();
  assert.equal(state.leaves, 1);
  assert.equal(ui.overlayId, 'menu');
});

test('继续等待和 Esc 都会取消退出，并将焦点交还给退出按钮', () => {
  const { state, handlers, ui, app } = setup();
  for (const cancel of [handlers.btnLanStay, () => app.onKey('Escape')]) {
    handlers.btnLanLeave();
    cancel();
    assert.equal(ui.overlayId, 'lanWait');
    assert.equal(state.focus, 'btnLanLeave');
    assert.equal(ui.$('lanWaitTitle').textContent, '等候队友选卡');
  }
  assert.equal(state.leaves, 0);
});

test('轮到本机选择时，不再接受已关闭弹层的退出确认', () => {
  const { state, handlers, ui } = setup();
  handlers.btnLanLeave();
  ui.show('levelup');
  handlers.btnLanConfirmLeave();
  assert.equal(ui.overlayId, 'levelup');
  assert.equal(state.leaves, 0);
});
