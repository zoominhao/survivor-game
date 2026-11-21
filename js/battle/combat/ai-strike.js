'use strict';

function forecastEnemy(g, e, delay) {
  const target = g.coop ? g.nearestPlayer(e.x, e.y) : g.player;
  if (!target || e.frozen > 0 || ['wind', 'sealWind', 'fanWind'].includes(e.phase)) return e;
  const step = e.speed * (e.slowT > 0 ? 1 - e.slow : 1) * delay;
  if (e.phase === 'charge') {
    return { x: e.x + e.cx * step * e.chargeSpeed, y: e.y + e.cy * step * e.chargeSpeed };
  }
  const dx = target.x - e.x, dy = target.y - e.y, dist = Math.hypot(dx, dy) || 1;
  const keep = ENEMIES[e.type].keep ?? e.r + CFG.PLAYER_R;
  const advance = dist < keep && ENEMIES[e.type].ranged ? -Math.min(step, keep - dist) : Math.min(step, Math.max(0, dist - keep));
  return { x: e.x + dx * advance / dist, y: e.y + dy * advance / dist };
}

// 探测未来落点，选择范围内预计能命中最多夜兽的位置；同分时保护离自己最近的一侧。
function planAiStrike(g, p, range, radius, delay) {
  const threats = [];
  for (const e of g.enemies) {
    if (e.dead) continue;
    const forecast = forecastEnemy(g, e, delay);
    const dist = (forecast.x - p.x) ** 2 + (forecast.y - p.y) ** 2;
    if (dist > (range + radius + e.r) ** 2) continue;
    threats.push({ x: forecast.x, y: forecast.y, dist, size: e.r });
  }
  let best = null, count = 0;
  for (const center of threats) {
    if (center.dist > range ** 2) continue;
    let hits = 0;
    for (const e of threats) {
      if ((e.x - center.x) ** 2 + (e.y - center.y) ** 2 < (radius + e.size) ** 2) hits++;
    }
    if (hits > count || (hits === count && center.dist < best?.dist)) { best = center; count = hits; }
  }
  return best;
}
