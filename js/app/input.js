'use strict';

// 键盘与触屏输入。
const Input = {
  x: 0, y: 0,
  keys: new Set(),
  joy: null, // 虚拟摇杆状态 { id, ox, oy, x, y }

  init() {
    window.addEventListener('keydown', e => {
      Sfx.unlock();
      if (e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLInputElement && e.target.type === 'number')) {
        if (e.code === 'Escape' && !e.repeat) App.onKey(e.code, e.shiftKey);
        return;
      }
      // 按钮获得焦点时，交给浏览器用 Enter / 空格触发点击，勿同时触发全局快捷键。
      if (e.target instanceof HTMLButtonElement && (e.code === 'Enter' || e.code === 'Space')) return;
      // 音量滑杆的方向键交给浏览器，不触发走位或禁止默认行为。
      if (e.target instanceof HTMLInputElement && e.target.type === 'range' && e.code.startsWith('Arrow')) return;
      if (e.repeat) return;
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      App.onKey(e.code, e.shiftKey);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.endJoy(); });

    // 触屏/鼠标拖动:按下处生成虚拟摇杆
    const cv = document.getElementById('game');
    const joyEl = document.getElementById('joy'), knob = document.getElementById('joyKnob');
    const MAXR = 48;
    cv.addEventListener('pointerdown', e => {
      Sfx.unlock();
      if (Game.state !== 'playing' || UI.overlayId || this.joy) return;
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
