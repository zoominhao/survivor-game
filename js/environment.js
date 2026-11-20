'use strict';
// 同一片荒原的景色会随本局时间变化，但地标坐标和障碍碰撞始终不变。
const Environment = {
  scenes: {
    dusk: { name: '松灯古道', ground: '#364234', weather: 'clear', darkness: 0.78 },
    night: { name: '月下松林', ground: '#202e28', weather: 'clear', darkness: 1 },
    bamboo: { name: '风过竹径', ground: '#283f31', weather: 'wind', darkness: 0.9, sound: 'bambooPass' },
    rain: { name: '雨落石庭', ground: '#303e49', weather: 'rain', darkness: 1, sound: 'rainPass' },
    snow: { name: '霜封山径', ground: '#5d7479', weather: 'snow', darkness: 0.82, sound: 'snowPass' },
    dawn: { name: '天光破晓', ground: '#6c6345', weather: 'clear', darkness: 0.19 },
  },
  route: [[0, 'dusk'], [26, 'night'], [55, 'bamboo'], [105, 'rain'], [177, 'snow'],
    [255, 'night'], [310, 'rain'], [376, 'bamboo'], [445, 'snow'], [517, 'night'],
    [572, 'bamboo'], [638, 'rain'], [710, 'snow'], [780, 'night'], [810, 'dawn']],
  lights: {
    lantern: { name: '石灯', color: '#ffd282', radius: 118, height: 19, strength: 0.88 },
    brazier: { name: '火盆', color: '#ff9b58', radius: 161, height: 13, strength: 0.93 },
    paperLamp: { name: '纸灯笼', color: '#ffb3a0', radius: 103, height: 33, strength: 0.87 },
  },
  sceneLights: {
    bamboo: { lantern: 'paperLamp', brazier: 'lantern' },
    rain: { paperLamp: 'lantern', brazier: 'lantern' },
    snow: { paperLamp: 'brazier', lantern: 'brazier' },
  },
  sceneEnemies: {
    dusk: { paperChild: 1 },
    night: { jiangshi: 3, paperChild: 1 },
    bamboo: { paperChild: 2, jiangshi: 3 },
    rain: { umbrellaGhost: 3, bride: 2 },
    snow: { snowEnvoy: 1 },
    dawn: { snowEnvoy: 2, jiangshi: 1 },
  },
  landmarks: {
    wardBell: { name: '镇魂钟', prompt: '靠近撞钟 · 震退夜兽', status: '钟声冷却', cd: 35, radius: 155, color: '#ffe1a0', sound: 'wardBell' },
    starSigil: { name: '引星符阵', prompt: '靠近引星 · 吸取经验', status: '符阵充能', cd: 24, radius: 285, color: '#b8e5d2', sound: 'sigilGather' },
    supplyBox: { name: '补给木匣', prompt: '靠近开匣 · 金币与经验', status: '木匣已开', cd: Infinity, coins: 5, xp: 4, color: '#f1bd7c', sound: 'chest' },
  },

  sceneAt(time) {
    let index = this.route.length - 1;
    while (index > 0 && time < this.route[index][0]) index--;
    const [since, id] = this.route[index];
    const from = this.route[Math.max(0, index - 1)][1];
    const t = index === 0 ? 1 : U.clamp((time - since) / (id === 'dawn' ? 90 : 5), 0, 1);
    return { id, from, since, mix: t * t * (3 - 2 * t) };
  },

  lightKind(kind, sceneId) { return this.sceneLights[sceneId]?.[kind] || kind; },

  // 换景时逐渐替换新刷怪的组合，原本的怪潮密度和场上敌人不变。
  enemyPoolAt(time, roll = Math.random()) {
    if (time < 12 || roll >= (time < 60 ? 0.22 : 0.42)) return null;
    const scene = this.sceneAt(time);
    const localRoll = roll / (time < 60 ? 0.22 : 0.42);
    return this.sceneEnemies[localRoll < scene.mix ? scene.id : scene.from];
  },

  createRun() { return { lit: new Set(), healed: new Set(), reeds: new Map(), landmarkReady: new Map() }; },
  key(prop) { return `${prop.x}:${prop.y}`; },

  // 交互由走位触发，手机不用增加按钮；点亮、治疗分别记录，满血不会浪费治疗。
  step(g) {
    const p = g.player, run = g.environment;
    const scene = this.sceneAt(g.time), landscape = scene.mix < 0.5 ? scene.from : scene.id;
    for (const [key, end] of run.reeds) if (end <= g.time) run.reeds.delete(key);
    const reach = 42;
    Terrain.forEachProp(p.x - reach, p.y - reach, p.x + reach, p.y + reach, prop => {
      const dist = Math.hypot(p.x - prop.x, p.y - prop.y), key = this.key(prop);
      if (Object.hasOwn(this.lights, prop.kind) && dist <= 36) this.visitLight(g, prop, key, this.lightKind(prop.kind, landscape));
      if (Object.hasOwn(this.landmarks, prop.kind) && dist <= 34) this.visitLandmark(g, prop, key);
      if (prop.kind === 'reeds' && p.moving && dist <= 24 && !run.reeds.has(key)) {
        run.reeds.set(key, g.time + 0.95);
        g.burst(prop.x, prop.y, '#a3b66c', 5);
        Sfx.play('rustle');
      }
    });
  },

  visitLandmark(g, prop, key) {
    const ready = g.environment.landmarkReady;
    if ((ready.get(key) ?? 0) > g.time) return;
    const def = this.landmarks[prop.kind];
    let message = def.name;
    if (prop.kind === 'wardBell') {
      let hit = false;
      g.eachEnemyNear(prop.x, prop.y, def.radius, e => {
        const dx = e.x - prop.x, dy = e.y - prop.y, d = Math.hypot(dx, dy) || 1;
        const push = (1 - e.kbRes) * 385;
        e.kx += dx / d * push; e.ky += dy / d * push;
        g.slowEnemy(e, 0.48, 2.4);
        hit = true;
      });
      if (!hit) return; // 没有怪时不会浪费冷却。
    } else if (prop.kind === 'starSigil') {
      let gathered = false;
      for (const gem of g.gems) {
        if (gem.mag || (gem.x - prop.x) ** 2 + (gem.y - prop.y) ** 2 > def.radius ** 2) continue;
        gem.mag = true; gathered = true;
      }
      if (!gathered) return;
    } else if (prop.kind === 'supplyBox') {
      const coins = g.player.coins;
      g.player.coins += def.coins * g.player.st.greed;
      g.gainXp(def.xp);
      message = `+${Math.floor(g.player.coins) - Math.floor(coins)} 金币 · +${Number((def.xp * g.player.st.growth).toFixed(1))} 经验`;
    }
    ready.set(key, g.time + def.cd);
    g.texts.push({ x: prop.x, y: prop.y - 24, s: message, life: 0.95, c: def.color });
    g.fx.push({ type: 'boom', x: prop.x, y: prop.y, r: Math.min(150, def.radius ?? 48), life: 0.48, max: 0.48, c: def.color });
    g.burst(prop.x, prop.y, def.color, 8);
    Sfx.play(def.sound);
  },

  visitLight(g, prop, key, kind = prop.kind) {
    const p = g.player, run = g.environment;
    if (!run.lit.has(key)) {
      const light = this.lights[kind];
      run.lit.add(key);
      g.burst(prop.x, prop.y - light.height, light.color, 6);
      Sfx.play('lantern');
    }
    if (kind !== 'lantern') return;
    const heal = Math.min(p.st.maxHp - p.hp, Math.round(p.st.maxHp * 0.12));
    if (heal < 1 || run.healed.has(key)) return;
    run.healed.add(key);
    p.hp += heal;
    g.texts.push({ x: p.x, y: p.y - 27, s: '+' + Math.round(heal), life: 0.8, c: '#a9e8ad' });
    g.fx.push({ type: 'boom', x: prop.x, y: prop.y, r: 42, life: 0.4, max: 0.4, c: '#dbd898' });
    Sfx.play('mango');
  },
};
