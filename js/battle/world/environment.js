'use strict';
// 地图各自定义地貌、灯、机关、天气与出没的鬼怪。重访同一地图使用同一布局。
const Environment = {
  scenes: {
    dusk: { name: '松灯古道', ground: '#44483a', shade: [33, 28, 41], weather: 'clear', darkness: 0.75,
      seed: 0, solids: ['pine', 'rock'], decor: 'waystone', lamp: 'lantern', landmark: 'supplyBox',
      opening: { shade: 1 }, enemies: { shade: 4, paperChild: 1 } },
    night: { name: '月下松林', ground: '#293b38', shade: [9, 25, 35], weather: 'mist', darkness: 0.98,
      seed: 31, solids: ['pine', 'graveStele'], decor: 'graveOffering', lamp: 'ghostLamp', landmark: 'wardBell',
      enemies: { shade: 5, paperChild: 2, moth: 1 }, late: { shade: 3, spitter: 1, wraith: 4, golem: 0.5 },
      boss: { t: 240, variant: 'nightmare', tier: 0 } },
    bamboo: { name: '风过竹径', ground: '#304637', shade: [11, 27, 22], weather: 'wind', darkness: 0.86, sound: 'bambooPass',
      seed: 67, solids: ['bamboo', 'bambooFence'], decor: 'reeds', lamp: 'paperLamp', landmark: 'paperWard',
      enemies: { shade: 3, jiangshi: 2, paperChild: 2 }, late: { jiangshi: 4, moth: 3, paperChild: 1, spitter: 1 } },
    rain: { name: '雨落石庭', ground: '#364450', shade: [22, 22, 35], weather: 'rain', darkness: 0.96, sound: 'rainPass',
      seed: 97, solids: ['courtyardGate', 'stoneScreen'], decor: 'puddle', lamp: 'weddingLamp', landmark: 'starSigil',
      enemies: { shade: 4, umbrellaGhost: 2, bride: 1, swarm: 0.18 }, late: { umbrellaGhost: 4, bride: 3, spitter: 2, swarm: 0.25 },
      boss: { t: 720, variant: 'bridalQueen', tier: 2 } },
    snow: { name: '霜封山径', ground: '#687d7d', shade: [21, 38, 51], weather: 'snow', darkness: 0.83, sound: 'snowPass',
      seed: 127, solids: ['snowPine', 'snowRock'], decor: 'snowDrift', lamp: 'brazier', landmark: 'warmingShrine',
      enemies: { shade: 4, snowEnvoy: 2, brute: 0.75 }, late: { snowEnvoy: 4, brute: 3, golem: 1.3, wraith: 1 },
      boss: { t: 480, variant: 'coffinKing', tier: 1 } },
    dawn: { name: '天光破晓', ground: '#6e684a', shade: [65, 52, 41], weather: 'clear', darkness: 0.16,
      seed: 163, solids: ['pine', 'graveStele'], decor: 'waystone', lamp: 'dawnLamp', landmark: 'dawnAltar',
      enemies: { jiangshi: 3, brute: 4, wraith: 3, golem: 1.5 } },
  },
  route: [[0, 'dusk'], [26, 'night'], [55, 'bamboo'], [105, 'rain'], [177, 'snow'],
    [228, 'night'], [310, 'rain'], [376, 'bamboo'], [445, 'snow'], [545, 'night'], [638, 'rain'], [810, 'dawn']],
  lights: {
    lantern: { name: '石灯', color: '#ffd282', radius: 118, height: 19, strength: 0.88 },
    brazier: { name: '火盆', color: '#ff9b58', radius: 161, height: 13, strength: 0.93 },
    paperLamp: { name: '纸灯笼', color: '#ffb3a0', radius: 103, height: 33, strength: 0.87 },
    ghostLamp: { name: '幽冥灯', color: '#86d7d0', radius: 124, height: 23, strength: 0.9 },
    weddingLamp: { name: '喜灯', color: '#ff777c', radius: 133, height: 33, strength: 0.92 },
    dawnLamp: { name: '晨灯', color: '#ffe0a0', radius: 143, height: 20, strength: 0.88 },
  },

  transition(id, from, since, time, duration = 5) {
    const t = id === from ? 1 : U.clamp((time - since) / duration, 0, 1);
    return { id, from, since, mix: t * t * (3 - 2 * t) };
  },

  sceneAt(time) {
    let index = this.route.length - 1;
    while (index > 0 && time < this.route[index][0]) index--;
    const [since, id] = this.route[index];
    const from = this.route[Math.max(0, index - 1)][1];
    return this.transition(id, from, since, time, id === 'dawn' ? 12 : 5);
  },

  forBattle(g) {
    const arena = g.boss?.arena;
    if (arena) return this.transition(arena.id, arena.from, g.boss.arrivedAt, g.time);
    const scheduled = this.sceneAt(g.time);
    // 门关着直到 Boss 倒下。若轮到新地图，破晓余光期间平滑接回路线。
    if (g.lastBossArena && g.time - g.bossClearAt < 5 && g.lastBossArena !== this.landscape(scheduled)) {
      return this.transition(this.landscape(scheduled), g.lastBossArena, g.bossClearAt, g.time);
    }
    return scheduled;
  },

  landscape(scene) { return scene.mix < 0.5 ? scene.from : scene.id; },

  enemyPoolAt(time, roll = Math.random(), scene = this.sceneAt(time)) {
    const map = this.scenes[roll < scene.mix ? scene.id : scene.from];
    if (time < 12 && map.opening) return map.opening;
    return time >= 360 && map.late ? map.late : map.enemies;
  },
};
