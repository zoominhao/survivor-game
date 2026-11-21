'use strict';

// ----- 角色 -----
// look: 独立造型；cost 为 0 的角色默认解锁。
const CHARS = {
  ella: { name: '提灯人·艾拉', color: '#f4a261', weapon: 'spark',   cost: 0,   desc: '均衡的守夜人。伤害 +10%', look: 'lantern', might: 0.1 },
  tuan: { name: '小啾咪·果果', color: '#f4eedc', weapon: 'monkey', cost: 0,   desc: '小猴落地震击，数量 +1、生命 -10', look: 'girl', amount: 1, hp: -10 },
  echo: { name: '小老鼠·开心', color: '#f6c94e', weapon: 'mouse', cost: 0,    desc: '鼠伴自动追敌，移速 +8%、生命 -10', look: 'echo', speed: 0.08, hp: -10 },
  xiaoxiao: { name: '川妹·霄霄', color: '#f4a58e', weapon: 'latiao', cost: 0, desc: '香辣连发，生命 +10、护甲 +1', look: 'xiaoxiao', hp: 10, armor: 1 },
  zhu: { name: '工程师·竹', color: '#9adfcd', weapon: 'codeShard', cost: 0, desc: '代码连发，冷却 -6%、生命 -5', look: 'zhu', haste: 0.06, hp: -5 },
  bron: { name: '铁匠·布隆',   color: '#8d99ae', weapon: 'aura',    cost: 300, desc: '生命 +40,护甲 +1,移速 -10%', look: 'smith', hp: 40, armor: 1, speed: -0.1 },
  nova: { name: '观星者·诺瓦', color: '#9d7bff', weapon: 'thunder', cost: 600, desc: '冷却 -12%,生命 -20', look: 'astronomer', haste: 0.12, hp: -20 },
  sain: { name: '游侠·塞恩',   color: '#52b788', weapon: 'blade',   cost: 900, desc: '移速 +15%,拾取范围 +30%', look: 'ranger', speed: 0.15, magnet: 0.3 },
};

// ----- 局外永久强化(价格 = cost × (当前等级 + 1)) -----
const HERO_TRAINING_COSTS = [2, 3, 4];
const HERO_TRAINING = {
  vital: { name: '体魄修炼', desc: '每级基础生命 +6', step: 6 },
  might: { name: '攻势修炼', desc: '每级伤害 +3%', step: 0.03 },
  swift: { name: '步法修炼', desc: '每级移速 +2%', step: 0.02 },
};

const META = {
  might:  { name: '磨砺', icon: 'kills',   desc: '伤害 +5%',          max: 5, cost: 60 },
  vital:  { name: '体魄',                  desc: '生命上限 +10%',     max: 5, cost: 50 },
  swift:  { name: '轻足',                  desc: '移动速度 +4%',      max: 3, cost: 80 },
  armor:  { name: '坚韧',                  desc: '护甲 +1',           max: 3, cost: 150 },
  regen:  { name: '复苏',                  desc: '每秒回复 +0.1',     max: 5, cost: 70 },
  magnet: { name: '感知',                  desc: '拾取范围 +15%',     max: 3, cost: 60 },
  growth: { name: '悟性',                  desc: '经验获取 +5%',      max: 5, cost: 80 },
  greed:  { name: '贪婪', icon: 'coin',    desc: '金币获取 +10%',     max: 5, cost: 80 },
  reroll: { name: '重掷',                  desc: '每局重掷次数 +1',   max: 3, cost: 120 },
  revive: { name: '余烬', icon: 'lantern', desc: '每局可复活 1 次',   max: 1, cost: 500 },
};
