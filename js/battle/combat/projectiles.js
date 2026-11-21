'use strict';

// 投射物、区域武器与敌方弹幕。
const BattleProjectiles = {
  // ---------- 投射物 ----------
  addProj(o, p = this.player) {
    o.uid = 'p' + (++this.uid);
    o.age = 0;
    o.maxLife = o.life;
    o.hit = new Set();
    o.owner = p;
    this.projs.push(o);
  },

  addZone(o) {
    o.owner = this.player;
    this.zones.push(o);
  },

  updateProjs(dt) {
    const arr = this.projs;
    let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      const p = b.owner || this.player;
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
          this.damageEnemy(e, b.dmg, b.wid, b.mode === 'spiral' ? e.x - p.x : b.vx, b.mode === 'spiral' ? e.y - p.y : b.vy, b.kb, p);
          if (b.split) this.splitPaper(b, p);
          else if (b.refold) this.refoldPaper(b, p);
          if (b.blast) {
            this.aoe(b.x, b.y, b.blast, b.dmg * 0.6, b.wid, 80, p);
            this.fx.push({ type: 'boom', x: b.x, y: b.y, r: b.blast, life: 0.25, max: 0.25, c: b.color });
            if (b.sauce) {
              this.zones.push({
                type: 'fire', look: b.look, x: b.x, y: b.y, r: b.blast, life: b.sauce, tk: 0.25,
                dmg: b.dmg * 0.45, wid: b.wid, color: b.color, slow: b.spillSlow, owner: p,
              });
              this.play('splash');
            }
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
    this.play(WEAPONS[b.wid]?.bounceSound || 'bounce');
  },

  splitPaper(shot, owner) {
    const angle = Math.atan2(shot.vy, shot.vx), dmg = shot.dmg * shot.split;
    shot.split = 0;
    for (const offset of [-0.72, 0.72]) {
      const a = angle + offset;
      const flake = { x: shot.x, y: shot.y, vx: Math.cos(a) * 405, vy: Math.sin(a) * 405,
        r: 4, life: 0.43, pierce: 1, dmg, wid: shot.wid, look: 'paperFlake', color: shot.color, kb: 48, refold: shot.refold };
      this.addProj(flake, owner);
      flake.hit = new Set(shot.hit);
    }
  },

  refoldPaper(flake, owner) {
    const tg = this.nearestEnemy(flake.x, flake.y, 230, flake.hit);
    if (!tg) return;
    const a = Math.atan2(tg.y - flake.y, tg.x - flake.x), speed = 460;
    const crane = { x: flake.x, y: flake.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      speed, mode: 'homing', tg, seek: 0.15, r: 5, life: 0.72, pierce: 1, dmg: flake.dmg * flake.refold,
      wid: flake.wid, look: 'paperKite', color: flake.color, kb: 40 };
    this.addProj(crane, owner);
    crane.hit = new Set(flake.hit);
  },

  // ---------- 区域效果:落地冲击、火海、霜环、年糕陷阱 ----------
  updateZones(dt) {
    const arr = this.zones;
    let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const z = arr[i];
      let keep = true;
      if (z.type === 'meteor' || z.type === 'monkey' || z.type === 'watermelon' || z.type === 'goldIngot') {
        z.t -= dt;
        if (z.t <= 0) {
          const meteor = z.type === 'meteor';
          keep = false;
          this.aoe(z.x, z.y, z.r, z.dmg, z.wid, z.kb ?? (meteor ? 220 : 75), z.owner);
          const color = z.color || (meteor ? '#ff9f6b' : '#ffb36b');
          this.fx.push({ type: 'boom', x: z.x, y: z.y, r: z.r, life: 0.35, max: 0.35, c: color });
          this.burst(z.x, z.y, z.color || (meteor ? '#ffb36b' : color), 8);
          if (z.type === 'watermelon') this.burst(z.x, z.y, '#80c48b', 6);
          this.shake = Math.max(this.shake, meteor ? 6 : 2);
          this.play(z.impactSound ?? (meteor ? 'boom' : z.type === 'watermelon' ? 'splash' : 'land'));
          if (z.burn) arr.push({ type: 'fire', x: z.x, y: z.y, r: z.r * 0.9, life: z.burn, tk: 0.3, dmg: z.dmg * 0.3, wid: z.wid, owner: z.owner });
        }
      } else if (z.type === 'ricecake') {
        keep = this.updateRicecake(z, dt);
      } else if (z.type === 'fire') {
        z.life -= dt; z.tk -= dt;
        if (z.drift && z.owner.hp > 0) {
          const dx = z.owner.x - z.x, dy = z.owner.y - z.y;
          const k = Math.min(1, z.drift * dt / (Math.hypot(dx, dy) || 1));
          z.x += dx * k; z.y += dy * k;
        }
        if (z.tk <= 0) {
          z.tk = 0.5;
          if (z.heal && z.life > 0) for (const p of this.players) {
            if (p.hp > 0 && Math.hypot(p.x - z.x, p.y - z.y) <= z.r) {
              p.hp = Math.min(p.st.maxHp, p.hp + p.st.maxHp * z.heal);
            }
          }
          this.eachEnemyNear(z.x, z.y, z.r, e => {
            this.damageEnemy(e, z.dmg, z.wid, 0, 0, 0, z.owner);
            if (z.slow && !e.dead) this.slowEnemy(e, z.slow, 0.65);
          });
        }
        keep = z.life > 0;
      } else if (z.type === 'undertow') {
        z.life -= dt; z.tk -= dt;
        keep = z.life > 0;
        if (keep && z.tk <= 0) {
          z.tk = 0.16;
          eachFolkLineEnemy(this, z, { x: z.fromX, y: z.fromY }, z.r, e => this.slowEnemy(e, z.slow, 0.48));
        }
      } else if (z.type === 'decoy') {
        z.life -= dt;
        keep = z.life > 0;
        if (!keep) {
          this.aoe(z.x, z.y, z.trigger, z.dmg, z.wid, z.kb, z.owner);
          FolkSynergy.mistMask(this, z);
          this.fx.push({ type: 'boom', x: z.x, y: z.y, r: z.trigger, life: 0.32, max: 0.32, c: z.color });
          this.play('boom');
        }
      } else if (z.type === 'ring') {
        if (z.t > 0) {
          z.t = Math.max(0, z.t - dt);
          if (z.t > 0) { arr[n++] = z; continue; }
          this.play('watchClack');
        }
        const before = z.r;
        z.r = z.recall ? Math.max(0, before - z.spd * dt) : Math.min(z.maxR, before + z.spd * dt);
        this.eachEnemyNear(z.x, z.y, z.recall ? before : z.r, e => {
          if (z.recall && Math.hypot(e.x - z.x, e.y - z.y) + e.r < z.r) return;
          if (z.hit.has(e.id)) return;
          z.hit.add(e.id);
          const sign = z.recall ? -1 : 1;
          this.damageEnemy(e, z.dmg, z.wid, sign * (e.x - z.x), sign * (e.y - z.y), z.kb ?? 60, z.owner);
          FolkSynergy.markClack(this, e, z);
          if (z.freeze && !e.boss) e.frozen = z.freeze;
          if (z.slow) this.slowEnemy(e, z.slow, z.freeze + 2);
        });
        keep = z.recall ? z.r > 0 : z.r < z.maxR;
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
      this.damageEnemy(e, z.dmg, z.wid, 0, 0, 0, z.owner);
      if (!e.dead) this.slowEnemy(e, z.slow, z.chill);
    });
    this.fx.push({ type: 'boom', x: z.x, y: z.y, r: z.r, life: 0.3, max: 0.3, c: z.color });
    this.burst(z.x, z.y, z.color, 6);
    this.play('hit');
    return false;
  },

  // ---------- 敌方子弹 ----------
  reflectBullet(b, p) {
    if (p.iframe > 0 || this.practiceInvincible || this.state !== 'playing') return false;
    const mirror = p.weapons.find(w => w.id === 'boneMirror' && w.timer <= 0);
    if (!mirror) return false;
    const s = mirror.s, speed = Math.hypot(b.vx, b.vy);
    const dx = speed > 0 ? -b.vx / speed : p.dirx, dy = speed > 0 ? -b.vy / speed : p.diry;
    mirror.timer = s.cd * p.st.cd;
    const color = WEAPONS[mirror.id].color;
    this.addProj({ x: b.x, y: b.y, vx: dx * 480, vy: dy * 480, r: 6 * p.st.area, life: 1.2,
      dmg: s.dmg * p.st.might, pierce: s.pierce, wid: mirror.id, look: 'mirrorBolt', color, kb: 80 }, p);
    this.fx.push({ type: 'mirrorWard', x: p.x, y: p.y, r: 25, life: 0.35, max: 0.35, c: color });
    this.play('mirrorChime');
    return true;
  },

  updateBullets(dt) {
    const arr = this.ebullets;
    let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const p = this.coop ? this.nearestPlayer(b.x, b.y) : this.player;
      if (!p) break;
      const dx = b.x - p.x, dy = b.y - p.y, rr = b.r + CFG.PLAYER_R;
      if (dx * dx + dy * dy < rr * rr) {
        if (!this.reflectBullet(b, p)) this.hurtPlayer(b.dmg, null, p);
        continue;
      }
      if (b.life > 0) arr[n++] = b;
    }
    arr.length = n;
  },
};
