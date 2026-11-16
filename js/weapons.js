'use strict';
// ===== 武器行为 =====
// 每种 kind 对应一个 update(g, w, s, dt):g = Game,w = 武器实例,s = 当前等级面板

// 计算武器在指定等级的面板(base + 逐级增量)
function weaponStats(id, lv) {
  const d = WEAPONS[id];
  const s = Object.assign({}, d.base);
  if (d.ups) {
    for (let i = 0; i < lv - 1 && i < d.ups.length; i++) {
      for (const k in d.ups[i]) s[k] += d.ups[i][k];
    }
  }
  return s;
}

// 把升级增量翻译成卡片上的文字
function upgradeText(delta) {
  const out = [];
  for (const k in delta) {
    const v = delta[k];
    if (k === 'dmg') out.push('伤害 +' + v);
    else if (k === 'cd') out.push('冷却 ' + v + ' 秒');
    else if (k === 'count') out.push('数量 +' + v);
    else if (k === 'pierce') out.push('穿透 +' + v);
    else if (k === 'radius') out.push('范围 +' + v);
    else if (k === 'dur') out.push('持续 +' + v + ' 秒');
    else if (k === 'size') out.push('体积 +' + v);
  }
  return out.join(',');
}

const TAU = Math.PI * 2;

const WeaponFns = {
  // 星火弹 / 星爆:朝最近的敌人连发
  bolt(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.timer -= dt;
    if (w.timer <= 0 && !(w.burst > 0)) {
      if (!g.nearestEnemy(p.x, p.y, 540)) { w.timer = 0.1; return; }
      w.timer = s.cd * st.cd;
      w.burst = s.count + st.amount;
      w.bt = 0;
      w.shot = 0;
    }
    if (w.burst > 0) {
      w.bt -= dt;
      if (w.bt > 0) return;
      w.bt = 0.06;
      w.burst--;
      const ts = g.nearestEnemies(p.x, p.y, 560, s.spread || 1);
      if (!ts.length) { w.burst = 0; return; }
      const t = ts[w.shot++ % ts.length];
      const a = Math.atan2(t.y - p.y, t.x - p.x) + U.rand(-0.06, 0.06);
      g.addProj({
        x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        r: s.size * st.area, dmg: s.dmg * st.might, pierce: s.pierce, life: 1.4,
        wid: w.id, look: 'bolt', color: WEAPONS[w.id].color, kb: 120,
        blast: s.blast ? s.blast * st.area : 0,
      });
      Sfx.play('shoot');
    }
  },

  // 光矛 / 引星矛:朝面向方向投出贯穿矛,进化后自动追踪
  lance(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.timer -= dt;
    if (w.timer > 0) return;
    w.timer = s.cd * st.cd;
    const n = s.count + st.amount;
    let base = Math.atan2(p.diry, p.dirx);
    if (s.homing) {
      const t = g.nearestEnemy(p.x, p.y, 500);
      if (t) base = Math.atan2(t.y - p.y, t.x - p.x);
    }
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * (s.homing ? 0.5 : 0.16);
      g.addProj({
        x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        r: s.size * st.area, dmg: s.dmg * st.might, pierce: s.pierce,
        life: s.homing ? 2.4 : 1.1, speed: s.speed, mode: s.homing ? 'homing' : '',
        wid: w.id, look: 'lance', color: WEAPONS[w.id].color, kb: 160,
      });
    }
    Sfx.play('shoot');
  },

  // 回旋飞刃 / 风暴之刃
  blade(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.timer -= dt;
    if (w.timer > 0) return;
    const n = s.count + st.amount;
    const common = {
      r: s.size * st.area, dmg: s.dmg * st.might, pierce: Infinity, rehit: 0.42,
      wid: w.id, look: 'blade', color: WEAPONS[w.id].color, kb: 90, rot: 0,
    };
    if (s.spiral) {
      // 进化:多把飞刃绕玩家螺旋外扩再收回
      w.timer = s.cd * st.cd;
      for (let i = 0; i < n; i++) {
        g.addProj(Object.assign({
          x: p.x, y: p.y, vx: 0, vy: 0, mode: 'spiral',
          ang: i / n * TAU, maxR: 190 * st.area, life: 2.4,
        }, common));
      }
    } else {
      const t = g.nearestEnemy(p.x, p.y, 420);
      if (!t) { w.timer = 0.15; return; }
      w.timer = s.cd * st.cd;
      const base = Math.atan2(t.y - p.y, t.x - p.x);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.4;
        const dx = Math.cos(a), dy = Math.sin(a);
        g.addProj(Object.assign({
          x: p.x, y: p.y, vx: dx * 500, vy: dy * 500, dx, dy,
          mode: 'boomer', acc: 620, life: 1.7,
        }, common));
      }
    }
    Sfx.play('shoot');
  },

  // 环绕萤火 / 永恒星环:位置由角度实时算出,不生成投射物
  orbit(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.ang = (w.ang || 0) + 3.4 * dt;
    if (s.perm) {
      w.on = 1;
    } else if (w.on > 0) {
      w.on -= dt;
      if (w.on <= 0) w.timer = s.cd * st.cd;
    } else {
      w.timer -= dt;
      if (w.timer > 0) return;
      w.on = s.dur;
    }
    const n = s.count + st.amount, R = s.radius * st.area, r = s.size * st.area;
    const dmg = s.dmg * st.might;
    for (let i = 0; i < n; i++) {
      const a = w.ang + i / n * TAU;
      g.eachEnemyNear(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, r, e => {
        if (g.canHit(e, w.id, 0.45)) g.damageEnemy(e, dmg, w.id, e.x - p.x, e.y - p.y, 140);
      });
    }
  },

  // 荆棘光环 / 荆棘壁垒:周期性伤害身边敌人
  aura(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.timer -= dt;
    if (w.timer > 0) return;
    w.timer = s.tick * st.cd;
    const dmg = s.dmg * st.might;
    g.eachEnemyNear(p.x, p.y, s.radius * st.area, e => {
      g.damageEnemy(e, dmg, w.id, e.x - p.x, e.y - p.y, 40);
      if (s.slow) g.slowEnemy(e, s.slow, 0.6);
    });
  },

  // 落雷 / 雷暴:随机劈视野内的敌人,进化后连锁
  thunder(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.timer -= dt;
    if (w.timer > 0) return;
    const n = s.count + st.amount;
    let fired = false;
    for (let i = 0; i < n; i++) {
      const t = g.randomEnemy();
      if (!t) break;
      fired = true;
      g.fx.push({ type: 'zap', x: t.x, y: t.y, life: 0.22, max: 0.22 });
      g.aoe(t.x, t.y, s.radius * st.area, s.dmg * st.might, w.id, 60);
      if (s.chain) {
        let cur = t;
        const used = new Set([t.id]);
        for (let c = 0; c < s.chain; c++) {
          const nx = g.nearestEnemy(cur.x, cur.y, 170, used);
          if (!nx) break;
          used.add(nx.id);
          g.fx.push({ type: 'arc', x: cur.x, y: cur.y, x2: nx.x, y2: nx.y, life: 0.2, max: 0.2 });
          g.damageEnemy(nx, s.dmg * st.might * 0.6, w.id, 0, 0, 0);
          cur = nx;
        }
      }
    }
    if (!fired) { w.timer = 0.2; return; }
    w.timer = s.cd * st.cd;
    g.shake = Math.max(g.shake, 2.5);
    Sfx.play('zap');
  },

  // 陨星 / 天火:先在地面标记,延迟后落下爆炸
  meteor(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.timer -= dt;
    if (w.timer > 0) return;
    const n = s.count + st.amount;
    let fired = false;
    for (let i = 0; i < n; i++) {
      const t = g.randomEnemy();
      if (!t) break;
      fired = true;
      const delay = 0.65 + i * 0.12;
      g.zones.push({
        type: 'meteor', x: t.x + U.rand(-18, 18), y: t.y + U.rand(-18, 18),
        r: s.radius * st.area, t: delay, max: delay,
        dmg: s.dmg * st.might, wid: w.id, burn: s.burn || 0,
      });
    }
    w.timer = fired ? s.cd * st.cd : 0.2;
  },

  // 霜环 / 凛冬:从玩家位置向外扩散的寒霜
  frost(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.timer -= dt;
    if (w.timer > 0) return;
    const R = s.radius * st.area;
    if (!g.nearestEnemy(p.x, p.y, R + 40)) { w.timer = 0.2; return; }
    w.timer = s.cd * st.cd;
    g.zones.push({
      type: 'ring', x: p.x, y: p.y, r: 12, maxR: R, spd: R / 0.45,
      dmg: s.dmg * st.might, wid: w.id, slow: s.slow, freeze: s.freeze || 0, hit: new Set(),
    });
    Sfx.play('frost');
  },
};
