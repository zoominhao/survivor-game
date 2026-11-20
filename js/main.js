'use strict';
// ===== 入口:输入、主循环、流程控制 =====

const Input = {
  x: 0, y: 0,
  keys: new Set(),
  joy: null, // 虚拟摇杆状态 { id, ox, oy, x, y }

  init() {
    window.addEventListener('keydown', e => {
      Sfx.unlock();
      // 按钮获得焦点时，交给浏览器用 Enter / 空格触发点击，勿同时触发全局快捷键。
      if (e.target instanceof HTMLButtonElement && (e.code === 'Enter' || e.code === 'Space')) return;
      if (e.repeat) return;
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      App.onKey(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.endJoy(); });

    // 触屏/鼠标拖动:按下处生成虚拟摇杆
    const cv = document.getElementById('game');
    const joyEl = document.getElementById('joy'), knob = document.getElementById('joyKnob');
    const MAXR = 48;
    cv.addEventListener('pointerdown', e => {
      Sfx.unlock();
      if (Game.state !== 'playing' || this.joy) return;
      this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      joyEl.style.left = e.clientX + 'px';
      joyEl.style.top = e.clientY + 'px';
      knob.style.transform = 'translate(0,0)';
      joyEl.classList.remove('hidden');
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 部分环境不支持指针捕获 */ }
    });
    cv.addEventListener('pointermove', e => {
      const j = this.joy;
      if (!j || e.pointerId !== j.id) return;
      let dx = e.clientX - j.ox, dy = e.clientY - j.oy;
      const l = Math.hypot(dx, dy);
      if (l > MAXR) { dx = dx / l * MAXR; dy = dy / l * MAXR; }
      j.x = dx / MAXR; j.y = dy / MAXR;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    });
    const end = e => { if (this.joy && e.pointerId === this.joy.id) this.endJoy(); };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  },

  endJoy() {
    this.joy = null;
    document.getElementById('joy').classList.add('hidden');
  },

  // 每帧把键盘/摇杆状态汇总成移动向量
  poll() {
    if (this.joy) { this.x = this.joy.x; this.y = this.joy.y; return; }
    const k = this.keys;
    this.x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    this.y = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
  },
};

const App = {
  last: 0,
  introEndsAt: 0,

  init() {
    Save.load();
    Sfx.muted = Save.data.muted;
    Render.init();
    Input.init();
    UI.init();
    // 切到后台时自动暂停
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
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
      Game.update(dt);
    }
    Render.draw(dt);
    UI.updateHud();
    requestAnimationFrame(t => this.frame(t));
  },
};

window.addEventListener('DOMContentLoaded', () => App.init());
