'use strict';
// 接近石灯有暖光，雨雪和风独立绘制，不遮挡战斗提示或改变移动速度。
const EnvironmentArt = {
  groundTiles: {},
  lightMasks: new Map(),

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
    const lights = [];
    let hint = null, hintDist = 122;
    // 包括画面外一段距离，边缘的光池不会随着物件出入画面突然消失。
    Terrain.forEachProp(left - 172, top - 172, right + 172, bottom + 172, prop => {
      const key = Environment.key(prop);
      const light = Object.hasOwn(Environment.lights, prop.kind) ? Environment.lights[prop.kind] : null;
      const lit = !!light && g.environment.lit.has(key);
      const rustle = Math.max(0, (g.environment.reeds.get(key) || 0) - time);
      if (lit) lights.push({ x: prop.x, y: prop.y - light.height, light });
      else if (light && g.state === 'playing') {
        const d = Math.hypot(g.player.x - prop.x, g.player.y - prop.y);
        if (d < hintDist) { hint = { prop, light }; hintDist = d; }
      }
      if (prop.x < left - 94 || prop.x > right + 94 || prop.y < top - 94 || prop.y > bottom + 94) return;
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
    return { lights, hint };
  },

  // 在独立夜色层开出柔边光池，露出原有地表纹理，不洗掉角色、伤害字或预警。
  drawLighting(ctx, render, lights, darkness) {
    const { W: w, H: h, s } = render;
    const { e, f } = ctx.getTransform();
    if (!this.shade) this.shade = document.createElement('canvas');
    if (this.shade.width !== w || this.shade.height !== h) {
      this.shade.width = w; this.shade.height = h;
    }
    const layer = this.shade.getContext('2d');
    layer.clearRect(0, 0, w, h);
    layer.fillStyle = '#060d1b'; layer.globalAlpha = darkness * 0.38; layer.fillRect(0, 0, w, h);
    layer.fillStyle = render.dark; layer.globalAlpha = darkness * 0.88; layer.fillRect(0, 0, w, h);
    layer.globalAlpha = 1;
    layer.globalCompositeOperation = 'destination-out';
    for (const { x, y, light } of lights) {
      const cx = x * s + e, cy = y * s + f, r = light.radius * s;
      layer.drawImage(this.lightMask(light), cx - r, cy - r, r * 2, r * 2);
    }
    layer.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.shade, 0, 0); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.18 + darkness * 0.16;
    for (const { x, y, light } of lights) render.drawGlow(ctx, light.color, x, y, light.radius * 0.73);
    ctx.restore();
  },

  lightMask(light) {
    let mask = this.lightMasks.get(light);
    if (!mask) {
      const r = light.radius;
      mask = document.createElement('canvas'); mask.width = mask.height = r * 2;
      const c = mask.getContext('2d'), cut = c.createRadialGradient(r, r, 0, r, r, r);
      cut.addColorStop(0, `rgba(0,0,0,${light.strength})`);
      cut.addColorStop(0.42, `rgba(0,0,0,${light.strength * 0.68})`);
      cut.addColorStop(1, '#0000');
      c.fillStyle = cut; c.fillRect(0, 0, r * 2, r * 2);
      this.lightMasks.set(light, mask);
    }
    return mask;
  },

  drawLightHint(ctx, hint) {
    if (!hint) return;
    const { prop, light } = hint;
    ctx.save(); ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = '#111b22'; ctx.fillStyle = '#f5ddb1';
    const label = `靠近点亮${light.name}`;
    ctx.strokeText(label, prop.x, prop.y + 22); ctx.fillText(label, prop.x, prop.y + 22);
    ctx.restore();
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
