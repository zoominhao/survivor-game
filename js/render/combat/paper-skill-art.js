'use strict';

const PaperSkillArt = {
  lure(ctx, z) {
    ctx.save(); ctx.translate(z.x, z.y);
    ctx.strokeStyle = z.color;
    ctx.globalAlpha = 0.22 * Math.min(1, z.life / 0.45);
    ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = Math.min(1, z.life / 0.35);
    ctx.fillStyle = '#dfdfba'; ctx.strokeStyle = '#64836a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-6, -13); ctx.lineTo(-19, -8); ctx.lineTo(-19, -3); ctx.lineTo(-7, -7);
    ctx.lineTo(-9, 4); ctx.lineTo(-1, 2); ctx.lineTo(9, 4); ctx.lineTo(7, -7);
    ctx.lineTo(19, -3); ctx.lineTo(19, -8); ctx.lineTo(6, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -23); ctx.lineTo(4, -24); ctx.lineTo(8, -19);
    ctx.lineTo(3, -13); ctx.lineTo(-6, -15); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#954b3c'; ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(3, -6); ctx.lineTo(-2, -2); ctx.stroke();
    ctx.restore();
  },

  seal(ctx, z) {
    const k = 1 - z.t / z.max;
    ctx.save(); ctx.translate(z.x, z.y); ctx.strokeStyle = ctx.fillStyle = z.color;
    ctx.globalAlpha = 0.06 + 0.13 * k;
    ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.64; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, z.r, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.lineWidth = 4; ctx.stroke();
    ctx.rotate(Math.PI / 4); ctx.strokeRect(-11, -11, 22, 22); ctx.rotate(-Math.PI / 4);
    ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(7, -5); ctx.moveTo(0, -9); ctx.lineTo(0, 9);
    ctx.moveTo(-6, 5); ctx.lineTo(0, 1); ctx.lineTo(6, 5); ctx.stroke(); ctx.restore();
  },
};
