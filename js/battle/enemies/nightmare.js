'use strict';

const NightmareBattle = {
  updateNightmare(boss, dt, dx, dy) {
    boss.cd -= dt;
    if (boss.cd > 0) return;
    if (boss.phase === 'charge') {
      boss.phase = '';
      boss.cd = 3.5;
    } else if (boss.phase === 'wind') {
      boss.phase = 'charge';
      boss.cd = 0.8;
      this.playNearby('bossCharge', boss, 480);
      if (boss.tier >= 1) {
        const count = 10 + boss.tier * 4;
        for (let i = 0; i < count; i++) {
          const a = i / count * TAU;
          this.ebullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
            r: 6, dmg: boss.dmg * 0.6, life: 5 });
        }
      }
    } else {
      // 预警开始时锁定冲锋方向，给玩家横向躲避的时间。
      Object.assign(boss, { phase: 'wind', cd: 0.8, cx: dx, cy: dy });
      this.playNearby('bossWind', boss, 420);
    }
  },
};
