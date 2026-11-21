'use strict';

const ZhuSkillArt = {
  scan(ctx, z) {
    const k = U.clamp(1 - z.t / z.max, 0, 1), r = z.r;
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.translate(z.x, z.y);
    ctx.lineWidth = 1.45; ctx.strokeStyle = z.color; ctx.fillStyle = '#57bcca1f';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.35; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.79, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1; ctx.rotate(TAU * k);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, 0);
    ctx.arc(0, 0, r, 0, TAU * 0.17); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(-TAU * k);
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
    ctx.restore();
  },

  code(ctx, shot) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(shot.x, shot.y); ctx.rotate(Math.atan2(shot.vy, shot.vx)); ctx.scale(shot.r / 7, shot.r / 7);
    ctx.strokeStyle = shot.color; ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(-21, -2.9); ctx.lineTo(-8, -2.9); ctx.moveTo(-15, 2.6); ctx.lineTo(-8, 2.6); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#284c48';
    ctx.beginPath(); ctx.roundRect(-8, -5, 16, 10, 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#dbfff0'; ctx.lineWidth = 1.15;
    ctx.beginPath(); ctx.moveTo(-3, -2.4); ctx.lineTo(-5, 0); ctx.lineTo(-3, 2.4);
    ctx.moveTo(3, -2.4); ctx.lineTo(5, 0); ctx.lineTo(3, 2.4);
    ctx.moveTo(1.1, -3); ctx.lineTo(-1.1, 3); ctx.stroke();
    ctx.restore();
  },

  ticket(ctx, shot) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(shot.x, shot.y); ctx.rotate(Math.atan2(shot.vy, shot.vx) + Math.sin(shot.age * 27) * 0.18);
    ctx.scale(shot.r / 8, shot.r / 8);
    ctx.strokeStyle = '#765337'; ctx.fillStyle = shot.color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-11, -5); ctx.lineTo(11, -5); ctx.lineTo(11, -1.7);
    ctx.quadraticCurveTo(8.1, 0, 11, 1.7); ctx.lineTo(11, 5); ctx.lineTo(-11, 5);
    ctx.lineTo(-11, 1.7); ctx.quadraticCurveTo(-8.1, 0, -11, -1.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a95b42'; ctx.fillRect(-8.5, -3.7, 4, 7.4);
    ctx.strokeStyle = '#694a37'; ctx.lineWidth = 0.85; ctx.setLineDash([1.25, 1]);
    ctx.beginPath(); ctx.moveTo(5.8, -4); ctx.lineTo(5.8, 4); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(-2.6, 2); ctx.lineTo(2.9, -2.4); ctx.moveTo(-1.8, -1.5);
    ctx.lineTo(1.2, 0); ctx.moveTo(0.35, -0.4); ctx.lineTo(3.1, 0.8); ctx.stroke();
    ctx.restore();
  },

  noodles(ctx, zone, time) {
    const k = U.clamp(zone.r / zone.maxR, 0, 1);
    ctx.save(); ctx.translate(zone.x, zone.y);
    ctx.globalAlpha = 0.93 - k * 0.57;
    for (let i = 0; i < 2; i++) {
      ctx.strokeStyle = i ? '#ffe3a7' : zone.color; ctx.lineWidth = i ? 1.5 : 3;
      ctx.beginPath();
      for (let j = 0; j <= 64; j++) {
        const a = j / 64 * TAU;
        const r = zone.r - i * 4.8 + (2.2 + k * 2.6) * Math.sin(a * 10 - time * 11 + i * 1.3);
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    if (k < 0.85) {
      ctx.globalAlpha = 1 - k / 0.85; ctx.fillStyle = '#ece1c6'; ctx.strokeStyle = '#a96d48'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-13, -1); ctx.quadraticCurveTo(-8, 11, 0, 11);
      ctx.quadraticCurveTo(8, 11, 13, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f7bd67'; ctx.beginPath(); ctx.ellipse(0, -2, 13, 4.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#805f3d'; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(13, -13);
      ctx.moveTo(3, 0); ctx.lineTo(17, -10); ctx.stroke();
    }
    ctx.restore();
  },
};
