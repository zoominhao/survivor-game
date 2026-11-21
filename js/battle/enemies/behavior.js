'use strict';

// 刷怪、移动、攻击和邻近查询。
const BattleEnemies = {
  // ---------- 刷怪 ----------
  spawnR() { return Math.hypot(this.view.hw, this.view.hh) + 50; },

  spawn(dt) {
    const t = this.time;
    const anchor = () => {
      if (!this.coop) return this.player;
      const slot = this.uid % 2, p = this.players[slot];
      return p.hp > 0 ? p : this.players[1 - slot];
    };
    const minute = Math.min(WAVE_RATES.length - 1, Math.floor(t / 60));
    const rate = WAVE_RATES[minute];
    const scene = Environment.forBattle(this), landscape = Environment.landscape(scene);
    const count = this.enemies.length;
    if (count < CFG.MAX_ENEMIES) {
      this.spawnAcc += rate * dt;
      if (count < 6 + minute * 5) this.spawnAcc += rate * dt * 2; // 场上太空时加速补怪
    }
    const R = this.spawnR();
    while (this.spawnAcc >= 1) {
      this.spawnAcc--;
      const p = anchor();
      const type = U.weighted(Environment.enemyPoolAt(t, undefined, scene));
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
      const p = anchor();
      this.eliteT += 45;
      const pool = Environment.enemyPoolAt(t, undefined, scene);
      let type = U.weighted(pool);
      if (type === 'swarm' || type === 'moth') type = Object.keys(pool).find(id => id !== 'swarm' && id !== 'moth');
      const a = Math.random() * TAU;
      this.spawnEnemy(type, p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, true);
    }
    // 定时事件
    while (this.evIdx < EVENTS.length && t >= EVENTS[this.evIdx].t) {
      const ev = EVENTS[this.evIdx++];
      const p = anchor();
      if (ev.kind !== 'boss' && ev.scene !== landscape) continue;
      if (ev.kind === 'ring') {
        const rr = R * 0.92;
        for (let i = 0; i < ev.n; i++) {
          const a = i / ev.n * TAU;
          this.spawnEnemy(ev.enemy, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
        }
        this.emit('banner', ev.msg || `${ENEMIES[ev.enemy].name}正在合围！`);
        this.play(ev.sound || 'siegeArrival');
      } else if (ev.kind === 'arrival') {
        const a = Math.random() * TAU, rr = R * 0.78;
        this.spawnEnemy(ev.enemy, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
        this.emit('banner', ev.msg);
        if (ev.sound) this.play(ev.sound);
      } else if (ev.kind === 'boss') {
        this.pendingBosses.push(ev);
      }
    }
    // 上一位还没击败时排队，但其他定时怪潮照常发生。
    if (this.state === 'playing' && !this.boss && this.pendingBosses.length && t - this.bossClearAt >= BOSS_REWARD_BEAT) {
      this.offerBossDecision(this.pendingBosses.shift());
    }
  },

  spawnEnemy(type, x, y, elite) {
    // 联机给 Boss 留一个席位，怪潮不能让同步实体越过上限。
    if (this.coop && type !== 'boss' && this.enemies.length >= CFG.MAX_ENEMIES - (this.boss ? 0 : 1)) return null;
    const d = ENEMIES[type], m = this.time / 60;
    const hpMul = 1 + m * 0.2 + m * m * 0.012; // 血量随时间成长
    const e = {
      id: ++this.uid, type, x, y, r: d.r, hp: d.hp * hpMul, maxHp: d.hp * hpMul,
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
    if (type !== 'boss' && !d.ghost) Terrain.move(e, 0, 0, e.r, 0, this.landscape);
    this.enemies.push(e);
    return e;
  },

  // ---------- 敌人 ----------
  updateEnemies(dt) {
    const g = this.grid, cell = g.cell;
    const far = this.spawnR() * 1.7, R = this.spawnR();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const p = this.coop ? this.nearestPlayer(e.x, e.y) : this.player;
      if (!p) break;
      const def = ENEMIES[e.type], avoidsTerrain = !def.ghost && !e.boss;
      e.t += dt;
      if (e.flash > 0) e.flash -= dt;
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 0.001;
      // 被甩得太远的敌人直接挪回玩家周围
      if (d > far && !e.boss) {
        const a = Math.random() * TAU;
        e.x = p.x + Math.cos(a) * R; e.y = p.y + Math.sin(a) * R;
        if (avoidsTerrain) Terrain.move(e, 0, 0, e.r, 0, this.landscape);
        continue;
      }
      let sp = e.speed;
      if (e.frozen > 0) { e.frozen -= dt; sp = 0; }
      else if (e.slowT > 0) { e.slowT -= dt; sp *= 1 - e.slow; }
      if (def.hop) {
        sp *= 0.26 + 1.19 * this.hopLift(e, def.hop);
        if (sp > 0 && e.t % def.hop < dt) this.playNearby('corpseHop', e, 235);
      }
      const stepSound = def.moveSound;
      if (sp > 0 && stepSound && e.t % stepSound.period < dt) this.playNearby(stepSound.cue, e, stepSound.range);
      let mx = dx / d, my = dy / d;
      if (def.weave) {
        const sway = Math.sin(e.t * 7) * def.weave;
        const dir = Math.atan2(my, mx) + sway;
        mx = Math.cos(dir); my = Math.sin(dir);
      }

      if (def.ranged) {
        // 远程怪:保持距离、横向游走、定时发射弹幕
        if (d < def.keep - 30) { mx = -mx; my = -my; }
        else if (d < def.keep + 30) { const tx = -my * e.side; my = mx * e.side; mx = tx; }
        e.shootT -= dt;
        if (e.shootT <= 0 && d < def.keep + 140 && e.frozen <= 0 && this.ebullets.length < 80) {
          this.fireEnemyVolley(e, def, Math.atan2(dy, dx));
        }
      } else if (e.boss) {
        this.updateBossAttack(e, dt, mx, my, d, p);
        if (['wind', 'sealWind', 'fanWind'].includes(e.phase)) sp = 0;
        else if (e.phase === 'charge') { mx = e.cx; my = e.cy; sp *= e.chargeSpeed; }
        else if (e.kind === 'bridalQueen' && d < 150) { mx = -mx; my = -my; }
      }

      const moveX = (mx * sp + e.kx) * dt, moveY = (my * sp + e.ky) * dt;
      if (avoidsTerrain && (moveX || moveY)) Terrain.move(e, moveX, moveY, e.r, e.side, this.landscape);
      else { e.x += moveX; e.y += moveY; }
      const decay = Math.max(0, 1 - 8 * dt);
      e.kx *= decay; e.ky *= decay;

      // 敌人之间互相挤开，能穿障的鬼怪不主动挤开其他敌人。
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
        if (e.x !== x || e.y !== y) Terrain.move(e, 0, 0, e.r, 0, this.landscape);
      }

      if (d < e.r + CFG.PLAYER_R) this.hurtPlayer(e.dmg, e, p);
      if (this.coop) for (const other of this.players) {
        if (other !== p && Math.hypot(other.x - e.x, other.y - e.y) < e.r + CFG.PLAYER_R) this.hurtPlayer(e.dmg, e, other);
      }
      if (this.state !== 'playing') break;
    }
  },

  hopLift(e, period) { return Math.sin(Math.PI * ((e.t % period) / period)); },

  fireEnemyVolley(e, def, angle) {
    e.shootT = def.shotCd ?? 2.8;
    const fan = def.fan ?? 1, speed = def.shotSpeed ?? 150;
    for (let i = 0; i < fan && this.ebullets.length < 80; i++) {
      const a = angle + (i - (fan - 1) / 2) * (def.spread ?? 0);
      this.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r: 5, dmg: e.dmg, life: 4, look: def.shotLook });
    }
    if (def.shotLook === 'weddingPaper') this.playNearby('weddingPaper', e, 400);
    else if (def.shotSound) this.playNearby(def.shotSound, e, 350);
  },

  playNearby(cue, source, range) {
    const p = this.coop ? this.nearestPlayer(source.x, source.y) : this.player;
    if (!p) return;
    const dx = source.x - p.x, dy = source.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= range) return;
    const gain = 1 - dist / range;
    this.play(cue, gain, U.clamp(dx / 160, -0.8, 0.8));
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
};
