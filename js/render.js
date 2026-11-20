'use strict';
// ===== 渲染:所有图形均为 Canvas 程序化绘制,无外部素材 =====

// 敌人造型(以中心为原点、r 为半径绘制,左右对称,因此无需翻转)
const SHAPES = {
  // 幽灵状轮廓:圆顶 + 锯齿下摆
  blob(c, r, fill, stroke) {
    c.beginPath();
    c.arc(0, -r * 0.15, r * 0.95, Math.PI, 0);
    c.lineTo(r * 0.95, r * 0.55);
    const n = 4, w = r * 1.9 / n;
    for (let i = 0; i < n; i++) {
      const x0 = r * 0.95 - i * w;
      c.lineTo(x0 - w / 2, r * 0.95);
      c.lineTo(x0 - w, r * 0.55);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.lineJoin = 'round';
    c.lineWidth = Math.max(1, r * 0.12);
    c.strokeStyle = stroke;
    c.stroke();
  },
  eyes(c, r, color, y, sx, sy) {
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = r * 0.5;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(s * r * 0.36, r * y, r * sx, r * sy, 0, 0, TAU);
      c.fill();
    }
    c.shadowBlur = 0;
  },
  shade(c, r) {
    SHAPES.blob(c, r, '#4a3470', '#2a1c45');
    SHAPES.eyes(c, r, '#ffe08a', -0.2, 0.16, 0.22);
  },
  moth(c, r) {
    c.fillStyle = '#7d8fb3';
    c.strokeStyle = '#4c5878';
    c.lineWidth = 1;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(s * r * 0.55, -r * 0.1, r * 0.55, r * 0.9, s * 0.5, 0, TAU);
      c.fill();
      c.stroke();
    }
    c.fillStyle = '#2b3350';
    c.beginPath();
    c.ellipse(0, 0, r * 0.3, r * 0.75, 0, 0, TAU);
    c.fill();
    SHAPES.eyes(c, r, '#ff8fa3', -0.35, 0.1, 0.1);
  },
  swarm(c, r) {
    c.fillStyle = '#c8553d';
    c.strokeStyle = '#7a2e1f';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, 0, r * 0.9, 0, TAU);
    c.fill();
    c.stroke();
    SHAPES.eyes(c, r, '#fff2c9', -0.1, 0.18, 0.18);
  },
  brute(c, r) {
    c.fillStyle = '#6b7568';
    c.strokeStyle = '#3d453b';
    c.lineWidth = r * 0.12;
    c.beginPath();
    c.roundRect(-r * 0.92, -r * 0.92, r * 1.84, r * 1.84, r * 0.4);
    c.fill();
    c.stroke();
    // 裂纹
    c.lineWidth = r * 0.07;
    c.beginPath();
    c.moveTo(-r * 0.5, r * 0.9); c.lineTo(-r * 0.3, r * 0.4); c.lineTo(-r * 0.55, r * 0.1);
    c.moveTo(r * 0.6, -r * 0.9); c.lineTo(r * 0.45, -r * 0.55);
    c.stroke();
    // 眉骨
    c.fillStyle = '#4b5449';
    c.fillRect(-r * 0.7, -r * 0.5, r * 1.4, r * 0.22);
    SHAPES.eyes(c, r, '#ffb347', -0.15, 0.15, 0.13);
  },
  spitter(c, r) {
    // 带刺的球
    c.fillStyle = '#5a9e4b';
    c.beginPath();
    const n = 10;
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * TAU, rr = i % 2 ? r * 0.72 : r * 1.05;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.fillStyle = '#3f7a36';
    c.beginPath(); c.arc(0, 0, r * 0.62, 0, TAU); c.fill();
    // 独眼
    c.fillStyle = '#f5f0c0';
    c.beginPath(); c.arc(0, -r * 0.05, r * 0.36, 0, TAU); c.fill();
    c.fillStyle = '#20301c';
    c.beginPath(); c.arc(0, -r * 0.05, r * 0.16, 0, TAU); c.fill();
  },
  wraith(c, r) {
    c.globalAlpha = 0.78;
    SHAPES.blob(c, r, '#78dcd2', '#3c9a94');
    c.globalAlpha = 1;
    SHAPES.eyes(c, r, '#0b2530', -0.2, 0.17, 0.26);
  },
  golem(c, r) {
    c.fillStyle = '#55606e';
    c.strokeStyle = '#2f3742';
    c.lineWidth = r * 0.1;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + Math.PI / 6;
      c.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
    }
    c.closePath();
    c.fill();
    c.stroke();
    // 发光晶核
    c.fillStyle = '#7df9ff';
    c.shadowColor = '#7df9ff';
    c.shadowBlur = r * 0.6;
    c.beginPath();
    c.moveTo(0, r * 0.1); c.lineTo(r * 0.25, r * 0.4); c.lineTo(0, r * 0.7); c.lineTo(-r * 0.25, r * 0.4);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;
    SHAPES.eyes(c, r, '#7df9ff', -0.3, 0.14, 0.1);
  },
  boss(c, r) {
    // 角
    c.fillStyle = '#7a2342';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * r * 0.35, -r * 0.85);
      c.quadraticCurveTo(s * r * 0.95, -r * 1.25, s * r * 0.85, -r * 0.45);
      c.closePath();
      c.fill();
    }
    SHAPES.blob(c, r, '#22123a', '#b0305a');
    SHAPES.eyes(c, r, '#ff3355', -0.25, 0.2, 0.14);
    // 锯齿嘴
    c.strokeStyle = '#ff6b8a';
    c.lineWidth = r * 0.06;
    c.beginPath();
    c.moveTo(-r * 0.4, r * 0.15);
    for (let i = 1; i <= 8; i++) c.lineTo(-r * 0.4 + i * r * 0.1, r * (i % 2 ? 0.28 : 0.15));
    c.stroke();
  },
};

const Render = {
  cv: null, ctx: null, W: 0, H: 0, s: 1,
  sprites: {}, glows: {}, menuT: 0,

  init() {
    this.cv = document.getElementById('game');
    this.ctx = this.cv.getContext('2d');
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.buildSprites();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    this.cv.width = this.W = Math.max(1, Math.round(w * dpr));
    this.cv.height = this.H = Math.max(1, Math.round(h * dpr));
    // 按短边缩放,保证手机竖屏和桌面宽屏看到的战场大小接近
    this.s = dpr * U.clamp(Math.min(w, h) / 620, 0.55, 1.5);
    Game.view.hw = this.W / (2 * this.s);
    Game.view.hh = this.H / (2 * this.s);
    // 提灯光照:中心亮、四周暗
    const g = this.ctx.createRadialGradient(
      this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.26,
      this.W / 2, this.H / 2, Math.hypot(this.W, this.H) * 0.56);
    g.addColorStop(0, 'rgba(4,6,18,0)');
    g.addColorStop(1, 'rgba(4,6,18,0.86)');
    this.dark = g;
  },

  // ---------- 预渲染 ----------
  makeSprite(r, draw) {
    const S = 3, size = Math.ceil((r * 2.6 + 12) * S);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.translate(size / 2, size / 2);
    x.scale(S, S);
    draw(x, r);
    // 受击闪白版本
    const f = document.createElement('canvas');
    f.width = f.height = size;
    const fx = f.getContext('2d');
    fx.drawImage(c, 0, 0);
    fx.globalCompositeOperation = 'source-atop';
    fx.fillStyle = '#fff';
    fx.fillRect(0, 0, size, size);
    return { n: c, f, half: size / (2 * S), r };
  },

  buildSprites() {
    for (const id in ENEMIES) this.sprites[id] = this.makeSprite(ENEMIES[id].r, SHAPES[id] || FolkEnemyArt[id]);

    // 地面贴图:256 世界单位的可平铺图块,以 2 倍分辨率绘制
    const T = 512, tile = document.createElement('canvas');
    tile.width = tile.height = T;
    const c = tile.getContext('2d');
    c.fillStyle = '#15231e';
    c.fillRect(0, 0, T, T);
    // 装饰物离边缘留出余量,避免平铺接缝
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 26; i++) {
      c.fillStyle = `rgba(${i % 2 ? '30,52,42' : '24,40,48'},0.55)`;
      c.beginPath();
      c.ellipse(rnd(60, T - 60), rnd(60, T - 60), rnd(18, 50), rnd(12, 34), rnd(0, 3), 0, TAU);
      c.fill();
    }
    c.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const x = rnd(16, T - 16), y = rnd(16, T - 16);
      c.strokeStyle = i % 3 ? '#27402f' : '#2f4a3a';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x - 4, y - 11);
      c.moveTo(x + 5, y); c.lineTo(x + 6, y - 14);
      c.moveTo(x + 10, y); c.lineTo(x + 15, y - 10);
      c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      c.fillStyle = '#2b3a3a';
      c.beginPath();
      c.ellipse(rnd(20, T - 20), rnd(20, T - 20), rnd(5, 11), rnd(4, 8), 0, 0, TAU);
      c.fill();
    }
    this.ground = this.ctx.createPattern(tile, 'repeat');
    this.ground.setTransform(new DOMMatrix().scale(0.5));
  },

  // 发光贴图,按颜色缓存
  glow(color) {
    let g = this.glows[color];
    if (g) return g;
    g = document.createElement('canvas');
    g.width = g.height = 64;
    const c = g.getContext('2d');
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.25, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 64, 64);
    this.glows[color] = g;
    return g;
  },

  drawGlow(ctx, color, x, y, r) {
    ctx.drawImage(this.glow(color), x - r, y - r, r * 2, r * 2);
  },

  // ---------- 每帧绘制 ----------
  draw(dt) {
    const g = Game, ctx = this.ctx, W = this.W, H = this.H, s = this.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (!g.player || g.state === 'menu') {
      // 主菜单背景:缓慢漂移的夜色荒原
      this.menuT += dt;
      ctx.setTransform(s, 0, 0, s, -this.menuT * 12 * s, -this.menuT * 5 * s);
      ctx.fillStyle = this.ground;
      ctx.fillRect(this.menuT * 12, this.menuT * 5, W / s, H / s);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = this.dark;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const p = g.player, time = g.time;
    let sx = 0, sy = 0;
    if (g.shake > 0.2 && g.state === 'playing') {
      sx = (Math.random() - 0.5) * g.shake * s;
      sy = (Math.random() - 0.5) * g.shake * s;
    }
    ctx.setTransform(s, 0, 0, s, W / 2 - p.x * s + sx, H / 2 - p.y * s + sy);
    const hw = g.view.hw + 24, hh = g.view.hh + 24;
    const L = p.x - hw, T = p.y - hh, Rt = p.x + hw, B = p.y + hh;
    const vis = (x, y, pad) => x > L - pad && x < Rt + pad && y > T - pad && y < B + pad;

    const scene = Environment.sceneAt(time);
    const before = Environment.scenes[scene.from], current = Environment.scenes[scene.id];
    const darkness = before.darkness + (current.darkness - before.darkness) * scene.mix;
    const { lights, hint } = EnvironmentArt.drawField(ctx, this, g, L, T, Rt, B, scene);
    const pose = this.playerPose(p, time);
    const beam = g.state === 'intro' ? null : p.char === 'echo' ? EchoFigure.drawBeam : p.char === 'xiaoxiao' ? XiaoxiaoArt.drawBeam : null;
    this.drawZones(ctx, g, p, time);
    this.drawDrops(ctx, g, vis, time);
    this.drawEnemies(ctx, g, vis);
    EnvironmentArt.drawLighting(ctx, this, lights, darkness, p, pose, beam);
    if (beam) beam(ctx, p, pose);
    this.drawBossWarning(ctx, g.boss);
    this.drawPlayer(ctx, g, p, pose);
    this.drawProjs(ctx, g, p, vis);
    this.drawFx(ctx, g, vis);
    EnvironmentArt.drawLightHint(ctx, hint);

    // 伤害数字
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    for (const t of g.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 3);
      ctx.strokeText(t.s, t.x, t.y);
      ctx.fillStyle = t.c;
      ctx.fillText(t.s, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    // 屏幕空间：黎明暖色及轻量天气粒子，使用战斗时钟以支持暂停。
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (scene.id === 'dawn') {
      ctx.globalAlpha = scene.mix * 0.22;
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
    EnvironmentArt.drawTransition(ctx, W, H, scene, this.reduceMotion?.matches);
    EnvironmentArt.drawWeather(ctx, W, H, s, time, scene, this.reduceMotion?.matches);
    // 低血量红色警示
    const hpK = p.hp / p.st.maxHp;
    if (hpK < 0.35 && g.state === 'playing') {
      ctx.globalAlpha = (0.35 - hpK) * (1.1 + Math.sin(time * 8) * 0.4);
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.55);
      v.addColorStop(0, 'rgba(255,0,30,0)');
      v.addColorStop(1, 'rgba(255,0,30,0.9)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
  },

  drawZones(ctx, g, p, time) {
    // 光环类武器
    for (const w of p.weapons) {
      if (WEAPONS[w.id].kind !== 'aura') continue;
      const R = w.s.radius * p.st.area, strong = !!w.s.thorns;
      ctx.fillStyle = strong ? 'rgba(150,255,140,0.13)' : 'rgba(120,220,130,0.09)';
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = strong ? 'rgba(190,255,170,0.6)' : 'rgba(140,240,150,0.38)';
      ctx.lineWidth = strong ? 3 : 2;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -time * 26;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const z of g.zones) {
      if (z.type === 'meteor') {
        const k = 1 - z.t / z.max;
        ctx.fillStyle = `rgba(255,90,50,${0.08 + k * 0.2})`;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,140,90,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
      } else if (z.type === 'monkey' || z.type === 'watermelon') {
        const k = 1 - z.t / z.max;
        ctx.save();
        ctx.strokeStyle = ctx.fillStyle = z.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.32 + 0.42 * k;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.1 + 0.22 * k;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (z.type === 'ricecake') {
        FoodArt.ricecake(ctx, z);
      } else if (z.type === 'fire' && z.look === 'tomato') {
        FoodArt.sauce(ctx, z);
      } else if (z.type === 'fire' && z.look === 'bubbletea') {
        FoodArt.teaSpill(ctx, z);
      } else if (z.type === 'fire') {
        const a = Math.min(1, z.life) * (0.26 + Math.sin(time * 18 + z.x) * 0.06);
        ctx.fillStyle = `rgba(255,120,40,${a})`;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,210,90,${a * 0.8})`;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.55, 0, TAU); ctx.fill();
      } else if (z.type === 'ring' && z.look === 'roar') {
        XiaoxiaoArt.roar(ctx, z);
      } else if (z.type === 'ring') {
        const k = 1 - z.r / z.maxR;
        ctx.strokeStyle = `rgba(190,240,255,${0.25 + k * 0.7})`;
        ctx.lineWidth = 5 + k * 6;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(170,230,255,${k * 0.1})`;
        ctx.fill();
      }
    }
  },

  // 冲锋提示和弹幕画在夜色层上方，看不见怪物时仍能反应。
  drawBossWarning(ctx, b) {
    if (b && !b.dead && b.phase === 'wind') {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.cy, b.cx));
      ctx.fillStyle = 'rgba(255,50,80,0.2)';
      ctx.fillRect(0, -b.r, 230, b.r * 2);
      ctx.strokeStyle = 'rgba(255,90,110,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, -b.r, 230, b.r * 2);
      ctx.restore();
    }
  },

  drawDrops(ctx, g, vis, time) {
    // 经验宝石:按价值分三档颜色
    for (const gem of g.gems) {
      if (!vis(gem.x, gem.y, 10)) continue;
      const big = gem.v >= 25, mid = gem.v >= 5;
      const r = big ? 7 : mid ? 5.5 : 4;
      ctx.fillStyle = big ? '#ff7ab8' : mid ? '#ffd166' : '#6fe3c4';
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - r); ctx.lineTo(gem.x + r * 0.75, gem.y);
      ctx.lineTo(gem.x, gem.y + r); ctx.lineTo(gem.x - r * 0.75, gem.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(gem.x - r * 0.3, gem.y - r * 0.45, r * 0.3, r * 0.3);
    }
    for (const k of g.pickups) {
      if (!vis(k.x, k.y, 20)) continue;
      const bob = Math.sin(time * 5 + k.x) * 2;
      if (k.type === 'coin') {
        ctx.fillStyle = '#f2b632';
        ctx.beginPath(); ctx.arc(k.x, k.y + bob, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath(); ctx.arc(k.x - 1, k.y - 1 + bob, 2.2, 0, TAU); ctx.fill();
      } else if (k.type === 'heart') {
        ctx.fillStyle = '#ff5d73';
        ctx.beginPath();
        ctx.arc(k.x - 3.5, k.y - 2 + bob, 4.2, 0, TAU);
        ctx.arc(k.x + 3.5, k.y - 2 + bob, 4.2, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(k.x - 7.4, k.y + bob); ctx.lineTo(k.x, k.y + 8 + bob); ctx.lineTo(k.x + 7.4, k.y + bob);
        ctx.closePath(); ctx.fill();
      } else if (k.type === 'vacuum') {
        ctx.globalCompositeOperation = 'lighter';
        this.drawGlow(ctx, '#6fe3c4', k.x, k.y + bob, 16);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#d9fff5';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(k.x, k.y + bob, 6, time * 4, time * 4 + 4.6); ctx.stroke();
      } else if (k.type === 'chest') {
        ctx.globalCompositeOperation = 'lighter';
        this.drawGlow(ctx, '#ffd166', k.x, k.y, 30 + Math.sin(time * 4) * 4);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(k.x - 11, k.y - 6, 22, 14);
        ctx.fillStyle = '#b57a3c';
        ctx.fillRect(k.x - 11, k.y - 10, 22, 6);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(k.x - 11, k.y - 4.5, 22, 2);
        ctx.fillRect(k.x - 2, k.y - 6, 4, 6);
      }
    }
  },

  drawEnemies(ctx, g, vis) {
    const es = g.enemies;
    es.sort((a, b) => a.y - b.y); // 按 y 排序形成前后遮挡;逻辑不依赖数组顺序
    // 影子合并为一条路径
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    for (const e of es) {
      if (e.dead || !vis(e.x, e.y, e.r + 10)) continue;
      ctx.moveTo(e.x + e.r * 0.8, e.y + e.r * 0.85);
      ctx.ellipse(e.x, e.y + e.r * 0.85, e.r * 0.8, e.r * 0.3, 0, 0, TAU);
    }
    ctx.fill();
    for (const e of es) {
      if (e.dead || !vis(e.x, e.y, e.r + 20)) continue;
      const sp = this.sprites[e.type];
      const k = e.r / sp.r, h = sp.half * k;
      const hop = ENEMIES[e.type].hop;
      const bob = e.frozen > 0 ? 0 : hop ? -g.hopLift(e, hop) * e.r * 0.58 : Math.sin(e.t * 7) * 1.5;
      // Boss 蓄力时抖动
      const jx = e.phase === 'wind' ? (Math.random() - 0.5) * 4 : 0;
      ctx.drawImage(sp.n, e.x - h + jx, e.y - h + bob, h * 2, h * 2);
      if (e.flash > 0) {
        // 受击闪白:半透明叠加,怪多或 Boss 持续挨打时不至于一片纯白
        ctx.globalAlpha = 0.6;
        ctx.drawImage(sp.f, e.x - h + jx, e.y - h + bob, h * 2, h * 2);
        ctx.globalAlpha = 1;
      }
      if (e.frozen > 0 || e.slowT > 0) {
        ctx.fillStyle = e.frozen > 0 ? 'rgba(170,230,255,0.5)' : 'rgba(170,230,255,0.22)';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
      }
      if (e.elite) {
        // 精英怪:金色光圈 + 血条
        ctx.strokeStyle = 'rgba(255,209,102,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, TAU); ctx.stroke();
        const bw = e.r * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 12, bw, 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 12, bw * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
  },

  // ---------- 角色造型 ----------
  // 以原点为中心、面朝右绘制;walk ∈ [-1, 1] 为走路摆动相位
  drawFigure(ctx, charId, walk, tier = 0, aim = 0) {
    const c = CHARS[charId];
    if (c.look === 'girl') this.drawGirl(ctx, walk, tier);
    else if (c.look === 'echo') EchoFigure.runner(ctx, walk, tier, aim);
    else if (c.look === 'xiaoxiao') XiaoxiaoArt.runner(ctx, walk, tier, aim);
    else this.drawCloak(ctx, c.color, tier);
  },

  // 默认造型:兜帽斗篷 + 提灯
  drawCloak(ctx, color, tier) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-10, 12);
    ctx.quadraticCurveTo(-13, -6, 0, -15);
    ctx.quadraticCurveTo(13, -6, 10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (tier > 0) {
      ctx.strokeStyle = '#f4ca86'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-9, -3); ctx.quadraticCurveTo(-7, -9, 0, -13);
      ctx.quadraticCurveTo(7, -9, 9, -3); ctx.stroke();
    }
    // 兜帽下的脸
    ctx.fillStyle = '#1b1626';
    ctx.beginPath(); ctx.ellipse(1.5, -4, 6.2, 5.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, -5.5, 2, 3);
    ctx.fillRect(4.2, -5.5, 2, 3);
    // 提灯
    ctx.strokeStyle = '#c9a66b';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(14, -3); ctx.lineTo(14, 0); ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(14, 3, 3.2, 0, TAU); ctx.fill();
  },

  // 小女孩造型:高马尾 + 黄色发夹、透明圆框眼镜、米白色熊猫九宫格卫衣、灰色阔腿裤、粉色手表
  drawGirl(ctx, walk, tier) {
    const HAIR = '#1d1b20', SKIN = '#f7d7bd', CREAM = '#f4eedc', GREY = '#9c9ea6';
    ctx.lineCap = 'round';
    // 马尾(在身后,随走动甩动)
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.moveTo(-4.5, -13);
    ctx.quadraticCurveTo(-13 - walk * 1.2, -11, -11 - walk * 2.2, 0.5);
    ctx.quadraticCurveTo(-8.5, -4, -5.5, -7.5);
    ctx.closePath();
    ctx.fill();
    // 阔腿裤:两条裤腿随步伐前后分开
    const sw = walk * 1.4;
    ctx.fillStyle = GREY;
    ctx.beginPath();
    ctx.moveTo(-5.6, 4.5); ctx.lineTo(0, 4.5); ctx.lineTo(0.2 - sw, 13); ctx.lineTo(-7.2 - sw, 13);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 4.5); ctx.lineTo(5.6, 4.5); ctx.lineTo(7.2 + sw, 13); ctx.lineTo(-0.2 + sw, 13);
    ctx.closePath(); ctx.fill();
    // 裤缝线
    ctx.strokeStyle = '#84868e';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-2.8, 6); ctx.lineTo(-3.5 - sw, 13);
    ctx.moveTo(2.8, 6); ctx.lineTo(3.5 + sw, 13);
    ctx.stroke();
    // 后侧手臂(自然下垂)
    ctx.strokeStyle = '#e9e1cc';
    ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(-5.5, -0.5); ctx.lineTo(-7.2 + walk * 0.8, 4.2); ctx.stroke();
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(-7.4 + walk * 0.9, 5.6, 1.4, 0, TAU); ctx.fill();
    // 卫衣
    ctx.fillStyle = CREAM;
    ctx.beginPath(); ctx.roundRect(-6.8, -3.6, 13.6, 9.6, 3.4); ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,40,0.35)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = '#e4dbc3';
    ctx.fillRect(-5.6, 4.6, 11.2, 1.3); // 下摆罗纹
    // 胸前的熊猫九宫格印花
    const gx = -2.6, gy = -1.6, cs = 1.8;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gx, gy, cs * 3, cs * 3);
    ctx.fillStyle = '#26252b';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = gx + c * cs, y = gy + r * cs;
        ctx.fillRect(x + 0.25, y + 0.2, 0.5, 0.5);  // 耳朵
        ctx.fillRect(x + 1.05, y + 0.2, 0.5, 0.5);
        ctx.fillRect(x + 0.45, y + 1.0, 0.9, 0.5);  // 身体
      }
    }
    ctx.strokeStyle = 'rgba(40,40,50,0.5)';
    ctx.lineWidth = 0.2;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      ctx.moveTo(gx + i * cs, gy); ctx.lineTo(gx + i * cs, gy + cs * 3);
      ctx.moveTo(gx, gy + i * cs); ctx.lineTo(gx + cs * 3, gy + i * cs);
    }
    ctx.stroke();
    // 前侧手臂(提灯)、粉色手表、手
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(5.2, -0.8); ctx.lineTo(9.6, -1.4); ctx.stroke();
    ctx.fillStyle = '#f2788f';
    ctx.fillRect(10.2, -3.2, 1.3, 3.6);
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(12.4, -1.5, 1.5, 0, TAU); ctx.fill();
    // 提灯
    ctx.strokeStyle = '#c9a66b';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(12.6, -0.4); ctx.lineTo(13.4, 1.6); ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(13.8, 4, 2.8, 0, TAU); ctx.fill();
    // 头
    const hx = 0.6, hy = -9.6, hr = 6.9;
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
    // 头发:向后梳起露出额头
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.arc(hx, hy, hr + 0.4, Math.PI * 0.82, Math.PI * 1.86);
    ctx.quadraticCurveTo(hx + 2, hy - 4.5, hx - 2.8, hy - 1.2);
    ctx.closePath();
    ctx.fill();
    // 耳朵
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(hx - 3, hy + 1.4, 1.2, 0, TAU); ctx.fill();
    // 升级后的粉色花发夹，初始仍是黄色发夹。
    if (tier > 0) Wardrobe.drawFlower(ctx, hx - 2.1, hy - 5.6);
    else {
      ctx.fillStyle = '#f4c430';
      ctx.save();
      ctx.translate(hx - 1.4, hy - 5.4);
      ctx.rotate(-0.5);
      ctx.fillRect(-1.3, -0.55, 2.6, 1.1);
      ctx.restore();
    }
    // 腮红
    ctx.fillStyle = 'rgba(240,130,130,0.38)';
    ctx.beginPath(); ctx.arc(hx + 0.5, hy + 3.3, 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 5, hy + 3.3, 1.1, 0, TAU); ctx.fill();
    // 眼睛
    ctx.fillStyle = '#2a2326';
    ctx.beginPath(); ctx.arc(hx + 0.9, hy + 0.7, 0.75, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 4.6, hy + 0.7, 0.75, 0, TAU); ctx.fill();
    // 透明圆框眼镜
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeStyle = 'rgba(238,196,206,0.95)';
    ctx.lineWidth = 0.55;
    for (const ex of [hx + 0.9, hx + 4.6]) {
      ctx.beginPath(); ctx.arc(ex, hy + 0.7, 1.9, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(hx - 1, hy + 0.5); ctx.lineTo(hx - 2.8, hy + 0.8); ctx.stroke(); // 镜腿
    // 微笑
    ctx.strokeStyle = '#b0584f';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(hx + 2.8, hy + 3.3, 1.1, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.lineCap = 'butt';
  },

  // 名册与开场共用角色立绘，小头像和大立绘用不同绘制分辨率。
  avatar(charId, S = 3) {
    const w = 40, h = 44;
    const cv = document.createElement('canvas');
    cv.width = w * S; cv.height = h * S;
    cv.className = 'avatar';
    const x = cv.getContext('2d');
    const look = CHARS[charId].look;
    if (look === 'echo' || look === 'xiaoxiao') {
      x.translate(w * S / 2, 4 * S);
      x.scale(S * 0.38, S * 0.38);
      if (look === 'echo') EchoFigure.portrait(x);
      else XiaoxiaoArt.portrait(x);
    } else {
      x.translate(w * S / 2 - 1.2 * S, h * S / 2 + 2.6 * S);
      x.scale(S * 1.2, S * 1.2);
      this.drawFigure(x, charId, 0);
    }
    return cv;
  },

  playerPose(p, time) {
    const stride = p.moving ? Math.sin(p.walkT * 14) : 0;
    const bob = p.moving ? stride * 1.6 : Math.sin(time * 3) * 0.6;
    // 角色局部坐标会左右镜像，手电和光锥使用同一个局部角度。
    const aim = Math.atan2(p.diry, p.dirx * p.face);
    return { stride, bob, aim };
  },

  drawPlayer(ctx, g, p, { stride, bob, aim } = this.playerPose(p, g.time)) {
    const look = CHARS[p.char].look, tier = Wardrobe.stage(p.level, g.pending);
    const motion = !this.reduceMotion?.matches;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 10, 4, 0, 0, TAU); ctx.fill();
    if (tier >= 3) Wardrobe.drawSeal(ctx, p.x, p.y, look, motion ? g.time : 0);
    const directionalLight = look === 'echo' || look === 'xiaoxiao';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = directionalLight ? 0.34 : 0.5;
    const glowOffset = directionalLight ? 0 : 14 * p.face;
    this.drawGlow(ctx, look === 'xiaoxiao' ? '#c6e5fd' : '#ffd166', p.x + glowOffset, p.y + 2 + bob, 34);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (p.iframe > 0 && Math.floor(g.time * 24) % 2) ctx.globalAlpha = 0.45; // 无敌闪烁
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(p.face, 1);
    Wardrobe.drawTrail(ctx, look, tier, motion ? g.time : 0, motion ? stride : 0);
    this.drawFigure(ctx, p.char, stride, tier, aim);
    Wardrobe.drawClasp(ctx, look, tier);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (look === 'xiaoxiao' && p.weapons.some(w => w.id === 'skincare' && w.on > 0)) {
      ctx.strokeStyle = '#b9ead8ae'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 22, 28, 0, Math.PI * 0.12, Math.PI * 1.88); ctx.stroke();
    }
    this.drawExamGuard(ctx, p, g.time);
    // 血条
    const k = Math.max(0, p.hp / p.st.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(p.x - 18, p.y + 19, 36, 5);
    ctx.fillStyle = k > 0.35 ? '#e5484d' : '#ff8a3d';
    ctx.fillRect(p.x - 17, p.y + 20, 34 * k, 3);
  },

  drawExamGuard(ctx, p, time) {
    const guards = p.weapons.find(w => w.id === 'exampaper')?.guards || 0;
    if (!guards) return;
    const r = 31;
    ctx.save();
    ctx.translate(p.x, p.y - 2);
    ctx.strokeStyle = '#f6e2b378'; ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < guards; i++) {
      const a = time * 2.1 - Math.PI * 0.75 + i * TAU / guards;
      ctx.save();
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
      ctx.rotate(Math.cos(a) * 0.42);
      ctx.fillStyle = '#f6e5be'; ctx.strokeStyle = '#8d7258'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(3, -9); ctx.lineTo(7, -5);
      ctx.lineTo(7, 9); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -9); ctx.lineTo(3, -5); ctx.lineTo(7, -5);
      ctx.moveTo(-4, -4); ctx.lineTo(1, -4); ctx.moveTo(-4, -1); ctx.lineTo(4, -1);
      ctx.moveTo(-4, 2); ctx.lineTo(0, 2); ctx.stroke();
      ctx.strokeStyle = '#a34d42'; ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(2, 7); ctx.lineTo(5, 3); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  drawMouse(ctx, b) {
    const stride = Math.sin(b.age * 31), scale = Math.min(1.8, b.r / 8);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.scale(scale, scale);

    ctx.fillStyle = '#17201d99';
    ctx.beginPath(); ctx.ellipse(-1, 3, 10, 4, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -Math.abs(stride) * 1.8);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#bb7d6b'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-7, 1);
    ctx.bezierCurveTo(-12, 4, -16, 6 + stride * 3, -19, 1 + stride * 3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 3); ctx.lineTo(-5 + stride * 2, 5);
    ctx.moveTo(3, 3); ctx.lineTo(3 - stride * 2, 5); ctx.stroke();

    ctx.fillStyle = b.color; ctx.strokeStyle = '#624638'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.ellipse(-3, 0, 7.5, 4.9, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 0.7); ctx.quadraticCurveTo(6, -6, 1, -4.5);
    ctx.quadraticCurveTo(-4, -3.5, -1, 2.6); ctx.quadraticCurveTo(3, 6, 10, 0.7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#dea08c';
    ctx.beginPath(); ctx.arc(0.5, -4.8, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#352724';
    ctx.beginPath(); ctx.arc(5, -1.5, 1, 0, TAU); ctx.moveTo(11, 0.7); ctx.arc(10, 0.7, 1, 0, TAU); ctx.fill();
    ctx.restore();
  },

  drawMonkeyLeap(ctx, z) {
    const k = U.clamp(1 - z.t / z.max, 0, 1), lift = Math.sin(k * Math.PI);
    const scale = z.wid === 'monkeytroop' ? 1.22 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(z.fromX + (z.x - z.fromX) * k, z.fromY + (z.y - z.fromY) * k - lift * 42);
    ctx.scale(z.x < z.fromX ? -scale : scale, scale);
    ctx.rotate((k - 0.5) * 0.6);
    ctx.lineCap = 'round';

    ctx.strokeStyle = '#b87a54'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-4, 6);
    ctx.bezierCurveTo(-11, 13, -21, 9, -18, 2);
    ctx.bezierCurveTo(-16, -2, -11, 1, -14, 4); ctx.stroke();
    ctx.strokeStyle = '#d19a6b'; ctx.lineWidth = 3.7;
    ctx.beginPath();
    ctx.moveTo(3, 1); ctx.lineTo(12, -2 + k * 6);
    ctx.moveTo(-2, 6); ctx.lineTo(-8 + k * 10, 10); ctx.stroke();

    ctx.fillStyle = '#a56a48'; ctx.strokeStyle = '#432d26'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 4, 5.6, 6.6, -0.38, 0, TAU); ctx.fill(); ctx.stroke();
    for (const x of [-5, 9]) {
      ctx.beginPath(); ctx.arc(x, -6, 3.1, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(2, -6.5, 7.2, 7.1, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = z.color;
    ctx.beginPath(); ctx.moveTo(2, -8.4);
    ctx.bezierCurveTo(-4.5, -13.9, -6, -2, 0.3, -1);
    ctx.bezierCurveTo(8, 1.8, 10.9, -11.4, 4.7, -10.2);
    ctx.quadraticCurveTo(3.1, -10.1, 2, -8.4); ctx.fill();
    ctx.fillStyle = '#442b24';
    ctx.beginPath(); ctx.arc(0.1, -6.4, 0.85, 0, TAU); ctx.moveTo(5.6, -6.5); ctx.arc(4.7, -6.5, 0.9, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2.8, -4.4, 1.8, 0.3, 2.7); ctx.stroke();
    ctx.restore();
  },

  drawBasketball(ctx, b) {
    const r = b.r;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y);
    ctx.fillStyle = '#16201b99';
    ctx.beginPath(); ctx.ellipse(0, r * 0.6, r, r * 0.37, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -Math.abs(Math.sin(b.age * 19)) * r * 0.42);
    ctx.rotate(b.age * 13);
    ctx.fillStyle = b.color; ctx.strokeStyle = '#593625'; ctx.lineWidth = 1.15;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.moveTo(-r * 0.74, -r * 0.66); ctx.quadraticCurveTo(-r * 0.12, 0, -r * 0.74, r * 0.66);
    ctx.moveTo(r * 0.74, -r * 0.66); ctx.quadraticCurveTo(r * 0.12, 0, r * 0.74, r * 0.66);
    ctx.stroke();
    ctx.restore();
  },

  drawProjs(ctx, g, p, vis) {
    ctx.globalCompositeOperation = 'lighter';
    // 环绕类武器的光球与甜筒
    for (const w of p.weapons) {
      if (WEAPONS[w.id].kind !== 'orbit' || !(w.on > 0)) continue;
      const st = p.st, n = w.s.count + st.amount, R = w.s.radius * st.area, r = w.s.size * st.area;
      const color = WEAPONS[w.id].color;
      for (let i = 0; i < n; i++) {
        const a = w.ang + i / n * TAU;
        const x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
        if (w.id === 'icecream') FoodArt.icecream(ctx, x, y, r, i);
        else this.drawGlow(ctx, color, x, y, r * 2.2);
      }
    }
    for (const b of g.projs) {
      if (!vis(b.x, b.y, 40)) continue;
      if (b.look === 'mouse') {
        this.drawMouse(ctx, b);
      } else if (b.look === 'basketball') {
        this.drawBasketball(ctx, b);
      } else if (b.look === 'latiao' || b.look === 'pony') {
        XiaoxiaoArt[b.look](ctx, b);
      } else if (b.look === 'candy' || b.look === 'potato' || b.look === 'tomato' || b.look === 'bubbletea') {
        FoodArt[b.look](ctx, b);
      } else if (b.look === 'bolt') {
        this.drawGlow(ctx, b.color, b.x, b.y, b.r * 2.4);
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = b.r * 0.9;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (b.look === 'lance') {
        const l = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / l, uy = b.vy / l;
        ctx.strokeStyle = b.color;
        ctx.lineCap = 'round';
        ctx.lineWidth = b.r * 0.7;
        ctx.beginPath(); ctx.moveTo(b.x - ux * 22, b.y - uy * 22); ctx.lineTo(b.x + ux * 10, b.y + uy * 10); ctx.stroke();
        this.drawGlow(ctx, b.color, b.x + ux * 8, b.y + uy * 8, b.r * 2);
      } else if (b.look === 'blade') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        ctx.strokeStyle = 'rgba(40,60,90,0.7)';
        ctx.lineWidth = 1;
        // 四角手里剑
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU, rr = i % 2 ? b.r * 0.35 : b.r;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
      }
    }
    // 有延迟的落地技能：陨星、灵猴与西瓜。
    for (const z of g.zones) {
      if (z.type === 'monkey') this.drawMonkeyLeap(ctx, z);
      else if (z.type === 'watermelon') FoodArt.watermelon(ctx, z);
      if (z.type !== 'meteor') continue;
      const k = z.t / z.max;
      this.drawGlow(ctx, '#ff9f6b', z.x + k * 110, z.y - k * 340, 16 + (1 - k) * 12);
    }
    ctx.globalCompositeOperation = 'source-over';
    // 敌方子弹
    for (const b of g.ebullets) {
      if (!vis(b.x, b.y, 10)) continue;
      if (b.look === 'weddingPaper') { FolkEnemyArt.weddingPaper(ctx, b); continue; }
      if (b.look === 'rainDrop') { FolkEnemyArt.rainDrop(ctx, b); continue; }
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd6de';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
    }
  },

  drawFx(ctx, g, vis) {
    ctx.globalCompositeOperation = 'lighter';
    for (const f of g.fx) {
      const k = f.life / f.max;
      if (f.type === 'zap') {
        // 折线闪电:首次绘制时生成并缓存折点
        if (!f.pts) {
          f.pts = [];
          for (let i = 0; i <= 7; i++) f.pts.push((i === 0 ? 0 : (Math.random() - 0.5) * 34), -i * 60);
        }
        ctx.strokeStyle = `rgba(200,235,255,${k})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < f.pts.length; i += 2) ctx.lineTo(f.x + f.pts[i], f.y + f.pts[i + 1]);
        ctx.stroke();
        ctx.globalAlpha = k;
        this.drawGlow(ctx, '#9ad7ff', f.x, f.y, 34);
        ctx.globalAlpha = 1;
      } else if (f.type === 'arc') {
        ctx.strokeStyle = `rgba(200,235,255,${k})`;
        ctx.lineWidth = 2;
        const mx = (f.x + f.x2) / 2 + (f.y2 - f.y) * 0.15, my = (f.y + f.y2) / 2 - (f.x2 - f.x) * 0.15;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(mx, my); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      } else if (f.type === 'boom') {
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = f.c;
        ctx.lineWidth = 3 + k * 5;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - k * 0.6), 0, TAU); ctx.stroke();
        ctx.globalAlpha = k * 0.25;
        ctx.fillStyle = f.c;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (f.type === 'mangoHeal') {
        FoodArt.mangoHeal(ctx, f, k);
      } else if (f.type === 'skincare') {
        XiaoxiaoArt.balm(ctx, f, k);
      } else if (f.type === 'outfitPulse' && !this.reduceMotion?.matches) {
        const r = 13 + 25 * (1 - k);
        ctx.globalAlpha = k * 0.52;
        ctx.strokeStyle = f.c; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(f.x, f.y + 12, r, r * 0.42, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const q of g.parts) {
      ctx.globalAlpha = Math.min(1, q.life * 3);
      ctx.fillStyle = q.c;
      ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  },
};
