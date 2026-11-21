'use strict';

// 本地军师：只比较本次的卡片、装备和血量，不改选项或接入外部服务。
function recommendUpgrade(choices, p) {
  const low = p.hp < p.st.maxHp * 0.45;
  const critical = p.hp < p.st.maxHp * 0.22;
  const owns = id => p.weapons.some(w => w.id === id);
  const passive = id => p.passives.some(q => q.id === id);

  function evaluate(c) {
    const item = WEAPONS[c.id];
    if (c.kind === 'heal') return [critical ? 120 : low ? 88 : 10, '直接回血，可以为下一波争取时间'];
    if (c.kind === 'evo') return [100, `材料齐了，可以把${item.name}进化成${WEAPONS[c.to].name}`];
    if (c.kind === 'passive') {
      const weapon = p.weapons.find(w => WEAPONS[w.id].evo?.need === c.id && w.lv >= WEAPONS[w.id].max);
      if (weapon) return [93, `拿到${PASSIVES[c.id].name}后，满级的${WEAPONS[weapon.id].name}就满足进化条件`];
      if (low && ['vital', 'regen', 'armor'].includes(c.id)) return [78, `血量偏低，${PASSIVES[c.id].name}可以提高生存能力`];
      const values = { might: 41, haste: 41, amount: 47, swift: 38, vital: 37 };
      return [values[c.id] ?? 29, `${PASSIVES[c.id].name}：${PASSIVES[c.id].desc}`];
    }
    if (c.kind === 'weapon') {
      if (low && ['snackHeal', 'exampaper', 'skincare'].includes(item.kind)) return [90, '血量偏低，补上回血或护盾手段'];
      if (item.evo && c.lv === item.max && passive(item.evo.need)) return [89, '这次升满后，下一次选卡即可准备进化'];
      const defense = ['snackHeal', 'exampaper', 'skincare', 'mirror'].includes(item.kind);
      if (!owns(c.id) && !defense && p.weapons.length <= 2) return [57, '前期多一种攻击，清怪更稳'];
      return [defense ? 35 : owns(c.id) ? 49 : 43, defense ? '为后续怪潮补一项保命手段' :
        owns(c.id) ? `强化已有的${item.name}` : '加入一种不同的攻击方式，补足现有构筑'];
    }
    return [11, '积攒本局金币，可用于 Boss 战前抉择'];
  }

  let best = null;
  for (let index = 0; index < choices.length; index++) {
    const [score, reason] = evaluate(choices[index]);
    if (!best || score > best.score) best = { index, score, reason };
  }
  return best;
}
