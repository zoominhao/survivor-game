'use strict';

// 投射物、区域武器与敌方弹幕。
const BattleProjectiles = {
  // ---------- 投射物 ----------
  addProj(o) {
    o.uid = 'p' + (++this.uid);
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
            if (b.sauce) {
              this.zones.push({
                type: 'fire', look: b.look, x: b.x, y: b.y, r: b.blast, life: b.sauce, tk: 0.25,
                dmg: b.dmg * 0.45, wid: b.wid, color: b.color, slow: b.spillSlow,
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
    this.play('bounce');
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
          this.aoe(z.x, z.y, z.r, z.dmg, z.wid, z.kb ?? (meteor ? 220 : 75));
          this.fx.push({ type: 'boom', x: z.x, y: z.y, r: z.r, life: 0.35, max: 0.35, c: meteor ? '#ff9f6b' : z.color });
          this.burst(z.x, z.y, meteor ? '#ffb36b' : z.color, 8);
          if (z.type === 'watermelon') this.burst(z.x, z.y, '#80c48b', 6);
          this.shake = Math.max(this.shake, meteor ? 6 : 2);
          this.play(z.impactSound ?? (meteor ? 'boom' : z.type === 'watermelon' ? 'splash' : 'land'));
          if (z.burn) arr.push({ type: 'fire', x: z.x, y: z.y, r: z.r * 0.9, life: z.burn, tk: 0.3, dmg: z.dmg * 0.3, wid: z.wid });
        }
      } else if (z.type === 'ricecake') {
        keep = this.updateRicecake(z, dt);
      } else if (z.type === 'fire') {
        z.life -= dt; z.tk -= dt;
        if (z.tk <= 0) {
          z.tk = 0.5;
          this.eachEnemyNear(z.x, z.y, z.r, e => {
            this.damageEnemy(e, z.dmg, z.wid, 0, 0, 0);
            if (z.slow && !e.dead) this.slowEnemy(e, z.slow, 0.65);
          });
        }
        keep = z.life > 0;
      } else if (z.type === 'ring') {
        z.r += z.spd * dt;
        this.eachEnemyNear(z.x, z.y, z.r, e => {
          if (z.hit.has(e.id)) return;
          z.hit.add(e.id);
          this.damageEnemy(e, z.dmg, z.wid, e.x - z.x, e.y - z.y, z.kb ?? 60);
          if (z.freeze && !e.boss) e.frozen = z.freeze;
          if (z.slow) this.slowEnemy(e, z.slow, z.freeze + 2);
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
    this.play('hit');
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
};
