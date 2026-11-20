'use strict';
// 妈妈·霄霄：按照片转绘，不携带原照片。头像和跑步共用脸部及服装图形。
const XiaoxiaoArt = (() => {
  const skin = '#f2be9c', hair = '#29232f', white = '#faf5ed', seam = '#aab8bd', denim = '#314659';
  const paths = {
    backHair: new Path2D('M-21 31 C-28 26 -28 4 -24 -9 C-23 -22 -14 -28 0 -28 C15 -29 25 -19 26 -4 C25 10 29 21 30 33 Q24 38 16 34 L8 28 L-7 29 Q-15 37 -21 31 Z'),
    face: new Path2D('M-19 -14 Q-12 -23 0 -23 Q14 -23 20 -11 L21 5 C21 18 12 25 2 26 C-8 26 -19 19 -21 8 Q-23 -3 -19 -14 Z'),
    leftHair: new Path2D('M1 -24 Q-10 -22 -17 -12 C-22 -6 -22 6 -22 17 Q-22 24 -25 29 C-26 15 -30 4 -25 -11 C-20 -27 -8 -30 1 -27 Z'),
    rightHair: new Path2D('M1 -27 C18 -29 27 -17 26 -1 Q26 18 30 32 Q26 35 22 30 C22 20 21 7 19 -4 C17 -14 9 -22 1 -24 Z'),
    hairLight: new Path2D('M-4 -24 Q-18 -19 -22 -7 Q-25 5 -24 16 M7 -25 Q23 -19 23 -3 Q23 14 27 22'),
    brows: new Path2D('M-14 -5 Q-9 -8 -4 -5 M5 -5.5 Q10 -8 14 -5'),
    lids: new Path2D('M-14 1.4 Q-10 -2.8 -5 0.7 M5 0.8 Q10 -3 14 1.1'),
    smile: new Path2D('M-7 13 Q0 15.3 7 12.1 C5 17 2 19 -0.6 19 Q-5 18.8 -7 13 Z'),
    coat: new Path2D('M-7 -2 Q-16 0 -20 11 L-20 32 Q-11 38 0 35 Q11 39 20 34 L19 12 Q16 1 7 -2 Z'),
    quilt: new Path2D('M-18 10 Q-13 12 -8 11 M5 11 Q13 14 18 11 M-19 20 Q-11 22 -3 20 M4 21 Q12 24 18 20 M-18 29 Q-10 32 -2 30 M5 30 Q13 33 19 29 M1 3 L2 34'),
    raised: new Path2D('M-11 63 C-22 61 -27 53 -31 42 Q-37 28 -38 17 L-28 14 Q-25 26 -21 34 Q-15 43 -4 53 Z'),
    palm: new Path2D('M-38 17 Q-43 15 -44 11 Q-45 7 -41 5 L-42 -3 Q-43 -7 -40 -7 Q-38 -7 -37 -4 L-35 5 Q-32 3 -30 5 Q-28 8 -31 9 Q-29 13 -31 17 Z'),
    sleeve: new Path2D('M21 58 Q27 64 28 74 L29 85 Q27 90 21 87 L16 70 Z'),
    wrap: new Path2D('M-11 0 Q-10 -6 -6 -6 Q0 -2 9 -6 Q14 0 10 5 Q3 10 -8 6 Q-12 5 -11 0 Z'),
    scarfFront: new Path2D('M-8 4 Q-4 5 1 6 L-2 33 Q-6 39 -14 33 Q-9 24 -8 4 Z'),
  };

  function fill(ctx, path, color, edge, width = 1) {
    ctx.fillStyle = color; ctx.fill(path);
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = width; ctx.stroke(path); }
  }

  function oval(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  }

  function line(ctx, color, width, x, y, u, v) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(u, v); ctx.stroke();
  }

  function backHair(ctx, x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    fill(ctx, paths.backHair, hair, '#201e2a', 1.1);
    ctx.restore();
  }

  function head(ctx, x, y, scale, tier = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.lineCap = 'round';
    const blush = ctx.createLinearGradient(-16, -21, 19, 21);
    blush.addColorStop(0, '#f8cfaa'); blush.addColorStop(0.58, '#facdab'); blush.addColorStop(1, '#e6a486');
    fill(ctx, paths.face, blush, '#a26455');
    fill(ctx, paths.leftHair, hair); fill(ctx, paths.rightHair, hair);
    ctx.strokeStyle = '#55404e'; ctx.lineWidth = 1.45; ctx.stroke(paths.hairLight);
    ctx.strokeStyle = '#68433f'; ctx.lineWidth = 1.18; ctx.stroke(paths.brows);
    for (const side of [-1, 1]) {
      const ex = 9.5 * side;
      oval(ctx, ex, 2, 4.6, 3.12, '#fff0dc');
      oval(ctx, ex, 1.7, 2.95, 3.02, '#463039');
      oval(ctx, ex - 0.75, 0.52, 1.14, 0.84, '#fff4e4');
      oval(ctx, ex * 1.42, 8.7, 4.25, 1.95, '#e77f8078');
    }
    ctx.strokeStyle = '#593738'; ctx.lineWidth = 1.27; ctx.stroke(paths.lids);
    oval(ctx, 0.45, 9.1, 1.3, 0.68, '#b77866');
    fill(ctx, paths.smile, '#9a514e');
    oval(ctx, 0.1, 17.1, 2.75, 0.9, '#df8c84');
    if (tier > 0) {
      line(ctx, '#f6d38c', 2.6, -17, -16.5, -11, -17.8);
      oval(ctx, -11, -17.8, 1.45, 1.45, '#fff0c4');
    }
    ctx.restore();
  }

  function coat(ctx, sway, tier = 0) {
    const cloth = ctx.createLinearGradient(-20, 10, 20, 32);
    cloth.addColorStop(0, '#f9f6ee'); cloth.addColorStop(1, '#d5dfe0');
    fill(ctx, paths.coat, cloth, '#81969a', 1.1);
    ctx.strokeStyle = seam; ctx.lineWidth = 0.85; ctx.stroke(paths.quilt);
    oval(ctx, 2, 14.2, 1.1, 1.1, '#8fa0a4'); oval(ctx, 2, 24, 1.08, 1.08, '#8fa0a4');
    line(ctx, '#986847', 2.6, 14, 5, -12, 28);
    ctx.save(); ctx.translate(-14, 27); ctx.rotate(-0.27 + sway * 0.025);
    ctx.fillStyle = '#ae7956'; ctx.strokeStyle = '#75513e'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.roundRect(-8, -1, 13, 10, 2.8); ctx.fill(); ctx.stroke();
    line(ctx, '#d4a276', 1, -6, 2, 3, 2); oval(ctx, -0.5, 3.2, 0.8, 0.8, '#f5d096');
    ctx.restore();
    fill(ctx, paths.scarfFront, '#bc4652', tier >= 3 ? '#ecbf75' : '#8c3345', 1.1);
    ctx.fillStyle = '#d3525d'; ctx.strokeStyle = tier >= 3 ? '#ecbf75' : '#9d3b48'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(6, 1);
    ctx.bezierCurveTo(13, 6, 18 + sway, 11, 20 + sway * 1.65, 21);
    ctx.lineTo(10 + sway * 1.3, 23); ctx.quadraticCurveTo(10, 12, 4, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    fill(ctx, paths.wrap, '#cc4b56', '#963a47', 0.95);
    if (tier >= 2) {
      oval(ctx, -6, 3.2, 2.12, 2.12, '#ebbf78');
      oval(ctx, -6, 3.2, 0.82, 0.82, '#fff1cf');
    }
  }

  function portrait(ctx) {
    ctx.save(); ctx.lineCap = 'round';
    backHair(ctx, 5, 27, 1);
    fill(ctx, paths.raised, white, '#90a2a6', 1.2);
    line(ctx, seam, 0.95, -34, 25, -26, 23); line(ctx, seam, 0.9, -29, 41, -23, 36);
    fill(ctx, paths.palm, skin, '#b17762', 0.9);
    line(ctx, '#b47c66', 0.85, -40, 8, -36, 9); line(ctx, '#b47c66', 0.72, -38, 12, -34, 11);
    fill(ctx, paths.sleeve, white, '#90a2a6'); oval(ctx, 25, 85, 3.7, 4.5, skin);
    ctx.save(); ctx.translate(5, 55); coat(ctx, 0); ctx.restore();
    head(ctx, 5, 27, 1);
    ctx.restore();
  }

  function runner(ctx, stride, tier) {
    ctx.save(); ctx.lineCap = 'round';
    const hx = 0.4 + stride * 0.5, hy = -15.1;
    for (const side of [-1, 1]) {
      const hip = side * 4.2, step = stride * side, foot = hip + step * 5.2, lift = Math.max(0, step) * 2.2;
      line(ctx, denim, 5.8, hip, 5, foot, 14.8 - lift);
      line(ctx, '#59717c', 0.9, hip + 0.8, 8, foot + 0.55, 14.1 - lift);
      oval(ctx, foot + 1, 15.7 - lift, 3.1, 1.55, '#cfd6da');
      line(ctx, '#f7f3e9', 0.7, foot - 0.7, 15.25 - lift, foot + 2, 15.25 - lift);
    }
    backHair(ctx, hx, hy, 0.41);
    line(ctx, '#d2dddc', 3.8, -8, -0.2, -10 + stride * 2.1, 7);
    ctx.save(); ctx.translate(0, -7.5); ctx.scale(0.52, 0.52); coat(ctx, stride * 3, tier); ctx.restore();
    line(ctx, white, 3.7, 8, -0.1, 10 - stride * 2.3, 7);
    oval(ctx, 10 - stride * 2.3, 8.1, 1.6, 1.6, skin);
    head(ctx, hx, hy, 0.41, tier);
    ctx.restore();
  }

  function latiao(ctx, b) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) + Math.sin(b.age * 28) * 0.18);
    ctx.scale(b.r / 7, b.r / 7);
    ctx.fillStyle = b.color; ctx.strokeStyle = '#922f37'; ctx.lineWidth = 0.85;
    ctx.beginPath(); ctx.roundRect(-10, -3.1, 20, 6.2, 2.2); ctx.fill(); ctx.stroke();
    for (let i = -6; i <= 6; i += 4) line(ctx, '#ffaf64', 1, i, -1.5, i + 1, 1.15);
    oval(ctx, -11.6, 2.8, 1.05, 0.7, '#ffd088');
    ctx.restore();
  }

  function pony(ctx, b) {
    const stride = Math.sin(b.age * 37), r = b.r / 12;
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) * 0.28);
    if (b.vx < 0) ctx.scale(-1, 1);
    ctx.scale(r, r);
    oval(ctx, 0, 7, 15, 3.2, '#372d285e');
    ctx.translate(0, -Math.abs(stride) * 4); ctx.lineCap = 'round';
    line(ctx, '#9e6954', 2.55, -6, 4, -8 + stride * 5, 9);
    line(ctx, '#e9b277', 2.7, 6, 4, 8 - stride * 5, 9);
    ctx.strokeStyle = '#995c49'; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-15, -5, -20, -1 + stride * 2); ctx.stroke();
    oval(ctx, -1, 0, 11, 5.8, b.color);
    oval(ctx, 6.8, -4.4, 4.8, 7.1, b.color);
    oval(ctx, 10.2, -8.4, 6.25, 4.4, '#ffd495');
    line(ctx, '#b87853', 2.2, 8, -11, 8.7, -15);
    line(ctx, '#98614b', 1.7, 5.5, -5, 5.4, -10);
    oval(ctx, 12.2, -9, 0.88, 0.88, '#4f342b');
    ctx.restore();
  }

  function roar(ctx, z) {
    const k = Math.max(0, 1 - z.r / z.maxR);
    ctx.save(); ctx.strokeStyle = z.color; ctx.globalAlpha = 0.22 + 0.73 * k; ctx.lineWidth = 3 + k * 4;
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3 - z.r * 0.008;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, a, a + 1.72); ctx.stroke();
    }
    ctx.globalAlpha = k * 0.2; ctx.fillStyle = z.color;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.89, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function balm(ctx, f, k) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, k * 3);
    ctx.translate(f.x + 14, f.y - 24 - (1 - k) * 24); ctx.rotate(0.18);
    ctx.fillStyle = '#c3efde'; ctx.strokeStyle = '#4b7d73'; ctx.lineWidth = 0.85;
    ctx.beginPath(); ctx.roundRect(-6, -6, 12, 15, 2.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e4c59b'; ctx.fillRect(-4.5, -8.5, 9, 3);
    oval(ctx, 0, 2, 2.1, 2.5, '#77b3a0');
    ctx.restore();
  }

  return { portrait, runner, latiao, pony, roar, balm };
})();
