'use strict';

// ----- 武器 -----
// base: 1 级面板;ups: 2~max 级每级的增量;evo: 满级 + 持有指定被动后可进化
const WEAPONS = {
  spark: {
    name: '星火弹', color: '#ffd166', kind: 'bolt', max: 6,
    desc: '向最近的敌人射出星火',
    base: { dmg: 10, cd: 1.0, count: 1, pierce: 1, speed: 460, size: 6 },
    ups: [{ count: 1 }, { dmg: 5, pierce: 1 }, { cd: -0.15 }, { count: 1, dmg: 5 }, { dmg: 8, pierce: 1 }],
    evo: { need: 'haste', to: 'starburst' },
  },
  starburst: {
    name: '星爆', color: '#fff3b0', kind: 'bolt', evolved: true, max: 1,
    desc: '连射会爆炸的星弹,同时压制多个目标',
    base: { dmg: 24, cd: 0.55, count: 4, pierce: 2, speed: 560, size: 8, blast: 46, spread: 3 },
  },

  orbit: {
    name: '环绕萤火', color: '#b8f2a0', kind: 'orbit', max: 6,
    desc: '萤火环绕自身旋转,灼伤靠近的敌人',
    base: { dmg: 8, cd: 3.0, count: 2, radius: 78, dur: 3.5, size: 9 },
    ups: [{ count: 1 }, { dmg: 4, radius: 10 }, { dur: 1, cd: -0.4 }, { count: 1, dmg: 4 }, { dmg: 6, dur: 1 }],
    evo: { need: 'area', to: 'halo' },
  },
  halo: {
    name: '永恒星环', color: '#e6ffb3', kind: 'orbit', evolved: true, max: 1,
    desc: '永不熄灭的星环,数量更多、范围更大',
    base: { dmg: 26, cd: 0, count: 6, radius: 115, dur: 1, size: 11, perm: 1 },
  },

  thunder: {
    name: '落雷', color: '#9ad7ff', kind: 'thunder', max: 6,
    desc: '雷电随机劈向视野内的敌人',
    base: { dmg: 22, cd: 2.4, count: 1, radius: 42 },
    ups: [{ dmg: 8 }, { count: 1 }, { cd: -0.3, radius: 8 }, { count: 1, dmg: 8 }, { dmg: 12, cd: -0.3 }],
    evo: { need: 'amount', to: 'tempest' },
  },
  tempest: {
    name: '雷暴', color: '#c9e8ff', kind: 'thunder', evolved: true, max: 1,
    desc: '密集落雷,并在敌人之间连锁跳跃',
    base: { dmg: 50, cd: 1.3, count: 4, radius: 55, chain: 4 },
  },

  aura: {
    name: '荆棘光环', color: '#7bd88f', kind: 'aura', max: 6,
    desc: '持续伤害身边的所有敌人',
    base: { dmg: 5, radius: 68, tick: 0.45 },
    ups: [{ dmg: 2 }, { radius: 12 }, { dmg: 2 }, { radius: 12, dmg: 1 }, { dmg: 3 }],
    evo: { need: 'armor', to: 'bulwark' },
  },
  bulwark: {
    name: '荆棘壁垒', color: '#a6f0a0', kind: 'aura', evolved: true, max: 1,
    desc: '更大的光环,减速敌人并反伤攻击者',
    base: { dmg: 16, radius: 105, tick: 0.4, slow: 0.35, thorns: 30 },
  },

  blade: {
    name: '回旋飞刃', color: '#e0e6f0', kind: 'blade', max: 6,
    desc: '掷出会飞回来的利刃,贯穿沿途敌人',
    base: { dmg: 14, cd: 1.9, count: 1, size: 14 },
    ups: [{ dmg: 6 }, { count: 1 }, { cd: -0.3, size: 3 }, { dmg: 8 }, { count: 1, dmg: 6 }],
    evo: { need: 'swift', to: 'stormblade' },
  },
  stormblade: {
    name: '风暴之刃', color: '#ffffff', kind: 'blade', evolved: true, max: 1,
    desc: '飞刃呈螺旋向外横扫,再收回身边',
    base: { dmg: 40, cd: 2.2, count: 5, size: 20, spiral: 1 },
  },

  meteor: {
    name: '陨星', color: '#ff9f6b', kind: 'meteor', max: 6,
    desc: '召唤陨星砸向敌群,范围爆炸',
    base: { dmg: 30, cd: 3.2, count: 1, radius: 58 },
    ups: [{ dmg: 12 }, { count: 1 }, { radius: 12, cd: -0.3 }, { dmg: 15 }, { count: 1, cd: -0.3 }],
    evo: { need: 'might', to: 'skyfire' },
  },
  skyfire: {
    name: '天火', color: '#ffb199', kind: 'meteor', evolved: true, max: 1,
    desc: '陨星连发,落点留下持续燃烧的火海',
    base: { dmg: 70, cd: 2.2, count: 4, radius: 80, burn: 3 },
  },

  frost: {
    name: '霜环', color: '#aee9ff', kind: 'frost', max: 6,
    desc: '释放扩散的寒霜,伤害并减速敌人',
    base: { dmg: 10, cd: 4.5, radius: 130, slow: 0.5 },
    ups: [{ dmg: 6 }, { radius: 25 }, { cd: -0.6 }, { dmg: 8, radius: 25 }, { cd: -0.6, dmg: 6 }],
    evo: { need: 'regen', to: 'winter' },
  },
  winter: {
    name: '凛冬', color: '#e3f8ff', kind: 'frost', evolved: true, max: 1,
    desc: '巨大的寒潮,冻结范围内的敌人',
    base: { dmg: 42, cd: 3.0, radius: 260, slow: 0.6, freeze: 1.6 },
  },

  lance: {
    name: '光矛', color: '#ffe9a8', kind: 'lance', max: 6,
    desc: '朝移动方向投出贯穿的光矛',
    base: { dmg: 16, cd: 1.3, count: 1, pierce: 3, speed: 640, size: 7 },
    ups: [{ dmg: 6 }, { count: 1 }, { pierce: 2, cd: -0.15 }, { dmg: 8 }, { count: 1, dmg: 6 }],
    evo: { need: 'magnet', to: 'starlance' },
  },
  starlance: {
    name: '引星矛', color: '#fff7d6', kind: 'lance', evolved: true, max: 1,
    desc: '光矛会自动追踪敌人,连续贯穿',
    base: { dmg: 40, cd: 0.9, count: 4, pierce: 6, speed: 520, size: 8, homing: 1 },
  },

  mouse: {
    name: '鼠伴出击', color: '#e9c290', kind: 'mouse', max: 6, exclusive: 'echo',
    desc: '派出小鼠追击最近的夜兽，升级可增加鼠伴数量。',
    base: { dmg: 12, cd: 1.35, count: 1, pierce: 1, speed: 365, size: 8, range: 410, life: 1.6 },
    ups: [{ count: 1 }, { dmg: 4 }, { cd: -0.2, pierce: 1 }, { count: 1 }, { dmg: 8, cd: -0.15 }],
    evo: { need: 'swift', to: 'nightmice' },
  },
  nightmice: {
    name: '百鼠夜行', color: '#f5d7a1', kind: 'mouse', evolved: true, max: 1,
    desc: '五只金色鼠伴结队追击，连续穿过多只夜兽。',
    base: { dmg: 32, cd: 0.85, count: 5, pierce: 3, speed: 435, size: 9, range: 470, life: 2.1 },
  },

  ricecake: {
    name: '黏黏年糕', color: '#f2dcb3', kind: 'ricecake', max: 6, exclusive: 'echo',
    desc: '在脚下留一块软糯年糕；夜兽踩中后，周围敌人受伤并减速。',
    base: { dmg: 15, cd: 3.3, radius: 61, trigger: 22, range: 270, life: 6, slow: 0.55, chill: 2 },
    ups: [{ radius: 9 }, { dmg: 5 }, { cd: -0.5 }, { radius: 12 }, { dmg: 10, cd: -0.35 }],
  },
  icecream: {
    name: '冰淇淋旋风', color: '#a7dded', kind: 'orbit', max: 6, exclusive: 'echo',
    desc: '甜筒绕身旋转，碰到夜兽就造成伤害并降低移速。',
    base: { dmg: 7, cd: 3.2, count: 3, radius: 64, dur: 3.2, size: 10, slow: 0.32, chill: 1.25 },
    ups: [{ count: 1 }, { dmg: 3, radius: 8 }, { dur: 0.8 }, { dmg: 4, size: 2 }, { count: 1, cd: -0.5 }],
  },
  candy: {
    name: '彩糖连发', color: '#efa8c5', colors: ['#efa8c5', '#f2c479', '#9fdac5'], kind: 'bolt', look: 'candy', max: 6, exclusive: 'echo',
    sound: 'candy',
    desc: '朝附近夜兽快速连发彩色糖果。升级后可增加糖果数量和穿透。',
    base: { dmg: 7, cd: 1.4, count: 3, pierce: 1, speed: 565, size: 6, spread: 3 },
    ups: [{ count: 1 }, { dmg: 3 }, { pierce: 1 }, { count: 1, cd: -0.2 }, { dmg: 5, count: 1 }],
  },
  watermelon: {
    name: '西瓜炸弹', color: '#ef8a86', kind: 'lob', look: 'watermelon', max: 6, exclusive: 'echo',
    sound: 'toss',
    desc: '把西瓜抛向附近夜兽，砸地时炸开，伤害落点周围的敌人。',
    base: { dmg: 26, cd: 2.8, count: 1, radius: 65, range: 380, delay: 0.48 },
    ups: [{ radius: 8 }, { dmg: 8 }, { cd: -0.45 }, { count: 1 }, { dmg: 10, radius: 10 }],
  },
  basketball: {
    name: '篮球投射', color: '#f2a55b', kind: 'bolt', look: 'basketball', max: 6, exclusive: 'echo',
    sound: 'bounce',
    desc: '投出篮球，命中后弹向附近尚未被这颗球命中的夜兽。',
    base: { dmg: 12, cd: 1.95, count: 1, pierce: 1, speed: 480, size: 9, bounces: 1, bounceRange: 165 },
    ups: [{ dmg: 5 }, { bounces: 1 }, { cd: -0.3 }, { count: 1 }, { dmg: 7, bounces: 1 }],
  },
  bubbletea: {
    name: '珍珠奶茶', color: '#efc18b', kind: 'bolt', look: 'bubbletea', max: 6, exclusive: 'echo', sound: 'toss',
    desc: '朝夜兽扔出一杯奶茶。撞翻后洒出一地珍珠，对踩进来的夜兽持续造成伤害和减速。',
    base: { dmg: 12, cd: 3.6, count: 1, pierce: 1, speed: 385, size: 9, blast: 51, sauce: 2.5, slow: 0.38 },
    ups: [{ blast: 9 }, { dmg: 4 }, { sauce: 0.7 }, { cd: -0.55 }, { dmg: 6, blast: 10 }],
  },
  drumstick: {
    name: '回血鸡腿', color: '#efb974', kind: 'snackHeal', look: 'drumstickHeal', sound: 'drumstick', max: 6, exclusive: 'echo',
    desc: '生命低于 70% 时自动吃掉一只鸡腿，回复 16% 最大生命。升级可提高回复量、缩短冷却。',
    base: { heal: 0.16, threshold: 0.7, cd: 12 },
    ups: [{ heal: 0.02 }, { cd: -1 }, { heal: 0.03 }, { cd: -1.5 }, { heal: 0.04 }],
  },

  monkey: {
    name: '灵猴踏枝', color: '#f4b99b', kind: 'lob', look: 'monkey', max: 6, exclusive: 'tuan',
    desc: '召唤小猴跳向夜兽，落地时震击周围敌人。',
    base: { dmg: 10, cd: 2.25, count: 1, radius: 44, range: 350, delay: 0.36 },
    ups: [{ dmg: 4 }, { radius: 8 }, { cd: -0.25 }, { count: 1 }, { dmg: 8, radius: 8 }],
    evo: { need: 'area', to: 'monkeytroop' },
  },
  monkeytroop: {
    name: '群猴闹山', color: '#ffd77f', kind: 'lob', look: 'monkey', evolved: true, max: 1,
    desc: '一群金色灵猴接连跃下，震击范围扩大。',
    base: { dmg: 29, cd: 1.7, count: 3, radius: 73, range: 410, delay: 0.33 },
  },

  potato: {
    name: '土豆滚滚', color: '#dcb37b', kind: 'lance', look: 'potato', max: 6, exclusive: 'tuan',
    sound: 'roll',
    desc: '朝最近的移动方向滚出土豆，把沿途多只夜兽推开。',
    base: { dmg: 10, cd: 1.7, count: 1, pierce: 3, speed: 440, size: 10 },
    ups: [{ dmg: 5 }, { pierce: 1, size: 2 }, { cd: -0.25 }, { count: 1 }, { dmg: 7, pierce: 1 }],
  },
  tomato: {
    name: '番茄飞溅', color: '#ee806b', kind: 'bolt', look: 'tomato', max: 6, exclusive: 'tuan',
    sound: 'toss',
    desc: '朝附近夜兽投掷番茄。命中时溅开，留下持续伤害夜兽的番茄酱。',
    base: { dmg: 9, cd: 2.8, count: 1, pierce: 1, speed: 430, size: 8, blast: 43, sauce: 1.6, spread: 2 },
    ups: [{ dmg: 4 }, { blast: 8 }, { sauce: 0.8 }, { cd: -0.4 }, { dmg: 6, blast: 10 }],
  },
  mango: {
    name: '芒果干补给', color: '#f8c866', kind: 'snackHeal', look: 'mangoHeal', sound: 'mango', max: 6, exclusive: 'tuan',
    desc: '生命低于 85% 时自动吃一块芒果干，回复 10% 最大生命。',
    base: { heal: 0.1, threshold: 0.85, cd: 8.5 },
    ups: [{ heal: 0.03 }, { cd: -0.7 }, { heal: 0.03 }, { cd: -1 }, { heal: 0.04 }],
  },
  exampaper: {
    name: '试卷护盾', color: '#f6e2b3', kind: 'exampaper', max: 6, exclusive: 'tuan',
    desc: '试卷环绕果果并抵挡伤害。每次挡住攻击都会让附近夜兽减速；用完后开始充能。',
    base: { guards: 1, cd: 9, radius: 62, slow: 0.4, chill: 1.2 },
    ups: [{ radius: 10 }, { cd: -0.7 }, { guards: 1 }, { radius: 14 }, { cd: -1.2 }],
  },
  latiao: {
    name: '香辣连发', color: '#ef764e', kind: 'bolt', look: 'latiao', max: 6, exclusive: 'xiaoxiao', sound: 'candy',
    desc: '朝附近夜兽连发红油辣条，升级后可以穿透多个目标。',
    base: { dmg: 7, cd: 1.35, count: 2, pierce: 1, speed: 510, size: 7, spread: 2 },
    ups: [{ count: 1 }, { dmg: 4 }, { pierce: 1 }, { count: 1, cd: -0.2 }, { dmg: 6, pierce: 1 }],
  },
  goldIngot: {
    name: '黄金砸怪', color: '#f6cc6a', kind: 'lob', look: 'goldIngot', impactSound: 'goldDrop', max: 6, exclusive: 'xiaoxiao',
    desc: '召来金元宝砸向附近夜兽，落地时造成范围伤害并震退敌人。升级后可同时砸下更多元宝。',
    base: { dmg: 30, cd: 3.3, count: 1, radius: 60, range: 390, delay: 0.52, kb: 245 },
    ups: [{ radius: 10 }, { dmg: 10 }, { cd: -0.45 }, { count: 1 }, { dmg: 12, radius: 12 }],
  },
  gallop: {
    name: '万马奔腾', color: '#efbd7e', kind: 'lance', look: 'pony', max: 6, exclusive: 'xiaoxiao', sound: 'roll',
    desc: '沿最近移动的方向派出一排小马，蹦跳穿过沿途夜兽。',
    base: { dmg: 12, cd: 3.2, count: 3, pierce: 3, speed: 390, size: 12, spreadAngle: 0.29 },
    ups: [{ dmg: 4 }, { count: 1 }, { cd: -0.5 }, { pierce: 1, size: 2 }, { dmg: 7, count: 1 }],
  },
  momroar: {
    name: '妈妈怒吼', color: '#ef9c91', kind: 'frost', look: 'roar', max: 6, exclusive: 'xiaoxiao', sound: 'roar',
    desc: '夜兽靠近时发出一圈声浪，伤害并震退周围敌人。',
    base: { dmg: 13, cd: 3.8, radius: 114, kb: 310 },
    ups: [{ radius: 16 }, { dmg: 6 }, { cd: -0.55 }, { radius: 18 }, { dmg: 8, cd: -0.4 }],
  },
  skincare: {
    name: '水润护肤', color: '#b9ead8', kind: 'skincare', max: 6, exclusive: 'xiaoxiao',
    desc: '受伤或夜兽靠近时涂上面霜，回复 6% 最大生命，并在 3 秒内减少 30% 所受伤害。',
    base: { heal: 0.06, cd: 8.8, dur: 3, reduce: 0.3, range: 170 },
    ups: [{ heal: 0.02 }, { dur: 0.6 }, { reduce: 0.08 }, { cd: -1 }, { heal: 0.02, cd: -0.5 }],
  },
};

// ----- 被动道具 -----
const PASSIVES = {
  might:  { name: '力量符石', max: 5, desc: '伤害 +10%' },
  haste:  { name: '急速沙漏', max: 5, desc: '武器冷却 -8%' },
  area:   { name: '广域透镜', max: 5, desc: '攻击范围 +10%' },
  amount: { name: '复制棱镜', max: 2, desc: '投射物数量 +1' },
  swift:  { name: '疾风靴',   max: 5, desc: '移动速度 +8%' },
  armor:  { name: '铁木护符', max: 5, desc: '每次受伤 -1' },
  vital:  { name: '生命之种', max: 5, desc: '生命上限 +20%' },
  regen:  { name: '晨露',     max: 5, desc: '每秒回复 0.3 生命' },
  magnet: { name: '引星磁石', max: 5, desc: '拾取范围 +30%' },
  wisdom: { name: '智慧之冠', max: 5, desc: '经验获取 +8%' },
};
