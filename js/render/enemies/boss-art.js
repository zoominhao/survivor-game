'use strict';
// 尸王背古棺，鬼后坐红轿，轮廓和预警形状都与夜魇不同。
const BossArt = (() => {
  const paths = {
    coffin: new Path2D('M-39 -40L-29 -57 27 -57 40 -40 32 50 20 58 -21 58 -32 50Z'),
    coffinRim: new Path2D('M-31 -38L-24 -49H23L31 -38 25 46 16 51H-16L-25 46Z'),
    coffinBands: new Path2D('M-34 -31H34M-32 33H31M-27 -43L26 43M27 -43L-26 43'),
    royalCoat: new Path2D('M-23 -9L-45 20 -48 40 -31 45 -24 31 -24 52H24V31L31 45 48 40 45 20 23 -9Z'),
    royalFace: new Path2D('M-19 -28H19L21 -9 14 3 0 9 -13 3 -21 -9Z'),
    royalHat: new Path2D('M-27 -34L-18 -44H18L27 -34 19 -24H-19Z'),
    goldSeal: new Path2D('M-7 -25L7 -24 6 13 1 10 -5 14Z'),
    sealInk: new Path2D('M1 -19V6M-3 -14H4M-3 -9L4 -7M-2 2L4 -3'),
    sedanRoof: new Path2D('M-56 -24Q-44 -33 -32 -44L-15 -42 0 -56 15 -42 30 -44Q44 -31 56 -24L35 -18H-35Z'),
    sedan: new Path2D('M-43 -22H43L45 39Q0 54 -45 39Z'),
    curtains: new Path2D('M-39 -20H-12Q-16 9 -31 28L-41 35H-46ZM39 -20H12Q16 9 31 28L41 35H46Z'),
    dress: new Path2D('M-13 -9H13L26 34Q16 45 0 43Q-15 45 -26 34Z'),
    veil: new Path2D('M-20 -12Q0 -33 20 -12L24 7 17 13 9 9 0 15 -9 9 -17 13 -24 7Z'),
    bridalTrim: new Path2D('M-20 -9Q0 -24 20 -9M-20 6L-16 9 -9 6 0 12 9 6 16 9 20 6M-13 17L-15 31M13 17L15 31'),
  };

  function shape(ctx, path, fill, border, line = 1.8) {
    ctx.fillStyle = fill; ctx.fill(path);
    ctx.strokeStyle = border; ctx.lineWidth = line; ctx.stroke(path);
  }

  function coffinKing(ctx, r) {
    ctx.save(); ctx.scale(r / 44, r / 44); ctx.lineJoin = 'round';
    shape(ctx, paths.coffin, '#373238', '#ae9b75', 2.6);
    shape(ctx, paths.coffinRim, '#52504b', '#77735a');
    ctx.strokeStyle = '#a58664'; ctx.lineWidth = 3; ctx.stroke(paths.coffinBands);
    shape(ctx, paths.royalCoat, '#344949', '#8c8763', 2.1);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#b3c799'; ctx.fillRect(s * 40 - 5, 31, 10, 8);
      ctx.strokeStyle = '#c0aa70'; ctx.lineWidth = 1.45;
      ctx.beginPath(); ctx.moveTo(s * 23, 3); ctx.lineTo(s * 34, 18); ctx.lineTo(s * 30, 27); ctx.stroke();
    }
    shape(ctx, paths.royalFace, '#93ac83', '#485e55');
    ctx.fillStyle = '#f1e18c'; ctx.fillRect(-15, -19, 6, 3); ctx.fillRect(9, -19, 6, 3);
    shape(ctx, paths.royalHat, '#2a3542', '#987f5d');
    shape(ctx, paths.goldSeal, '#e6c977', '#ab6b45');
    ctx.strokeStyle = '#a04a40'; ctx.lineWidth = 1.3; ctx.stroke(paths.sealInk);
    ctx.restore();
  }

  function bridalQueen(ctx, r) {
    ctx.save(); ctx.scale(r / 44, r / 44); ctx.lineJoin = 'round';
    shape(ctx, paths.sedan, '#4c2a42', '#aa6c68', 2.1);
    shape(ctx, paths.curtains, '#852f4e', '#c87177');
    shape(ctx, paths.dress, '#993b59', '#e0977b');
    shape(ctx, paths.veil, '#cc536d', '#eebe88', 2.15);
    ctx.strokeStyle = '#f4c08a'; ctx.lineWidth = 1.5; ctx.stroke(paths.bridalTrim);
    ctx.fillStyle = '#ffe09d'; ctx.fillRect(-9, 1, 4, 2.5); ctx.fillRect(5, 1, 4, 2.5);
    shape(ctx, paths.sedanRoof, '#74334d', '#e3a477', 2.2);
    for (const x of [-35, 35]) {
      ctx.strokeStyle = '#d7a476'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x, -13); ctx.stroke();
      ctx.fillStyle = '#f3a777'; ctx.beginPath(); ctx.ellipse(x, -9, 4.6, 5.8, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function warning(ctx, boss) {
    if (boss.phase === 'sealWind') {
      const k = 1 - boss.cd / boss.windTime;
      for (const seal of boss.seals) {
        ctx.save(); ctx.fillStyle = '#d0be662f'; ctx.strokeStyle = '#e4d58aca'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(seal.x, seal.y, seal.r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e9ce7256'; ctx.beginPath(); ctx.arc(seal.x, seal.y, seal.r * U.clamp(k, 0, 1), 0, TAU); ctx.fill();
        ctx.restore();
      }
    } else if (boss.phase === 'fanWind') {
      ctx.save(); ctx.translate(boss.x, boss.y); ctx.rotate(boss.attackAngle);
      ctx.fillStyle = '#e55c7c2e'; ctx.strokeStyle = '#ff91a6cb'; ctx.lineWidth = 1.8;
      const wing = BRIDAL_FAN_HALF_ANGLE, wings = boss.fanWings;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 260, -wing, wing); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = 1 - wings; i < wings; i++) {
        const a = i * wing / wings;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32); ctx.lineTo(Math.cos(a) * 114, Math.sin(a) * 114); ctx.stroke();
      }
      ctx.restore();
    }
  }

  return { coffinKing, bridalQueen, warning };
})();
