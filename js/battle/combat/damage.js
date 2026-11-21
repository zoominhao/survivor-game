'use strict';

// 命中、伤害、护盾和死亡。
const BattleDamage = {
  canHit(e, key, interval) {
    if (this.coop && this.player.slot === 1) key = `p2:${key}`;
    const t = e.h[key];
    if (t !== undefined && this.time - t < interval) return false;
    e.h[key] = this.time;
    return true;
  },

  slowEnemy(e, f, dur) {
    if (e.boss) f *= 0.5;
    if (e.slowT <= 0 || f >= e.slow) e.slow = f;
    e.slowT = Math.max(e.slowT, dur);
  },

  damageEnemy(e, dmg, wid, kx, ky, kb, p = this.player) {
    if (e.dead) return;
    dmg = Math.max(1, Math.round(dmg * U.rand(0.9, 1.1)));
    e.hp -= dmg;
    e.flash = 0.08;
    p.dmgBy[wid] = (p.dmgBy[wid] || 0) + dmg;
    if (kb) {
      const l = Math.hypot(kx, ky) || 1, k = kb * (1 - e.kbRes);
      e.kx += kx / l * k; e.ky += ky / l * k;
    }
    if (this.texts.length < 70) {
      this.texts.push({ x: e.x + U.rand(-6, 6), y: e.y - e.r, s: String(dmg), life: 0.6, c: '#fff' });
    }
    this.play('hit');
    if (e.hp <= 0) this.killEnemy(e, p);
  },

  aoe(x, y, r, dmg, wid, kb, p = this.player) {
    this.eachEnemyNear(x, y, r, e => this.damageEnemy(e, dmg, wid, e.x - x, e.y - y, kb, p));
  },

  killEnemy(e, p = this.player) {
    if (e.dead) return;
    e.dead = true;
    p.kills++;
    this.dropGem(e.x, e.y, e.xp);
    const r = Math.random();
    if (r < 0.05) this.pickups.push({ type: 'coin', x: e.x, y: e.y, v: 1 });
    else if (r < 0.057) this.pickups.push({ type: 'heart', x: e.x, y: e.y });
    else if (r < 0.0595 && !this.pickups.some(k => k.type === 'vacuum')) this.pickups.push({ type: 'vacuum', x: e.x, y: e.y });
    if (e.elite || e.boss) {
      this.pickups.push({ type: 'wardPaper', x: e.x + 16, y: e.y - 6 });
      this.pickups.push({ type: 'chest', x: e.x, y: e.y, boss: e.boss, bossName: e.name });
    }
    if (e.boss) this.bossCleared(e, p);
    else if (e.elite) this.trackContract('eliteHunt');
    this.burst(e.x, e.y, ENEMIES[e.type].color, e.boss ? 30 : e.elite ? 12 : 4);
    if (e.type === 'bride') this.playNearby('bridalFade', e, 310);
    else if (!e.boss) this.play('kill');
  },

  hurtPlayer(dmg, src, p = this.player) {
    if (p.hp <= 0 || p.iframe > 0 || this.practiceInvincible || this.state !== 'playing') return;
    const paper = p.weapons.find(w => w.id === 'exampaper' && w.guards > 0);
    if (paper) { this.consumeExamGuard(paper, p); return; }
    const care = p.weapons.find(w => w.id === 'skincare' && w.on > 0);
    const bond = this.bondActive && this.bond.stat === 'incoming' ? this.bond.factor : 1;
    dmg = Math.max(1, Math.round((dmg - p.st.armor) * (care ? 1 - care.s.reduce : 1) * bond));
    p.hp -= dmg;
    this.interruptRescue(p);
    p.iframe = src && src.boss ? 0.7 : 0.3; // 被 Boss 撞到后给更长的无敌时间,避免贴身秒杀
    this.shake = Math.max(this.shake, 5);
    this.texts.push({ x: p.x, y: p.y - 20, s: '-' + dmg, life: 0.7, c: '#ff6b6b' });
    this.play('hurt');
    // 荆棘壁垒的反伤
    if (src) {
      for (const w of p.weapons) {
        if (w.s.thorns) this.damageEnemy(src, w.s.thorns * p.st.might, w.id, src.x - p.x, src.y - p.y, 200, p);
      }
    }
    if (p.hp <= 0) this.die(p);
  },

  consumeExamGuard(w, p = this.player) {
    const s = w.s;
    if (--w.guards === 0) w.timer = s.cd * p.st.cd;
    p.iframe = 0.3; // 同一波贴身攻击不会在同一帧消耗两张试卷。
    const radius = s.radius * p.st.area, color = WEAPONS[w.id].color;
    this.eachEnemyNear(p.x, p.y, radius, e => this.slowEnemy(e, s.slow, s.chill));
    this.fx.push({ type: 'boom', x: p.x, y: p.y, r: radius, life: 0.34, max: 0.34, c: color });
    this.burst(p.x, p.y, color, 9);
    this.texts.push({ x: p.x, y: p.y - 22, s: '抵挡', life: 0.7, c: color });
    this.play('paper');
  },

  die(p = this.player) {
    if (p.revives > 0) {
      // 余烬复活:回半血、短暂无敌、震开周围敌人
      p.revives--;
      p.hp = p.st.maxHp * 0.5;
      p.iframe = 2.5;
      this.aoe(p.x, p.y, 260, 60, 'revive', 600, p);
      this.fx.push({ type: 'boom', x: p.x, y: p.y, r: 260, life: 0.5, max: 0.5, c: '#ffd166' });
      this.shake = 12;
      this.emit('banner', '余烬重燃');
      return;
    }
    p.hp = 0;
    this.stepBond();
    if (this.coop && this.players.some(other => other.hp > 0)) {
      p.moving = false;
      if (this.robot && p === this.partner) this.sendSignal(p.slot, 'help');
      const hint = this.rescue.used ? '击败 Boss 可唤回队友' : '靠近站稳 2 秒可扶救';
      this.emit('banner', `${p.slot + 1} 号守夜人倒下 · ${hint}`);
      return;
    }
    this.finish(false);
  },
};
