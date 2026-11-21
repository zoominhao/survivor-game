'use strict';
// 夜魇的青铜傩面、盘角与披甲造型。
const NightmareArt = (() => {
  const p = { metal: '#768e80', edge: '#d0bb82', plate: '#344d48', robe: '#412b3a', ember: '#ffc57b' };
  const paths = {
    cloak: new Path2D('M-24 -26Q-43 -22 -50 -4L-59 36Q-47 31 -44 49L-25 42 -16 55 -5 47 4 57 18 47 27 53 40 42 53 46 59 33 51 1Q44 -19 23 -26Z'),
    breast: new Path2D('M-21 3Q0 -8 21 3L33 28 17 42 0 47 -17 42 -33 28Z'),
    plate: new Path2D('M-30 -17Q-44 -15 -52 -4L-56 8 -41 20 -25 15 -18 -1Z'),
    plateRims: new Path2D('M-52 3Q-42 1 -31 -9M-50 9Q-39 8 -28 -3M-44 14Q-35 13 -27 7'),
    horn: new Path2D('M-18 -29Q-25 -42 -42 -40Q-63 -38 -55 -59Q-49 -47 -33 -53Q-17 -58 -10 -34Z'),
    hornRims: new Path2D('M-45 -42Q-40 -45 -40 -51M-32 -41Q-26 -45 -27 -54M-22 -36Q-17 -40 -18 -49'),
    face: new Path2D('M-18 -41Q0 -46 18 -41L30 -30 27 -8Q34 4 19 9L10 18Q0 24 -10 18L-19 9Q-34 4 -27 -8L-30 -30Z'),
    eyeSocket: new Path2D('M-24 -24Q-16 -29 -6 -21L-8 -14Q-18 -16 -24 -20Z'),
    nose: new Path2D('M0 -23L-6 -9 -5 -5 0 -7 5 -5 6 -9Z'),
    jaw: new Path2D('M-16 -1Q-9 1 -5 -1L0 2 5 -1Q9 1 16 -1L12 9Q0 15 -12 9Z'),
    fangs: new Path2D('M-14 0L-9 2 -10 8ZM-6 2L-1 3 -4 7ZM14 0L9 2 10 8ZM6 2L1 3 4 7Z'),
    forehead: new Path2D('M0 -42L7 -35 0 -28 -7 -35Z'),
    maskEtch: new Path2D('M-22 -31Q-14 -35 -8 -28M22 -31Q14 -35 8 -28M-22 -13L-20 -7 -15 -6M22 -13L20 -7 15 -6M-10 13L0 17 10 13'),
    armorEtch: new Path2D('M-16 23L0 34 16 23M-12 32L0 40 12 32M-14 44L-7 37M14 44L7 37'),
  };

  function shape(c, path, fill, line, width = 1.5) {
    c.fillStyle = fill; c.fill(path);
    if (line) { c.strokeStyle = line; c.lineWidth = width; c.stroke(path); }
  }

  function paint(c, r) {
    c.save(); c.scale(r / 44, r / 44); c.lineJoin = 'round';
    shape(c, paths.cloak, p.robe, '#1f202c', 2.6);
    shape(c, paths.breast, p.plate, '#181d29', 2.3);
    c.strokeStyle = p.edge; c.lineWidth = 1.4; c.stroke(paths.armorEtch);
    for (const side of [1, -1]) {
      c.save(); c.scale(side, 1);
      shape(c, paths.plate, p.plate, p.edge, 1.9);
      c.strokeStyle = p.edge; c.lineWidth = 1.05; c.stroke(paths.plateRims);
      shape(c, paths.horn, p.metal, '#2b2830', 2.2);
      c.strokeStyle = p.edge; c.lineWidth = 1.05; c.stroke(paths.hornRims);
      c.restore();
    }
    shape(c, paths.face, p.metal, p.edge, 2.35);
    c.strokeStyle = p.edge; c.lineWidth = 1.25; c.stroke(paths.maskEtch);
    shape(c, paths.nose, p.plate, p.edge, 1.1);
    shape(c, paths.jaw, '#29202b', p.edge, 1.55);
    shape(c, paths.fangs, '#e4d5a9');
    shape(c, paths.forehead, p.plate, p.edge, 1.15);
    for (const side of [1, -1]) {
      c.save(); c.scale(side, 1); shape(c, paths.eyeSocket, '#261e2a', p.edge, 1);
      c.fillStyle = p.ember; c.beginPath(); c.ellipse(-15, -21, 5.6, 1.75, 0.22, 0, TAU); c.fill(); c.restore();
    }
    c.fillStyle = p.ember; c.fillRect(-1.1, -38, 2.2, 6);
    c.restore();
  }

  function signs(ctx, boss, time, reduced, glow) {
    const color = p.ember;
    const inv = boss.phase === 'wind' ? 1 : 0;
    ctx.save(); ctx.globalAlpha = inv ? 0.7 : 0.31;
    ctx.strokeStyle = color; ctx.lineWidth = 1.25 + inv;
    ctx.beginPath(); ctx.ellipse(boss.x, boss.y + boss.r * 0.71, boss.r * 1.23, boss.r * 0.41, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = inv ? 0.64 : 0.36;
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3 + (reduced ? 0 : time * 1.7);
      const x = boss.x + Math.cos(a) * boss.r * 1.22, y = boss.y + Math.sin(a) * boss.r * 0.45;
      glow(color, x, y, 13 + inv * 6);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function arrival(ctx, w, h, progress, reduced) {
    if (progress < 0 || progress >= 1) return;
    const pulse = Math.sin(Math.PI * progress);
    const pad = Math.min(w, h) * (reduced ? 0.034 : 0.016 + Math.sqrt(progress) * 0.021);
    const mark = Math.min(w, h) * 0.12;
    ctx.save(); ctx.strokeStyle = '#ee9a77'; ctx.globalAlpha = pulse * 0.65; ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.0035);
    for (const [x, y, dx, dy] of [[pad, pad, 1, 1], [w - pad, pad, -1, 1], [pad, h - pad, 1, -1], [w - pad, h - pad, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x + mark * dx, y); ctx.lineTo(x, y); ctx.lineTo(x, y + mark * dy); ctx.stroke();
    }
    ctx.restore();
  }

  return { paint, signs, arrival };
})();
