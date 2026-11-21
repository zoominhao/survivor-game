'use strict';

// 战斗反馈数据及寿命。
const BattleEffects = {
  burst(x, y, color, n) {
    for (let i = 0; i < n && this.parts.length < 260; i++) {
      const a = Math.random() * TAU, s = U.rand(40, 160);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.rand(0.25, 0.5), c: color });
    }
  },

  // ---------- 特效 ----------
  updateFx(dt) {
    this.shake *= Math.max(0, 1 - 9 * dt);
    let arr = this.fx, n = 0;
    for (let i = 0; i < arr.length; i++) { arr[i].life -= dt; if (arr[i].life > 0) arr[n++] = arr[i]; }
    arr.length = n;
    arr = this.texts; n = 0;
    for (let i = 0; i < arr.length; i++) {
      const t = arr[i];
      t.life -= dt; t.y -= 34 * dt;
      if (t.life > 0) arr[n++] = t;
    }
    arr.length = n;
    arr = this.parts; n = 0;
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i];
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt;
      q.vx *= 0.92; q.vy *= 0.92;
      if (q.life > 0) arr[n++] = q;
    }
    arr.length = n;
  },
};
