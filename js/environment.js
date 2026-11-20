'use strict';
// 同一片荒原的景色会随本局时间变化，但地标坐标和障碍碰撞始终不变。
const Environment = {
  scenes: {
    dusk: { name: '松灯古道', ground: '#364234', weather: 'clear', darkness: 0.78 },
    night: { name: '月下松林', ground: '#202e28', weather: 'clear', darkness: 1 },
    bamboo: { name: '风过竹径', ground: '#283f31', weather: 'wind', darkness: 0.9 },
    rain: { name: '雨落石庭', ground: '#303e49', weather: 'rain', darkness: 1 },
    snow: { name: '霜封山径', ground: '#5d7479', weather: 'snow', darkness: 0.82 },
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

  createRun() { return { lit: new Set(), healed: new Set(), reeds: new Map() }; },
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
      if (prop.kind === 'reeds' && p.moving && dist <= 24 && !run.reeds.has(key)) {
        run.reeds.set(key, g.time + 0.95);
        g.burst(prop.x, prop.y, '#a3b66c', 5);
        Sfx.play('rustle');
      }
    });
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
