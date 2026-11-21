'use strict';

const ACTIVE_SKILLS = {
  dash: { cooldown: 6, color: '#c9f1e7', speed: 520, duration: 0.18, guard: 0.32 },
  ward: { cooldown: 0.8, initial: 1, capacity: 3 }, // E 槽共用符纸库存；双人永远使用免费版镇夜符。
};

const PAPER_SKILLS = {
  ward: { name: '镇夜符', cost: 0, cooldown: ACTIVE_SKILLS.ward.cooldown, color: '#f7d894', radius: 138, slow: 0.55, duration: 2.4,
    cast: 'castWard', desc: '清除附近敌弹并减速夜兽，不造成伤害。' },
  lure: { name: '引魂符', cost: 160, cooldown: 4, color: '#cae5c9', radius: 166, duration: 3,
    cast: 'castPaperLure', desc: '在脚下放置纸人，吸引附近普通近战鬼 3 秒。不吸引精英、远程鬼和 Boss，也不清弹。' },
  seal: { name: '朱砂印', cost: 220, cooldown: 2.8, color: '#f6a28a', radius: 120, delay: 1.35, damage: 75,
    cast: 'castPaperSeal', desc: '在脚下留下符印，1.35 秒后伤害圈内夜兽。不清弹，也不打断 Boss。' },
  frostBind: { name: '霜缚符', cost: 190, cooldown: 3.5, color: '#bce5fa', radius: 116, duration: 1.55, slow: 0.45,
    cast: 'castFrostBind', desc: '冻结近处普通夜兽约 1.5 秒，精英只减速。不伤害 Boss，也不清弹。' },
  lifePaper: { name: '续命符', cost: 205, cooldown: 5, color: '#b9e5a6', radius: 44, heal: 0.18, woundOnly: true,
    cast: 'castLifePaper', desc: '回复 18% 最大生命，不提供无敌。满血不可施放、不耗符纸。' },
  ghostPierce: { name: '穿魂符', cost: 240, cooldown: 3.2, color: '#f7ca92', radius: 345, speed: 550, pierce: 5, damage: 62,
    cast: 'castGhostPierce', desc: '沿当前或上一次移动方向射出符光，最多贯穿 5 只夜兽。' },
};

const canEquipPaperSkill = (data, id) => typeof id === 'string' && Object.hasOwn(PAPER_SKILLS, id) &&
  (id === 'ward' || data.paperSkills?.[id] === true);

function activeDirection(p, { x = 0, y = 0 }) {
  const length = Math.hypot(x, y);
  return Number.isFinite(length) && length > 0.08 ? [x / length, y / length] : [p.dirx, p.diry];
}

const BattleActives = {
  activeSkill(p, slot) { return slot === 'ward' ? PAPER_SKILLS[p.paperSkill ?? 'ward'] : ACTIVE_SKILLS.dash; },
  activeCooldown(p, slot) { return slot === 'dash' ? p.st?.dashCooldown ?? ACTIVE_SKILLS.dash.cooldown : this.activeSkill(p, slot).cooldown; },
  paperCapacity(p) { return p.st?.paperCapacity ?? ACTIVE_SKILLS.ward.capacity; },

  canUseActive(slot, id) {
    if (this.state !== 'playing' || (slot !== 0 && slot !== 1) || typeof id !== 'string' || !Object.hasOwn(ACTIVE_SKILLS, id)) return false;
    const p = this.players[slot];
    if (!p || p.hp <= 0 || (p.activeReady[id] ?? 0) > this.time) return false;
    return id !== 'ward' || p.wardCharges > 0 && (!this.activeSkill(p, id).woundOnly || p.hp < p.st.maxHp);
  },

  useActive(slot, id, input = {}) {
    if (!this.canUseActive(slot, id)) return false;
    const p = this.players[slot];
    const skill = this.activeSkill(p, id);
    p.activeReady[id] = this.time + this.activeCooldown(p, id);
    if (id === 'dash') this.beginDash(p, input, skill);
    else {
      p.wardCharges--;
      const radius = skill.radius * (RouteFork.active(this, 'bamboo') ? ROUTE_BRANCHES.bamboo.radiusBoost : 1);
      this[skill.cast](p, skill, radius, input);
    }
    return true;
  },

  beginDash(p, input, skill) {
    const [x, y] = activeDirection(p, input);
    const trace = { type: 'dashTrace', x: p.x, y: p.y, x2: p.x, y2: p.y,
      r: 12, life: 0.34, max: 0.34, c: skill.color };
    p.dash = { x, y, left: skill.duration, trace };
    p.iframe = Math.max(p.iframe, skill.guard);
    this.interruptRescue(p);
    this.fx.push(trace);
    this.play('dashSteps');
  },

  castWard(p, skill, radius) {
    const near = (e, radius) => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= radius ** 2;
    const bullets = this.ebullets;
    let kept = 0;
    for (const b of bullets) if (!near(b, radius + b.r)) bullets[kept++] = b;
    bullets.length = kept;
    for (const e of this.enemies) {
      if (!e.dead && near(e, radius + e.r)) this.slowEnemy(e, skill.slow, skill.duration);
    }
    this.fx.push({ type: 'activeWard', x: p.x, y: p.y, r: radius, life: 0.48, max: 0.48, c: skill.color });
    this.play('activeWard');
  },

  castPaperLure(p, skill, radius) {
    this.addZone({ type: 'decoy', look: 'paperLure', x: p.x, y: p.y, r: radius, life: skill.duration,
      max: skill.duration, normalOnly: true, noBurst: true, color: skill.color }, p);
    this.play('paper');
  },

  castPaperSeal(p, skill, radius) {
    this.addZone({ type: 'paperSeal', x: p.x, y: p.y, r: radius, t: skill.delay, max: skill.delay,
      dmg: skill.damage * p.st.might, wid: 'seal', color: skill.color }, p);
    this.play('activeWard');
  },

  castFrostBind(p, skill, radius) {
    for (const e of this.enemies) {
      if (e.dead || e.boss || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 > (radius + e.r) ** 2) continue;
      if (e.elite) this.slowEnemy(e, skill.slow, skill.duration);
      else e.frozen = Math.max(e.frozen, skill.duration);
    }
    this.fx.push({ type: 'activeWard', x: p.x, y: p.y, r: radius, life: 0.52, max: 0.52, c: skill.color });
    this.play('frost');
  },

  castLifePaper(p, skill, radius) {
    const healed = Math.min(p.st.maxHp - p.hp, Math.round(p.st.maxHp * skill.heal));
    p.hp += healed;
    this.texts.push({ x: p.x, y: p.y - 27, s: `+${Math.ceil(healed)}`, life: 0.9, c: skill.color });
    this.fx.push({ type: 'boom', x: p.x, y: p.y, r: radius, life: 0.44, max: 0.44, c: skill.color });
    this.play('mango');
  },

  castGhostPierce(p, skill, reach, input) {
    const [dx, dy] = activeDirection(p, input);
    this.addProj({ x: p.x, y: p.y, vx: dx * skill.speed, vy: dy * skill.speed, r: 12,
      life: reach / skill.speed, pierce: skill.pierce, dmg: skill.damage * p.st.might,
      wid: 'ghostPierce', look: 'lance', color: skill.color, kb: 0 }, p);
    this.play('activeWard');
  },

  updatePaperSeal(zone, dt) {
    zone.t -= dt;
    if (zone.t > 0) return true;
    this.aoe(zone.x, zone.y, zone.r, zone.dmg, zone.wid, 0, zone.owner);
    this.fx.push({ type: 'boom', x: zone.x, y: zone.y, r: zone.r, life: 0.42, max: 0.42, c: zone.color });
    this.burst(zone.x, zone.y, zone.color, 10);
    this.play('boom');
    return false;
  },
};
