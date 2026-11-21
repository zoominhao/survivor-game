'use strict';

// 经验宝石和战利品。
const BattleDrops = {
  dropGem(x, y, v) {
    if (v <= 0) return;
    if (this.gems.length >= CFG.MAX_GEMS) {
      // 宝石过多时把经验并入已有宝石,避免对象无限增长
      this.gems[(Math.random() * this.gems.length) | 0].v += v;
      return;
    }
    this.gems.push({ x: x + U.rand(-4, 4), y: y + U.rand(-4, 4), v, sp: 0, mag: false });
  },

  // ---------- 掉落物 ----------
  gainXp(v) {
    const p = this.player;
    p.xp += v * p.st.growth;
    while (p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed;
      p.level++;
      p.xpNeed = this.xpFor(p.level);
      this.pending++;
    }
  },

  collectAllGems() {
    const xp = this.gems.reduce((sum, gem) => sum + gem.v, 0);
    this.gems.length = 0;
    if (xp > 0) this.gainXp(xp);
    return xp;
  },

  updatePickups(dt) {
    const p = this.player, mr2 = p.st.magnet * p.st.magnet;
    // 经验宝石:进入拾取范围后加速飞向玩家
    const gs = this.gems;
    let n = 0;
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i];
      const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
      if (g.mag || d2 < mr2) {
        g.mag = true;
        g.sp = Math.min(760, (g.sp || 140) + 1100 * dt);
        const d = Math.sqrt(d2) || 1, step = g.sp * dt;
        if (d <= Math.max(16, step)) { this.gainXp(g.v); this.play('gem'); continue; }
        g.x += dx / d * step; g.y += dy / d * step;
      }
      gs[n++] = g;
    }
    gs.length = n;

    const ps = this.pickups;
    n = 0;
    for (let i = 0; i < ps.length; i++) {
      const k = ps[i];
      const dx = p.x - k.x, dy = p.y - k.y, d2 = dx * dx + dy * dy;
      if (k.type === 'chest' && k.boss && this.time - this.bossClearAt < BOSS_REWARD_BEAT) {
        ps[n++] = k;
        continue;
      }
      if (k.type === 'coin' && (k.mag || d2 < mr2)) {
        k.mag = true;
        const d = Math.sqrt(d2) || 1, step = 420 * dt;
        k.x += dx / d * Math.min(step, d); k.y += dy / d * Math.min(step, d);
      }
      if (d2 < 24 * 24) {
        if (k.type === 'coin') { p.coins += k.v * p.st.greed; this.play('coin'); }
        else if (k.type === 'heart') { p.hp = Math.min(p.st.maxHp, p.hp + p.st.maxHp * 0.25); this.play('chest'); }
        else if (k.type === 'vacuum') { for (const g of gs) g.mag = true; this.play('frost'); }
        else if (k.type === 'chest') { this.openChest(k.boss, k.bossName); }
        continue;
      }
      ps[n++] = k;
    }
    ps.length = n;
  },
};
