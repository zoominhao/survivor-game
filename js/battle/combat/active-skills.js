'use strict';

const ACTIVE_SKILLS = {
  dash: { cooldown: 6, color: '#c9f1e7', speed: 520, duration: 0.18, guard: 0.32 },
  ward: { cooldown: 0.8, initial: 1, capacity: 3, color: '#f7d894', radius: 138, slow: 0.55, duration: 2.4 },
};

const BattleActives = {
  canUseActive(slot, id) {
    if (this.state !== 'playing' || (slot !== 0 && slot !== 1) || typeof id !== 'string' || !Object.hasOwn(ACTIVE_SKILLS, id)) return false;
    const p = this.players[slot];
    return !!p && p.hp > 0 && (p.activeReady[id] ?? 0) <= this.time && (id !== 'ward' || p.wardCharges > 0);
  },

  useActive(slot, id, input = {}) {
    if (!this.canUseActive(slot, id)) return false;
    const p = this.players[slot];
    const skill = ACTIVE_SKILLS[id];
    p.activeReady[id] = this.time + skill.cooldown;
    if (id === 'dash') this.beginDash(p, input, skill);
    else {
      p.wardCharges--;
      this.castWard(p, skill);
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

  castWard(p, skill) {
    const near = (e, radius) => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= radius ** 2;
    const radius = skill.radius * (RouteFork.active(this, 'bamboo') ? ROUTE_BRANCHES.bamboo.radiusBoost : 1);
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
};
