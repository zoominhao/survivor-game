'use strict';
// 接近石灯有暖光，雨雪和风独立绘制，不遮挡战斗提示或改变移动速度。
const EnvironmentArt = {
  groundTiles: {},
  lightMasks: new Map(),
  closeLight: { radius: 61, strength: 0.97 },
  carriedLantern: { radius: 125, strength: 0.95 },
  partnerLight: { radius: 69, strength: 0.88, color: '#a8dfd1' },

  afterglow(age, duration) {
    if (age < 0 || age >= duration) return 0;
    const k = Math.min(age / 0.32, (duration - age) / 1.6, 1);
    return k * k * (3 - 2 * k);
  },

  ground(ctx, id) {
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
    const weather = Environment.scenes[id].weather;
    if (weather === 'rain' || weather === 'storm') this.paving(c);
    else this.scuffs(c, weather === 'snow' || weather === 'blizzard');
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

  drawField(ctx, render, g, left, top, right, bottom, map) {
    ctx.fillStyle = this.ground(ctx, map);
    ctx.fillRect(left, top, right - left, bottom - top);
    const reduced = render.reduceMotion?.matches, time = g.time;
    const lights = [];
    let hint = null, hintDist = 122;
    // 包括画面外一段距离，边缘的光池不会随着物件出入画面突然消失。
    Terrain.forEachProp(left - 185, top - 185, right + 185, bottom + 185, prop => {
      const key = WorldInteractions.key(prop, map);
      const light = Environment.lights[prop.kind];
      const lit = !!light && g.environment.lit.has(key);
      const landmark = WorldInteractions.landmarks[prop.kind];
      const remaining = landmark ? Math.max(0, (g.environment.landmarkReady.get(key) ?? 0) - time) : 0;
      if (lit) lights.push({ x: prop.x, y: prop.y - light.height, light, weight: 1 });
      else if ((light || landmark) && g.state === 'playing') {
        const d = Math.hypot(g.player.x - prop.x, g.player.y - prop.y);
        if (d < hintDist && (!remaining || d < 52)) {
          const text = light ? `靠近点亮${light.name}` : !remaining ? landmark.prompt :
            Number.isFinite(remaining) ? `${landmark.status} ${Math.ceil(remaining)}秒` : landmark.status;
          hint = { prop, text, used: !!remaining }; hintDist = d;
        }
      }
      if (prop.x < left - 94 || prop.x > right + 94 || prop.y < top - 94 || prop.y > bottom + 94) return;
      let lean = 0;
      if (!reduced && (prop.kind === 'bamboo' || prop.kind === 'reeds')) {
        const rustle = Math.max(0, (g.environment.reeds.get(key) || 0) - time);
        lean = 0.067 * Math.sin(time * 5 + prop.y * 0.02) + rustle * 0.35 * Math.sin(time * 27);
      }
      TerrainArt.draw(ctx, prop, lean, lit || (!!landmark && remaining === 0));
    }, map);
    return { lights, hint };
  },

  // 夜色覆盖地形与怪物，角色光束和已点亮的场景灯在同一层开出视野。
  drawLighting(ctx, render, lights, darkness, shade, player, beams) {
    const { W: w, H: h, s } = render;
    const { e, f } = ctx.getTransform();
    if (!this.shade) this.shade = document.createElement('canvas');
    if (this.shade.width !== w || this.shade.height !== h) {
      this.shade.width = w; this.shade.height = h;
    }
    const layer = this.shade.getContext('2d');
    layer.clearRect(0, 0, w, h);
    // 留一层环境微光，没点灯也能辨认道路和怪物轮廓。
    layer.fillStyle = shade; layer.globalAlpha = 0.70 * Math.min(1, darkness / 0.86); layer.fillRect(0, 0, w, h);
    layer.fillStyle = render.dark; layer.globalAlpha = darkness * 0.34; layer.fillRect(0, 0, w, h);
    layer.globalAlpha = 1;
    layer.globalCompositeOperation = 'destination-out';
    for (const { x, y, light, weight } of lights) {
      layer.globalAlpha = weight;
      this.reveal(layer, light, x * s + e, y * s + f, s);
    }
    layer.globalAlpha = 1;
    const hasBeam = beams.some(ray => ray.member === player);
    const near = hasBeam ? this.closeLight : this.carriedLantern;
    this.reveal(layer, near, (player.x + (hasBeam ? 0 : 10 * player.face)) * s + e, player.y * s + f, s);
    if (beams.length) {
      layer.save(); layer.setTransform(s, 0, 0, s, e, f);
      for (const ray of beams) ray.draw(layer, ray.member, ray.pose, true);
      layer.restore();
    }
    layer.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.shade, 0, 0); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (const { x, y, light, weight } of lights) {
      ctx.globalAlpha = (0.18 + darkness * 0.16) * weight;
      render.drawGlow(ctx, light.color, x, y, light.radius * 0.73);
    }
    ctx.restore();
  },

  reveal(layer, light, x, y, scale) {
    const r = light.radius * scale;
    layer.drawImage(this.lightMask(light), x - r, y - r, r * 2, r * 2);
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
    const { prop, text, used } = hint;
    ctx.save(); ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = '#111b22'; ctx.fillStyle = used ? '#a8ada6' : '#f5ddb1';
    ctx.strokeText(text, prop.x, prop.y + 22); ctx.fillText(text, prop.x, prop.y + 22);
    ctx.restore();
  },

  particles(ctx, w, h, scale, time, kind, weight, reduced) {
    if (kind === 'clear' || weight <= 0 || reduced) return;
    if (kind === 'storm') {
      const strength = Environment.stormFlash(time);
      if (strength > 0) {
        ctx.save(); ctx.globalAlpha = strength * weight * 0.21;
        ctx.fillStyle = '#b7d0ff'; ctx.fillRect(0, 0, w, h);
        const x = w * (0.16 + Terrain.hash(Environment.stormCycle(time), 6, 32) * 0.67);
        ctx.globalAlpha = strength * weight * 0.85;
        ctx.strokeStyle = '#dceaff'; ctx.lineWidth = Math.max(1, scale * 1.4);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - w * 0.07, h * 0.16);
        ctx.lineTo(x - w * 0.02, h * 0.14); ctx.lineTo(x - w * 0.095, h * 0.31); ctx.stroke(); ctx.restore();
      }
    }
    if (kind === 'mist' || kind === 'thickMist') {
      if (!this.mistSprite) {
        const tile = document.createElement('canvas');
        tile.width = tile.height = 128;
        const c = tile.getContext('2d'), fog = c.createRadialGradient(64, 64, 2, 64, 64, 64);
        fog.addColorStop(0, '#a9cabf'); fog.addColorStop(1, '#a9cabf00');
        c.fillStyle = fog; c.fillRect(0, 0, 128, 128);
        this.mistSprite = tile;
      }
      ctx.save(); ctx.globalAlpha = weight * (kind === 'thickMist' ? 0.21 : 0.12);
      for (let i = 0; i < 5; i++) {
        const x = (Terrain.hash(i, 4, 5) * (w + 260) + time * (6 + i)) % (w + 260) - 130;
        const y = h * (0.15 + i * 0.17);
        ctx.drawImage(this.mistSprite, x - 182 * scale, y - 21 * scale, 364 * scale, 42 * scale);
      }
      ctx.restore();
      return;
    }
    const rain = kind === 'rain' || kind === 'storm', snow = kind === 'snow' || kind === 'blizzard';
    const count = kind === 'storm' ? 126 : rain ? 100 : kind === 'blizzard' ? 105 : snow ? 78 : 35;
    const wrap = (v, size) => (v % size + size) % size;
    ctx.save(); ctx.globalAlpha = weight * (rain ? 0.40 : 0.69);
    ctx.strokeStyle = rain ? '#a6cade' : '#b6ce86';
    ctx.fillStyle = snow ? '#e5f4ed' : '#b6ce86';
    ctx.lineWidth = Math.max(1, scale * 0.82);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const speed = 0.48 + Terrain.hash(i, 4, 2) * 0.9;
      const x0 = Terrain.hash(i, 4, 3) * w, y0 = Terrain.hash(i, 4, 4) * h;
      const vx = kind === 'storm' ? 190 : kind === 'wind' || kind === 'blizzard' ? 142 : rain ? 82 : 29;
      const vy = rain ? 520 : kind === 'wind' ? 12 : 47;
      const x = wrap(x0 + time * vx * scale * speed + (rain ? 0 : Math.sin(i + time * 2.4) * scale * 12), w);
      const y = wrap(y0 + time * vy * scale * speed, h);
      if (snow) {
        const r = (0.85 + speed * 1.25) * scale;
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
      } else {
        const dx = (kind === 'storm' ? 8 : rain ? 3.5 : 12) * scale * speed;
        ctx.moveTo(x, y); ctx.lineTo(x + dx, y + (rain ? 19 : 3) * scale * speed);
      }
    }
    if (snow) ctx.fill(); else ctx.stroke();
    ctx.restore();
  },
};
