'use strict';

function folkLineNear(x, y, x1, y1, x2, y2, radius) {
  const dx = x2 - x1, dy = y2 - y1, square = dx * dx + dy * dy || 1;
  const t = U.clamp(((x - x1) * dx + (y - y1) * dy) / square, 0, 1);
  return (x - x1 - dx * t) ** 2 + (y - y1 - dy * t) ** 2 <= radius ** 2;
}

function eachFolkLineEnemy(g, a, b, width, fn) {
  g.eachEnemyNear((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, Math.hypot(b.x - a.x, b.y - a.y) * 0.5 + width, e => {
    if (folkLineNear(e.x, e.y, a.x, a.y, b.x, b.y, width + e.r)) fn(e);
  });
}

// 江湖客的动作只写入战斗对象，房主使用同一套逻辑计算双人伤害与治疗。
const FolkLoadouts = {
  tripleClack(g, w, s, dt) {
    const p = g.player, r = s.radius * p.st.area;
    if ((w.timer -= dt) > 0) return;
    if (!g.nearestEnemy(p.x, p.y, r + 32)) { w.timer = 0.15; return; }
    w.timer = s.cd * p.st.cd;
    for (let i = 0; i < 3; i++) {
      g.addZone({ type: 'ring', look: 'watchClack', t: i * 0.26, x: p.x, y: p.y, r: 10,
        maxR: r, spd: (r - 10) / 0.33, dmg: s.dmg * p.st.might, wid: w.id,
        kb: s.kb * (0.56 + i * 0.28), hit: new Set(), color: WEAPONS[w.id].color });
    }
    if (s.recall) g.addZone({ type: 'ring', look: 'watchClack', t: 0.87, x: p.x, y: p.y, r,
      maxR: r, spd: r / 0.43, dmg: s.dmg * p.st.might * 0.7, wid: w.id, recall: true,
      kb: s.kb * 1.55, hit: new Set(), color: '#fff2cc' });
    g.play('watchClack');
  },

  herbalFog(g, w, s, dt) {
    const p = g.player, r = s.radius * p.st.area;
    if ((w.timer -= dt) > 0) return;
    const wounded = g.players.some(m => m.hp > 0 && m.hp < m.st.maxHp * 0.9 && Math.hypot(m.x - p.x, m.y - p.y) <= r);
    if (!wounded && !g.nearestEnemy(p.x, p.y, s.range)) { w.timer = 0.18; return; }
    w.timer = s.cd * p.st.cd;
    g.addZone({ type: 'fire', look: 'herbalFog', x: p.x, y: p.y, r, life: s.dur, tk: 0,
      heal: s.heal, drift: s.drift, dmg: s.dmg * p.st.might, slow: s.slow, wid: w.id, color: WEAPONS[w.id].color });
    g.play('herbalMist');
  },

  tideOar(g, w, s, dt) {
    if ((w.timer -= dt) > 0) return;
    const p = g.player, reach = s.range * p.st.area, width = s.width * p.st.area;
    const dx = p.dirx, dy = p.diry, cx = p.x + dx * reach / 2, cy = p.y + dy * reach / 2;
    let hit = false;
    g.eachEnemyNear(cx, cy, Math.hypot(reach / 2, width), e => {
      const ax = e.x - p.x, ay = e.y - p.y, forward = ax * dx + ay * dy, side = ay * dx - ax * dy;
      if (forward < -e.r || forward > reach + e.r || Math.abs(side) > width + e.r) return;
      const sign = Math.sign(side) || (e.id % 2 ? 1 : -1);
      g.damageEnemy(e, s.dmg * p.st.might, w.id, -dy * sign, dx * sign, s.kb);
      hit = true;
    });
    if (!hit) { w.timer = 0.12; return; }
    w.timer = s.cd * p.st.cd;
    g.fx.push({ type: 'tideOar', x: p.x, y: p.y, x2: p.x + dx * reach, y2: p.y + dy * reach,
      r: width, life: 0.42, max: 0.42, c: WEAPONS[w.id].color });
    if (s.wake) g.addZone({ type: 'undertow', x: p.x, y: p.y, fromX: p.x + dx * reach, fromY: p.y + dy * reach,
      r: width, life: s.wake, max: s.wake, t: 0, tk: 0, slow: s.slow, color: WEAPONS[w.id].color });
    g.play('splash');
  },

  scarletThread(g, w, s, dt) {
    if ((w.timer -= dt) > 0) return;
    const p = g.player, [first, second, third] = g.nearestEnemies(p.x, p.y, s.range, s.knots || 2);
    if (!first) { w.timer = 0.15; return; }
    w.timer = s.cd * p.st.cd;
    const edges = third ? [[first, second], [second, third], [third, first]] : [[second || p, first]];
    const width = s.width * p.st.area, hit = new Set();
    const thread = g.combo?.id === 'thread' ? { dmg: s.dmg * p.st.might * 0.8 + 18, owner: p, wid: w.id } : null;
    const life = thread ? 0.95 : 0.45;
    for (const [a, b] of edges) {
      eachFolkLineEnemy(g, a, b, width, e => {
        if (hit.has(e.id)) return;
        hit.add(e.id);
        g.damageEnemy(e, s.dmg * p.st.might, w.id, 0, 0, 0);
        if (!e.dead) g.slowEnemy(e, s.slow, s.chill);
      });
      g.fx.push({ type: 'scarletThread', x: a.x, y: a.y, x2: b.x, y2: b.y,
        r: width, life, max: life, c: WEAPONS[w.id].color, thread });
    }
    g.play('threadPluck');
  },

  maskEcho(g, w, s, dt) {
    if ((w.timer -= dt) > 0) return;
    const p = g.player, foe = g.nearestEnemy(p.x, p.y, s.range);
    if (!foe) { w.timer = 0.2; return; }
    w.timer = s.cd * p.st.cd;
    const angle = Math.atan2(foe.y - p.y, foe.x - p.x), dx = Math.cos(angle), dy = Math.sin(angle);
    const distance = Math.min(116, Math.hypot(foe.x - p.x, foe.y - p.y));
    const offsets = s.twin ? [-s.twin, s.twin] : [0];
    offsets.forEach((offset, i) => {
      const at = { x: p.x + dx * distance - dy * offset, y: p.y + dy * distance + dx * offset };
      Terrain.move(at, 0, 0, CFG.PLAYER_R, 0, g.stage);
      g.addZone({ type: 'decoy', look: 'maskEcho', ...at,
        r: s.radius * p.st.area, trigger: s.blast * p.st.area, life: s.dur + i * 0.42,
        dmg: s.dmg * p.st.might, kb: s.kb, wid: w.id, color: WEAPONS[w.id].color });
    });
    g.play('maskFlare');
  },
};
