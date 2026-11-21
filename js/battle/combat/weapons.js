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
    else if (k === 'bounces') out.push('弹射次数 +' + v);
    else if (k === 'guards') out.push('抵挡次数 +' + v);
    else if (k === 'heal') out.push('回复量 +' + Number((v * 100).toFixed(1)) + '% 最大生命');
    else if (k === 'reduce') out.push('减伤 +' + Math.round(v * 100) + '%');
    else if (k === 'slow') out.push('减速 +' + Math.round(v * 100) + '%');
    else if (k === 'radius' || k === 'blast') out.push('范围 +' + v);
    else if (k === 'width') out.push('宽度 +' + v);
    else if (k === 'range') out.push('距离 +' + v);
    else if (k === 'dur' || k === 'sauce') out.push('持续 +' + v + ' 秒');
    else if (k === 'size') out.push('体积 +' + v);
  }
  return out.join(',');
}

const WeaponFns = {
  ...FolkLoadouts,
  incense(g, w, s, dt) {
    w.timer -= dt;
    if (w.timer > 0) return;
    const p = g.player;
    if (!g.nearestEnemy(p.x, p.y, s.range)) { w.timer = 0.22; return; }
    w.timer = s.cd * p.st.cd;
    g.addZone({ type: 'fire', look: 'incense', x: p.x, y: p.y, r: s.radius * p.st.area, life: s.dur, tk: 0,
      dmg: s.dmg * p.st.might, wid: w.id, slow: s.slow, color: WEAPONS[w.id].color });
    g.play('incenseSet');
  },

  mirror(g, w, s, dt) {
    w.timer = Math.max(0, w.timer - dt); // 没有弹幕时保留充能，不白白消耗冷却。
  },

  aiIntercept(g, w, s, dt) {
    w.timer -= dt;
    if (w.timer > 0) return;
    const p = g.player, radius = s.radius * p.st.area;
    const target = planAiStrike(g, p, s.range, radius, s.delay);
    if (!target) { w.timer = 0.26; return; }
    w.timer = s.cd * p.st.cd;
    g.addZone({ type: 'meteor', look: 'aiScan', x: target.x, y: target.y, r: radius, t: s.delay, max: s.delay,
      dmg: s.dmg * p.st.might, wid: w.id, kb: 95, color: WEAPONS[w.id].color, impactSound: 'aiStrike' });
    g.play('aiScan');
  },

  // 水润护肤：有恢复或防护需求才消耗冷却，减伤时间随战斗时钟递减。
  skincare(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.on = Math.max(0, (w.on || 0) - dt);
    if (w.timer > 0) w.timer -= dt;
    if (w.timer > 0 || w.on > 0 || (p.hp >= st.maxHp && !g.nearestEnemy(p.x, p.y, s.range))) return;
    w.timer = s.cd * st.cd;
    w.on = s.dur;
    const healed = Math.min(st.maxHp - p.hp, st.maxHp * s.heal);
    p.hp += healed;
    if (Math.round(healed) > 0) g.texts.push({ x: p.x, y: p.y - 30, s: '+' + Math.round(healed), life: 0.8, c: '#b9ead8' });
    g.fx.push({ type: 'skincare', x: p.x, y: p.y, life: 0.7, max: 0.7 });
    g.play('mango');
  },

  // 食物补给：受伤到阈值以下才消耗冷却，不浪费满血时的补给。
  snackHeal(g, w, s, dt) {
    const p = g.player, st = p.st, item = WEAPONS[w.id];
    if (w.timer > 0) w.timer -= dt;
    if (w.timer > 0 || p.hp >= st.maxHp * s.threshold) return;
    w.timer = s.cd * st.cd;
    const healed = Math.min(st.maxHp - p.hp, st.maxHp * s.heal);
    p.hp += healed;
    g.texts.push({ x: p.x, y: p.y - 30, s: '+' + Math.round(healed), life: 0.85, c: '#a9e8ad' });
    g.fx.push({ type: item.look, x: p.x, y: p.y, life: 0.7, max: 0.7 });
    g.play(item.sound);
  },

  // 试卷用完才开始充能；就绪时一直保留，直到挡住攻击。
  exampaper(g, w, s, dt) {
    if (w.guards > 0) return;
    w.timer -= dt;
    if (w.timer <= 0) w.guards = s.guards;
  },

  // 黏黏年糕：有夜兽靠近才在脚下布置，踩中后由区域逻辑触发。
  ricecake(g, w, s, dt) {
    const p = g.player, st = p.st;
    w.timer -= dt;
    if (w.timer > 0) return;
    if (!g.nearestEnemy(p.x, p.y, s.range)) { w.timer = 0.2; return; }
    w.timer = s.cd * st.cd;
    g.addZone({
      type: 'ricecake', x: p.x, y: p.y, r: s.radius * st.area, trigger: s.trigger * st.area,
      life: s.life, dmg: s.dmg * st.might, slow: s.slow, chill: s.chill,
      wid: w.id, color: WEAPONS[w.id].color,
    });
  },

  // 鼠伴出击 / 百鼠夜行：尽量分开追击不同目标，沿用投射物的追踪和命中规则。
  mouse(g, w, s, dt) {
    const p = g.player, st = p.st, item = WEAPONS[w.id];
    w.timer -= dt;
    if (w.timer > 0) return;
    const count = s.count + st.amount;
    const targets = g.nearestEnemies(p.x, p.y, s.range, count);
    if (!targets.length) { w.timer = 0.15; return; }
    w.timer = s.cd * st.cd;
    for (let i = 0; i < count; i++) {
      const tg = targets[i % targets.length];
      const a = Math.atan2(tg.y - p.y, tg.x - p.x) + (i - (count - 1) / 2) * 0.14;
      g.addProj({
        x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        r: s.size * st.area, speed: s.speed, life: s.life, dmg: s.dmg * st.might, pierce: s.pierce,
        mode: 'homing', tg, seek: 0.2, wid: w.id, look: item.look || 'mouse', color: item.color, kb: 75, split: s.split,
      });
    }
    g.play(item.sound || 'mouse');
  },

  // 星火弹 / 星爆 / 彩糖 / 番茄 / 篮球：朝附近敌人投射。
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
      const d = WEAPONS[w.id], shot = w.shot++;
      const t = ts[shot % ts.length];
      const a = Math.atan2(t.y - p.y, t.x - p.x) + U.rand(-0.06, 0.06);
      g.addProj({
        x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        r: s.size * st.area, dmg: s.dmg * st.might, pierce: s.pierce, life: 1.4,
        wid: w.id, look: d.look || 'bolt', color: d.colors ? d.colors[shot % d.colors.length] : d.color, kb: 120,
        blast: s.blast ? s.blast * st.area : 0, sauce: s.sauce || 0, spillSlow: s.sauce ? s.slow : 0,
        bounces: s.bounces || 0, bounceRange: s.bounceRange ? s.bounceRange * st.area : 0,
      });
      g.play(d.sound || 'shoot');
    }
  },

  // 光矛 / 引星矛 / 土豆：朝最近移动方向发射贯穿投射物，引星矛自动追踪。
  lance(g, w, s, dt) {
    const p = g.player, st = p.st, d = WEAPONS[w.id];
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
      const a = base + (i - (n - 1) / 2) * (s.spreadAngle ?? (s.homing ? 0.5 : 0.16));
      g.addProj({
        x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
        r: s.size * st.area, dmg: s.dmg * st.might, pierce: s.pierce,
        life: s.homing ? 2.4 : 1.1, speed: s.speed, mode: s.homing ? 'homing' : '',
        wid: w.id, look: d.look || 'lance', color: d.color, kb: 160,
      });
    }
    g.play(d.sound || 'shoot');
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
    g.play('shoot');
  },

  // 环绕萤火 / 永恒星环 / 冰淇淋旋风:位置由角度实时算出,不生成投射物
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
        if (!g.canHit(e, w.id, 0.45)) return;
        g.damageEnemy(e, dmg, w.id, e.x - p.x, e.y - p.y, 140);
        if (s.slow && !e.dead) g.slowEnemy(e, s.slow, s.chill);
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
    g.play('zap');
  },

  // 灵猴 / 西瓜 / 金元宝：先标记落点，稍后造成范围伤害。
  lob(g, w, s, dt) {
    const p = g.player, st = p.st, d = WEAPONS[w.id];
    w.timer -= dt;
    if (w.timer > 0) return;
    const count = s.count + st.amount;
    const targets = g.nearestEnemies(p.x, p.y, s.range, count);
    if (!targets.length) { w.timer = 0.2; return; }
    w.timer = s.cd * st.cd;
    for (let i = 0; i < count; i++) {
      const target = targets[i % targets.length];
      const a = Math.atan2(target.y - p.y, target.x - p.x);
      const offset = i < targets.length ? 0 : (i % 2 ? -1 : 1) * Math.min(28, i * 12);
      const delay = s.delay + i * 0.08;
      g.addZone({
        type: d.look, fromX: p.x, fromY: p.y,
        x: target.x - Math.sin(a) * offset, y: target.y + Math.cos(a) * offset,
        r: s.radius * st.area, t: delay, max: delay, dmg: s.dmg * st.might, wid: w.id,
        color: d.color, kb: s.kb, impactSound: d.impactSound,
      });
    }
    if (d.sound) g.play(d.sound);
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
      g.addZone({
        type: 'meteor', x: t.x + U.rand(-18, 18), y: t.y + U.rand(-18, 18),
        r: s.radius * st.area, t: delay, max: delay,
        dmg: s.dmg * st.might, wid: w.id, burn: s.burn || 0,
      });
    }
    w.timer = fired ? s.cd * st.cd : 0.2;
  },

  // 从玩家位置向外扩散的寒霜或声浪。
  frost(g, w, s, dt) {
    const p = g.player, st = p.st, d = WEAPONS[w.id];
    w.timer -= dt;
    if (w.timer > 0) return;
    const R = s.radius * st.area;
    if (!g.nearestEnemy(p.x, p.y, R + 40)) { w.timer = 0.2; return; }
    w.timer = s.cd * st.cd;
    g.addZone({
      type: 'ring', x: p.x, y: p.y, r: 12, maxR: R, spd: R / 0.45,
      dmg: s.dmg * st.might, wid: w.id, slow: s.slow || 0, freeze: s.freeze || 0, hit: new Set(),
      look: d.look, color: d.color, kb: s.kb ?? 60,
    });
    g.play(d.sound || 'frost');
  },
};
