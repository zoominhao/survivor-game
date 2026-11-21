'use strict';

// 浏览器入口把战斗事件接到界面和音效；战斗文件无需加载浏览器代码。
const battleViews = {
  levelup: () => UI.showLevelUp(),
  decision: () => { Input.endJoy(); UI.showBossDecision(); },
  chest: () => UI.showChest(),
  result: () => UI.showResult(),
  resume: () => UI.show(null),
  banner: text => UI.banner(text),
};
const Game = createBattle({
  save: Save,
  emit: (event, data) => battleViews[event](data),
  play: (...args) => Sfx.play(...args),
});

const App = {
  last: 0,
  introEndsAt: 0,

  init() {
    Save.load();
    Sfx.muted = Save.data.muted;
    Sfx.hidden = document.hidden;
    Render.init((hw, hh) => { Game.view.hw = hw; Game.view.hh = hh; });
    Input.init();
    UI.init();
    // 切到后台时自动暂停
    document.addEventListener('visibilitychange', () => {
      Sfx.setHidden(document.hidden);
      if (document.hidden) this.pause();
    });
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
  },

  startRun() {
    if (Game.state === 'intro') return;
    Input.endJoy();
    Game.start(Save.data.lastChar);
    Game.state = 'intro';
    UI.cache = {};
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 900 : 2200;
    this.introEndsAt = performance.now() + duration;
    UI.showIntro(Game.player.char, duration);
    Sfx.play('intro');
  },

  finishIntro() {
    if (Game.state !== 'intro' || document.hidden) return;
    Game.state = 'playing';
    UI.show(null);
  },

  pause() {
    if (Game.state !== 'playing') return;
    Game.state = 'paused';
    Input.endJoy();
    UI.showPause();
  },

  resume() {
    if (Game.state !== 'paused') return;
    Game.state = 'playing';
    UI.show(null);
  },

  toggleMute() {
    Sfx.setMuted(!Sfx.muted);
    UI.refreshMute();
  },

  onKey(code) {
    const s = Game.state;
    if (code === 'KeyM') { this.toggleMute(); return; }
    if (s === 'intro') {
      if (['Enter', 'Space', 'Escape'].includes(code)) this.finishIntro();
      return;
    }
    if (s === 'decision') {
      if (code === 'Digit1' || code === 'Numpad1') Game.chooseBossPlan('ward');
      else if (code === 'Digit2' || code === 'Numpad2') Game.chooseBossPlan('challenge');
      else if (code === 'Escape') Game.chooseBossPlan('normal');
      return;
    }
    if (code === 'Escape' && UI.overlayId === 'shop') { UI.showMenu(); return; }
    if (code === 'Escape' || code === 'KeyP') {
      if (s === 'playing') this.pause(); else if (s === 'paused') this.resume();
      return;
    }
    if (s === 'levelup') {
      if (code === 'Digit1' || code === 'Numpad1') Game.choose(0);
      else if (code === 'Digit2' || code === 'Numpad2') Game.choose(1);
      else if (code === 'Digit3' || code === 'Numpad3') Game.choose(2);
      else if (code === 'KeyR') Game.reroll();
    } else if (s === 'chest') {
      if (code === 'Enter' || code === 'Space') Game.closeChest();
    } else if (s === 'gameover' || s === 'victory') {
      if (code === 'Enter') this.startRun();
    } else if (s === 'menu') {
      if (code === 'Enter' && !document.getElementById('menu').classList.contains('hidden')) this.startRun();
    }
  },

  frame(now) {
    // 限制单帧步长,避免卡顿或切回前台后一步跨过太长时间
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    Input.poll();
    if (Game.state === 'intro') {
      if (now >= this.introEndsAt) this.finishIntro();
    } else if (Game.state === 'playing') {
      Game.update(dt, Input);
    }
    const boss = Game.boss;
    const bossActive = !!boss && !boss.dead;
    Sfx.syncMusic(Game.state, bossActive, bossActive && Game.time - boss.arrivedAt < BOSS_ARRIVAL);
    Render.draw(dt, Game);
    UI.updateHud();
    requestAnimationFrame(t => this.frame(t));
  },
};

window.addEventListener('DOMContentLoaded', () => App.init());
