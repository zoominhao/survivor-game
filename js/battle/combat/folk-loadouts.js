'use strict';

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
    g.play('watchClack');
  },

  herbalFog(g, w, s, dt) {
    const p = g.player, r = s.radius * p.st.area;
    if ((w.timer -= dt) > 0) return;
    const wounded = g.players.some(m => m.hp > 0 && m.hp < m.st.maxHp * 0.9 && Math.hypot(m.x - p.x, m.y - p.y) <= r);
    if (!wounded && !g.nearestEnemy(p.x, p.y, s.range)) { w.timer = 0.18; return; }
    w.timer = s.cd * p.st.cd;
    g.addZone({ type: 'fire', look: 'herbalFog', x: p.x, y: p.y, r, life: s.dur, tk: 0,
      heal: s.heal, dmg: s.dmg * p.st.might, slow: s.slow, wid: w.id, color: WEAPONS[w.id].color });
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
    g.play('splash');
  },

  scarletThread(g, w, s, dt) {
    if ((w.timer -= dt) > 0) return;
    const p = g.player, [first, second] = g.nearestEnemies(p.x, p.y, s.range, 2);
    if (!first) { w.timer = 0.15; return; }
    w.timer = s.cd * p.st.cd;
    const a = second || p, b = first, dx = b.x - a.x, dy = b.y - a.y, square = dx * dx + dy * dy || 1;
    const width = s.width * p.st.area;
    g.eachEnemyNear((a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(dx, dy) / 2 + width, e => {
      const t = U.clamp(((e.x - a.x) * dx + (e.y - a.y) * dy) / square, 0, 1);
      if (Math.hypot(e.x - a.x - dx * t, e.y - a.y - dy * t) > width + e.r) return;
      g.damageEnemy(e, s.dmg * p.st.might, w.id, 0, 0, 0);
      if (!e.dead) g.slowEnemy(e, s.slow, s.chill);
    });
    g.fx.push({ type: 'scarletThread', x: a.x, y: a.y, x2: b.x, y2: b.y,
      r: width, life: 0.45, max: 0.45, c: WEAPONS[w.id].color });
    g.play('threadPluck');
  },

  maskEcho(g, w, s, dt) {
    if ((w.timer -= dt) > 0) return;
    const p = g.player, foe = g.nearestEnemy(p.x, p.y, s.range);
    if (!foe) { w.timer = 0.2; return; }
    w.timer = s.cd * p.st.cd;
    const d = Math.hypot(foe.x - p.x, foe.y - p.y) || 1, factor = Math.min(1, 116 / d);
    const at = { x: p.x + (foe.x - p.x) * factor, y: p.y + (foe.y - p.y) * factor };
    Terrain.move(at, 0, 0, CFG.PLAYER_R, 0, g.landscape);
    g.addZone({ type: 'decoy', look: 'maskEcho', ...at,
      r: s.radius * p.st.area, trigger: s.blast * p.st.area, life: s.dur,
      dmg: s.dmg * p.st.might, kb: s.kb, wid: w.id, color: WEAPONS[w.id].color });
    g.play('maskFlare');
  },
};
