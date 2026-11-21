'use strict';

// 双人局沿用单人战斗，房主同时模拟两名守夜人。
const BattleCoop = {
  makePlayer(char, slot, x = 0) {
    const m = this.save.data.meta;
    const p = {
      slot, x, y: 0, dirx: 1, diry: 0, face: 1, moving: false, walkT: 0,
      iframe: 0, hp: 0, level: 1, xp: 0, xpNeed: this.xpFor(1), pending: 0, char,
      weapons: [], passives: [], evolved: {}, kills: 0, coins: 0, dmgBy: {},
      st: {}, rerolls: m.reroll, revives: m.revive, activeReady: { dash: 0, ward: 0 }, dash: null,
      wardCharges: ACTIVE_SKILLS.ward.initial,
      paperSkill: !this.coop && canEquipPaperSkill(this.save.data, this.save.data.paperSkill) ? this.save.data.paperSkill : 'ward',
    };
    this.recalc(p);
    p.hp = p.st.maxHp;
    this.addWeapon(CHARS[char].weapon, p);
    return p;
  },

  nearestPlayer(x, y, rangeFor = null) {
    let best = null, dist = Infinity;
    for (const p of this.players) {
      if (p.hp <= 0) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < dist && (!rangeFor || d < rangeFor(p) ** 2)) { best = p; dist = d; }
    }
    return best;
  },

  stepBond() {
    if (!this.bond) return;
    const [a, b] = this.players;
    const range = this.bondActive ? BOND_BREAK_RANGE : BOND_JOIN_RANGE;
    const active = a.hp > 0 && b.hp > 0 && (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= range ** 2;
    if (active === this.bondActive) return;
    this.bondActive = active;
    for (const p of this.players) this.recalc(p);
  },

  movePlayer(p, input, dt) {
    const dash = p.dash;
    const { x: ix = 0, y: iy = 0 } = dash || input;
    const il = Math.hypot(ix, iy), { speed, regen, maxHp } = p.st;
    p.moving = p.hp > 0 && il > 0.08;
    if (p.hp <= 0) { p.dash = null; return; }
    if (p.moving) {
      const k = il > 1 ? 1 / il : 1, { x, y } = p;
      const step = dash ? ACTIVE_SKILLS.dash.speed * Math.min(dt, dash.left) : speed * dt;
      Terrain.move(p, ix * k * step, iy * k * step, CFG.PLAYER_R, 0, this.stage);
      p.dirx = ix / il; p.diry = iy / il;
      if (Math.abs(ix) > 0.05) p.face = ix < 0 ? -1 : 1;
      p.moving = Math.hypot(p.x - x, p.y - y) > 0.05;
      if (p.moving) p.walkT += dt;
    }
    if (dash) {
      dash.trace.x2 = p.x; dash.trace.y2 = p.y;
      dash.left -= dt;
      if (dash.left < 1e-8) p.dash = null;
    }
    if (p.iframe > 0) p.iframe -= dt;
    if (regen > 0 && p.hp < maxHp) p.hp = Math.min(maxHp, p.hp + regen * dt);
  },

  // 武器函数仍通过 g.player 取施放者，退出时恢复房主，不改变界面所见的玩家。
  stepLoadout(p, dt) {
    if (p.hp <= 0) return;
    const previous = this.player;
    this.player = p;
    try {
      for (const w of p.weapons) WeaponFns[WEAPONS[w.id].kind](this, w, w.s, dt);
    } finally { this.player = previous; }
  },

  pendingFor(p) { return p.slot === 1 ? p.pending : this.pending; },
  addPending(p, n) { if (p.slot === 1) p.pending += n; else this.pending += n; },

  nextLevelUp() {
    if (this.state !== 'playing' || this.time - this.bossClearAt < BOSS_REWARD_BEAT) return;
    const p = this.players.find(p => p.hp > 0 && this.pendingFor(p) > 0);
    if (!p) return;
    if (this.robot && p === this.partner) {
      while (this.pendingFor(p) > 0) {
        const choices = this.buildChoices(3, p);
        this.applyChoice(choices[recommendUpgrade(choices, p).index], p);
        this.addPending(p, -1);
      }
      return; // 机器人用同一套升级池选卡，但不会停住双人战斗。
    }
    this.levelPlayer = p;
    this.state = 'levelup';
    this.choices = this.buildChoices(3, p);
    this.play('level');
    this.emit('levelup');
  },
};
