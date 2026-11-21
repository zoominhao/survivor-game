'use strict';
// 地图各自定义地貌、灯、机关、天气与出没的鬼怪。重访同一地图使用同一布局。
const STAGES = {
  dusk: { cost: 0, icon: 'lantern', desc: '暮色古道 · 石灯回血，木匣补给。' },
  night: { cost: 100, icon: 'moon', desc: '月下薄雾 · 幽冥灯和镇魂钟，黑无常出没。',
    arrival: { scene: 'night', kind: 'arrival', enemy: 'paperChild', msg: '松影里走出一个纸扎童子', sound: 'paperChildArrival' } },
  bamboo: { cost: 120, icon: 'bambooRoute', desc: '穿竹冷风 · 靠镇纸符减速跳僵合围。',
    arrival: { scene: 'bamboo', kind: 'arrival', enemy: 'jiangshi', msg: '竹篱后传来一声闷响', sound: 'corpseAmbush' } },
  rain: { cost: 140, icon: 'rainRoute', desc: '冷雨石庭 · 红喜灯、引星符阵和油纸伞鬼。',
    arrival: { scene: 'rain', kind: 'arrival', enemy: 'umbrellaGhost', msg: '雨幕里撑起一把油纸伞', sound: 'umbrellaOpen' } },
  snow: { cost: 160, icon: 'winter', desc: '山间落雪 · 火盆照路，取暖龛可回血。',
    arrival: { scene: 'snow', kind: 'arrival', enemy: 'snowEnvoy', msg: '雪地现出一道白影', sound: 'envoyCall' } },
  dawn: { cost: 160, icon: 'dawn', desc: '荒草残碑 · 香台可短暂无敌，镇墓石兽游荡。',
    arrival: { scene: 'dawn', kind: 'arrival', enemy: 'brute', msg: '残碑旁的石兽睁开了眼', sound: 'siegeArrival' } },
  storm: { cost: 180, icon: 'thunder', desc: '雷雨交加 · 祠门与积水间，借镇魂钟挡住画皮妖。',
    arrival: { scene: 'storm', kind: 'arrival', enemy: 'spitter', msg: '雷光照见祠门后的一张人皮', sound: 'stormThunder' } },
  blizzard: { cost: 200, icon: 'winter', desc: '横风飞雪 · 围墙和雪石之间，靠暖龛补血。',
    arrival: { scene: 'blizzard', kind: 'arrival', enemy: 'snowEnvoy', msg: '风雪里响起一段铁链声', sound: 'envoyCall' } },
  burial: { cost: 220, icon: 'mist', desc: '浓雾压院 · 灯影照着供桌，纸童与跳僵成群。',
    arrival: { scene: 'burial', kind: 'arrival', enemy: 'paperChild', msg: '供桌底下传来纸张撕裂的声音', sound: 'paperChildArrival' } },
};
const DEFAULT_STAGE = 'dusk';

const Environment = {
  scenes: {
    dusk: { name: '松灯古道', ground: '#44483a', shade: [33, 28, 41], weather: 'clear', darkness: 0.75,
      seed: 0, solids: ['pine', 'rock'], decor: 'waystone', lamp: 'lantern', landmark: 'supplyBox',
      opening: { shade: 1 }, enemies: { shade: 4, paperChild: 1, moth: 0.7, spitter: 0.45 },
      late: { shade: 3, paperChild: 2, jiangshi: 2, brute: 1, spitter: 1 } },
    night: { name: '月下松林', ground: '#293b38', shade: [9, 25, 35], weather: 'mist', darkness: 0.98,
      seed: 31, solids: ['pine', 'graveStele'], decor: 'graveOffering', lamp: 'ghostLamp', landmark: 'wardBell',
      enemies: { shade: 5, paperChild: 2, moth: 1 }, late: { shade: 3, spitter: 1, wraith: 4, golem: 0.5 },
      boss: { t: 240, variant: 'nightmare', tier: 0 } },
    bamboo: { name: '风过竹径', ground: '#304637', shade: [11, 27, 22], weather: 'wind', darkness: 0.86, sound: 'bambooPass',
      seed: 67, solids: ['bamboo', 'bambooFence'], decor: 'reeds', lamp: 'paperLamp', landmark: 'paperWard',
      enemies: { shade: 3, jiangshi: 2, paperChild: 2 }, late: { jiangshi: 4, moth: 3, paperChild: 1, spitter: 1 } },
    rain: { name: '雨落石庭', ground: '#364450', shade: [22, 22, 35], weather: 'rain', darkness: 0.96, sound: 'rainPass',
      seed: 97, solids: ['courtyardGate', 'stoneScreen'], decor: 'puddle', lamp: 'weddingLamp', landmark: 'starSigil',
      opening: { shade: 4, umbrellaGhost: 1 }, enemies: { shade: 4, umbrellaGhost: 2, bride: 1, swarm: 0.18 }, late: { umbrellaGhost: 4, bride: 3, spitter: 2, swarm: 0.25 },
      boss: { t: 720, variant: 'bridalQueen', tier: 2 } },
    snow: { name: '霜封山径', ground: '#687d7d', shade: [21, 38, 51], weather: 'snow', darkness: 0.83, sound: 'snowPass',
      seed: 127, solids: ['snowPine', 'snowRock'], decor: 'snowDrift', lamp: 'brazier', landmark: 'warmingShrine',
      opening: { shade: 4, snowEnvoy: 1 }, enemies: { shade: 4, snowEnvoy: 2, brute: 0.75 }, late: { snowEnvoy: 4, brute: 3, golem: 1.3, wraith: 1 },
      boss: { t: 480, variant: 'coffinKing', tier: 1 } },
    dawn: { name: '残碑古道', ground: '#555145', shade: [47, 42, 33], weather: 'clear', darkness: 0.72,
      seed: 163, solids: ['pine', 'graveStele'], decor: 'waystone', lamp: 'dawnLamp', landmark: 'dawnAltar',
      opening: { shade: 3, brute: 1 }, enemies: { jiangshi: 3, brute: 4, wraith: 3, golem: 1.5 } },
    storm: { name: '雷雨荒祠', ground: '#424752', shade: [20, 28, 44], weather: 'storm', music: 'rain', darkness: 0.93,
      seed: 197, solids: ['courtyardGate', 'graveStele'], decor: 'puddle', lamp: 'ghostLamp', landmark: 'wardBell',
      opening: { shade: 4, spitter: 1 }, enemies: { shade: 3, spitter: 3, moth: 2 }, late: { spitter: 4, golem: 2, wraith: 3 } },
    blizzard: { name: '飞雪驿道', ground: '#829095', shade: [21, 39, 56], weather: 'blizzard', music: 'snow', darkness: 0.87,
      seed: 223, solids: ['snowRock', 'stoneScreen'], decor: 'snowDrift', lamp: 'brazier', landmark: 'warmingShrine',
      opening: { shade: 4, snowEnvoy: 1 }, enemies: { snowEnvoy: 4, shade: 3, jiangshi: 2 }, late: { snowEnvoy: 5, brute: 4, wraith: 2 } },
    burial: { name: '雾锁义庄', ground: '#445849', shade: [18, 32, 29], weather: 'thickMist', music: 'night', darkness: 0.92,
      seed: 251, solids: ['graveStele', 'bambooFence'], decor: 'graveOffering', lamp: 'paperLamp', landmark: 'paperWard',
      opening: { shade: 4, paperChild: 1 }, enemies: { paperChild: 3, jiangshi: 4, shade: 2 }, late: { jiangshi: 5, wraith: 4, paperChild: 1 } },
  },
  lights: {
    lantern: { name: '石灯', color: '#ffd282', radius: 118, height: 19, strength: 0.88 },
    brazier: { name: '火盆', color: '#ff9b58', radius: 161, height: 13, strength: 0.93 },
    paperLamp: { name: '纸灯笼', color: '#ffb3a0', radius: 103, height: 33, strength: 0.87 },
    ghostLamp: { name: '幽冥灯', color: '#86d7d0', radius: 124, height: 23, strength: 0.9 },
    weddingLamp: { name: '喜灯', color: '#ff777c', radius: 133, height: 33, strength: 0.92 },
    dawnLamp: { name: '晨灯', color: '#ffe0a0', radius: 143, height: 20, strength: 0.88 },
  },

  isStage(id) { return typeof id === 'string' && Object.hasOwn(STAGES, id); },

  canOpen(data, id) { return this.isStage(id) && (!STAGES[id].cost || data?.routes?.[id] === true); },

  ownedStages(data) { return Object.keys(STAGES).filter(id => this.canOpen(data, id)); },

  stagePool(data) {
    const owned = this.ownedStages(data);
    const preferred = Array.isArray(data?.stageSelection) ? owned.filter(id => data.stageSelection.includes(id)) : [];
    return preferred.length ? preferred : owned;
  },

  sharedStages(local, peer) {
    const shared = local.filter(id => this.isStage(id) && peer.includes(id));
    return shared.length ? shared : [DEFAULT_STAGE];
  },

  pickStage(pool, rng = Math.random) { return pool.length > 1 ? pool[Math.floor(rng() * pool.length)] : pool[0] ?? DEFAULT_STAGE; },

  forBattle(g) { return { id: this.isStage(g.stage) ? g.stage : DEFAULT_STAGE }; },

  dawnlight(time, duration = CFG.RUN_TIME) {
    const lead = Math.min(90, duration / 10);
    return U.clamp((time - (duration - lead)) / (lead * 2 / 3), 0, 1);
  },

  stormCycle(time) { return Math.floor((time - 7) / 18); },
  stormFlash(time) {
    const cycle = this.stormCycle(time);
    return cycle < 0 ? 0 : Math.max(0, 1 - (time - 7 - cycle * 18) / 0.45);
  },

  enemyPoolAt(time, stage = DEFAULT_STAGE) {
    const map = this.scenes[stage];
    if (time < 12 && map.opening) return map.opening;
    return time >= 360 && map.late ? map.late : map.enemies;
  },
};
