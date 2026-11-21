'use strict';

// 敌人贴图与战场绘制。
const EnemyRendering = {
  // ---------- 预渲染 ----------
  makeSprite(r, draw) {
    const S = 3, size = Math.ceil((r * 2.6 + 12) * S);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.translate(size / 2, size / 2);
    x.scale(S, S);
    draw(x, r);
    // 受击闪白版本
    const f = document.createElement('canvas');
    f.width = f.height = size;
    const fx = f.getContext('2d');
    fx.drawImage(c, 0, 0);
    fx.globalCompositeOperation = 'source-atop';
    fx.fillStyle = '#fff';
    fx.fillRect(0, 0, size, size);
    return { n: c, f, half: size / (2 * S), r };
  },

  buildEnemySprites() {
    for (const id in ENEMIES) {
      if (id !== 'boss') this.sprites[id] = this.makeSprite(ENEMIES[id].r, NightParadeArt[id] || FolkEnemyArt[id]);
    }
    const r = ENEMIES.boss.r;
    this.bossSprites = {
      nightmare: this.makeSprite(r, NightmareArt.paint),
      coffinKing: this.makeSprite(r, BossArt.coffinKing),
      bridalQueen: this.makeSprite(r, BossArt.bridalQueen),
    };
  },

  // 冲锋提示和弹幕画在夜色层上方，看不见怪物时仍能反应。
  drawBossWarning(ctx, b) {
    if (b && !b.dead && (b.phase === 'sealWind' || b.phase === 'fanWind')) BossArt.warning(ctx, b);
    if (b && !b.dead && b.phase === 'wind') {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.cy, b.cx));
      const reach = 230 * b.chargeSpeed / BOSS_TACTICS.nightmare.values.normal;
      ctx.fillStyle = 'rgba(255,50,80,0.2)';
      ctx.fillRect(0, -b.r, reach, b.r * 2);
      ctx.strokeStyle = 'rgba(255,90,110,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, -b.r, reach, b.r * 2);
      ctx.restore();
    }
  },

  drawEnemies(ctx, g, vis) {
    // 只排序显示列表，不改动战斗的敌人更新顺序。
    const es = g.enemies.filter(e => !e.dead && vis(e.x, e.y, e.r + 20)).sort((a, b) => a.y - b.y);
    // 影子合并为一条路径
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    for (const e of es) {
      if (e.dead || !vis(e.x, e.y, e.r + 10)) continue;
      ctx.moveTo(e.x + e.r * 0.8, e.y + e.r * 0.85);
      ctx.ellipse(e.x, e.y + e.r * 0.85, e.r * 0.8, e.r * 0.3, 0, 0, TAU);
    }
    ctx.fill();
    for (const e of es) {
      const sp = e.type === 'boss' ? this.bossSprites[e.kind || 'nightmare'] : this.sprites[e.type];
      const k = e.r / sp.r, h = sp.half * k;
      const hop = ENEMIES[e.type].hop;
      const bob = e.frozen > 0 ? 0 : hop ? -g.hopLift(e, hop) * e.r * 0.58 : Math.sin(e.t * 7) * 1.5;
      // Boss 蓄力时抖动
      const jx = e.phase === 'wind' || e.phase === 'sealWind' ? Math.sin(e.t * 44) * 2 : 0;
      ctx.drawImage(sp.n, e.x - h + jx, e.y - h + bob, h * 2, h * 2);
      if (e.flash > 0) {
        // 受击闪白:半透明叠加,怪多或 Boss 持续挨打时不至于一片纯白
        ctx.globalAlpha = 0.6;
        ctx.drawImage(sp.f, e.x - h + jx, e.y - h + bob, h * 2, h * 2);
        ctx.globalAlpha = 1;
      }
      if (e.frozen > 0 || e.slowT > 0) {
        ctx.fillStyle = e.frozen > 0 ? 'rgba(170,230,255,0.5)' : 'rgba(170,230,255,0.22)';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
      }
      if (e.elite) {
        // 精英怪:金色光圈 + 血条
        ctx.strokeStyle = 'rgba(255,209,102,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, TAU); ctx.stroke();
        const bw = e.r * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 12, bw, 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 12, bw * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
  },
};
