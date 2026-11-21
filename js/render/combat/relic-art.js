'use strict';

const RelicArt = {
  soulCoin(ctx, b) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.scale(b.r / 7 * (0.42 + 0.58 * Math.abs(Math.cos(b.age * 35))), b.r / 7);
    ctx.fillStyle = b.color; ctx.strokeStyle = '#a5673f'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(0, 0, 7.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffe4a5'; ctx.beginPath(); ctx.arc(0, 0, 5.35, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#61483b'; ctx.fillRect(-2, -2, 4, 4); ctx.restore();
  },

  incense(ctx, z, time) {
    const fade = Math.min(1, z.life * 2);
    ctx.save(); ctx.translate(z.x, z.y);
    ctx.fillStyle = '#638974'; ctx.strokeStyle = z.color; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU);
    ctx.globalAlpha = 0.13 * fade; ctx.fill(); ctx.globalAlpha = 0.62 * fade;
    ctx.setLineDash([5, 7]); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) {
      const u = (time * 0.68 + i / 3) % 1, x = (i - 1) * 5;
      ctx.globalAlpha = 0.51 * (1 - u) * fade; ctx.lineWidth = 1.7 - u * 0.55;
      ctx.beginPath(); ctx.moveTo(x, -4 - u * 13);
      ctx.bezierCurveTo(x + 9, -12 - u * 16, x - 11, -21 - u * 18, x + 7, -28 - u * 19); ctx.stroke();
    }
    ctx.globalAlpha = fade; ctx.fillStyle = '#866453'; ctx.strokeStyle = '#efc58a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-10, -3); ctx.quadraticCurveTo(-8, 11, 0, 10);
    ctx.quadraticCurveTo(8, 11, 10, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#594b43'; ctx.beginPath(); ctx.ellipse(0, -3, 10, 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#f5d9a4'; ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-4, -13);
    ctx.moveTo(3, -3); ctx.lineTo(4, -12); ctx.stroke(); ctx.restore();
  },

  mirrorBolt(ctx, b) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.strokeStyle = b.color; ctx.fillStyle = '#e5fff7'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-b.r * 2.7, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.r * 1.5, 0); ctx.lineTo(0, -b.r * 0.6);
    ctx.lineTo(-b.r * 0.55, 0); ctx.lineTo(0, b.r * 0.6); ctx.closePath(); ctx.fill(); ctx.restore();
  },

  mirrorWard(ctx, f, k) {
    const r = f.r * (1 + 0.75 * (1 - k));
    ctx.save(); ctx.translate(f.x, f.y); ctx.globalAlpha = k * 0.8;
    ctx.fillStyle = '#85baa81e'; ctx.strokeStyle = f.c; ctx.lineWidth = 2.1;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * TAU, x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  },
};
