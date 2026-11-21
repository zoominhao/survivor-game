'use strict';

const COOP_DIFFICULTY = { spawnRate: 1.12, enemyHp: 1.18, enemyDamage: 1.08, bossHp: 1.25 };
const BOND_JOIN_RANGE = 150;
const BOND_BREAK_RANGE = 175;

const CoopBonds = (() => {
  const roles = {
    ella: 'aid', tuan: 'art', echo: 'aid', xiaoxiao: 'front', zhu: 'art', bron: 'front',
    nova: 'art', sain: 'front', ruo: 'art', wen: 'front', shao: 'aid', du: 'front', su: 'art', yan: 'aid',
  };
  const roleNames = { aid: '援护', art: '术法', front: '先锋' };
  const bonds = {
    'front/front': { name: '并肩破阵', stat: 'might', factor: 1.12, label: '伤害 +12%' },
    'art/front': { name: '开路镇邪', stat: 'area', factor: 1.15, label: '技能范围 +15%' },
    'aid/front': { name: '护灯成阵', stat: 'incoming', factor: 0.88, label: '受伤 −12%' },
    'art/art': { name: '双符连奏', stat: 'cd', factor: 0.9, label: '武器冷却 −10%' },
    'aid/art': { name: '借光引路', stat: 'speed', factor: 1.1, label: '移速 +10%' },
    'aid/aid': { name: '同灯回春', stat: 'regen', add: 0.8, label: '每秒回复 0.8 生命' },
  };
  const links = {
    'su/wen': { id: 'thread', name: '梆响断线', label: '更夫把夜兽震进红线时，引爆红线' },
    'shao/yan': { id: 'mist', name: '借面回春', label: '傩面在青芍的药雾中爆开时，额外治疗队友' },
  };

  const role = id => Object.hasOwn(roles, id) ? roles[id] : 'aid';
  return {
    roleName: id => roleNames[role(id)],
    forPair: (a, b) => bonds[[role(a), role(b)].sort().join('/')],
    linkFor: (a, b) => links[[a, b].sort().join('/')],
  };
})();
