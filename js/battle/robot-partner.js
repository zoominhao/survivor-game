'use strict';

const RobotPartner = (() => {
  const stop = { x: 0, y: 0 };
  const roles = {
    guard: { name: '近身护卫', spacing: 55, range: 88, orbit: 3 },
    flank: { name: '侧翼游击', spacing: 78, range: 112, orbit: 12 },
    range: { name: '远程支援', spacing: 104, range: 158, orbit: 7 },
  };
  const roster = { ella: 'range', tuan: 'flank', echo: 'flank', xiaoxiao: 'guard', zhu: 'range', bron: 'guard', nova: 'range', sain: 'flank',
    ruo: 'range', wen: 'guard', shao: 'guard', du: 'flank', su: 'range', yan: 'flank' };

  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function pick(leader, last, random = Math.random) {
    const pool = Object.keys(CHARS).filter(id => id !== leader && id !== last);
    return pool[Math.floor(random() * pool.length)];
  }

  function smartPickup(g, p, leader, low, field) {
    let target = null, best = Infinity;
    const health = p.hp / p.st.maxHp;
    const hasPriority = leader.hp <= 0 || leader.hp / leader.st.maxHp > health;
    const candidates = low ? (hasPriority ? g.pickups : []) : g.gems;
    for (const item of candidates) {
      if (low ? item.type !== 'heart' : item.mag) continue;
      const d = distance(p, item);
      if (d > 130 || d >= best || (leader.hp > 0 && distance(leader, item) > 180)) continue;
      if (RobotThreats.contactRisk(field, item.x, item.y, RobotThreats.horizon) > 16) continue;
      best = d;
      target = item;
    }
    return target;
  }

  function selectGoal(g, p, leader, brain, field) {
    const d = distance(p, leader), low = p.hp < p.st.maxHp * 0.55;
    if (leader.hp <= 0 && !g.rescue.used) return { type: 'rescue', at: leader, range: 24 };
    const follow = g.signals[0]?.id === 'follow' && g.signals[0].until > g.time;
    const heart = low && smartPickup(g, p, leader, true, field);
    if (heart) return { type: 'collect', at: heart, range: 0 };
    const foe = field.enemies.reduce((best, e) => !best || distance(p, e) < distance(p, best) ? e : best, null);
    if (low && foe) {
      const a = Math.atan2(p.y - foe.y, p.x - foe.x);
      return { type: 'retreat', at: { x: p.x + Math.cos(a) * 105, y: p.y + Math.sin(a) * 105 }, range: 0 };
    }
    if (leader.hp <= 0) return foe ? { type: 'kite', at: foe, range: brain.role.range } : { type: 'hold', at: p, range: 0 };
    if (follow || d > 163) return { type: 'regroup', at: leader, range: follow ? 49 : brain.role.spacing };
    const gem = !low && smartPickup(g, p, leader, false, field);
    if (gem) return { type: 'collect', at: gem, range: Math.max(0, p.st.magnet - 12) };
    if (foe) return { type: 'kite', at: foe, range: brain.role.range };
    return { type: 'regroup', at: leader, range: brain.role.spacing };
  }

  function goalCost(p, leader, goal, brain, x, y) {
    const dTarget = Math.hypot(x - goal.at.x, y - goal.at.y);
    const leash = leader.hp > 0 ? Math.max(0, Math.hypot(x - leader.x, y - leader.y) - 173) * 0.42 : 0;
    if (goal.type === 'hold') return leash;
    if (goal.type === 'collect' || goal.type === 'retreat') return Math.max(0, dTarget - goal.range) * 0.5 + leash;
    const gap = Math.abs(dTarget - goal.range);
    let cost = Math.max(0, gap - 12) * (goal.type === 'rescue' ? 0.77 : 0.43) + leash;
    if (goal.type === 'kite' && gap < 38) {
      const angle = Math.atan2(p.y - goal.at.y, p.x - goal.at.x);
      const tangent = ((y - p.y) * Math.cos(angle) - (x - p.x) * Math.sin(angle)) * brain.side;
      cost -= U.clamp(tangent / 62, -1, 1) * brain.role.orbit;
    }
    return cost;
  }

  function chooseHeading(g, p, leader, brain) {
    const field = RobotThreats.scan(g, p), goal = selectGoal(g, p, leader, brain, field);
    const stationaryRisk = RobotThreats.pathRisk(field, p);
    if (goal.type === 'rescue' && distance(p, leader) <= RESCUE_RADIUS - 5 && stationaryRisk < 12) {
      return stop;
    }
    const pace = goal.type === 'collect' && stationaryRisk < 30 ?
      U.clamp((distance(p, goal.at) - goal.range) / (p.st.speed * RobotThreats.horizon), 0.34, 1) : 1;
    const base = Math.atan2(goal.at.y - p.y, goal.at.x - p.x), r = CFG.PLAYER_R;
    const at = (x, y, t) => Terrain.obstacleAt(p.x + x * p.st.speed * t, p.y + y * p.st.speed * t, r, g.stage);
    const steps = [0.12, 0.27, 0.4, RobotThreats.horizon];
    const blocked = (x, y) => steps.some(t => at(x, y, t));
    const canDetour = (goal.type === 'regroup' || goal.type === 'rescue') && distance(p, goal.at) > goal.range + 26 &&
      blocked(Math.cos(base), Math.sin(base));
    let best = stop, bestScore = goalCost(p, leader, goal, brain, p.x, p.y) + stationaryRisk;
    let detour = stop, detourScore = Infinity;
    for (let i = 0; i < 16; i++) {
      const a = base + i * TAU / 16, x = pace * Math.cos(a), y = pace * Math.sin(a);
      if (blocked(x, y)) continue;
      const vx = x * p.st.speed, vy = y * p.st.speed;
      const endX = p.x + vx * RobotThreats.horizon, endY = p.y + vy * RobotThreats.horizon;
      const risk = RobotThreats.pathRisk(field, p, vx, vy);
      const score = goalCost(p, leader, goal, brain, endX, endY) + risk + 1.8 - (x * brain.move.x + y * brain.move.y);
      if (score < bestScore) { bestScore = score; best = { x, y }; }
      if (canDetour && Math.cos(a - base) >= -0.001 && risk <= stationaryRisk + 5 && score < detourScore) {
        detourScore = score; detour = { x, y };
      }
    }
    return best !== stop ? best : detour;
  }

  return {
    pick,
    start(char) { return { next: 0, move: stop, role: roles[roster[char]] || roles.range, side: Math.random() < 0.5 ? -1 : 1 }; },
    input(g) {
      if (g.partner.hp <= 0) return stop;
      const brain = g.robotBrain;
      if (g.time >= brain.next || brain.leaderDown !== (g.player.hp <= 0)) {
        brain.next = g.time + 0.09;
        brain.move = chooseHeading(g, g.partner, g.player, brain);
        brain.leaderDown = g.player.hp <= 0;
      }
      return brain.move;
    },
  };
})();
