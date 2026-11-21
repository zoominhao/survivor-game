'use strict';

const RobotPartner = (() => {
  const stop = { x: 0, y: 0 };

  function bossRisk(b, x, y) {
    if (!b || b.dead) return 0;
    const dx = x - b.x, dy = y - b.y;
    if (b.phase === 'wind' || b.phase === 'charge') {
      const ahead = dx * b.cx + dy * b.cy, side = Math.abs(dx * b.cy - dy * b.cx);
      return ahead > -14 && ahead < 285 ? Math.max(0, b.r + 31 - side) * 2.5 : 0;
    }
    if (b.phase === 'sealWind') return (b.seals || []).reduce((risk, s) => risk + Math.max(0, s.r + 27 - Math.hypot(x - s.x, y - s.y)) * 2.6, 0);
    if (b.phase === 'fanWind') {
      const delta = Math.atan2(dy, dx) - b.attackAngle;
      if (Math.hypot(dx, dy) < 300 && Math.cos(delta) > Math.cos(BRIDAL_FAN_HALF_ANGLE + 0.12)) return 58;
    }
    return 0;
  }

  function bulletRisk(b, x, y) {
    const dx = x - b.x, dy = y - b.y, square = b.vx * b.vx + b.vy * b.vy;
    const ahead = square > 0 ? U.clamp((dx * b.vx + dy * b.vy) / square, 0, Math.min(0.42, b.life)) : 0;
    return Math.max(0, b.r + 20 - Math.hypot(dx - b.vx * ahead, dy - b.vy * ahead)) * 2.3;
  }

  function chooseHeading(g, p, leader, previous) {
    const needRescue = leader.hp <= 0 && !g.rescue.used;
    const follow = g.signals[0]?.id === 'follow' && g.signals[0].until > g.time;
    const ideal = needRescue ? 24 : follow ? 52 : 76;
    const base = Math.atan2(leader.y - p.y, leader.x - p.x);
    const goalDistance = Math.hypot(p.x - leader.x, p.y - leader.y), r = CFG.PLAYER_R;
    const canDetour = (needRescue || leader.hp > 0) && goalDistance > ideal + 26 && [24, 52].some(d =>
      Terrain.obstacleAt(p.x + Math.cos(base) * d, p.y + Math.sin(base) * d, r, g.landscape));
    const enemies = g.enemies.filter(e => !e.dead && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 205 ** 2);
    const bullets = g.ebullets.filter(b => b.life > 0 && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 205 ** 2);
    const risk = (x, y) => bossRisk(g.boss, x, y) +
      enemies.reduce((sum, e) => sum + Math.max(0, e.r + 32 - Math.hypot(e.x - x, e.y - y)) * 1.6, 0) +
      bullets.reduce((sum, b) => sum + bulletRisk(b, x, y), 0);
    const currentRisk = risk(p.x, p.y);
    if (needRescue && goalDistance <= RESCUE_RADIUS - 5 && currentRisk < 14) return stop;

    const distanceCost = (x, y) => {
      if (leader.hp <= 0 && !needRescue) return 0;
      const distance = Math.hypot(x - leader.x, y - leader.y);
      return Math.max(0, Math.abs(distance - ideal) - 12) * (needRescue ? 0.78 : 0.47);
    };
    let best = stop, bestScore = distanceCost(p.x, p.y) + currentRisk;
    let detour = stop, detourScore = Infinity;
    for (let i = 0; i < 12; i++) {
      const a = base + i * TAU / 12, x = Math.cos(a), y = Math.sin(a);
      const midX = p.x + x * 24, midY = p.y + y * 24, endX = p.x + x * 52, endY = p.y + y * 52;
      if (Terrain.obstacleAt(midX, midY, r, g.landscape) || Terrain.obstacleAt(endX, endY, r, g.landscape)) continue;
      const pathRisk = Math.max(risk(endX, endY), risk(midX, midY) * 0.72);
      const score = distanceCost(endX, endY) + pathRisk +
        2 - 1.2 * (x * previous.x + y * previous.y);
      if (score < bestScore) { bestScore = score; best = { x, y }; }
      // 紧贴障碍时，安全的侧移可能暂时不缩短与队友的距离；保留这样的绕行方向。
      if (canDetour && Math.cos(a - base) >= -0.001 && pathRisk <= currentRisk + 8 && score < detourScore) {
        detourScore = score; detour = { x, y };
      }
    }
    return best !== stop ? best : detour;
  }

  return {
    input(g) {
      if (g.partner.hp <= 0) return stop;
      const brain = g.robotBrain;
      if (g.time >= brain.next || brain.leaderDown !== (g.player.hp <= 0) || brain.landscape !== g.landscape) {
        brain.next = g.time + 0.12;
        brain.move = chooseHeading(g, g.partner, g.player, brain.move);
        brain.leaderDown = g.player.hp <= 0;
        brain.landscape = g.landscape;
      }
      return brain.move;
    },
  };
})();
