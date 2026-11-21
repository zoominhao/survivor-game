'use strict';

// ----- 敌人：类型键供波次和战斗逻辑使用，名称和造型独立维护 -----
const ENEMIES = {
  shade:   { name: '寿衣鬼', hp: 10, speed: 58, dmg: 6, r: 12, xp: 1, color: '#b7adb9' },
  moth:    { name: '招魂纸鸢', hp: 7, speed: 105, dmg: 4, r: 9, xp: 1, color: '#ead7a3' },
  swarm:   { name: '灯笼小鬼', hp: 5, speed: 88, dmg: 3, r: 7, xp: 1, color: '#e48554' },
  brute:   { name: '镇墓石兽', hp: 70, speed: 38, dmg: 12, r: 20, xp: 6, color: '#9da182', kbRes: 0.7 },
  spitter: { name: '画皮妖', hp: 28, speed: 48, dmg: 6, r: 13, xp: 3, color: '#d7a8a0',
    ranged: true, keep: 210, shotLook: 'maskShard' },
  wraith:  { name: '黑无常', hp: 45, speed: 80, dmg: 9, r: 14, xp: 4, color: '#9aadd9', ghost: true },
  jiangshi: { name: '黄符僵尸', hp: 22, speed: 61, dmg: 8, r: 13, xp: 2, color: '#a1ba8d', hop: 0.9 },
  bride:   { name: '鬼新娘', hp: 44, speed: 56, dmg: 8, r: 15, xp: 4, color: '#e07b77', ghost: true,
    ranged: true, keep: 175, fan: 3, spread: 0.27, shotSpeed: 128, shotCd: 3.4, shotLook: 'weddingPaper' },
  paperChild: { name: '纸扎童子', hp: 12, speed: 76, dmg: 5, r: 11, xp: 1, color: '#d1bc8c', weave: 0.72,
    moveSound: { cue: 'paperChild', period: 1.3, range: 230 } },
  umbrellaGhost: { name: '油纸伞鬼', hp: 35, speed: 62, dmg: 7, r: 15, xp: 4, color: '#83b6c8', ghost: true,
    ranged: true, keep: 156, shotSpeed: 135, shotCd: 2.8, shotLook: 'rainDrop', shotSound: 'umbrellaDrip' },
  snowEnvoy: { name: '白无常', hp: 73, speed: 45, dmg: 12, r: 18, xp: 6, color: '#d0e7ea', kbRes: 0.64,
    moveSound: { cue: 'envoyChain', period: 1.65, range: 260 } },
  golem:   { name: '牛头阴差', hp: 220, speed: 34, dmg: 18, r: 26, xp: 15, color: '#b6936f', kbRes: 0.85 },
  boss:    { name: '夜魇',   hp: 1,   speed: 62,  dmg: 20, r: 44, xp: 0,  color: '#b0305a', kbRes: 1 },
};

// 三只 Boss 的血量(不随时间缩放)
const BOSS_HP = [1600, 6000, 16000];

// 基础刷怪频率按分钟增长；种类由当前地图决定。
const WAVE_RATES = [1, 1.6, 2.2, 2.6, 3, 3.4, 3.8, 4.2, 4.6, 5.5, 6.5, 7.5, 8.5, 10, 12];

// ----- 定时事件:包围圈 / Boss -----
const EVENTS = [
  { t: 16, scene: 'dusk', kind: 'arrival', enemy: 'paperChild', msg: '纸扎童子摇摇晃晃地来了', sound: 'paperChild' },
  { t: 70, scene: 'bamboo', kind: 'ring', enemy: 'jiangshi', n: 10, msg: '黄符僵尸围了上来' },
  { t: 119, scene: 'rain', kind: 'arrival', enemy: 'umbrellaGhost', msg: '雨幕里撑起一把油纸伞', sound: 'umbrellaOpen' },
  { t: 150, scene: 'rain', kind: 'ring', enemy: 'swarm', n: 26 },
  { t: 168, scene: 'rain', kind: 'arrival', enemy: 'bride', msg: '红盖头下，喜帖无声' },
  { t: 193, scene: 'snow', kind: 'arrival', enemy: 'snowEnvoy', msg: '雪地现出一道白影', sound: 'envoyCall' },
  { t: 390, scene: 'bamboo', kind: 'ring', enemy: 'moth', n: 34 },
  { t: 630, scene: 'night', kind: 'ring', enemy: 'wraith', n: 30 },
  { t: 840, scene: 'dawn', kind: 'ring', enemy: 'brute', n: 36, msg: '镇墓石兽合围，最后一分钟' },
  ...Object.entries(Environment.scenes).filter(([, map]) => map.boss)
    .map(([scene, map]) => ({ kind: 'boss', scene, ...map.boss })),
].sort((a, b) => a.t - b.t);
