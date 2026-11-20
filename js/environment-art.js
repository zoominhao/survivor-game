'use strict';
// 接近石灯有暖光，雨雪和风独立绘制，不遮挡战斗提示或改变移动速度。
const EnvironmentArt = {
  groundTiles: {},

  ground(ctx, id, plain) {
    if (id === 'night') return plain;
    if (this.groundTiles[id]) return this.groundTiles[id];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = Environment.scenes[id].ground; c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#17262538';
    for (let i = 0; i < 21; i++) {
      const x = 20 + Terrain.hash(i, 3, 1) * 216, y = 20 + Terrain.hash(i, 4, 2) * 216;
      c.beginPath(); c.ellipse(x, y, 8 + i % 11, 3 + i % 5, -0.3, 0, TAU); c.fill();
    }
    if (id === 'rain') this.paving(c);
    else this.scuffs(c, id === 'snow');
    return this.groundTiles[id] = ctx.createPattern(cv, 'repeat');
  },

  paving(c) {
    c.lineWidth = 1.2;
    for (let row = -1; row < 8; row++) {
      const y = row * 32, shift = (row % 2) * 32;
      for (let col = -1; col < 5; col++) {
        const x = col * 64 + shift;
        c.fillStyle = (row + col) % 2 ? '#778b8f22' : '#17222d30';
        c.fillRect(x + 2, y + 2, 59, 27);
        c.strokeStyle = '#18252e7d'; c.strokeRect(x, y, 64, 32);
      }
    }
  },

  scuffs(c, snow) {
    c.strokeStyle = snow ? '#d2e8e875' : '#81946961'; c.lineWidth = 1.2; c.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = 11 + Terrain.hash(i, 5, 3) * 228, y = 11 + Terrain.hash(i, 5, 4) * 228;
      c.beginPath(); c.moveTo(x, y);
      if (snow) c.quadraticCurveTo(x + 6, y - 3, x + 12, y);
      else { c.lineTo(x - 2, y - 5); c.moveTo(x + 3, y); c.lineTo(x + 6, y - 6); }
      c.stroke();
    }
  },

  drawField(ctx, render, g, left, top, right, bottom, scene) {
    const { id, from, mix } = scene;
    ctx.fillStyle = this.ground(ctx, mix < 1 ? from : id, render.ground);
    ctx.fillRect(left, top, right - left, bottom - top);
    if (mix > 0 && mix < 1) {
      ctx.globalAlpha = mix;
      ctx.fillStyle = this.ground(ctx, id, render.ground);
      ctx.fillRect(left, top, right - left, bottom - top);
      ctx.globalAlpha = 1;
    }
    const landscape = mix < 0.5 ? from : id;
    const reduced = render.reduceMotion?.matches, time = g.time;
    Terrain.forEachProp(left - 94, top - 94, right + 94, bottom + 94, prop => {
      const key = Environment.key(prop);
      const lit = prop.kind === 'lantern' && g.environment.lit.has(key);
      const rustle = Math.max(0, (g.environment.reeds.get(key) || 0) - time);
      if (lit) {
        ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.38;
        render.drawGlow(ctx, '#d49645', prop.x, prop.y - 14, 71);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      const gust = reduced ? 0 : 0.067 * Math.sin(time * 5 + prop.y * 0.02);
      const lean = (landscape === 'bamboo' ? gust : 0) +
        (!reduced && prop.kind === 'reeds' ? rustle * 0.35 * Math.sin(time * 27) : 0);
      // 树和石头的外观随地表一起淡变，脚底位置不跳动。
      if (mix > 0 && mix < 1 && (prop.kind === 'pine' || prop.kind === 'rock')) {
        ctx.globalAlpha = 1 - mix;
        TerrainArt.draw(ctx, prop, from, from === 'bamboo' ? gust : 0);
        ctx.globalAlpha = mix;
        TerrainArt.draw(ctx, prop, id, id === 'bamboo' ? gust : 0);
        ctx.globalAlpha = 1;
      } else TerrainArt.draw(ctx, prop, landscape, lean, lit);
    });
  },

  drawWeather(ctx, w, h, scale, time, scene, reduced) {
    const before = Environment.scenes[scene.from], after = Environment.scenes[scene.id];
    const fadeOut = 1 - scene.mix;
    if (before.weather === after.weather) this.particles(ctx, w, h, scale, time, after.weather, 1, reduced);
    else {
      this.particles(ctx, w, h, scale, time, before.weather, fadeOut, reduced);
      this.particles(ctx, w, h, scale, time, after.weather, scene.mix, reduced);
    }
  },

  particles(ctx, w, h, scale, time, kind, weight, reduced) {
    if (kind === 'clear' || weight <= 0 || reduced) return;
    const count = kind === 'rain' ? 100 : kind === 'snow' ? 78 : 35;
    const wrap = (v, size) => (v % size + size) % size;
    ctx.save(); ctx.globalAlpha = weight * (kind === 'rain' ? 0.40 : 0.69);
    ctx.strokeStyle = kind === 'rain' ? '#a6cade' : '#b6ce86';
    ctx.fillStyle = kind === 'snow' ? '#e5f4ed' : '#b6ce86';
    ctx.lineWidth = Math.max(1, scale * 0.82);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const speed = 0.48 + Terrain.hash(i, 4, 2) * 0.9;
      const x0 = Terrain.hash(i, 4, 3) * w, y0 = Terrain.hash(i, 4, 4) * h;
      const vx = kind === 'wind' ? 142 : kind === 'rain' ? 82 : 29;
      const vy = kind === 'wind' ? 12 : kind === 'rain' ? 520 : 47;
      const x = wrap(x0 + time * vx * scale * speed + (kind === 'rain' ? 0 : Math.sin(i + time * 2.4) * scale * 12), w);
      const y = wrap(y0 + time * vy * scale * speed, h);
      if (kind === 'snow') {
        const r = (0.85 + speed * 1.25) * scale;
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
      } else {
        const dx = (kind === 'rain' ? 3.5 : 12) * scale * speed;
        ctx.moveTo(x, y); ctx.lineTo(x + dx, y + (kind === 'rain' ? 19 : 3) * scale * speed);
      }
    }
    if (kind === 'snow') ctx.fill(); else ctx.stroke();
    ctx.restore();
  },
};
