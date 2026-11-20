'use strict';
// ===== 游戏核心逻辑 =====
// 不直接依赖 DOM:只通过 Input / UI / Sfx 三个全局对象与外界交互,
// 因此可以在 Node 里用桩对象跑整局模拟。

let UID = 0;

const Game = {
  state: 'menu',              // menu | intro | playing | levelup | chest | paused | gameover | victory
  view: { hw: 480, hh: 300 }, // 可视范围半宽/半高(世界单位),由渲染层在 resize 时写入
  grid: new Grid(64),
  player: null,

  // ---------- 开局 ----------
  start(charId) {
    const c = CHARS[charId], m = Save.data.meta;
    this.time = 0;
    this.spawnAcc = 0;
    this.evIdx = 0;
    this.eliteT = 45;
    this.enemies = [];
    this.projs = [];
    this.ebullets = [];
    this.gems = [];
    this.pickups = [];
    this.zones = [];
    this.fx = [];
    this.texts = [];
    this.parts = [];
    this.shake = 0;
    this.pending = 0;   // 待处理的升级次数
    this.boss = null;
    this.choices = [];
    this.chest = null;
    this.result = null;
    this.dirty = true;  // 构筑有变化,通知 HUD 刷新
    this.player = {
      x: 0, y: 0, dirx: 1, diry: 0, face: 1, moving: false, walkT: 0,
      iframe: 0, hp: 0, level: 1, xp: 0, xpNeed: this.xpFor(1), char: charId,
      weapons: [], passives: [], evolved: {}, kills: 0, coins: 0, dmgBy: {},
      st: {}, rerolls: m.reroll, revives: m.revive,
    };
    this.recalc();
    this.player.hp = this.player.st.maxHp;
    this.addWeapon(c.weapon);
    this.state = 'playing';
  },

  xpFor(lv) { return Math.floor(5 + (lv - 1) * 5 + Math.pow(lv - 1, 1.6)); },

  // 汇总角色、局外强化、被动道具,得到当前面板
  recalc() {
    const p = this.player, c = CHARS[p.char], m = Save.data.meta, st = p.st;
    const L = id => { const q = p.passives.find(x => x.id === id); return q ? q.lv : 0; };
    const oldMax = st.maxHp || 0;
    st.maxHp = Math.round((100 + (c.hp || 0)) * (1 + 0.1 * m.vital + 0.2 * L('vital')));
    st.speed = 150 * (1 + (c.speed || 0) + 0.04 * m.swift + 0.08 * L('swift'));
    st.might = 1 + (c.might || 0) + 0.05 * m.might + 0.1 * L('might');
    st.cd = Math.max(0.35, (1 - (c.haste || 0)) * (1 - 0.08 * L('haste')));
    st.area = 1 + 0.1 * L('area');
    st.amount = (c.amount || 0) + L('amount');
    st.armor = (c.armor || 0) + m.armor + L('armor');
    st.regen = 0.1 * m.regen + 0.3 * L('regen');
    st.magnet = 70 * (1 + (c.magnet || 0) + 0.15 * m.magnet + 0.3 * L('magnet'));
    st.growth = 1 + 0.05 * m.growth + 0.08 * L('wisdom');
    st.greed = 1 + 0.1 * m.greed;
    if (oldMax && st.maxHp > oldMax) p.hp += st.maxHp - oldMax; // 生命上限提高时同步补血
  },

  addWeapon(id) {
    const s = weaponStats(id, 1);
    this.player.weapons.push({ id, lv: 1, timer: 0, s, guards: s.guards || 0 });
    this.dirty = true;
  },

  // ---------- 升级选项 ----------
  buildChoices(n) {
    const p = this.player, out = [];
    // 可进化的武器必定出现
    for (const w of p.weapons) {
      const d = WEAPONS[w.id];
      if (d.evo && w.lv >= d.max && p.passives.some(x => x.id === d.evo.need)) {
        out.push({ kind: 'evo', id: w.id, to: d.evo.to });
      }
    }
    const pool = [];
    for (const w of p.weapons) {
      const d = WEAPONS[w.id];
      if (!d.evolved && w.lv < d.max) pool.push({ kind: 'weapon', id: w.id, lv: w.lv + 1, wt: 3 });
    }
    if (p.weapons.length < CFG.MAX_WEAPONS) {
      for (const id in WEAPONS) {
        const d = WEAPONS[id];
        if (d.evolved || (d.exclusive && d.exclusive !== p.char) || p.evolved[id] || p.weapons.some(w => w.id === id)) continue;
        pool.push({ kind: 'weapon', id, lv: 1, wt: 2 });
      }
    }
    for (const q of p.passives) {
      if (q.lv < PASSIVES[q.id].max) pool.push({ kind: 'passive', id: q.id, lv: q.lv + 1, wt: 3 });
    }
    if (p.passives.length < CFG.MAX_PASSIVES) {
      for (const id in PASSIVES) {
        if (!p.passives.some(q => q.id === id)) pool.push({ kind: 'passive', id, lv: 1, wt: 2 });
      }
    }
    // 多选升级时优先给一个尚未习得的专属武器，宝箱单次抽取照旧。
    if (n > 1 && out.length < n) {
      const exclusive = pool.filter(c => c.kind === 'weapon' && c.lv === 1 && WEAPONS[c.id].exclusive === p.char);
      if (exclusive.length) {
        const choice = exclusive[U.randInt(0, exclusive.length - 1)];
        out.push(...pool.splice(pool.indexOf(choice), 1));
      }
    }
    // 按权重不放回抽取
    while (out.length < n && pool.length) {
      let sum = 0;
      for (const c of pool) sum += c.wt;
      let r = Math.random() * sum, idx = 0;
      for (let i = 0; i < pool.length; i++) { r -= pool[i].wt; if (r <= 0) { idx = i; break; } }
      out.push(pool.splice(idx, 1)[0]);
    }
    out.length = Math.min(out.length, n);
    // 全部满级后的保底选项
    if (!out.length) out.push({ kind: 'coins' }, { kind: 'heal' });
    return out;
  },

  // 把选项转成卡片展示信息
  describe(c) {
    const p = this.player;
    if (c.kind === 'weapon') {
      const d = WEAPONS[c.id];
      let desc = c.lv === 1 ? d.desc : upgradeText(d.ups[c.lv - 2]);
      if (d.evo && (c.lv === 1 || d.exclusive)) {
        const need = PASSIVES[d.evo.need];
        desc += '\n进化搭档：' + need.name;
      }
      return { icon: c.id, name: d.name, tag: c.lv === 1 ? '新武器' : 'Lv.' + c.lv, desc, cls: 'weapon' };
    }
    if (c.kind === 'passive') {
      const d = PASSIVES[c.id];
      let desc = d.desc;
      // 提示这件被动能让哪把已持有的武器进化
      for (const w of p.weapons) {
        const wd = WEAPONS[w.id];
        if (wd.evo && wd.evo.need === c.id) desc += '\n可进化：' + wd.name;
      }
      return { icon: c.id, name: d.name, tag: c.lv === 1 ? '新道具' : 'Lv.' + c.lv, desc, cls: 'passive' };
    }
    if (c.kind === 'evo') {
      const d = WEAPONS[c.to];
      return { icon: c.to, name: d.name, tag: '进化', desc: d.desc, cls: 'evo' };
    }
    if (c.kind === 'coins') return { icon: 'coin', name: '一袋金币', tag: '', desc: '获得 25 金币', cls: 'passive' };
    return { icon: 'tonic', name: '治疗药剂', tag: '', desc: '回复 30% 生命', cls: 'passive' };
  },

  applyChoice(c) {
    const p = this.player;
    if (c.kind === 'weapon') {
      const w = p.weapons.find(x => x.id === c.id);
      if (w) {
        const oldGuards = w.s.guards || 0;
        w.s = weaponStats(w.id, ++w.lv);
        if (w.guards > 0) w.guards += Math.max(0, w.s.guards - oldGuards);
      } else this.addWeapon(c.id);
    } else if (c.kind === 'passive') {
      const q = p.passives.find(x => x.id === c.id);
      if (q) q.lv++; else p.passives.push({ id: c.id, lv: 1 });
      this.recalc();
    } else if (c.kind === 'evo') {
      const w = p.weapons.find(x => x.id === c.id);
      if (w) {
        p.evolved[c.id] = true;
        w.id = c.to; w.lv = 1; w.s = weaponStats(c.to, 1);
        w.timer = 0; w.on = 0; w.burst = 0;
      }
    } else if (c.kind === 'coins') {
      p.coins += 25;
    } else if (c.kind === 'heal') {
      p.hp = Math.min(p.st.maxHp, p.hp + p.st.maxHp * 0.3);
    }
    this.dirty = true;
  },

  // 玩家在升级界面选了第 i 项
  choose(i) {
    if (this.state !== 'levelup' || !this.choices[i]) return;
    this.applyChoice(this.choices[i]);
    this.pending--;
    if (this.pending > 0) {
      this.choices = this.buildChoices(3);
      UI.showLevelUp();
    } else {
      const p = this.player;
      this.fx.push({ type: 'outfitPulse', x: p.x, y: p.y, life: 0.55, max: 0.55, c: CHARS[p.char].color });
      this.state = 'playing';
      UI.show(null);
    }
  },

  reroll() {
    const p = this.player;
    if (this.state !== 'levelup' || p.rerolls <= 0) return;
    p.rerolls--;
    this.choices = this.buildChoices(3);
    UI.showLevelUp();
  },

  // 宝箱:金币 + 直接获得若干次强化(优先进化)
  openChest(boss) {
    const p = this.player;
    const coins = Math.round((boss ? U.randInt(80, 120) : U.randInt(15, 35)) * p.st.greed);
    p.coins += coins;
    const got = [];
    for (let i = 0, n = boss ? 3 : 1; i < n; i++) {
      const c = this.buildChoices(1)[0];
      if (!c || c.kind === 'coins' || c.kind === 'heal') break;
      got.push(this.describe(c));
      this.applyChoice(c);
    }
    this.chest = { coins, got, boss };
    this.state = 'chest';
    Sfx.play('chest');
    UI.showChest();
  },

  closeChest() {
    if (this.state !== 'chest') return;
    this.state = 'playing';
    UI.show(null);
  },

  // ---------- 主循环 ----------
  update(dt) {
    if (this.state !== 'playing') return;
    const p = this.player, st = p.st;
    this.time += dt;
    if (this.time >= CFG.RUN_TIME) { this.finish(true); return; }

    // 玩家移动
    let ix = Input.x, iy = Input.y;
    const il = Math.hypot(ix, iy);
    p.moving = il > 0.08;
    if (p.moving) {
      const k = il > 1 ? 1 / il : 1;
      const x = p.x, y = p.y;
      Terrain.move(p, ix * k * st.speed * dt, iy * k * st.speed * dt, CFG.PLAYER_R);
      p.dirx = ix / il; p.diry = iy / il;
      if (Math.abs(ix) > 0.05) p.face = ix < 0 ? -1 : 1;
      p.moving = Math.hypot(p.x - x, p.y - y) > 0.05;
      if (p.moving) p.walkT += dt;
    }
    if (p.iframe > 0) p.iframe -= dt;
    if (st.regen > 0 && p.hp < st.maxHp) p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);

    this.spawn(dt);

    // 重建空间网格
    this.grid.clear();
    for (const e of this.enemies) this.grid.insert(e);

    // 玩家可能在敌人/子弹阶段阵亡,此时本帧后续逻辑(尤其是拾取宝箱)不能再改状态
    this.updateEnemies(dt);
    if (this.state !== 'playing') return;
    for (const w of p.weapons) WeaponFns[WEAPONS[w.id].kind](this, w, w.s, dt);
    this.updateProjs(dt);
    this.updateZones(dt);
    this.updateBullets(dt);
    if (this.state !== 'playing') return;
    this.updatePickups(dt);
    this.updateFx(dt);

    // 清理死亡敌人
    const es = this.enemies;
    let n = 0;
    for (let i = 0; i < es.length; i++) if (!es[i].dead) es[n++] = es[i];
    es.length = n;

    if (this.pending > 0 && this.state === 'playing') {
      this.state = 'levelup';
      this.choices = this.buildChoices(3);
      Sfx.play('level');
      UI.showLevelUp();
    }
  },

  // ---------- 刷怪 ----------
  spawnR() { return Math.hypot(this.view.hw, this.view.hh) + 50; },

  spawn(dt) {
    const t = this.time, p = this.player;
    const minute = Math.min(WAVES.length - 1, Math.floor(t / 60));
    const wv = WAVES[minute];
    const count = this.enemies.length;
    if (count < CFG.MAX_ENEMIES) {
      this.spawnAcc += wv.rate * dt;
      if (count < 6 + minute * 5) this.spawnAcc += wv.rate * dt * 2; // 场上太空时加速补怪
    }
    const R = this.spawnR();
    while (this.spawnAcc >= 1) {
      this.spawnAcc--;
      const type = U.weighted(wv.types);
      const a = Math.random() * TAU;
      const x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
      if (type === 'swarm') {
        for (let i = 0; i < 5; i++) this.spawnEnemy(type, x + U.rand(-30, 30), y + U.rand(-30, 30));
      } else {
        this.spawnEnemy(type, x, y);
      }
    }
    // 定期出现的精英怪,击杀掉宝箱
    if (t >= this.eliteT) {
      this.eliteT += 45;
      let type = U.weighted(wv.types);
      if (type === 'swarm' || type === 'moth') type = 'shade';
      const a = Math.random() * TAU;
      this.spawnEnemy(type, p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, true);
    }
    // 定时事件
    while (this.evIdx < EVENTS.length && t >= EVENTS[this.evIdx].t) {
      const ev = EVENTS[this.evIdx++];
      if (ev.kind === 'ring') {
        const rr = R * 0.92;
        for (let i = 0; i < ev.n; i++) {
          const a = i / ev.n * TAU;
          this.spawnEnemy(ev.enemy, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
        }
        UI.banner(ev.msg || '夜兽正在合围!');
      } else if (ev.kind === 'boss') {
        const a = Math.random() * TAU;
        const e = this.spawnEnemy('boss', p.x + Math.cos(a) * R, p.y + Math.sin(a) * R);
        e.boss = true; e.tier = ev.tier;
        e.hp = e.maxHp = BOSS_HP[ev.tier];
        e.r = 44 + ev.tier * 6;
        e.dmg = 14 + ev.tier * 7;
        e.cd = 3; e.phase = '';
        this.boss = e;
        Sfx.play('boss');
        UI.banner('夜魇降临');
      }
    }
  },

  spawnEnemy(type, x, y, elite) {
    const d = ENEMIES[type], m = this.time / 60;
    const hpMul = 1 + m * 0.2 + m * m * 0.012; // 血量随时间成长
    const e = {
      id: ++UID, type, x, y, r: d.r, hp: d.hp * hpMul, maxHp: d.hp * hpMul,
      speed: d.speed * U.rand(0.9, 1.1), dmg: d.dmg * (1 + m * 0.05), xp: d.xp,
      kx: 0, ky: 0, kbRes: d.kbRes || 0, flash: 0, slow: 0, slowT: 0, frozen: 0,
      h: {}, t: Math.random() * 6, shootT: U.rand(1, 3), side: Math.random() < 0.5 ? -1 : 1,
      dead: false, elite: false, boss: false,
    };
    if (elite) {
      e.elite = true;
      e.hp = e.maxHp = e.hp * 7;
      e.r *= 1.45; e.xp *= 10; e.kbRes = Math.max(e.kbRes, 0.8);
    }
    if (type !== 'boss' && !d.ghost) Terrain.move(e, 0, 0, e.r);
    this.enemies.push(e);
    return e;
  },

  // ---------- 敌人 ----------
  updateEnemies(dt) {
    const p = this.player, g = this.grid, cell = g.cell;
    const far = this.spawnR() * 1.7, R = this.spawnR();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const def = ENEMIES[e.type], avoidsTerrain = !def.ghost && !e.boss;
      e.t += dt;
      if (e.flash > 0) e.flash -= dt;
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 0.001;
      // 被甩得太远的敌人直接挪回玩家周围
      if (d > far && !e.boss) {
        const a = Math.random() * TAU;
        e.x = p.x + Math.cos(a) * R; e.y = p.y + Math.sin(a) * R;
        if (avoidsTerrain) Terrain.move(e, 0, 0, e.r);
        continue;
      }
      let sp = e.speed;
      if (e.frozen > 0) { e.frozen -= dt; sp = 0; }
      else if (e.slowT > 0) { e.slowT -= dt; sp *= 1 - e.slow; }
      let mx = dx / d, my = dy / d;

      if (def.ranged) {
        // 远程怪:保持距离、横向游走、定时吐刺
        if (d < def.keep - 30) { mx = -mx; my = -my; }
        else if (d < def.keep + 30) { const tx = -my * e.side; my = mx * e.side; mx = tx; }
        e.shootT -= dt;
        if (e.shootT <= 0 && d < def.keep + 140 && e.frozen <= 0 && this.ebullets.length < 80) {
          e.shootT = 2.8;
          this.ebullets.push({ x: e.x, y: e.y, vx: dx / d * 150, vy: dy / d * 150, r: 5, dmg: e.dmg, life: 4 });
        }
      } else if (e.boss) {
        // Boss:周期性蓄力冲锋,二阶以上冲锋时放一圈弹幕
        e.cd -= dt;
        if (e.cd <= 0) {
          if (e.phase === 'charge') { e.phase = ''; e.cd = 3.5; }
          else if (e.phase === 'wind') {
            e.phase = 'charge'; e.cd = 0.8;
            if (e.tier >= 1) {
              const nb = 10 + e.tier * 4;
              for (let i = 0; i < nb; i++) {
                const a = i / nb * TAU;
                this.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, r: 6, dmg: e.dmg * 0.6, life: 5 });
              }
            }
          } else {
            // 蓄力开始时就锁定冲锋方向,渲染层据此画预警线,玩家有时间横向躲开
            e.phase = 'wind'; e.cd = 0.8; e.cx = mx; e.cy = my;
          }
        }
        if (e.phase === 'wind') sp = 0;
        else if (e.phase === 'charge') { mx = e.cx; my = e.cy; sp *= 3.4; }
      }

      const moveX = (mx * sp + e.kx) * dt, moveY = (my * sp + e.ky) * dt;
      if (avoidsTerrain && (moveX || moveY)) Terrain.move(e, moveX, moveY, e.r, e.side);
      else { e.x += moveX; e.y += moveY; }
      const decay = Math.max(0, 1 - 8 * dt);
      e.kx *= decay; e.ky *= decay;

      // 敌人之间互相挤开(幽魂和 Boss 不参与)
      if (avoidsTerrain) {
        const x = e.x, y = e.y;
        const cx = Math.floor(e.x / cell), cy = Math.floor(e.y / cell);
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const a = g.get(gx, gy);
            if (!a) continue;
            for (let i = 0; i < a.length; i++) {
              const o = a[i];
              if (o === e || o.dead || ENEMIES[o.type].ghost) continue;
              const ox = e.x - o.x, oy = e.y - o.y, rr = e.r + o.r;
              const dd = ox * ox + oy * oy;
              if (dd < rr * rr && dd > 0.0001) {
                const l = Math.sqrt(dd), push = (rr - l) * 0.3;
                e.x += ox / l * push; e.y += oy / l * push;
              }
            }
          }
        }
        if (e.x !== x || e.y !== y) Terrain.move(e, 0, 0, e.r);
      }

      if (d < e.r + CFG.PLAYER_R) this.hurtPlayer(e.dmg, e);
    }
  },

  // ---------- 查询与伤害 ----------
  nearestEnemy(x, y, maxR, exclude) {
    let best = null, bd = maxR * maxR;
    for (const e of this.enemies) {
      if (e.dead || (exclude && exclude.has(e.id))) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  nearestEnemies(x, y, maxR, n) {
    if (n <= 1) { const e = this.nearestEnemy(x, y, maxR); return e ? [e] : []; }
    const list = [], m2 = maxR * maxR;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < m2) { e._d = d; list.push(e); }
    }
    list.sort((a, b) => a._d - b._d);
    if (list.length > n) list.length = n;
    return list;
  },

  // 随机取一个视野内的敌人,取不到则退化为最近的
  randomEnemy() {
    const p = this.player, v = this.view, es = this.enemies;
    if (!es.length) return null;
    for (let i = 0; i < 12; i++) {
      const e = es[(Math.random() * es.length) | 0];
      if (!e.dead && Math.abs(e.x - p.x) < v.hw && Math.abs(e.y - p.y) < v.hh) return e;
    }
    return this.nearestEnemy(p.x, p.y, Math.max(v.hw, v.hh));
  },

  // 遍历与圆 (x, y, r) 相交的存活敌人
  eachEnemyNear(x, y, r, fn) {
    const g = this.grid, c = g.cell, R = r + 64; // 64 = 最大敌人半径的余量
    const x0 = Math.floor((x - R) / c), x1 = Math.floor((x + R) / c);
    const y0 = Math.floor((y - R) / c), y1 = Math.floor((y + R) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const a = g.get(cx, cy);
        if (!a) continue;
        for (let i = 0; i < a.length; i++) {
          const e = a[i];
          if (e.dead) continue;
          const dx = e.x - x, dy = e.y - y, rr = r + e.r;
          if (dx * dx + dy * dy < rr * rr) fn(e);
        }
      }
    }
  },

  // 同一来源对同一敌人的命中间隔控制
  canHit(e, key, interval) {
    const t = e.h[key];
    if (t !== undefined && this.time - t < interval) return false;
    e.h[key] = this.time;
    return true;
  },

  slowEnemy(e, f, dur) {
    if (e.boss) f *= 0.5;
    if (e.slowT <= 0 || f >= e.slow) e.slow = f;
    e.slowT = Math.max(e.slowT, dur);
  },

  damageEnemy(e, dmg, wid, kx, ky, kb) {
    if (e.dead) return;
    dmg = Math.max(1, Math.round(dmg * U.rand(0.9, 1.1)));
    e.hp -= dmg;
    e.flash = 0.08;
    const p = this.player;
    p.dmgBy[wid] = (p.dmgBy[wid] || 0) + dmg;
    if (kb) {
      const l = Math.hypot(kx, ky) || 1, k = kb * (1 - e.kbRes);
      e.kx += kx / l * k; e.ky += ky / l * k;
    }
    if (this.texts.length < 70) {
      this.texts.push({ x: e.x + U.rand(-6, 6), y: e.y - e.r, s: String(dmg), life: 0.6, c: '#fff' });
    }
    Sfx.play('hit');
    if (e.hp <= 0) this.killEnemy(e);
  },

  aoe(x, y, r, dmg, wid, kb) {
    this.eachEnemyNear(x, y, r, e => this.damageEnemy(e, dmg, wid, e.x - x, e.y - y, kb));
  },

  killEnemy(e) {
    e.dead = true;
    const p = this.player;
    p.kills++;
    this.dropGem(e.x, e.y, e.xp);
    const r = Math.random();
    if (r < 0.05) this.pickups.push({ type: 'coin', x: e.x, y: e.y, v: 1 });
    else if (r < 0.057) this.pickups.push({ type: 'heart', x: e.x, y: e.y });
    else if (r < 0.0595 && !this.pickups.some(k => k.type === 'vacuum')) this.pickups.push({ type: 'vacuum', x: e.x, y: e.y });
    if (e.elite || e.boss) this.pickups.push({ type: 'chest', x: e.x, y: e.y, boss: e.boss });
    if (e.boss) {
      for (let i = 0; i < 12; i++) this.dropGem(e.x + U.rand(-50, 50), e.y + U.rand(-50, 50), 8);
      if (this.boss === e) this.boss = null;
      this.shake = 14;
      Sfx.play('boom');
      UI.banner('夜魇已被驱散');
    }
    this.burst(e.x, e.y, ENEMIES[e.type].color, e.boss ? 30 : e.elite ? 12 : 4);
    Sfx.play('kill');
  },

  dropGem(x, y, v) {
    if (v <= 0) return;
    if (this.gems.length >= CFG.MAX_GEMS) {
      // 宝石过多时把经验并入已有宝石,避免对象无限增长
      this.gems[(Math.random() * this.gems.length) | 0].v += v;
      return;
    }
    this.gems.push({ x: x + U.rand(-4, 4), y: y + U.rand(-4, 4), v, sp: 0, mag: false });
  },

  burst(x, y, color, n) {
    for (let i = 0; i < n && this.parts.length < 260; i++) {
      const a = Math.random() * TAU, s = U.rand(40, 160);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.rand(0.25, 0.5), c: color });
    }
  },

  hurtPlayer(dmg, src) {
    const p = this.player;
    if (p.iframe > 0 || this.state !== 'playing') return;
    const paper = p.weapons.find(w => w.id === 'exampaper' && w.guards > 0);
    if (paper) { this.consumeExamGuard(paper); return; }
    dmg = Math.max(1, Math.round(dmg - p.st.armor));
    p.hp -= dmg;
    p.iframe = src && src.boss ? 0.7 : 0.3; // 被 Boss 撞到后给更长的无敌时间,避免贴身秒杀
    this.shake = Math.max(this.shake, 5);
    this.texts.push({ x: p.x, y: p.y - 20, s: '-' + dmg, life: 0.7, c: '#ff6b6b' });
    Sfx.play('hurt');
    // 荆棘壁垒的反伤
    if (src) {
      for (const w of p.weapons) {
        if (w.s.thorns) this.damageEnemy(src, w.s.thorns * p.st.might, w.id, src.x - p.x, src.y - p.y, 200);
      }
    }
    if (p.hp <= 0) this.die();
  },

  consumeExamGuard(w) {
    const p = this.player, s = w.s;
    if (--w.guards === 0) w.timer = s.cd * p.st.cd;
    p.iframe = 0.3; // 同一波贴身攻击不会在同一帧消耗两张试卷。
    const radius = s.radius * p.st.area, color = WEAPONS[w.id].color;
    this.eachEnemyNear(p.x, p.y, radius, e => this.slowEnemy(e, s.slow, s.chill));
    this.fx.push({ type: 'boom', x: p.x, y: p.y, r: radius, life: 0.34, max: 0.34, c: color });
    this.burst(p.x, p.y, color, 9);
    this.texts.push({ x: p.x, y: p.y - 22, s: '抵挡', life: 0.7, c: color });
    Sfx.play('paper');
  },

  die() {
    const p = this.player;
    if (p.revives > 0) {
      // 余烬复活:回半血、短暂无敌、震开周围敌人
      p.revives--;
      p.hp = p.st.maxHp * 0.5;
      p.iframe = 2.5;
      this.aoe(p.x, p.y, 260, 60, 'revive', 600);
      this.fx.push({ type: 'boom', x: p.x, y: p.y, r: 260, life: 0.5, max: 0.5, c: '#ffd166' });
      this.shake = 12;
      UI.banner('余烬重燃');
      return;
    }
    p.hp = 0;
    this.finish(false);
  },

  // 结算:win = 是否撑到黎明
  finish(win) {
    const p = this.player, d = Save.data;
    const earned = Math.floor(p.coins) + Math.floor(this.time / 10) + (win ? 200 : 0);
    d.coins += earned;
    d.runs++;
    d.kills += p.kills;
    if (win) d.wins++;
    const newBest = this.time > d.best;
    if (newBest) d.best = Math.min(CFG.RUN_TIME, this.time);
    Save.write();
    this.result = { win, earned, time: Math.min(CFG.RUN_TIME, this.time), kills: p.kills, level: p.level, newBest };
    this.state = win ? 'victory' : 'gameover';
    if (win) {
      for (const e of this.enemies) this.burst(e.x, e.y, '#ffe9a8', 2);
      this.enemies.length = 0;
      this.ebullets.length = 0;
      this.boss = null;
    }
    Sfx.play(win ? 'level' : 'boom');
    UI.showResult();
  },

  // ---------- 投射物 ----------
  addProj(o) {
    o.uid = 'p' + (++UID);
    o.age = 0;
    o.maxLife = o.life;
    o.hit = new Set();
    this.projs.push(o);
  },

  updateProjs(dt) {
    const p = this.player, arr = this.projs;
    let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      b.life -= dt; b.age += dt;
      if (b.mode === 'boomer') {
        // 持续反向加速:飞出去再折返
        b.vx -= b.dx * b.acc * dt; b.vy -= b.dy * b.acc * dt;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.rot += 14 * dt;
      } else if (b.mode === 'spiral') {
        const rad = Math.sin(Math.PI * Math.min(1, b.age / b.maxLife)) * b.maxR;
        b.ang += 5 * dt;
        b.x = p.x + Math.cos(b.ang) * rad; b.y = p.y + Math.sin(b.ang) * rad;
        b.rot += 16 * dt;
      } else {
        if (b.mode === 'homing') {
          b.seek = (b.seek || 0) - dt;
          if (b.seek <= 0 || !b.tg || b.tg.dead) {
            b.seek = 0.12;
            b.tg = this.nearestEnemy(b.x, b.y, b.bounceRange || 420, b.hit);
          }
          if (b.tg) {
            const want = Math.atan2(b.tg.y - b.y, b.tg.x - b.x);
            let cur = Math.atan2(b.vy, b.vx);
            let diff = want - cur;
            while (diff > Math.PI) diff -= TAU;
            while (diff < -Math.PI) diff += TAU;
            cur += U.clamp(diff, -7 * dt, 7 * dt);
            b.vx = Math.cos(cur) * b.speed; b.vy = Math.sin(cur) * b.speed;
          }
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
      }

      if (b.life > 0) {
        let rebounded = false;
        this.eachEnemyNear(b.x, b.y, b.r, e => {
          if (b.life <= 0 || rebounded) return;
          if (b.rehit) { if (!this.canHit(e, b.uid, b.rehit)) return; }
          else { if (b.hit.has(e.id)) return; b.hit.add(e.id); }
          this.damageEnemy(e, b.dmg, b.wid, b.mode === 'spiral' ? e.x - p.x : b.vx, b.mode === 'spiral' ? e.y - p.y : b.vy, b.kb);
          if (b.blast) {
            this.aoe(b.x, b.y, b.blast, b.dmg * 0.6, b.wid, 80);
            this.fx.push({ type: 'boom', x: b.x, y: b.y, r: b.blast, life: 0.25, max: 0.25, c: b.color });
            if (b.sauce) this.zones.push({
              type: 'fire', look: 'tomato', x: b.x, y: b.y, r: b.blast, life: b.sauce, tk: 0.25,
              dmg: b.dmg * 0.45, wid: b.wid, color: b.color,
            });
          }
          if (b.bounceRange) {
            rebounded = true;
            this.reboundProjectile(b);
          } else if (--b.pierce <= 0) b.life = 0;
        });
      }
      if (b.life > 0) arr[n++] = b;
    }
    arr.length = n;
  },

  reboundProjectile(b) {
    const target = b.bounces > 0 ? this.nearestEnemy(b.x, b.y, b.bounceRange, b.hit) : null;
    if (!target) { b.life = 0; return; }
    b.bounces--;
    b.mode = 'homing';
    b.tg = target;
    b.seek = Infinity; // 一次弹射锁定一个新目标；目标死亡才重新寻找。
    const angle = Math.atan2(target.y - b.y, target.x - b.x);
    b.speed = Math.hypot(b.vx, b.vy);
    b.vx = Math.cos(angle) * b.speed;
    b.vy = Math.sin(angle) * b.speed;
  },

  // ---------- 区域效果:落地冲击、火海、霜环、年糕陷阱 ----------
  updateZones(dt) {
    const arr = this.zones;
    let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const z = arr[i];
      let keep = true;
      if (z.type === 'meteor' || z.type === 'monkey' || z.type === 'watermelon') {
        z.t -= dt;
        if (z.t <= 0) {
          const meteor = z.type === 'meteor';
          keep = false;
          this.aoe(z.x, z.y, z.r, z.dmg, z.wid, meteor ? 220 : 75);
          this.fx.push({ type: 'boom', x: z.x, y: z.y, r: z.r, life: 0.35, max: 0.35, c: meteor ? '#ff9f6b' : z.color });
          this.burst(z.x, z.y, meteor ? '#ffb36b' : z.color, 8);
          if (z.type === 'watermelon') this.burst(z.x, z.y, '#80c48b', 6);
          this.shake = Math.max(this.shake, meteor ? 6 : 2);
          Sfx.play('boom');
          if (z.burn) arr.push({ type: 'fire', x: z.x, y: z.y, r: z.r * 0.9, life: z.burn, tk: 0.3, dmg: z.dmg * 0.3, wid: z.wid });
        }
      } else if (z.type === 'ricecake') {
        keep = this.updateRicecake(z, dt);
      } else if (z.type === 'fire') {
        z.life -= dt; z.tk -= dt;
        if (z.tk <= 0) { z.tk = 0.5; this.aoe(z.x, z.y, z.r, z.dmg, z.wid, 0); }
        keep = z.life > 0;
      } else if (z.type === 'ring') {
        z.r += z.spd * dt;
        this.eachEnemyNear(z.x, z.y, z.r, e => {
          if (z.hit.has(e.id)) return;
          z.hit.add(e.id);
          this.damageEnemy(e, z.dmg, z.wid, e.x - z.x, e.y - z.y, 60);
          if (z.freeze && !e.boss) e.frozen = z.freeze;
          this.slowEnemy(e, z.slow, z.freeze + 2);
        });
        keep = z.r < z.maxR;
      }
      if (keep) arr[n++] = z;
    }
    arr.length = n;
  },

  updateRicecake(z, dt) {
    z.life -= dt;
    if (z.life <= 0) return false;
    let steppedOn = false;
    this.eachEnemyNear(z.x, z.y, z.trigger, () => { steppedOn = true; });
    if (!steppedOn) return true;
    this.eachEnemyNear(z.x, z.y, z.r, e => {
      this.damageEnemy(e, z.dmg, z.wid, 0, 0, 0);
      if (!e.dead) this.slowEnemy(e, z.slow, z.chill);
    });
    this.fx.push({ type: 'boom', x: z.x, y: z.y, r: z.r, life: 0.3, max: 0.3, c: z.color });
    this.burst(z.x, z.y, z.color, 6);
    Sfx.play('hit');
    return false;
  },

  // ---------- 敌方子弹 ----------
  updateBullets(dt) {
    const p = this.player, arr = this.ebullets;
    let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const dx = b.x - p.x, dy = b.y - p.y, rr = b.r + CFG.PLAYER_R;
      if (dx * dx + dy * dy < rr * rr) { this.hurtPlayer(b.dmg, null); continue; }
      if (b.life > 0) arr[n++] = b;
    }
    arr.length = n;
  },

  // ---------- 掉落物 ----------
  gainXp(v) {
    const p = this.player;
    p.xp += v * p.st.growth;
    while (p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed;
      p.level++;
      p.xpNeed = this.xpFor(p.level);
      this.pending++;
    }
  },

  updatePickups(dt) {
    const p = this.player, mr2 = p.st.magnet * p.st.magnet;
    // 经验宝石:进入拾取范围后加速飞向玩家
    const gs = this.gems;
    let n = 0;
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i];
      const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
      if (g.mag || d2 < mr2) {
        g.mag = true;
        g.sp = Math.min(760, (g.sp || 140) + 1100 * dt);
        const d = Math.sqrt(d2) || 1, step = g.sp * dt;
        if (d <= Math.max(16, step)) { this.gainXp(g.v); Sfx.play('gem'); continue; }
        g.x += dx / d * step; g.y += dy / d * step;
      }
      gs[n++] = g;
    }
    gs.length = n;

    const ps = this.pickups;
    n = 0;
    for (let i = 0; i < ps.length; i++) {
      const k = ps[i];
      const dx = p.x - k.x, dy = p.y - k.y, d2 = dx * dx + dy * dy;
      if (k.type === 'coin' && (k.mag || d2 < mr2)) {
        k.mag = true;
        const d = Math.sqrt(d2) || 1, step = 420 * dt;
        k.x += dx / d * Math.min(step, d); k.y += dy / d * Math.min(step, d);
      }
      if (d2 < 24 * 24) {
        if (k.type === 'coin') { p.coins += k.v * p.st.greed; Sfx.play('coin'); }
        else if (k.type === 'heart') { p.hp = Math.min(p.st.maxHp, p.hp + p.st.maxHp * 0.25); Sfx.play('chest'); }
        else if (k.type === 'vacuum') { for (const g of gs) g.mag = true; Sfx.play('frost'); }
        else if (k.type === 'chest') { this.openChest(k.boss); }
        continue;
      }
      ps[n++] = k;
    }
    ps.length = n;
  },

  // ---------- 特效 ----------
  updateFx(dt) {
    this.shake *= Math.max(0, 1 - 9 * dt);
    let arr = this.fx, n = 0;
    for (let i = 0; i < arr.length; i++) { arr[i].life -= dt; if (arr[i].life > 0) arr[n++] = arr[i]; }
    arr.length = n;
    arr = this.texts; n = 0;
    for (let i = 0; i < arr.length; i++) {
      const t = arr[i];
      t.life -= dt; t.y -= 34 * dt;
      if (t.life > 0) arr[n++] = t;
    }
    arr.length = n;
    arr = this.parts; n = 0;
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i];
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt;
      q.vx *= 0.92; q.vy *= 0.92;
      if (q.life > 0) arr[n++] = q;
    }
    arr.length = n;
  },
};
