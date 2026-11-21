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
    // 经验共享，装备和升级选择各自独立；倒下的队友也保留所得经验。
    if (RouteFork.active(this, 'rain')) v *= ROUTE_BRANCHES.rain.xp;
    for (const p of this.players) {
      p.xp += v * p.st.growth;
      while (p.xp >= p.xpNeed) {
        p.xp -= p.xpNeed;
        p.level++;
        p.xpNeed = this.xpFor(p.level);
        this.addPending(p, 1);
      }
    }
  },

  collectAllGems() {
    const xp = this.gems.reduce((sum, gem) => sum + gem.v, 0);
    this.gems.length = 0;
    if (xp > 0) this.gainXp(xp);
    return xp;
  },

  pickupWardPaper(item) {
    // 满额的守夜人不拦截符纸，附近还有空位的队友仍然能拾取。
    const p = this.nearestPlayer(item.x, item.y, member =>
      member.wardCharges < ACTIVE_SKILLS.ward.capacity && !(this.robot && member === this.partner) ? 24 : 0);
    if (!p) return false;
    p.wardCharges++;
    this.texts.push({ x: item.x, y: item.y - 15, s: '镇夜符 +1', life: 0.85, c: ACTIVE_SKILLS.ward.color });
    this.play('paper');
    return true;
  },

  updatePickups(dt) {
    // 经验宝石:进入拾取范围后加速飞向玩家
    const gs = this.gems;
    let n = 0;
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i];
      const p = this.coop ? this.nearestPlayer(g.x, g.y, g.mag ? null : p => p.st.magnet) : this.player;
      if (!p) { gs[n++] = g; continue; }
      const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
      if (g.mag || d2 < p.st.magnet ** 2) {
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
      if (k.type === 'wardPaper') {
        if (!this.pickupWardPaper(k)) ps[n++] = k;
        continue;
      }
      const p = this.coop ? this.nearestPlayer(k.x, k.y, k.type === 'coin' && !k.mag ? p => p.st.magnet : null) : this.player;
      if (!p) { ps[n++] = k; continue; }
      const dx = p.x - k.x, dy = p.y - k.y, d2 = dx * dx + dy * dy;
      if (k.type === 'chest' && k.boss && this.time - this.bossClearAt < BOSS_REWARD_BEAT) {
        ps[n++] = k;
        continue;
      }
      if (k.type === 'coin' && (k.mag || d2 < p.st.magnet ** 2)) {
        k.mag = true;
        const d = Math.sqrt(d2) || 1, step = 420 * dt;
        k.x += dx / d * Math.min(step, d); k.y += dy / d * Math.min(step, d);
      }
      if (d2 < 24 * 24) {
        if (k.type === 'coin') { p.coins += k.v * p.st.greed; this.play('coin'); }
        else if (k.type === 'heart') { p.hp = Math.min(p.st.maxHp, p.hp + p.st.maxHp * 0.25); this.play('chest'); }
        else if (k.type === 'vacuum') { for (const g of gs) g.mag = true; this.play('frost'); }
        else if (k.type === 'chest') { this.openChest(k.boss, k.bossName, p); }
        continue;
      }
      ps[n++] = k;
    }
    ps.length = n;
  },
};
