'use strict';

const BOSS_ARRIVAL = 1.45;
const BOSS_AFTERGLOW = 6;
const BOSS_REWARD_BEAT = 1.15;
const BRIDAL_FAN_HALF_ANGLE = 0.68;

const BOSS_TYPES = {
  nightmare: { name: '夜魇', speed: 62, sound: 'boss' },
  coffinKing: { name: '棺山尸王', speed: 46, sound: 'coffinKingArrival' },
  bridalQueen: { name: '冥轿鬼后', speed: 58, sound: 'bridalQueenArrival' },
};

const BossBattle = {
  summonBoss(kind, tier, x, y, sceneId, plan = 'normal') {
    const def = BOSS_TYPES[kind];
    const tactic = BOSS_TACTICS[kind];
    const arena = sceneId ? { id: sceneId, from: Environment.landscape(Environment.forBattle(this)) } : null;
    const boss = this.spawnEnemy('boss', x, y);
    Object.assign(boss, {
      boss: true, kind, name: def.name, tier, plan, [tactic.stat]: tactic.values[plan],
      bounty: plan === 'challenge' ? tactic.bounty : 0, hp: BOSS_HP[tier], maxHp: BOSS_HP[tier],
      speed: boss.speed * def.speed / ENEMIES.boss.speed,
      r: 44 + tier * 6, dmg: 14 + tier * 7, cd: 3, phase: '', arrivedAt: this.time, arena,
    });
    this.boss = boss;
    this.play(def.sound);
    this.emit('banner', `${def.name}降临`);
    return boss;
  },

  updateBossAttack(boss, dt, dx, dy, dist) {
    if (boss.kind === 'coffinKing') this.updateCoffinKing(boss, dt, dx, dy, dist);
    else if (boss.kind === 'bridalQueen') this.updateBridalQueen(boss, dt, dx, dy, dist);
    else this.updateNightmare(boss, dt, dx, dy);
  },

  updateCoffinKing(boss, dt, dx, dy, dist) {
    boss.cd -= dt;
    if (boss.cd > 0) return;
    if (boss.phase !== 'sealWind') {
      if (dist > 310) { boss.cd = 0.35; return; }
      const p = this.player;
      boss.phase = 'sealWind'; boss.windTime = boss.cd = 1.04;
      boss.seals = [-1, 0, 1].map(i => ({ x: p.x - dy * i * 125, y: p.y + dx * i * 125, r: boss.sealRadius }));
      this.playNearby('coffinSeal', boss, 450);
      return;
    }
    boss.phase = ''; boss.cd = 3.4;
    const p = this.player;
    for (const seal of boss.seals) {
      this.fx.push({ type: 'boom', ...seal, life: 0.45, max: 0.45, c: '#d2cb86' });
      this.burst(seal.x, seal.y, '#d8bf77', 7);
      if (Math.hypot(p.x - seal.x, p.y - seal.y) < seal.r + CFG.PLAYER_R) this.hurtPlayer(boss.dmg, boss);
    }
    boss.seals = [];
    this.shake = Math.max(this.shake, 3.5);
    this.playNearby('boom', boss, 450);
  },

  updateBridalQueen(boss, dt, dx, dy, dist) {
    boss.cd -= dt;
    if (boss.cd > 0) return;
    if (boss.phase !== 'fanWind') {
      if (dist > 360) { boss.cd = 0.35; return; }
      Object.assign(boss, { phase: 'fanWind', cd: 0.92, attackAngle: Math.atan2(dy, dx) });
      this.playNearby('bridalBell', boss, 480);
      return;
    }
    boss.phase = ''; boss.cd = 2.8;
    const wings = boss.fanWings;
    for (let i = -wings; i <= wings && this.ebullets.length < 80; i++) {
      const a = boss.attackAngle + i * BRIDAL_FAN_HALF_ANGLE / wings;
      this.ebullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 175, vy: Math.sin(a) * 175,
        r: 7, dmg: boss.dmg * 0.65, life: 3.5, look: 'weddingPaper' });
    }
    this.playNearby('weddingPaper', boss, 480);
  },

  bossCleared(boss) {
    for (let i = 0; i < 12; i++) this.dropGem(boss.x + U.rand(-50, 50), boss.y + U.rand(-50, 50), 8);
    this.lastBossArena = boss.arena ? Environment.landscape(Environment.forBattle(this)) : null;
    if (this.boss === boss) this.boss = null;
    this.bossClearAt = this.time;

    const p = this.player;
    const healed = Math.min(p.st.maxHp - p.hp, p.st.maxHp * 0.25);
    p.hp += healed;
    p.iframe = Math.max(p.iframe, BOSS_REWARD_BEAT);
    const xp = this.collectAllGems();
    const reward = [`+${Number((xp * p.st.growth).toFixed(1))} 经验`];
    if (healed > 0) reward.push(`+${Math.round(healed)} 生命`);
    if (boss.bounty) {
      p.coins += boss.bounty;
      reward.push(`+${boss.bounty} 赏金`);
    }
    this.texts.push({ x: p.x, y: p.y - 28, s: reward.join(' · '), life: 1.2, c: '#d4f5b1' });
    this.fx.push({ type: 'boom', x: p.x, y: p.y, r: 92, life: 0.65, max: 0.65, c: '#fff0b9' });
    this.burst(p.x, p.y, '#f5dd9f', 22);
    this.shake = 10;
    this.play('nightmareClear');
    this.emit('banner', `${boss.name || '夜魇'}已散 · 破晓余光`);
  },
};
