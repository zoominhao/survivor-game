'use strict';
// ===== 全局配置与数据表(纯数据,调数值只改这里) =====

const CFG = {
  RUN_TIME: 900,      // 一局时长(秒),撑到黎明即胜利
  MAX_ENEMIES: 380,   // 同屏敌人上限
  MAX_GEMS: 320,      // 经验宝石上限,超出后合并到已有宝石
  MAX_WEAPONS: 6,
  MAX_PASSIVES: 6,
  PLAYER_R: 11,       // 玩家受击半径
};

// ----- 武器 -----
// base: 1 级面板;ups: 2~max 级每级的增量;evo: 满级 + 持有指定被动后可进化
const WEAPONS = {
  spark: {
    name: '星火弹', icon: '✨', color: '#ffd166', kind: 'bolt', max: 6,
    desc: '向最近的敌人射出星火',
    base: { dmg: 10, cd: 1.0, count: 1, pierce: 1, speed: 460, size: 6 },
    ups: [{ count: 1 }, { dmg: 5, pierce: 1 }, { cd: -0.15 }, { count: 1, dmg: 5 }, { dmg: 8, pierce: 1 }],
    evo: { need: 'haste', to: 'starburst' },
  },
  starburst: {
    name: '星爆', icon: '🌟', color: '#fff3b0', kind: 'bolt', evolved: true, max: 1,
    desc: '连射会爆炸的星弹,同时压制多个目标',
    base: { dmg: 24, cd: 0.55, count: 4, pierce: 2, speed: 560, size: 8, blast: 46, spread: 3 },
  },

  orbit: {
    name: '环绕萤火', icon: '🔆', color: '#b8f2a0', kind: 'orbit', max: 6,
    desc: '萤火环绕自身旋转,灼伤靠近的敌人',
    base: { dmg: 8, cd: 3.0, count: 2, radius: 78, dur: 3.5, size: 9 },
    ups: [{ count: 1 }, { dmg: 4, radius: 10 }, { dur: 1, cd: -0.4 }, { count: 1, dmg: 4 }, { dmg: 6, dur: 1 }],
    evo: { need: 'area', to: 'halo' },
  },
  halo: {
    name: '永恒星环', icon: '💫', color: '#e6ffb3', kind: 'orbit', evolved: true, max: 1,
    desc: '永不熄灭的星环,数量更多、范围更大',
    base: { dmg: 26, cd: 0, count: 6, radius: 115, dur: 1, size: 11, perm: 1 },
  },

  thunder: {
    name: '落雷', icon: '⚡', color: '#9ad7ff', kind: 'thunder', max: 6,
    desc: '雷电随机劈向视野内的敌人',
    base: { dmg: 22, cd: 2.4, count: 1, radius: 42 },
    ups: [{ dmg: 8 }, { count: 1 }, { cd: -0.3, radius: 8 }, { count: 1, dmg: 8 }, { dmg: 12, cd: -0.3 }],
    evo: { need: 'amount', to: 'tempest' },
  },
  tempest: {
    name: '雷暴', icon: '🌩️', color: '#c9e8ff', kind: 'thunder', evolved: true, max: 1,
    desc: '密集落雷,并在敌人之间连锁跳跃',
    base: { dmg: 50, cd: 1.3, count: 4, radius: 55, chain: 4 },
  },

  aura: {
    name: '荆棘光环', icon: '🌿', color: '#7bd88f', kind: 'aura', max: 6,
    desc: '持续伤害身边的所有敌人',
    base: { dmg: 5, radius: 68, tick: 0.45 },
    ups: [{ dmg: 2 }, { radius: 12 }, { dmg: 2 }, { radius: 12, dmg: 1 }, { dmg: 3 }],
    evo: { need: 'armor', to: 'bulwark' },
  },
  bulwark: {
    name: '荆棘壁垒', icon: '🌵', color: '#a6f0a0', kind: 'aura', evolved: true, max: 1,
    desc: '更大的光环,减速敌人并反伤攻击者',
    base: { dmg: 16, radius: 105, tick: 0.4, slow: 0.35, thorns: 30 },
  },

  blade: {
    name: '回旋飞刃', icon: '🌀', color: '#e0e6f0', kind: 'blade', max: 6,
    desc: '掷出会飞回来的利刃,贯穿沿途敌人',
    base: { dmg: 14, cd: 1.9, count: 1, size: 14 },
    ups: [{ dmg: 6 }, { count: 1 }, { cd: -0.3, size: 3 }, { dmg: 8 }, { count: 1, dmg: 6 }],
    evo: { need: 'swift', to: 'stormblade' },
  },
  stormblade: {
    name: '风暴之刃', icon: '🌪️', color: '#ffffff', kind: 'blade', evolved: true, max: 1,
    desc: '飞刃呈螺旋向外横扫,再收回身边',
    base: { dmg: 40, cd: 2.2, count: 5, size: 20, spiral: 1 },
  },

  meteor: {
    name: '陨星', icon: '☄️', color: '#ff9f6b', kind: 'meteor', max: 6,
    desc: '召唤陨星砸向敌群,范围爆炸',
    base: { dmg: 30, cd: 3.2, count: 1, radius: 58 },
    ups: [{ dmg: 12 }, { count: 1 }, { radius: 12, cd: -0.3 }, { dmg: 15 }, { count: 1, cd: -0.3 }],
    evo: { need: 'might', to: 'skyfire' },
  },
  skyfire: {
    name: '天火', icon: '🔥', color: '#ffb199', kind: 'meteor', evolved: true, max: 1,
    desc: '陨星连发,落点留下持续燃烧的火海',
    base: { dmg: 70, cd: 2.2, count: 4, radius: 80, burn: 3 },
  },

  frost: {
    name: '霜环', icon: '❄️', color: '#aee9ff', kind: 'frost', max: 6,
    desc: '释放扩散的寒霜,伤害并减速敌人',
    base: { dmg: 10, cd: 4.5, radius: 130, slow: 0.5 },
    ups: [{ dmg: 6 }, { radius: 25 }, { cd: -0.6 }, { dmg: 8, radius: 25 }, { cd: -0.6, dmg: 6 }],
    evo: { need: 'regen', to: 'winter' },
  },
  winter: {
    name: '凛冬', icon: '🧊', color: '#e3f8ff', kind: 'frost', evolved: true, max: 1,
    desc: '巨大的寒潮,冻结范围内的敌人',
    base: { dmg: 42, cd: 3.0, radius: 260, slow: 0.6, freeze: 1.6 },
  },

  lance: {
    name: '光矛', icon: '🔱', color: '#ffe9a8', kind: 'lance', max: 6,
    desc: '朝移动方向投出贯穿的光矛',
    base: { dmg: 16, cd: 1.3, count: 1, pierce: 3, speed: 640, size: 7 },
    ups: [{ dmg: 6 }, { count: 1 }, { pierce: 2, cd: -0.15 }, { dmg: 8 }, { count: 1, dmg: 6 }],
    evo: { need: 'magnet', to: 'starlance' },
  },
  starlance: {
    name: '引星矛', icon: '🌠', color: '#fff7d6', kind: 'lance', evolved: true, max: 1,
    desc: '光矛会自动追踪敌人,连续贯穿',
    base: { dmg: 40, cd: 0.9, count: 4, pierce: 6, speed: 520, size: 8, homing: 1 },
  },
};

// ----- 被动道具 -----
const PASSIVES = {
  might:  { name: '力量符石', icon: '💎', max: 5, desc: '伤害 +10%' },
  haste:  { name: '急速沙漏', icon: '⏳', max: 5, desc: '武器冷却 -8%' },
  area:   { name: '广域透镜', icon: '🔍', max: 5, desc: '攻击范围 +10%' },
  amount: { name: '复制棱镜', icon: '🔮', max: 2, desc: '投射物数量 +1' },
  swift:  { name: '疾风靴',   icon: '👢', max: 5, desc: '移动速度 +8%' },
  armor:  { name: '铁木护符', icon: '🛡️', max: 5, desc: '每次受伤 -1' },
  vital:  { name: '生命之种', icon: '🌱', max: 5, desc: '生命上限 +20%' },
  regen:  { name: '晨露',     icon: '💧', max: 5, desc: '每秒回复 0.3 生命' },
  magnet: { name: '引星磁石', icon: '🧲', max: 5, desc: '拾取范围 +30%' },
  wisdom: { name: '智慧之冠', icon: '👑', max: 5, desc: '经验获取 +8%' },
};

// ----- 角色 -----
// look: 造型(缺省为斗篷,'girl' 为熊猫卫衣小女孩);cost 为 0 的角色默认解锁
const CHARS = {
  ella: { name: '提灯人·艾拉', color: '#f4a261', weapon: 'spark',   cost: 0,   desc: '均衡的守夜人。伤害 +10%', might: 0.1 },
  tuan: { name: '熊猫队长·团团', color: '#f4eedc', weapon: 'orbit',  cost: 0,   desc: '投射物数量 +1,生命 -10', look: 'girl', amount: 1, hp: -10 },
  bron: { name: '铁匠·布隆',   color: '#8d99ae', weapon: 'aura',    cost: 300, desc: '生命 +40,护甲 +1,移速 -10%', hp: 40, armor: 1, speed: -0.1 },
  nova: { name: '观星者·诺瓦', color: '#9d7bff', weapon: 'thunder', cost: 600, desc: '冷却 -12%,生命 -20', haste: 0.12, hp: -20 },
  sain: { name: '游侠·塞恩',   color: '#52b788', weapon: 'blade',   cost: 900, desc: '移速 +15%,拾取范围 +30%', speed: 0.15, magnet: 0.3 },
};

// ----- 局外永久强化(价格 = cost × (当前等级 + 1)) -----
const META = {
  might:  { name: '磨砺', icon: '⚔️', desc: '伤害 +5%',          max: 5, cost: 60 },
  vital:  { name: '体魄', icon: '❤️', desc: '生命上限 +10%',     max: 5, cost: 50 },
  swift:  { name: '轻足', icon: '🦶', desc: '移动速度 +4%',      max: 3, cost: 80 },
  armor:  { name: '坚韧', icon: '🛡️', desc: '护甲 +1',           max: 3, cost: 150 },
  regen:  { name: '复苏', icon: '💧', desc: '每秒回复 +0.1',     max: 5, cost: 70 },
  magnet: { name: '感知', icon: '🧲', desc: '拾取范围 +15%',     max: 3, cost: 60 },
  growth: { name: '悟性', icon: '📖', desc: '经验获取 +5%',      max: 5, cost: 80 },
  greed:  { name: '贪婪', icon: '🪙', desc: '金币获取 +10%',     max: 5, cost: 80 },
  reroll: { name: '重掷', icon: '🎲', desc: '每局重掷次数 +1',   max: 3, cost: 120 },
  revive: { name: '余烬', icon: '🕯️', desc: '每局可复活 1 次',   max: 1, cost: 500 },
};

// ----- 敌人 -----
const ENEMIES = {
  shade:   { name: '影兽',   hp: 10,  speed: 58,  dmg: 6,  r: 12, xp: 1,  color: '#6a4fa0' },
  moth:    { name: '夜蛾',   hp: 7,   speed: 105, dmg: 4,  r: 9,  xp: 1,  color: '#7d8fb3' },
  swarm:   { name: '噬光虫', hp: 5,   speed: 88,  dmg: 3,  r: 7,  xp: 1,  color: '#c8553d' },
  brute:   { name: '石甲兽', hp: 70,  speed: 38,  dmg: 12, r: 20, xp: 6,  color: '#7a8577', kbRes: 0.7 },
  spitter: { name: '吐刺者', hp: 28,  speed: 48,  dmg: 6,  r: 13, xp: 3,  color: '#5a9e4b', ranged: true, keep: 210 },
  wraith:  { name: '幽魂',   hp: 45,  speed: 80,  dmg: 9,  r: 14, xp: 4,  color: '#78dcd2', ghost: true },
  golem:   { name: '晶岩魔', hp: 220, speed: 34,  dmg: 18, r: 26, xp: 15, color: '#7df9ff', kbRes: 0.85 },
  boss:    { name: '夜魇',   hp: 1,   speed: 62,  dmg: 20, r: 44, xp: 0,  color: '#b0305a', kbRes: 1 },
};

// 三只 Boss 的血量(不随时间缩放)
const BOSS_HP = [1600, 6000, 16000];

// ----- 波次:下标 = 第几分钟;rate = 每秒刷怪数;types = 权重 -----
const WAVES = [
  { rate: 1.0, types: { shade: 1 } },
  { rate: 1.6, types: { shade: 4, moth: 1 } },
  { rate: 2.2, types: { shade: 3, moth: 2 } },
  { rate: 2.6, types: { shade: 3, moth: 2, brute: 0.6 } },
  { rate: 3.0, types: { shade: 2, moth: 2, brute: 1, spitter: 0.6 } },
  { rate: 3.4, types: { shade: 2, moth: 3, brute: 1, spitter: 1 } },
  { rate: 3.8, types: { shade: 2, wraith: 1.5, brute: 1, swarm: 0.5 } },
  { rate: 4.2, types: { wraith: 2, spitter: 1.5, moth: 3 } },
  { rate: 4.6, types: { brute: 2, wraith: 2, shade: 3 } },
  { rate: 5.5, types: { swarm: 0.8, wraith: 2, spitter: 1.5, golem: 0.3 } },
  { rate: 6.5, types: { brute: 2, wraith: 3, golem: 0.5, moth: 3 } },
  { rate: 7.5, types: { wraith: 3, spitter: 2, golem: 0.7, swarm: 0.8 } },
  { rate: 8.5, types: { golem: 1, brute: 3, wraith: 3 } },
  { rate: 10, types: { golem: 1.2, wraith: 4, swarm: 1, spitter: 2 } },
  { rate: 12, types: { golem: 1.5, wraith: 4, brute: 3, moth: 4 } },
];

// ----- 定时事件:包围圈 / Boss -----
const EVENTS = [
  { t: 150, kind: 'ring', enemy: 'swarm',  n: 26 },
  { t: 240, kind: 'boss', tier: 0 },
  { t: 390, kind: 'ring', enemy: 'moth',   n: 34 },
  { t: 480, kind: 'boss', tier: 1 },
  { t: 630, kind: 'ring', enemy: 'wraith', n: 30 },
  { t: 720, kind: 'boss', tier: 2 },
  { t: 840, kind: 'ring', enemy: 'brute',  n: 36, msg: '最后一分钟,黎明将至!' },
];
