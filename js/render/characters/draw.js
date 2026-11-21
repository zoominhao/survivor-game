'use strict';

// 角色立绘、战场造型和护盾。
const CharacterRendering = {
  // ---------- 角色造型 ----------
  // 以原点为中心、面朝右绘制;walk ∈ [-1, 1] 为走路摆动相位
  drawFigure(ctx, charId, walk, tier = 0, aim = 0) {
    const c = CHARS[charId];
    if (c.look === 'girl') this.drawGirl(ctx, walk, tier);
    else if (c.look === 'echo') EchoFigure.runner(ctx, walk, tier, aim);
    else if (c.look === 'xiaoxiao') XiaoxiaoArt.runner(ctx, walk, tier, aim);
    else this.drawCloak(ctx, c.color, tier);
  },

  // 默认造型:兜帽斗篷 + 提灯
  drawCloak(ctx, color, tier) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-10, 12);
    ctx.quadraticCurveTo(-13, -6, 0, -15);
    ctx.quadraticCurveTo(13, -6, 10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (tier > 0) {
      ctx.strokeStyle = '#f4ca86'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-9, -3); ctx.quadraticCurveTo(-7, -9, 0, -13);
      ctx.quadraticCurveTo(7, -9, 9, -3); ctx.stroke();
    }
    // 兜帽下的脸
    ctx.fillStyle = '#1b1626';
    ctx.beginPath(); ctx.ellipse(1.5, -4, 6.2, 5.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, -5.5, 2, 3);
    ctx.fillRect(4.2, -5.5, 2, 3);
    // 提灯
    ctx.strokeStyle = '#c9a66b';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(14, -3); ctx.lineTo(14, 0); ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(14, 3, 3.2, 0, TAU); ctx.fill();
  },

  // 小女孩造型:高马尾 + 黄色发夹、透明圆框眼镜、米白色熊猫九宫格卫衣、灰色阔腿裤、粉色手表
  drawGirl(ctx, walk, tier) {
    const HAIR = '#1d1b20', SKIN = '#f7d7bd', CREAM = '#f4eedc', GREY = '#9c9ea6';
    ctx.lineCap = 'round';
    // 马尾(在身后,随走动甩动)
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.moveTo(-4.5, -13);
    ctx.quadraticCurveTo(-13 - walk * 1.2, -11, -11 - walk * 2.2, 0.5);
    ctx.quadraticCurveTo(-8.5, -4, -5.5, -7.5);
    ctx.closePath();
    ctx.fill();
    // 阔腿裤:两条裤腿随步伐前后分开
    const sw = walk * 1.4;
    ctx.fillStyle = GREY;
    ctx.beginPath();
    ctx.moveTo(-5.6, 4.5); ctx.lineTo(0, 4.5); ctx.lineTo(0.2 - sw, 13); ctx.lineTo(-7.2 - sw, 13);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 4.5); ctx.lineTo(5.6, 4.5); ctx.lineTo(7.2 + sw, 13); ctx.lineTo(-0.2 + sw, 13);
    ctx.closePath(); ctx.fill();
    // 裤缝线
    ctx.strokeStyle = '#84868e';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-2.8, 6); ctx.lineTo(-3.5 - sw, 13);
    ctx.moveTo(2.8, 6); ctx.lineTo(3.5 + sw, 13);
    ctx.stroke();
    // 后侧手臂(自然下垂)
    ctx.strokeStyle = '#e9e1cc';
    ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(-5.5, -0.5); ctx.lineTo(-7.2 + walk * 0.8, 4.2); ctx.stroke();
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(-7.4 + walk * 0.9, 5.6, 1.4, 0, TAU); ctx.fill();
    // 卫衣
    ctx.fillStyle = CREAM;
    ctx.beginPath(); ctx.roundRect(-6.8, -3.6, 13.6, 9.6, 3.4); ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,40,0.35)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = '#e4dbc3';
    ctx.fillRect(-5.6, 4.6, 11.2, 1.3); // 下摆罗纹
    // 胸前的熊猫九宫格印花
    const gx = -2.6, gy = -1.6, cs = 1.8;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gx, gy, cs * 3, cs * 3);
    ctx.fillStyle = '#26252b';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = gx + c * cs, y = gy + r * cs;
        ctx.fillRect(x + 0.25, y + 0.2, 0.5, 0.5);  // 耳朵
        ctx.fillRect(x + 1.05, y + 0.2, 0.5, 0.5);
        ctx.fillRect(x + 0.45, y + 1.0, 0.9, 0.5);  // 身体
      }
    }
    ctx.strokeStyle = 'rgba(40,40,50,0.5)';
    ctx.lineWidth = 0.2;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      ctx.moveTo(gx + i * cs, gy); ctx.lineTo(gx + i * cs, gy + cs * 3);
      ctx.moveTo(gx, gy + i * cs); ctx.lineTo(gx + cs * 3, gy + i * cs);
    }
    ctx.stroke();
    // 前侧手臂(提灯)、粉色手表、手
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(5.2, -0.8); ctx.lineTo(9.6, -1.4); ctx.stroke();
    ctx.fillStyle = '#f2788f';
    ctx.fillRect(10.2, -3.2, 1.3, 3.6);
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(12.4, -1.5, 1.5, 0, TAU); ctx.fill();
    // 提灯
    ctx.strokeStyle = '#c9a66b';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(12.6, -0.4); ctx.lineTo(13.4, 1.6); ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(13.8, 4, 2.8, 0, TAU); ctx.fill();
    // 头
    const hx = 0.6, hy = -9.6, hr = 6.9;
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
    // 头发:向后梳起露出额头
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.arc(hx, hy, hr + 0.4, Math.PI * 0.82, Math.PI * 1.86);
    ctx.quadraticCurveTo(hx + 2, hy - 4.5, hx - 2.8, hy - 1.2);
    ctx.closePath();
    ctx.fill();
    // 耳朵
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(hx - 3, hy + 1.4, 1.2, 0, TAU); ctx.fill();
    // 升级后的粉色花发夹，初始仍是黄色发夹。
    if (tier > 0) Wardrobe.drawFlower(ctx, hx - 2.1, hy - 5.6);
    else {
      ctx.fillStyle = '#f4c430';
      ctx.save();
      ctx.translate(hx - 1.4, hy - 5.4);
      ctx.rotate(-0.5);
      ctx.fillRect(-1.3, -0.55, 2.6, 1.1);
      ctx.restore();
    }
    // 腮红
    ctx.fillStyle = 'rgba(240,130,130,0.38)';
    ctx.beginPath(); ctx.arc(hx + 0.5, hy + 3.3, 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 5, hy + 3.3, 1.1, 0, TAU); ctx.fill();
    // 眼睛
    ctx.fillStyle = '#2a2326';
    ctx.beginPath(); ctx.arc(hx + 0.9, hy + 0.7, 0.75, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 4.6, hy + 0.7, 0.75, 0, TAU); ctx.fill();
    // 透明圆框眼镜
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeStyle = 'rgba(238,196,206,0.95)';
    ctx.lineWidth = 0.55;
    for (const ex of [hx + 0.9, hx + 4.6]) {
      ctx.beginPath(); ctx.arc(ex, hy + 0.7, 1.9, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(hx - 1, hy + 0.5); ctx.lineTo(hx - 2.8, hy + 0.8); ctx.stroke(); // 镜腿
    // 微笑
    ctx.strokeStyle = '#b0584f';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(hx + 2.8, hy + 3.3, 1.1, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.lineCap = 'butt';
  },

  // 名册与开场共用角色立绘，小头像和大立绘用不同绘制分辨率。
  avatar(charId, S = 3) {
    const w = 40, h = 44;
    const cv = document.createElement('canvas');
    cv.width = w * S; cv.height = h * S;
    cv.className = 'avatar';
    const x = cv.getContext('2d');
    const look = CHARS[charId].look;
    if (look === 'echo' || look === 'xiaoxiao') {
      x.translate(w * S / 2, 4 * S);
      x.scale(S * 0.38, S * 0.38);
      if (look === 'echo') EchoFigure.portrait(x);
      else XiaoxiaoArt.portrait(x);
    } else {
      x.translate(w * S / 2 - 1.2 * S, h * S / 2 + 2.6 * S);
      x.scale(S * 1.2, S * 1.2);
      this.drawFigure(x, charId, 0);
    }
    return cv;
  },

  playerPose(p, time) {
    const stride = p.moving ? Math.sin(p.walkT * 14) : 0;
    const bob = p.moving ? stride * 1.6 : Math.sin(time * 3) * 0.6;
    // 角色局部坐标会左右镜像，手电和光锥使用同一个局部角度。
    const aim = Math.atan2(p.diry, p.dirx * p.face);
    return { stride, bob, aim };
  },

  drawPlayer(ctx, g, p, { stride, bob, aim } = this.playerPose(p, g.time)) {
    const look = CHARS[p.char].look, tier = Wardrobe.stage(p.level, g.pending);
    const motion = !this.reduceMotion?.matches;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 10, 4, 0, 0, TAU); ctx.fill();
    if (tier >= 3) Wardrobe.drawSeal(ctx, p.x, p.y, look, motion ? g.time : 0);
    const directionalLight = look === 'echo' || look === 'xiaoxiao';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = directionalLight ? 0.34 : 0.5;
    const glowOffset = directionalLight ? 0 : 14 * p.face;
    this.drawGlow(ctx, look === 'xiaoxiao' ? '#c6e5fd' : '#ffd166', p.x + glowOffset, p.y + 2 + bob, 34);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (p.iframe > 0 && Math.floor(g.time * 24) % 2) ctx.globalAlpha = 0.45; // 无敌闪烁
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(p.face, 1);
    Wardrobe.drawTrail(ctx, look, tier, motion ? g.time : 0, motion ? stride : 0);
    this.drawFigure(ctx, p.char, stride, tier, aim);
    Wardrobe.drawClasp(ctx, look, tier);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (look === 'xiaoxiao' && p.weapons.some(w => w.id === 'skincare' && w.on > 0)) {
      ctx.strokeStyle = '#b9ead8ae'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 22, 28, 0, Math.PI * 0.12, Math.PI * 1.88); ctx.stroke();
    }
    this.drawExamGuard(ctx, p, g.time);
    // 血条
    const k = Math.max(0, p.hp / p.st.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(p.x - 18, p.y + 19, 36, 5);
    ctx.fillStyle = k > 0.35 ? '#e5484d' : '#ff8a3d';
    ctx.fillRect(p.x - 17, p.y + 20, 34 * k, 3);
  },

  drawExamGuard(ctx, p, time) {
    const guards = p.weapons.find(w => w.id === 'exampaper')?.guards || 0;
    if (!guards) return;
    const r = 31;
    ctx.save();
    ctx.translate(p.x, p.y - 2);
    ctx.strokeStyle = '#f6e2b378'; ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < guards; i++) {
      const a = time * 2.1 - Math.PI * 0.75 + i * TAU / guards;
      ctx.save();
      ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
      ctx.rotate(Math.cos(a) * 0.42);
      ctx.fillStyle = '#f6e5be'; ctx.strokeStyle = '#8d7258'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(3, -9); ctx.lineTo(7, -5);
      ctx.lineTo(7, 9); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -9); ctx.lineTo(3, -5); ctx.lineTo(7, -5);
      ctx.moveTo(-4, -4); ctx.lineTo(1, -4); ctx.moveTo(-4, -1); ctx.lineTo(4, -1);
      ctx.moveTo(-4, 2); ctx.lineTo(0, 2); ctx.stroke();
      ctx.strokeStyle = '#a34d42'; ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(2, 7); ctx.lineTo(5, 3); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
};
