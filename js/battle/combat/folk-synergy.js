'use strict';

// 合招由两种专武在战场上实际相遇触发，不由玩家按键触发。
const FolkSynergy = {
  ready(g, id) {
    return g.combo?.id === id && g.bondActive && g.time >= g.comboReady;
  },

  markClack(g, e, z) {
    if (!e.boss && !e.dead && !z.recall && z.look === 'watchClack' && z.owner?.char === 'wen' &&
        e.kbRes < 1 && this.ready(g, 'thread')) e.clackPushUntil = g.time + 0.52;
  },

  crossedThread(g, e, prevX, prevY) {
    if (!this.ready(g, 'thread')) return;
    for (const f of g.fx) {
      if (!f.thread || f.thread.used || f.life <= 0) continue;
      const r = f.r + e.r;
      if (folkLineNear(prevX, prevY, f.x, f.y, f.x2, f.y2, r) ||
          !folkLineNear(e.x, e.y, f.x, f.y, f.x2, f.y2, r)) continue;
      f.thread.used = true;
      for (const edge of g.fx) if (edge.thread === f.thread) edge.life = Math.min(edge.life, 0.08);
      g.aoe(e.x, e.y, 92, f.thread.dmg, f.thread.wid, 0, f.thread.owner);
      this.burst(g, e.x, e.y, 92, '#ffb7bd');
      return;
    }
  },

  mistMask(g, mask) {
    if (mask.owner?.char !== 'yan' || !this.ready(g, 'mist')) return;
    const fog = g.zones.find(z => z.look === 'herbalFog' && z.owner?.char === 'shao' && z.life > 0 &&
      (z.x - mask.x) ** 2 + (z.y - mask.y) ** 2 <= z.r ** 2);
    if (!fog) return;
    let healed = false;
    for (const p of g.players) {
      if (p.hp <= 0 || p.hp >= p.st.maxHp || (p.x - fog.x) ** 2 + (p.y - fog.y) ** 2 > fog.r ** 2) continue;
      p.hp = Math.min(p.st.maxHp, p.hp + p.st.maxHp * 0.05);
      healed = true;
    }
    if (healed) this.burst(g, fog.x, fog.y, fog.r, '#b5efb6');
  },

  burst(g, x, y, r, color) {
    g.comboReady = g.time + 4.5;
    g.fx.push({ type: 'boom', x, y, r, life: 0.44, max: 0.44, c: color });
    g.texts.push({ x, y: y - 16, s: g.combo.name, life: 0.92, c: color });
    g.play(g.combo.id === 'thread' ? 'threadPluck' : 'herbalMist');
  },
};
