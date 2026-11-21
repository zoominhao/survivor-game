'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { loadGame } = require('./fixtures/load-game');

test('技能图章读出实际冷却与库存，同时保留可读的数字', () => {
  const scope = vm.createContext({});
  loadGame(scope, file => file.endsWith('/active-skills.js') || file.endsWith('/hud.js'));
  const { HudUI, BattleActives } = vm.runInContext('({ HudUI, BattleActives })', scope);
  const updates = new Map();
  const ui = { ...HudUI, set(id, prop, value) { updates.set(`${id}:${prop}`, value); } };
  const p = { slot: 0, hp: 1, activeReady: { dash: 6, ward: 0 }, wardCharges: 2 };
  const g = { state: 'playing', time: 3, player: p, players: [p], ...BattleActives };
  const get = (id, prop) => updates.get(`${id}:${prop}`);

  ui.updateActiveHud(g);
  assert.equal(get('btnDash', 'charge'), '50%');
  assert.equal(get('btnDashState', 'text'), '3 秒');
  assert.equal(get('btnDash', 'disabled'), true);
  assert.equal(get('btnWardState', 'text'), 'E · 2/3');
  assert.equal(parseFloat(get('btnWard', 'charge')).toFixed(1), '66.7');

  g.time = 6;
  p.wardCharges = 0;
  ui.updateActiveHud(g);
  assert.equal(get('btnDash', 'charge'), '100%');
  assert.equal(get('btnDashState', 'text'), '空格');
  assert.equal(get('btnWard', 'charge'), '0%');
  assert.equal(get('btnWardState', 'text'), '0/3');
  assert.equal(get('btnWard', 'disabled'), true);

  p.paperSkill = 'lure';
  p.wardCharges = 2;
  p.activeReady.ward = 9;
  ui.updateActiveHud(g);
  assert.equal(get('btnWard', 'aria-label'), '引魂符');
  assert.equal(get('btnWardIcon', 'src'), 'art/skill-lure.svg');
  assert.equal(get('btnWardState', 'text'), '3秒 · 2/3');
  assert.equal(get('btnWard', 'disabled'), true);

  p.st = { paperCapacity: 5, dashCooldown: 4.8, maxHp: 1 };
  p.wardCharges = 4;
  g.time = 10;
  ui.updateActiveHud(g);
  assert.equal(get('btnWard', 'paper-max'), 5);
  assert.equal(get('btnWard', 'charge'), '80%');
  assert.equal(get('btnWardState', 'text'), 'E · 4/5');
});
