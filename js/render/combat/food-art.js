'use strict';
// 角色的食物技能：世界坐标内绘制，图形与碰撞位置共用。
const FoodArt = {
  ricecake(ctx, z) {
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.strokeStyle = z.color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = Math.min(0.3, z.life);
    ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = Math.min(1, z.life * 2.5);
    ctx.fillStyle = '#264239'; ctx.strokeStyle = '#b4b78e';
    ctx.beginPath(); ctx.ellipse(0, 4, 16, 8, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#866b50';
    ctx.fillStyle = '#e0c5a0';
    ctx.beginPath(); ctx.roundRect(-12, -3, 21, 10, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = z.color;
    ctx.beginPath(); ctx.roundRect(-7, -9, 20, 11, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff2d5'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(3, -6); ctx.stroke();
    ctx.restore();
  },

  icecream(ctx, x, y, radius, flavor) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(x, y);
    ctx.scale(radius / 10, radius / 10);
    ctx.rotate((flavor % 2 ? 1 : -1) * 0.19);
    ctx.fillStyle = '#dfaa6b'; ctx.strokeStyle = '#6d5040'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3.7, 2); ctx.lineTo(2.8, 5);
    ctx.moveTo(4.2, 1); ctx.lineTo(-1.9, 5.8); ctx.stroke();
    ctx.fillStyle = ['#a7dded', '#f2b9cc', '#b7e3ce'][flavor % 3];
    ctx.beginPath(); ctx.arc(0, -4.3, 6.4, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff4dc';
    ctx.beginPath(); ctx.arc(-1.6, -9, 3.7, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  },

  candy(ctx, b) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx) + Math.sin(b.age * 24) * 0.28);
    ctx.scale(b.r / 6, b.r / 6);
    ctx.fillStyle = b.color; ctx.strokeStyle = '#6b4750'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, -1.7); ctx.lineTo(-11, -4.4); ctx.lineTo(-10, 0); ctx.lineTo(-11, 4.4); ctx.lineTo(-4, 1.7);
    ctx.moveTo(4, -1.7); ctx.lineTo(11, -4.4); ctx.lineTo(10, 0); ctx.lineTo(11, 4.4); ctx.lineTo(4, 1.7);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-5.5, -4, 11, 8, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff6dd'; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-3.6, -2.5); ctx.lineTo(-1, 2.5);
    ctx.moveTo(0.5, -2.8); ctx.lineTo(3, 2.3); ctx.stroke();
    ctx.restore();
  },

  potato(ctx, b) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y);
    ctx.scale(b.r / 10, b.r / 10);
    ctx.fillStyle = '#101a16a6';
    ctx.beginPath(); ctx.ellipse(0, 6, 11, 4, 0, 0, TAU); ctx.fill();
    ctx.rotate((Math.atan2(b.vy, b.vx) + b.age * 18));
    ctx.fillStyle = b.color; ctx.strokeStyle = '#68482f'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-10, -1);
    ctx.bezierCurveTo(-10, -7, -3, -10, 1, -8);
    ctx.bezierCurveTo(9, -9, 12, -3, 10, 3);
    ctx.bezierCurveTo(9, 8, 2, 9, -2, 7);
    ctx.bezierCurveTo(-7, 8, -11, 5, -10, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a37346';
    for (const [x, y, r] of [[-6, 1, 1.3], [1, 3, 1.4], [6, -2, 1.1]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#f4d4a2'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, -4); ctx.quadraticCurveTo(-2, -6, 2, -5); ctx.stroke();
    ctx.restore();
  },

  tomato(ctx, b) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y);
    ctx.scale(b.r / 8, b.r / 8);
    ctx.rotate(Math.sin(b.age * 10) * 0.34);
    ctx.fillStyle = b.color; ctx.strokeStyle = '#702f2b'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 1, 9, 7.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4c7851';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(2, -10); ctx.lineTo(2, -7);
    ctx.lineTo(6, -7); ctx.lineTo(2, -3); ctx.lineTo(0, -5); ctx.lineTo(-4, -4);
    ctx.lineTo(-6, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffcab0'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-5.5, 2, -3.8, 3.5); ctx.stroke();
    ctx.restore();
  },

  sauce(ctx, z) {
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.scale(z.r, z.r);
    const alpha = Math.min(1, z.life * 4);
    ctx.fillStyle = '#b9443b'; ctx.strokeStyle = z.color; ctx.lineWidth = 1.2 / z.r;
    ctx.globalAlpha = alpha * 0.42;
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = z.color; ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath(); ctx.moveTo(-0.55, 0.18);
    ctx.bezierCurveTo(-0.72, -0.34, 0.56, -0.46, 0.58, -0.12);
    ctx.bezierCurveTo(0.72, 0.21, 0.14, 0.27, 0.05, 0.51);
    ctx.bezierCurveTo(-0.2, 0.73, -0.36, 0.47, -0.55, 0.18); ctx.fill();
    for (const [x, y, r] of [[-0.63, -0.37, 0.11], [0.55, 0.41, 0.09], [0.24, -0.63, 0.08]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  bubbletea(ctx, b) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.scale(b.r / 9, b.r / 9);
    ctx.rotate(Math.atan2(b.vy, b.vx) * 0.18 + Math.sin(b.age * 25) * 0.32);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#e99cac'; ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(5.5, -13); ctx.stroke();
    ctx.fillStyle = '#edc38e'; ctx.strokeStyle = '#77523b';
    ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(8, -5); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff0d4'; ctx.beginPath(); ctx.roundRect(-9, -7, 18, 3, 1.2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#604139';
    for (const [x, y] of [[-3, 1], [2, 2], [-1, 5.5], [3.3, 5.2]]) {
      ctx.beginPath(); ctx.arc(x, y, 1.15, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  teaSpill(ctx, z) {
    ctx.save(); ctx.translate(z.x, z.y); ctx.scale(z.r, z.r);
    const alpha = Math.min(1, z.life * 4);
    ctx.fillStyle = '#b88350'; ctx.strokeStyle = z.color; ctx.lineWidth = 1.3 / z.r;
    ctx.globalAlpha = alpha * 0.42;
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = alpha * 0.8; ctx.fillStyle = '#453331';
    for (const [x, y, r] of [[-0.63, -0.12, 0.10], [-0.37, 0.41, 0.12], [0.2, 0.64, 0.095],
      [0.56, 0.33, 0.11], [0.48, -0.33, 0.12], [-0.11, -0.58, 0.097], [0.1, -0.1, 0.11]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  },

  watermelon(ctx, z) {
    const k = U.clamp(1 - z.t / z.max, 0, 1);
    const lift = Math.sin(Math.PI * k);
    const scale = Math.min(1.5, z.r / 65);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(z.fromX + (z.x - z.fromX) * k, z.fromY + (z.y - z.fromY) * k);
    ctx.fillStyle = '#101a16a6';
    ctx.beginPath(); ctx.ellipse(0, 2, 10 * scale, 4 * scale, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -lift * 56);
    ctx.rotate(k * TAU * 0.72);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#83bf68'; ctx.strokeStyle = '#284834'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(0, 0, 13.8, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#407e4c'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (const offset of [-6, 0, 6]) {
      ctx.beginPath(); ctx.moveTo(offset * 0.76, -9.1);
      ctx.bezierCurveTo(offset - 6, -3, offset + 4, 4, offset * 0.76, 9.1); ctx.stroke();
    }
    ctx.strokeStyle = '#c8db87'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-10, -3); ctx.quadraticCurveTo(-9, -6, -5.7, -7.6); ctx.stroke();
    ctx.restore();
  },

  healSnack(ctx, f, k, draw) {
    const rise = 1 - k;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, k * 2.8);
    ctx.strokeStyle = '#a9e8ad'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 6, 13 + 24 * rise, 8 + 13 * rise, 0, 0, TAU); ctx.stroke();
    ctx.translate(f.x + 13 + rise * 6, f.y - 22 - rise * 32);
    ctx.rotate(-0.25 + rise * 0.45);
    draw(ctx);
    ctx.restore();
  },

  mangoHeal(ctx, f, k) {
    this.healSnack(ctx, f, k, this.mangoSlices);
  },

  mangoSlices(ctx) {
    for (const [x, color] of [[0, '#e99a48'], [5, '#ffcc65']]) {
      ctx.translate(x, 0);
      ctx.fillStyle = color; ctx.strokeStyle = '#865535'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-7, 4);
      ctx.bezierCurveTo(-10, -3, 2, -11, 7, -8);
      ctx.quadraticCurveTo(4, -3, 6, 2); ctx.quadraticCurveTo(2, 7, -7, 4);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffe0a0';
      ctx.beginPath(); ctx.moveTo(-4, 1); ctx.quadraticCurveTo(-2, -3, 3, -5); ctx.stroke();
    }
  },

  drumstickHeal(ctx, f, k) {
    this.healSnack(ctx, f, k, this.roastDrumstick);
  },

  roastDrumstick(ctx) {
    ctx.rotate(-0.6);
    ctx.fillStyle = '#f6e7c9'; ctx.strokeStyle = '#a58063'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, -1); ctx.lineTo(7, -1);
    ctx.bezierCurveTo(8, -5, 13, -5, 12, -1);
    ctx.bezierCurveTo(16, 0, 14, 4, 10, 3); ctx.lineTo(-2, 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#cd8244'; ctx.strokeStyle = '#8e542e';
    ctx.beginPath(); ctx.moveTo(-0.5, -3);
    ctx.bezierCurveTo(-3, -10, -13, -11, -14, -3);
    ctx.bezierCurveTo(-16, 5, -8, 9, -2, 4);
    ctx.quadraticCurveTo(1, 3, 1, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffd395'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-11, -4); ctx.quadraticCurveTo(-9, -7, -5, -5); ctx.stroke();
  },
};
