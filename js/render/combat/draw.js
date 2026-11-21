'use strict';

// 武器效果、掉落物、投射物和粒子。
const CombatRendering = {
  lightningPoints: new WeakMap(),
  drawZones(ctx, g, time) {
    // 光环类武器
    for (const p of g.players) for (const w of p.weapons) {
      if (p.hp <= 0) continue;
      if (WEAPONS[w.id].kind !== 'aura') continue;
      const R = w.s.radius * p.st.area, strong = !!w.s.thorns;
      ctx.fillStyle = strong ? 'rgba(150,255,140,0.13)' : 'rgba(120,220,130,0.09)';
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = strong ? 'rgba(190,255,170,0.6)' : 'rgba(140,240,150,0.38)';
      ctx.lineWidth = strong ? 3 : 2;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -time * 26;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const z of g.zones) {
      if (z.type === 'meteor' && z.look !== 'aiScan') {
        const k = 1 - z.t / z.max;
        ctx.fillStyle = `rgba(255,90,50,${0.08 + k * 0.2})`;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,140,90,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
      } else if (z.type === 'monkey' || z.type === 'watermelon' || z.type === 'goldIngot') {
        const k = 1 - z.t / z.max;
        ctx.save();
        ctx.strokeStyle = ctx.fillStyle = z.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.32 + 0.42 * k;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.1 + 0.22 * k;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (z.type === 'ricecake') {
        FoodArt.ricecake(ctx, z);
      } else if (z.type === 'fire' && z.look === 'tomato') {
        FoodArt.sauce(ctx, z);
      } else if (z.type === 'fire' && z.look === 'bubbletea') {
        FoodArt.teaSpill(ctx, z);
      } else if (z.type === 'fire' && z.look === 'incense') {
        RelicArt.incense(ctx, z, time);
      } else if (z.type === 'fire') {
        const a = Math.min(1, z.life) * (0.26 + Math.sin(time * 18 + z.x) * 0.06);
        ctx.fillStyle = `rgba(255,120,40,${a})`;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,210,90,${a * 0.8})`;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.55, 0, TAU); ctx.fill();
      } else if (z.type === 'ring' && z.look === 'noodles') {
        ZhuSkillArt.noodles(ctx, z, time);
      } else if (z.type === 'ring' && z.look === 'roar') {
        XiaoxiaoArt.roar(ctx, z);
      } else if (z.type === 'ring') {
        const k = 1 - z.r / z.maxR;
        ctx.strokeStyle = `rgba(190,240,255,${0.25 + k * 0.7})`;
        ctx.lineWidth = 5 + k * 6;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(170,230,255,${k * 0.1})`;
        ctx.fill();
      }
    }
  },

  drawDrops(ctx, g, vis, time) {
    // 经验宝石:按价值分三档颜色
    for (const gem of g.gems) {
      if (!vis(gem.x, gem.y, 10)) continue;
      const big = gem.v >= 25, mid = gem.v >= 5;
      const r = big ? 7 : mid ? 5.5 : 4;
      ctx.fillStyle = big ? '#ff7ab8' : mid ? '#ffd166' : '#6fe3c4';
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - r); ctx.lineTo(gem.x + r * 0.75, gem.y);
      ctx.lineTo(gem.x, gem.y + r); ctx.lineTo(gem.x - r * 0.75, gem.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(gem.x - r * 0.3, gem.y - r * 0.45, r * 0.3, r * 0.3);
    }
    for (const k of g.pickups) {
      if (!vis(k.x, k.y, 20)) continue;
      const bob = Math.sin(time * 5 + k.x) * 2;
      if (k.type === 'coin') {
        ctx.fillStyle = '#f2b632';
        ctx.beginPath(); ctx.arc(k.x, k.y + bob, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath(); ctx.arc(k.x - 1, k.y - 1 + bob, 2.2, 0, TAU); ctx.fill();
      } else if (k.type === 'heart') {
        ctx.fillStyle = '#ff5d73';
        ctx.beginPath();
        ctx.arc(k.x - 3.5, k.y - 2 + bob, 4.2, 0, TAU);
        ctx.arc(k.x + 3.5, k.y - 2 + bob, 4.2, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(k.x - 7.4, k.y + bob); ctx.lineTo(k.x, k.y + 8 + bob); ctx.lineTo(k.x + 7.4, k.y + bob);
        ctx.closePath(); ctx.fill();
      } else if (k.type === 'vacuum') {
        ctx.globalCompositeOperation = 'lighter';
        this.drawGlow(ctx, '#6fe3c4', k.x, k.y + bob, 16);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#d9fff5';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(k.x, k.y + bob, 6, time * 4, time * 4 + 4.6); ctx.stroke();
      } else if (k.type === 'chest') {
        ctx.globalCompositeOperation = 'lighter';
        this.drawGlow(ctx, '#ffd166', k.x, k.y, 30 + Math.sin(time * 4) * 4);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(k.x - 11, k.y - 6, 22, 14);
        ctx.fillStyle = '#b57a3c';
        ctx.fillRect(k.x - 11, k.y - 10, 22, 6);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(k.x - 11, k.y - 4.5, 22, 2);
        ctx.fillRect(k.x - 2, k.y - 6, 4, 6);
      }
    }
  },

  drawMouse(ctx, b) {
    const stride = Math.sin(b.age * 31), scale = Math.min(1.8, b.r / 8);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.scale(scale, scale);

    ctx.fillStyle = '#17201d99';
    ctx.beginPath(); ctx.ellipse(-1, 3, 10, 4, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -Math.abs(stride) * 1.8);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#bb7d6b'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-7, 1);
    ctx.bezierCurveTo(-12, 4, -16, 6 + stride * 3, -19, 1 + stride * 3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 3); ctx.lineTo(-5 + stride * 2, 5);
    ctx.moveTo(3, 3); ctx.lineTo(3 - stride * 2, 5); ctx.stroke();

    ctx.fillStyle = b.color; ctx.strokeStyle = '#624638'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.ellipse(-3, 0, 7.5, 4.9, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 0.7); ctx.quadraticCurveTo(6, -6, 1, -4.5);
    ctx.quadraticCurveTo(-4, -3.5, -1, 2.6); ctx.quadraticCurveTo(3, 6, 10, 0.7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#dea08c';
    ctx.beginPath(); ctx.arc(0.5, -4.8, 2.8, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#352724';
    ctx.beginPath(); ctx.arc(5, -1.5, 1, 0, TAU); ctx.moveTo(11, 0.7); ctx.arc(10, 0.7, 1, 0, TAU); ctx.fill();
    ctx.restore();
  },

  drawMonkeyLeap(ctx, z) {
    const k = U.clamp(1 - z.t / z.max, 0, 1), lift = Math.sin(k * Math.PI);
    const scale = z.wid === 'monkeytroop' ? 1.22 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(z.fromX + (z.x - z.fromX) * k, z.fromY + (z.y - z.fromY) * k - lift * 42);
    ctx.scale(z.x < z.fromX ? -scale : scale, scale);
    ctx.rotate((k - 0.5) * 0.6);
    ctx.lineCap = 'round';

    ctx.strokeStyle = '#b87a54'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-4, 6);
    ctx.bezierCurveTo(-11, 13, -21, 9, -18, 2);
    ctx.bezierCurveTo(-16, -2, -11, 1, -14, 4); ctx.stroke();
    ctx.strokeStyle = '#d19a6b'; ctx.lineWidth = 3.7;
    ctx.beginPath();
    ctx.moveTo(3, 1); ctx.lineTo(12, -2 + k * 6);
    ctx.moveTo(-2, 6); ctx.lineTo(-8 + k * 10, 10); ctx.stroke();

    ctx.fillStyle = '#a56a48'; ctx.strokeStyle = '#432d26'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 4, 5.6, 6.6, -0.38, 0, TAU); ctx.fill(); ctx.stroke();
    for (const x of [-5, 9]) {
      ctx.beginPath(); ctx.arc(x, -6, 3.1, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(2, -6.5, 7.2, 7.1, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = z.color;
    ctx.beginPath(); ctx.moveTo(2, -8.4);
    ctx.bezierCurveTo(-4.5, -13.9, -6, -2, 0.3, -1);
    ctx.bezierCurveTo(8, 1.8, 10.9, -11.4, 4.7, -10.2);
    ctx.quadraticCurveTo(3.1, -10.1, 2, -8.4); ctx.fill();
    ctx.fillStyle = '#442b24';
    ctx.beginPath(); ctx.arc(0.1, -6.4, 0.85, 0, TAU); ctx.moveTo(5.6, -6.5); ctx.arc(4.7, -6.5, 0.9, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2.8, -4.4, 1.8, 0.3, 2.7); ctx.stroke();
    ctx.restore();
  },

  drawBasketball(ctx, b) {
    const r = b.r;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y);
    ctx.fillStyle = '#16201b99';
    ctx.beginPath(); ctx.ellipse(0, r * 0.6, r, r * 0.37, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -Math.abs(Math.sin(b.age * 19)) * r * 0.42);
    ctx.rotate(b.age * 13);
    ctx.fillStyle = b.color; ctx.strokeStyle = '#593625'; ctx.lineWidth = 1.15;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.moveTo(-r * 0.74, -r * 0.66); ctx.quadraticCurveTo(-r * 0.12, 0, -r * 0.74, r * 0.66);
    ctx.moveTo(r * 0.74, -r * 0.66); ctx.quadraticCurveTo(r * 0.12, 0, r * 0.74, r * 0.66);
    ctx.stroke();
    ctx.restore();
  },

  drawGoldIngot(ctx, z) {
    const k = U.clamp(1 - z.t / z.max, 0, 1);
    const lift = (1 - k * k) * 103;
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(z.x + lift * 0.21, z.y - lift);
    ctx.rotate((1 - k) * 0.36);
    ctx.strokeStyle = '#8b542a'; ctx.fillStyle = '#c8843c'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-21, -4); ctx.quadraticCurveTo(-16, 13, 0, 12);
    ctx.quadraticCurveTo(16, 13, 21, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4c45e';
    ctx.beginPath(); ctx.moveTo(-21, -4); ctx.quadraticCurveTo(-17, -12, -10, -4);
    ctx.quadraticCurveTo(0, 2, 10, -4); ctx.quadraticCurveTo(17, -12, 21, -4);
    ctx.quadraticCurveTo(15, 8, 0, 8); ctx.quadraticCurveTo(-16, 8, -21, -4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe399'; ctx.beginPath(); ctx.ellipse(0, -5, 10, 6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff2bd'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-7, -5); ctx.quadraticCurveTo(-3, -9, 4, -8); ctx.stroke();
    ctx.restore();
  },

  drawProjs(ctx, g, vis) {
    ctx.globalCompositeOperation = 'lighter';
    // 环绕类武器的光球与甜筒
    for (const p of g.players) for (const w of p.weapons) {
      if (p.hp <= 0) continue;
      if (WEAPONS[w.id].kind !== 'orbit' || !(w.on > 0)) continue;
      const st = p.st, n = w.s.count + st.amount, R = w.s.radius * st.area, r = w.s.size * st.area;
      const color = WEAPONS[w.id].color;
      for (let i = 0; i < n; i++) {
        const a = w.ang + i / n * TAU;
        const x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
        if (w.id === 'icecream') FoodArt.icecream(ctx, x, y, r, i);
        else this.drawGlow(ctx, color, x, y, r * 2.2);
      }
    }
    for (const b of g.projs) {
      if (!vis(b.x, b.y, 40)) continue;
      if (b.look === 'mouse') {
        this.drawMouse(ctx, b);
      } else if (b.look === 'basketball') {
        this.drawBasketball(ctx, b);
      } else if (b.look === 'latiao' || b.look === 'pony') {
        XiaoxiaoArt[b.look](ctx, b);
      } else if (b.look === 'code' || b.look === 'ticket') {
        ZhuSkillArt[b.look](ctx, b);
      } else if (b.look === 'soulCoin' || b.look === 'mirrorBolt') {
        RelicArt[b.look](ctx, b);
      } else if (b.look === 'candy' || b.look === 'potato' || b.look === 'tomato' || b.look === 'bubbletea') {
        FoodArt[b.look](ctx, b);
      } else if (b.look === 'bolt') {
        this.drawGlow(ctx, b.color, b.x, b.y, b.r * 2.4);
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = b.r * 0.9;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (b.look === 'lance') {
        const l = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / l, uy = b.vy / l;
        ctx.strokeStyle = b.color;
        ctx.lineCap = 'round';
        ctx.lineWidth = b.r * 0.7;
        ctx.beginPath(); ctx.moveTo(b.x - ux * 22, b.y - uy * 22); ctx.lineTo(b.x + ux * 10, b.y + uy * 10); ctx.stroke();
        this.drawGlow(ctx, b.color, b.x + ux * 8, b.y + uy * 8, b.r * 2);
      } else if (b.look === 'blade') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        ctx.strokeStyle = 'rgba(40,60,90,0.7)';
        ctx.lineWidth = 1;
        // 四角手里剑
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU, rr = i % 2 ? b.r * 0.35 : b.r;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
      }
    }
    // 有延迟的落地技能：陨星、灵猴与西瓜。
    for (const z of g.zones) {
      if (z.look === 'aiScan') { if (vis(z.x, z.y, z.r)) ZhuSkillArt.scan(ctx, z); continue; }
      if (z.type === 'monkey') this.drawMonkeyLeap(ctx, z);
      else if (z.type === 'watermelon') FoodArt.watermelon(ctx, z);
      else if (z.type === 'goldIngot') this.drawGoldIngot(ctx, z);
      if (z.type !== 'meteor') continue;
      const k = z.t / z.max;
      this.drawGlow(ctx, '#ff9f6b', z.x + k * 110, z.y - k * 340, 16 + (1 - k) * 12);
    }
    ctx.globalCompositeOperation = 'source-over';
    // 敌方子弹
    for (const b of g.ebullets) {
      if (!vis(b.x, b.y, 10)) continue;
      if (b.look === 'weddingPaper') { FolkEnemyArt.weddingPaper(ctx, b); continue; }
      if (b.look === 'rainDrop') { FolkEnemyArt.rainDrop(ctx, b); continue; }
      if (b.look === 'maskShard') { NightParadeArt.maskShard(ctx, b); continue; }
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd6de';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
    }
  },

  drawFx(ctx, g, vis) {
    ctx.globalCompositeOperation = 'lighter';
    for (const f of g.fx) {
      const k = f.life / f.max;
      if (f.type === 'zap') {
        // 折线闪电:首次绘制时生成并缓存折点
        let points = this.lightningPoints.get(f);
        if (!points) {
          points = [];
          for (let i = 0; i <= 7; i++) points.push((i === 0 ? 0 : (Math.random() - 0.5) * 34), -i * 60);
          this.lightningPoints.set(f, points);
        }
        ctx.strokeStyle = `rgba(200,235,255,${k})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < points.length; i += 2) ctx.lineTo(f.x + points[i], f.y + points[i + 1]);
        ctx.stroke();
        ctx.globalAlpha = k;
        this.drawGlow(ctx, '#9ad7ff', f.x, f.y, 34);
        ctx.globalAlpha = 1;
      } else if (f.type === 'arc') {
        ctx.strokeStyle = `rgba(200,235,255,${k})`;
        ctx.lineWidth = 2;
        const mx = (f.x + f.x2) / 2 + (f.y2 - f.y) * 0.15, my = (f.y + f.y2) / 2 - (f.x2 - f.x) * 0.15;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(mx, my); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      } else if (f.type === 'boom') {
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = f.c;
        ctx.lineWidth = 3 + k * 5;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - k * 0.6), 0, TAU); ctx.stroke();
        ctx.globalAlpha = k * 0.25;
        ctx.fillStyle = f.c;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (f.type === 'mangoHeal') {
        FoodArt.mangoHeal(ctx, f, k);
      } else if (f.type === 'drumstickHeal') {
        FoodArt.drumstickHeal(ctx, f, k);
      } else if (f.type === 'skincare') {
        XiaoxiaoArt.balm(ctx, f, k);
      } else if (f.type === 'mirrorWard') {
        RelicArt.mirrorWard(ctx, f, k);
      } else if (f.type === 'outfitPulse' && !this.reduceMotion?.matches) {
        const r = 13 + 25 * (1 - k);
        ctx.globalAlpha = k * 0.52;
        ctx.strokeStyle = f.c; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(f.x, f.y + 12, r, r * 0.42, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const q of g.parts) {
      ctx.globalAlpha = Math.min(1, q.life * 3);
      ctx.fillStyle = q.c;
      ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  },
};
