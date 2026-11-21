'use strict';

// 预估短时间内的接触判定。选择移动前模拟路线，但不改动任何实体。
const RobotThreats = (() => {
  const horizon = 0.52;
  const samples = [[0.13, 0.72], [0.31, 0.9], [horizon, 1]];

  function scan(g, p) {
    const near = (e, radius) => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < radius ** 2;
    const enemies = g.enemies.filter(e => !e.dead && near(e, 235)).map(e => {
      const target = g.enemyTarget(e);
      const predicted = forecastEnemy(g, e, horizon, target);
      const pursues = !e.boss && !ENEMIES[e.type].ranged && e.frozen <= 0 && target === p;
      return { x: e.x, y: e.y, r: e.r + CFG.PLAYER_R,
        vx: (predicted.x - e.x) / horizon, vy: (predicted.y - e.y) / horizon,
        pursuit: pursues ? e.speed * (e.slowT > 0 ? 1 - e.slow : 1) : 0 };
    });
    const bullets = g.ebullets.filter(b => b.life > 0 && near(b, 260));
    return { enemies, bullets, boss: g.boss, x: p.x, y: p.y };
  }

  function bossRisk(b, x, y) {
    if (!b || b.dead) return 0;
    const dx = x - b.x, dy = y - b.y;
    if (b.phase === 'wind' || b.phase === 'charge') {
      const ahead = dx * b.cx + dy * b.cy, side = Math.abs(dx * b.cy - dy * b.cx);
      return ahead > -14 && ahead < 300 ? Math.max(0, b.r + CFG.PLAYER_R + 23 - side) * 3 : 0;
    }
    if (b.phase === 'sealWind') {
      let risk = 0;
      for (const s of b.seals || []) risk += Math.max(0, s.r + CFG.PLAYER_R + 24 - Math.hypot(x - s.x, y - s.y)) * 3;
      return risk;
    }
    if (b.phase === 'fanWind' && Math.hypot(dx, dy) < 340) {
      const cosine = Math.cos(Math.atan2(dy, dx) - b.attackAngle);
      if (cosine > Math.cos(BRIDAL_FAN_HALF_ANGLE + 0.15)) return 62;
    }
    return 0;
  }

  function contactRisk(field, x, y, t) {
    let risk = bossRisk(field.boss, x, y);
    for (const e of field.enemies) {
      let ex = e.x + e.vx * t, ey = e.y + e.vy * t;
      if (e.pursuit) {
        // 追近身怪会转头。用路线中点修正它的方向，避免把贴着怪擦过误判为安全。
        const dx = (field.x + x) / 2 - e.x, dy = (field.y + y) / 2 - e.y;
        const travel = Math.min(1, e.pursuit * t / (Math.hypot(dx, dy) || 1));
        ex = e.x + dx * travel; ey = e.y + dy * travel;
      }
      const clearance = Math.hypot(x - ex, y - ey) - e.r;
      risk += Math.max(0, 30 - clearance) * 1.5;
      if (clearance <= 0) risk += 95 - clearance * 3;
    }
    return risk;
  }

  function pathRisk(field, p, vx = 0, vy = 0) {
    let risk = 0;
    for (const [t, weight] of samples) risk = Math.max(risk, contactRisk(field, p.x + vx * t, p.y + vy * t, t) * weight);
    // 检查弹幕与路线的相对线段，而不是只看目的地有没有弹幕。
    for (const b of field.bullets) {
      const x = b.x - p.x, y = b.y - p.y, dx = b.vx - vx, dy = b.vy - vy;
      const square = dx * dx + dy * dy;
      const t = square > 0 ? U.clamp(-(x * dx + y * dy) / square, 0, Math.min(horizon, b.life)) : 0;
      const clearance = Math.hypot(x + dx * t, y + dy * t) - b.r - CFG.PLAYER_R;
      risk += Math.max(0, 15 - clearance) * 2;
      if (clearance <= 0) risk += 120;
    }
    return risk;
  }

  return { horizon, scan, contactRisk, pathRisk };
})();
