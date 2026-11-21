'use strict';

// Canvas 布局、摄像机与每帧绘制顺序。
const characterBeams = { echo: EchoFigure.drawBeam, xiaoxiao: XiaoxiaoArt.drawBeam, zhu: ZhuFigure.drawBeam };
const Render = {
  ...EnemyRendering, ...CharacterRendering, ...CombatRendering,
  cv: null, ctx: null, W: 0, H: 0, s: 1, pixelScale: 1,
  sprites: {}, glows: {}, menuT: 0,

  init(onResize) {
    this.cv = document.getElementById('game');
    this.ctx = this.cv.getContext('2d');
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.buildEnemySprites();
    this.buildGround();
    const resize = () => this.resize(onResize);
    resize();
    window.addEventListener('resize', resize);
  },

  resize(onResize) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.pixelScale = dpr;
    const w = window.innerWidth, h = window.innerHeight;
    this.cv.width = this.W = Math.max(1, Math.round(w * dpr));
    this.cv.height = this.H = Math.max(1, Math.round(h * dpr));
    // 按短边缩放,保证手机竖屏和桌面宽屏看到的战场大小接近
    this.s = dpr * U.clamp(Math.min(w, h) / 620, 0.55, 1.5);
    onResize(this.W / (2 * this.s), this.H / (2 * this.s));
    // 提灯光照:中心亮、四周暗
    const g = this.ctx.createRadialGradient(
      this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.26,
      this.W / 2, this.H / 2, Math.hypot(this.W, this.H) * 0.56);
    g.addColorStop(0, 'rgba(4,6,18,0)');
    g.addColorStop(1, 'rgba(4,6,18,0.86)');
    this.dark = g;
  },

  buildGround() {
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
    if (typeof color !== 'string') color = '#fff';
    if (Object.hasOwn(this.glows, color)) return this.glows[color];
    if (color !== '#fff' && Object.keys(this.glows).length >= 128) return this.glow('#fff');
    const g = document.createElement('canvas');
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
  draw(dt, g) {
    const ctx = this.ctx, W = this.W, H = this.H, s = this.s;
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

    const p = g.player, time = g.time, mate = g.partner;
    const camera = p.hp <= 0 && mate?.hp > 0 ? mate : p;
    let sx = 0, sy = 0;
    if (g.shake > 0.2 && g.state === 'playing') {
      sx = (Math.random() - 0.5) * g.shake * s;
      sy = (Math.random() - 0.5) * g.shake * s;
    }
    ctx.setTransform(s, 0, 0, s, W / 2 - camera.x * s + sx, H / 2 - camera.y * s + sy);
    const hw = g.view.hw + 24, hh = g.view.hh + 24;
    const L = camera.x - hw, T = camera.y - hh, Rt = camera.x + hw, B = camera.y + hh;
    const vis = (x, y, pad) => x > L - pad && x < Rt + pad && y > T - pad && y < B + pad;

    const scene = Environment.forBattle(g);
    const outfitMap = Environment.landscape(scene);
    const before = Environment.scenes[scene.from], current = Environment.scenes[scene.id];
    const shade = `rgb(${before.shade.map((value, i) => Math.round(value + (current.shade[i] - value) * scene.mix)).join(',')})`;
    const afterglow = EnvironmentArt.afterglow(time - g.bossClearAt, BOSS_AFTERGLOW);
    const darkness = (before.darkness + (current.darkness - before.darkness) * scene.mix) * (1 - afterglow * 0.80);
    const { lights, hint } = EnvironmentArt.drawField(ctx, this, g, L, T, Rt, B, scene);
    const pose = this.playerPose(camera, time);
    const beams = g.state === 'intro' ? [] : g.players.filter(member => member.hp > 0 && characterBeams[member.char] && vis(member.x, member.y, 350))
      .map(member => ({ member, pose: member === camera ? pose : this.playerPose(member, time), draw: characterBeams[member.char] }));
    if (mate?.hp > 0 && mate !== camera) lights.push({ x: mate.x, y: mate.y, light: EnvironmentArt.partnerLight, weight: 1 });
    this.drawZones(ctx, g, time);
    this.drawDrops(ctx, g, vis, time);
    this.drawEnemies(ctx, g, vis);
    EnvironmentArt.drawLighting(ctx, this, lights, darkness, shade, camera, beams);
    for (const ray of beams) ray.draw(ctx, ray.member, ray.pose);
    const boss = g.boss, reduced = this.reduceMotion?.matches;
    if (boss?.kind === 'nightmare' && !boss.dead && vis(boss.x, boss.y, boss.r * 1.5)) {
      NightmareArt.signs(ctx, boss, time, reduced, (color, x, y, r) => this.drawGlow(ctx, color, x, y, r));
    }
    this.drawBossWarning(ctx, g.boss);
    if (mate) {
      for (const member of g.players) {
        if (!vis(member.x, member.y, 48)) continue;
        ctx.save();
        if (member.hp <= 0) ctx.globalAlpha = 0.37;
        this.drawPlayer(ctx, g, member, member === camera ? pose : this.playerPose(member, time), outfitMap);
        ctx.restore();
        ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = member === p ? '#ffe4aa' : '#b2efe6';
        ctx.strokeStyle = '#182421'; ctx.lineWidth = 3;
        const label = `${g.robot && member.slot === 1 ? '机器人' : `守夜 ${member.slot + 1}`}${member.hp <= 0 ? ' · 倒下' : ''}`;
        ctx.strokeText(label, member.x, member.y - 37);
        ctx.fillText(label, member.x, member.y - 37);
      }
    } else this.drawPlayer(ctx, g, p, pose, outfitMap);
    this.drawProjs(ctx, g, vis);
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
    if (boss && Number.isFinite(boss.arrivedAt)) NightmareArt.arrival(ctx, W, H, (time - boss.arrivedAt) / BOSS_ARRIVAL, reduced);
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
    CoopSignalArt.draw(ctx, g, camera, W, H, s, this.pixelScale);
  },
};
