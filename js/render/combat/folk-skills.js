'use strict';

const FolkSkillArt = {
  paper(ctx, b) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    if (b.look === 'paperKite') ctx.scale(0.65, 0.65);
    ctx.fillStyle = '#f5e4bc'; ctx.strokeStyle = '#bc995f'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    if (b.look === 'paperFlake') {
      ctx.moveTo(6, 0); ctx.lineTo(-5, -2.5); ctx.lineTo(-3, 2.9);
    } else {
      const wing = 7 + Math.sin(b.age * 32) * 2.6;
      ctx.moveTo(12, 0); ctx.lineTo(3, -2); ctx.lineTo(-5, -wing); ctx.lineTo(-1, 0);
      ctx.lineTo(-6, wing); ctx.lineTo(4, 2);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  },

  watchClack(ctx, z) {
    if (z.t > 0) return;
    ctx.save(); ctx.translate(z.x, z.y);
    ctx.strokeStyle = z.color; ctx.globalAlpha = 0.92 - z.r / z.maxR * 0.64; ctx.lineWidth = 2.15;
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.beginPath(); ctx.arc(0, 0, z.r, a + 0.09, a + 0.84); ctx.stroke(); }
    ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.arc(0, 0, Math.max(2, z.r - 5), 0, TAU); ctx.stroke(); ctx.restore();
  },

  herbalFog(ctx, z, time) {
    ctx.save(); ctx.translate(z.x, z.y); ctx.fillStyle = '#86c99c'; ctx.strokeStyle = z.color;
    ctx.globalAlpha = Math.min(1, z.life * 2) * 0.23;
    ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 2; ctx.globalAlpha *= 2.15;
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4 + time * 0.38, x = Math.cos(a) * z.r * 0.59, y = Math.sin(a) * z.r * 0.55;
      ctx.beginPath(); ctx.moveTo(x - 10, y + 5); ctx.quadraticCurveTo(x + 7, y + 1, x - 2, y - 7); ctx.stroke();
    }
    ctx.restore();
  },

  maskEcho(ctx, z, time) {
    ctx.save(); ctx.translate(z.x, z.y); ctx.strokeStyle = z.color;
    ctx.globalAlpha = Math.min(1, z.life * 2) * 0.53; ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#a64b37'; ctx.lineWidth = 2;
    const lift = Math.sin(time * 6) * 2.1; ctx.translate(0, lift);
    ctx.beginPath(); ctx.moveTo(-11, 8); ctx.lineTo(-13, -12); ctx.lineTo(-7, -7); ctx.lineTo(0, -10);
    ctx.lineTo(7, -7); ctx.lineTo(13, -12); ctx.lineTo(11, 8); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-4, -1); ctx.moveTo(9, -4); ctx.lineTo(4, -1);
    ctx.moveTo(-4, 5); ctx.lineTo(4, 5); ctx.stroke(); ctx.restore();
  },

  tideOar(ctx, f, k) {
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(Math.atan2(f.y2 - f.y, f.x2 - f.x));
    const length = Math.hypot(f.x2 - f.x, f.y2 - f.y), width = f.r * (0.6 + (1 - k) * 0.5);
    ctx.fillStyle = f.c; ctx.globalAlpha = k * 0.31;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(length * 0.68, -width * 1.7, length, 0);
    ctx.quadraticCurveTo(length * 0.68, width * 1.7, 0, 0); ctx.fill();
    ctx.globalAlpha = k * 0.82; ctx.strokeStyle = '#d1f5f2'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  },

  scarletThread(ctx, f, k) {
    ctx.save(); ctx.strokeStyle = f.c; ctx.lineWidth = 2 + k * 2; ctx.globalAlpha = k * 0.82;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    ctx.fillStyle = '#fee6d6';
    for (const t of [0, 0.5, 1]) {
      ctx.beginPath(); ctx.arc(f.x + (f.x2 - f.x) * t, f.y + (f.y2 - f.y) * t, 3.1 + k * 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },
};
