'use strict';
// 地图以固定种子生成区块，重访或缓存淘汰后位置不变。
const Terrain = {
  size: 320,
  maxR: 26,
  cache: new Map(),
  // 起点有手工安排的地标，中央留出完整的活动空间。
  origin: {
    '-1:-1': { x: -154, y: -130, kind: 'rock', r: 26 },
    '0:-1': { x: 152, y: -116, kind: 'pine', r: 19 },
    '-1:0': { x: -160, y: 126, kind: 'pine', r: 19 },
    '0:0': { x: 166, y: 142, kind: 'rock', r: 26 },
  },

  hash(x, y, salt) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(salt, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },

  chunk(cx, cy, scene = 'dusk') {
    const cell = cx + ':' + cy, key = `${scene}:${cell}`;
    const saved = this.cache.get(key);
    if (saved) return saved;

    const map = Environment.scenes[scene];
    const roll = salt => this.hash(cx, cy, salt + map.seed);
    const x0 = cx * this.size, y0 = cy * this.size;
    const tall = roll(3) < 0.47;
    const solid = (scene === 'dusk' && this.origin[cell]) || {
      x: x0 + 118 + roll(1) * 94,
      y: y0 + 110 + roll(2) * 100,
      kind: map.solids[tall ? 0 : 1], r: tall ? 19 : 26,
    };

    const props = [solid];
    const flip = roll(4) < 0.5;
    props.push({
      x: x0 + (flip ? 56 : 257) + (roll(6) - 0.5) * 44,
      y: y0 + 48 + roll(7) * 64, kind: map.decor,
    });
    props.push({
      x: x0 + (flip ? 252 : 66) + (roll(8) - 0.5) * 44,
      y: y0 + 235 + roll(9) * 52, kind: roll(5) < 0.52 ? map.lamp : 'slabs',
    });
    if (cell === '0:0') props.push({ x: 78, y: 103, kind: map.lamp });
    if (cell === '-1:-1') props.push({ x: -96, y: -70, kind: map.lamp });
    if (cell === '0:-1') props.push({ x: 52, y: -91, kind: map.lamp });
    if (cell === '0:-1' && scene === 'dusk') props.push({ x: 117, y: -52, kind: map.landmark });
    else if (cell === '0:0' && scene !== 'dusk') props.push({ x: 119 + roll(12) * 71, y: 49, kind: map.landmark });
    else if (!this.origin[cell] && roll(11) < 0.62) {
      props.push({ x: x0 + 88 + roll(12) * 143, y: y0 + 25, kind: map.landmark });
    }

    const chunk = { solid, props };
    if (this.cache.size >= 192) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, chunk);
    return chunk;
  },

  forEachProp(left, top, right, bottom, visit, scene) {
    for (let cy = Math.floor(top / this.size); cy <= Math.floor(bottom / this.size); cy++) {
      for (let cx = Math.floor(left / this.size); cx <= Math.floor(right / this.size); cx++) {
        for (const o of this.chunk(cx, cy, scene).props) {
          if (o.x >= left && o.x <= right && o.y >= top && o.y <= bottom) visit(o);
        }
      }
    }
  },

  obstacleAt(x, y, r, scene) {
    const pad = r + this.maxR;
    for (let cy = Math.floor((y - pad) / this.size); cy <= Math.floor((y + pad) / this.size); cy++) {
      for (let cx = Math.floor((x - pad) / this.size); cx <= Math.floor((x + pad) / this.size); cx++) {
        const o = this.chunk(cx, cy, scene).solid;
        if ((x - o.x) ** 2 + (y - o.y) ** 2 < (r + o.r) ** 2) return o;
      }
    }
    return null;
  },

  // 圆形脚底碰撞；玩家沿边滑动，普通夜兽在正面受阻时主动往侧边绕。
  move(body, dx, dy, r, steer = 0, scene) {
    const steps = Math.ceil(Math.hypot(dx, dy) / 20);
    if (steps > 1) {
      for (let i = 0; i < steps; i++) this.move(body, dx / steps, dy / steps, r, steer, scene);
      return;
    }
    const x = body.x + dx, y = body.y + dy;
    const o = this.obstacleAt(x, y, r, scene);
    if (!o) { body.x = x; body.y = y; return; }

    const ox = x - o.x, oy = y - o.y, d = Math.hypot(ox, oy);
    const nx = d ? ox / d : 1, ny = d ? oy / d : 0;
    const radius = r + o.r + 0.05;
    let slide = 0;
    if (steer) {
      const tangent = dy * nx - dx * ny;
      slide = Math.max(0, Math.hypot(dx, dy) * 0.72 - Math.abs(tangent)) * (Math.sign(tangent) || steer);
    }
    body.x = o.x + nx * radius - ny * slide;
    body.y = o.y + ny * radius + nx * slide;
  },
};
