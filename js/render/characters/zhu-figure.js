'use strict';

// 工程师·竹：用线条重绘短发、细框眼镜和立领外套，头像和战场复用脸部造型。
const ZhuFigure = (() => {
  const ink = '#111822', cloth = '#263443', lapel = '#3f5165', skin = '#ce9d76', jade = '#9adfcd';
  const lens = { x: 16.6, y: -17.2, radius: 6.4 };
  const paths = {
    face: new Path2D('M-19 -14 Q-15 -25 1 -24 Q16 -24 20 -12 L19 7 Q17 17 8 23 Q2 28 -5 24 Q-15 21 -19 12 Q-22 1 -19 -14 Z'),
    hair: new Path2D('M-20.3 -6 L-22 -13 Q-21 -20 -17 -25 Q-12 -29.5 -5 -30 L4 -30 Q15 -29.5 20 -24 Q23 -20 22 -14 L21 -6 L18 -7 L16.8 -14 L14 -19 Q8 -22 0 -22 Q-9 -22 -15 -17 L-17.8 -12 L-18.8 -6 Z'),
    templeFade: new Path2D('M-20.4 -6 L-21.3 -13 Q-20 -17 -17 -20 L-16.4 -16 L-18.1 -11 L-18.8 -6 Z M17.1 -15 L18.6 -19 L21.5 -17 L21 -6 L18.8 -7 Z'),
    hairShine: new Path2D('M-16 -23 l4 -2 M-12 -26 l5 -1.7 M-6 -27 l5 -1 M0 -27.4 l4.8 0 M5 -27.2 l4.8 1 M10 -25.8 l4.4 1.6 M-15 -21 l4.1 -1.7 M-8 -24 l4.6 -1'),
    brows: new Path2D('M-15 -4.8 Q-11.5 -7.3 -5.4 -4.8 M5.3 -5 Q11 -7.6 16 -5.9'),
    lids: new Path2D('M-14 2.4 Q-10 -0.6 -6 1.9 M6 2.2 Q11 -0.7 15 1.7'),
    noseMouth: new Path2D('M3.1 5.1 Q1.6 8.8 4.4 9.7 L6.2 9.1 M-5.5 15.5 Q1 16.5 8 14.3'),
    shadow: new Path2D('M20 -4 Q15 0 15 10 Q13 18 7 23 Q15 20 18 10 Z'),
    crownWebbing: new Path2D('M-8.3 -29.9 Q-4.5 -31.5 0.5 -30.4 Q9.4 -28.4 12.7 -22 L14 -18.5 L8.1 -17.5 Q6.5 -25 -8.3 -29.9 Z'),
    browWebbing: new Path2D('M-23 -12 Q-13 -19 5 -17 Q14 -18 22 -15 L23 -9 Q10 -12 0 -11 Q-13 -11 -22 -6 Z'),
    strapStitch: new Path2D('M-6.3 -29.7 Q4 -29.9 10.9 -21 M-21 -11 Q-12 -16 5 -15 Q14 -16 21 -13 M-21 -8 Q-12 -13 2 -12'),
    lampBracket: new Path2D('M5 -17 L23 -16 L25 -11 L23 -8 L7 -9 L3 -12 Z'),
    lampCase: new Path2D('M8 -24 L22 -24 L27 -20 L27 -15 L23 -11 L8 -11 L5 -14 L5 -21 Z'),
    caseBevel: new Path2D('M7 -21 L9 -23 L22 -23 L25 -20 M7 -13 L10 -12 L22 -12'),
    jacket: new Path2D('M-14 -5 Q-30 -4 -36 10 L-41 32 Q-31 40 -21 41 L21 41 Q33 37 41 30 L35 10 Q31 -2 15 -5 Z'),
    shirt: new Path2D('M-13 2 Q1 12 14 2 L19 41 L-20 41 Z'),
    collar: new Path2D('M-18 -8 L-12 -4 Q-15 9 -7 20 L-12 27 Q-23 5 -18 -8 Z M18 -8 L13 -5 Q14 7 7 20 L12 28 Q23 6 18 -8 Z'),
    seams: new Path2D('M-22 8 Q-29 17 -30 29 M22 8 Q30 17 31 27 M-15 27 L-12 41 M13 27 L11 41 M20 29 L29 26'),
    placket: new Path2D('M-10 24 L-6 41 L-11 41 L-15 25 Z M9 24 L6 41 L11 41 L14 25 Z'),
    pocket: new Path2D('M-30 20 L-21 18 L-18 32 L-28 34 Z'),
    zip: new Path2D('M-9 26 L-6 41 M-26 22 L-21 21 M-29 14 L-23 11 M20 14 L26 16'),
  };

  function fill(ctx, shape, color, border) {
    ctx.fillStyle = color; ctx.fill(shape);
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke(shape); }
  }

  function spot(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  }

  function stroke(ctx, x, y, u, v, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(u, v); ctx.stroke();
  }

  function headlamp(ctx, tier) {
    // 织带从侧扣绕过额头，顶部再绕一条受力带。灯壳卡在外凸的支座上。
    fill(ctx, paths.crownWebbing, '#526663', ink);
    fill(ctx, paths.browWebbing, '#576a6a', '#202d34');
    ctx.strokeStyle = '#ceaa77'; ctx.lineWidth = 0.9; ctx.stroke(paths.strapStitch);
    ctx.save(); ctx.translate(-15, -12.2); ctx.rotate(-0.23);
    ctx.strokeStyle = '#d7ba8e'; ctx.fillStyle = '#17272e'; ctx.lineWidth = 1.05;
    ctx.beginPath(); ctx.roundRect(-3.6, -3.6, 7.2, 7.2, 1.45); ctx.fill(); ctx.stroke();
    stroke(ctx, 0, -2.9, 0, 2.9, '#b49067', 1.15); ctx.restore();

    fill(ctx, paths.lampBracket, '#3a4a50', '#15242c');
    spot(ctx, 7.1, -10.7, 1.35, 1.2, '#c8a975');
    spot(ctx, 22.6, -10.1, 1.2, 1.15, '#d0b27d');
    fill(ctx, paths.lampCase, '#263842', '#111a23');
    ctx.strokeStyle = '#82999d'; ctx.lineWidth = 1; ctx.stroke(paths.caseBevel);
    spot(ctx, lens.x, lens.y, lens.radius + 1.55, 5.55, '#bfa278');
    spot(ctx, lens.x, lens.y, lens.radius, 4.22, tier === 3 ? '#e7ffd0' : '#edda9d');
    spot(ctx, lens.x + 1.5, lens.y - 0.7, 3.3, 1.8, '#fff9dd');
  }

  function head(ctx, x, y, scale, tier = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    const light = ctx.createLinearGradient(-18, -19, 22, 24);
    light.addColorStop(0, '#efc49a'); light.addColorStop(0.57, '#d6a480'); light.addColorStop(1, '#b77f60');
    spot(ctx, -19, 3, 3.1, 6.5, '#ba805f'); spot(ctx, 20, 3, 2.9, 6.2, skin);
    fill(ctx, paths.face, light, '#946247'); fill(ctx, paths.hair, '#17191f', '#10151b');
    fill(ctx, paths.templeFade, '#404146');
    fill(ctx, paths.shadow, '#aa71544d');
    ctx.strokeStyle = '#59616a'; ctx.lineWidth = 0.9; ctx.stroke(paths.hairShine);
    ctx.strokeStyle = '#664c3d'; ctx.lineWidth = 1.4; ctx.stroke(paths.brows);
    for (const side of [-1, 1]) {
      const ex = side * 10;
      spot(ctx, ex, 2.6, 4.2, 1.95, '#f4dfc9');
      spot(ctx, ex + 0.8, 2.6, 2.0, 2.0, '#2e2324');
      spot(ctx, ex + 0.2, 1.65, 0.66, 0.65, '#fff3df');
      ctx.fillStyle = '#d0f1e31b'; ctx.strokeStyle = tier ? '#a5e6ca' : '#514642'; ctx.lineWidth = tier ? 1.65 : 1.25;
      ctx.beginPath(); ctx.roundRect(ex - 7.6, -1, 15.2, 9.8, [2.1, 2.1, 3.6, 3.6]); ctx.fill(); ctx.stroke();
      stroke(ctx, ex - 5, 0, ex - 0.6, 0, '#f4e8ce9c', 0.85);
      stroke(ctx, side * 17.4, 0.5, side * 21, -1.9, '#61564a', 1.3);
    }
    ctx.strokeStyle = '#684f43'; ctx.lineWidth = 0.7; ctx.stroke(paths.lids);
    ctx.strokeStyle = '#56433c'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-2.4, 1.5); ctx.quadraticCurveTo(0, -0.5, 2.5, 1.5); ctx.stroke();
    ctx.strokeStyle = '#8d5344'; ctx.lineWidth = 1.05; ctx.stroke(paths.noseMouth);
    headlamp(ctx, tier);
    ctx.restore();
  }

  function jacket(ctx, outfit) {
    fill(ctx, paths.jacket, outfit?.main ?? cloth, ink); fill(ctx, paths.shirt, ink);
    fill(ctx, paths.placket, '#637983');
    fill(ctx, paths.pocket, '#263a45', '#182c35');
    fill(ctx, paths.collar, lapel, ink);
    ctx.strokeStyle = '#5b6877'; ctx.lineWidth = 1.2; ctx.stroke(paths.seams);
    ctx.strokeStyle = '#bfa27a'; ctx.lineWidth = 1.1; ctx.stroke(paths.zip);
    stroke(ctx, 24, 17, 23, 22, outfit?.tier ? outfit.trim : '#bfab90', 1.8);
  }

  function terminal(ctx, x, y, angle = 0, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    ctx.strokeStyle = '#769a99'; ctx.fillStyle = '#233d43'; ctx.lineWidth = 0.86;
    ctx.beginPath(); ctx.roundRect(-3.2, -4.7, 12.3, 8.5, 1.45); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = jade; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(0.4, -2.35); ctx.lineTo(-1.2, -0.8); ctx.lineTo(0.4, 0.8);
    ctx.moveTo(4.7, -2.35); ctx.lineTo(6.2, -0.8); ctx.lineTo(4.7, 0.8);
    ctx.moveTo(3.2, -2.6); ctx.lineTo(1.8, 1.3); ctx.stroke();
    spot(ctx, 8, -0.5, 0.86, 0.86, '#d6fff0');
    ctx.restore();
  }

  const handX = stride => 10.2 - stride * 1.7;
  const handY = 3.2;
  const headX = stride => 0.5 + stride * 0.7, headY = -12.8, headScale = 0.35;
  const lampOrigin = stride => ({ x: headX(stride) + lens.x * headScale, y: headY + lens.y * headScale });
  const beam = HandLight.create(336, 129, 0.36, 0.48, [246, 236, 181]);

  return {
    lampOrigin,
    drawBeam(ctx, p, pose, mask) {
      const { x, y } = lampOrigin(pose.stride);
      beam(ctx, p, pose, x, y, lens.radius * headScale, 0, mask);
    },
    portrait(ctx) {
      ctx.save(); ctx.lineCap = 'round';
      stroke(ctx, '#aa7859', 14, 0, 47, 0, 60);
      ctx.save(); ctx.translate(0, 57); jacket(ctx); ctx.restore();
      head(ctx, -2, 34, 1);
      terminal(ctx, 25, 84, -0.2, 1.8);
      spot(ctx, 23, 90, 4.5, 4, skin);
      ctx.restore();
    },
    runner(ctx, stride, outfit, aim) {
      ctx.save(); ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const hip = side * 3.6, step = stride * side, x = hip + step * 4.7, y = 15 - Math.max(0, step) * 2.8;
        stroke(ctx, '#303743', 4.4, hip, 5, x, y);
        stroke(ctx, '#586977', 0.8, hip + 0.6, 8, x + 0.5, y);
        spot(ctx, x + 1, y + 0.8, 3.15, 1.55, '#b9cbc4');
      }
      const backHand = -9 + stride * 2.4;
      stroke(ctx, outfit.main, 4.5, -7, -1, backHand, 5);
      spot(ctx, backHand, 6, 1.5, 1.65, skin);
      ctx.save(); ctx.translate(0, -4.3); ctx.scale(0.28, 0.27); jacket(ctx, outfit); ctx.restore();
      stroke(ctx, lapel, 3.8, 6, -1.75, handX(stride), handY);
      head(ctx, headX(stride), headY, headScale, outfit.tier);
      terminal(ctx, handX(stride), handY, aim);
      spot(ctx, handX(stride) - 0.55, handY + 0.75, 1.55, 1.45, skin);
      ctx.restore();
    },
  };
})();
