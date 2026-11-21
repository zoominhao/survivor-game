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
const SoloGame = createBattle({
  save: Save,
  emit: (event, data) => battleViews[event](data),
  play: (...args) => Sfx.play(...args),
});
let Game = SoloGame;

const App = {
  last: 0,
  introEndsAt: 0,
  utilityReturn: null,
  tapCount: 0,
  tapsSince: -Infinity,

  init() {
    Save.load();
    Sfx.configure(Save.data);
    Sfx.hidden = document.hidden;
    Render.init((hw, hh) => { Game.view.hw = hw; Game.view.hh = hh; });
    Input.init();
    UI.init();
    Lan.openHashInvite();
    // 切到后台时自动暂停
    document.addEventListener('visibilitychange', () => {
      Sfx.setHidden(document.hidden);
      if (document.hidden) {
        if (Lan.guest) return;
        if (this.utilityReturn?.state === 'playing') this.utilityReturn.state = 'paused';
        this.pause();
      }
    });
    window.addEventListener('pagehide', e => {
      if (!Lan.link) return;
      if (e.persisted) Lan.leave(); else Lan.close();
    });
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
  },

  startRun() {
    if (Game.state === 'intro') return;
    if (Lan.running) { Lan.open(); return; }
    this.tapCount = 0; this.tapsSince = -Infinity;
    Input.endJoy();
    Game.start(Game.practiceChar ?? Save.data.lastChar);
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
    if (Game.openingScene !== 'dusk') {
      const scene = Environment.scenes[Game.openingScene];
      UI.banner(scene.name);
      if (scene.sound) Sfx.play(scene.sound, 0.78);
    }
  },

  pause() {
    if (Game.state !== 'playing') return;
    if (Lan.guest) {
      Lan.guestPause = true;
      Input.endJoy();
      UI.showPause();
      return;
    }
    Game.state = 'paused';
    Input.endJoy();
    UI.showPause();
  },

  resume() {
    if (Lan.guest && Lan.guestPause) {
      Lan.guestPause = false;
      Lan.syncGuestPanel(true);
      return;
    }
    if (Game.state !== 'paused') return;
    Game.state = 'playing';
    UI.show(null);
  },

  toggleMute() {
    Sfx.setMuted(!Sfx.muted);
    UI.refreshAudio();
  },

  openUtility(id) {
    const state = Game.state;
    if (id !== 'audio' && id !== 'practice') return;
    if (id === 'practice' && Lan.running) return;
    if (this.utilityReturn || !(['playing', 'paused'].includes(state) || (id === 'audio' && state === 'menu'))) return;
    this.utilityReturn = { id, state, focus: document.activeElement, guestPause: Lan.guestPause };
    this.tapCount = 0; this.tapsSince = -Infinity;
    // 主菜单本身不推进战斗，保留状态可继续播放菜单音乐。
    if (state !== 'menu' && !Lan.guest) Game.state = id;
    Input.endJoy();
    if (id === 'audio') UI.refreshAudio(); else UI.refreshPractice();
    UI.show(id);
  },

  closeUtility() {
    if (!this.utilityReturn) return;
    const { state, focus, guestPause } = this.utilityReturn;
    this.utilityReturn = null;
    if (Lan.guest) {
      if (guestPause && Game.state === 'playing') UI.showPause();
      else Lan.syncGuestPanel(true);
      if (focus?.getClientRects().length) focus.focus({ preventScroll: true });
      return;
    }
    Game.state = state;
    if (state === 'paused') UI.showPause();
    else UI.show(state === 'menu' ? 'menu' : null);
    if (focus?.getClientRects().length) focus.focus({ preventScroll: true });
  },

  tapPractice(now = performance.now()) {
    if (Game.state !== 'playing' || this.utilityReturn || Lan.running) return;
    if (now - this.tapsSince > 2500) { this.tapCount = 0; this.tapsSince = now; }
    if (++this.tapCount === 5) this.openUtility('practice');
  },

  onKey(code, shift = false) {
    const s = Game.state;
    if (code === 'KeyM') { this.toggleMute(); return; }
    const practiceKey = code === 'KeyG' && shift;
    if (this.utilityReturn) {
      if (code === 'Escape' || (practiceKey && this.utilityReturn.id === 'practice')) this.closeUtility();
      return;
    }
    if (UI.overlayId === 'lan') { if (code === 'Escape') Lan.leave(); return; }
    if (Lan.running && s === 'playing' && !UI.overlayId) {
      if (code === 'KeyQ') { UI.toggleSignals(); return; }
      if (UI.signalsOpen) {
        if (code === 'Escape') { UI.closeSignals(true); return; }
        if (/^(Digit|Numpad)[1-4]$/.test(code)) { UI.chooseSignal(Number(code.at(-1)) - 1); return; }
      }
    }
    if (practiceKey) { this.openUtility('practice'); return; }
    if (s === 'intro') {
      if (['Enter', 'Space', 'Escape'].includes(code)) this.finishIntro();
      return;
    }
    if (s === 'decision') {
      if (Lan.guest) return;
      if (code === 'Digit1' || code === 'Numpad1') Game.chooseBossPlan('ward');
      else if (code === 'Digit2' || code === 'Numpad2') Game.chooseBossPlan('challenge');
      else if (code === 'Escape') Game.chooseBossPlan('normal');
      return;
    }
    if (code === 'Escape' && ['shop', 'contracts'].includes(UI.overlayId)) { UI.showMenu(); return; }
    if (code === 'Escape' || code === 'KeyP') {
      if (Lan.guestPause) this.resume();
      else if (s === 'playing') this.pause(); else if (s === 'paused' && !Lan.guest) this.resume();
      return;
    }
    if (s === 'levelup') {
      if (!Lan.localTurn) return;
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
    if (!Lan.running) Lan.tickLobby(now);
    if (Lan.running) Lan.step(dt, now);
    else if (Game.state === 'intro') {
      if (now >= this.introEndsAt) this.finishIntro();
    } else if (Game.state === 'playing') {
      Game.update(dt, Input);
    }
    const boss = Game.boss;
    const landscape = Game.player && Game.state !== 'menu' ? Environment.landscape(Environment.forBattle(Game)) : null;
    const bossTheme = boss && !boss.dead ? boss.kind ?? 'boss' : null;
    Sfx.syncMusic(Game.state === 'audio' ? 'playing' : Game.state, bossTheme, landscape);
    Render.draw(dt, Game);
    UI.updateHud();
    requestAnimationFrame(t => this.frame(t));
  },
};

window.addEventListener('DOMContentLoaded', () => App.init());
