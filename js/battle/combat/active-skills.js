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
};

const canEquipPaperSkill = (data, id) => typeof id === 'string' && Object.hasOwn(PAPER_SKILLS, id) &&
  (id === 'ward' || data.paperSkills?.[id] === true);

const BattleActives = {
  activeSkill(p, slot) { return slot === 'ward' ? PAPER_SKILLS[p.paperSkill ?? 'ward'] : ACTIVE_SKILLS.dash; },

  canUseActive(slot, id) {
    if (this.state !== 'playing' || (slot !== 0 && slot !== 1) || typeof id !== 'string' || !Object.hasOwn(ACTIVE_SKILLS, id)) return false;
    const p = this.players[slot];
    return !!p && p.hp > 0 && (p.activeReady[id] ?? 0) <= this.time && (id !== 'ward' || p.wardCharges > 0);
  },

  useActive(slot, id, input = {}) {
    if (!this.canUseActive(slot, id)) return false;
    const p = this.players[slot];
    const skill = this.activeSkill(p, id);
    p.activeReady[id] = this.time + skill.cooldown;
    if (id === 'dash') this.beginDash(p, input, skill);
    else {
      p.wardCharges--;
      const radius = skill.radius * (RouteFork.active(this, 'bamboo') ? ROUTE_BRANCHES.bamboo.radiusBoost : 1);
      this[skill.cast](p, skill, radius);
    }
    return true;
  },

  beginDash(p, { x = 0, y = 0 }, skill) {
    const length = Math.hypot(x, y), aimed = Number.isFinite(length) && length > 0.08;
    const trace = { type: 'dashTrace', x: p.x, y: p.y, x2: p.x, y2: p.y,
      r: 12, life: 0.34, max: 0.34, c: skill.color };
    p.dash = { x: aimed ? x / length : p.dirx, y: aimed ? y / length : p.diry, left: skill.duration, trace };
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
