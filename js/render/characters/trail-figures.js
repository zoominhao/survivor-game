'use strict';

// 系统角色靠身形、帽子和手持物区分，不共用斗篷剪影。
const TrailFigures = (() => {
  const ink = '#202533';

  function shape(ctx, path, color, edge = ink, width = 1) {
    ctx.fillStyle = color; ctx.strokeStyle = edge; ctx.lineWidth = width;
    ctx.fill(path); ctx.stroke(path);
  }

  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  }

  function stroke(ctx, path, color, width = 1.25) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(path); }

  const art = {
    lanternCoat: new Path2D('M-10 -6 Q-7 -10 0 -9 L9 -5 L13 10 L5 14 L0 10 L-13 14 L-11 4 Z'),
    lanternHat: new Path2D('M-15 -14 L-3 -25 Q0 -26 3 -23 L16 -14 Q5 -10 -15 -14 Z'),
    lanternRibs: new Path2D('M-12 -14 L-2 -22 M-6 -13 L0 -22 M8 -13 L1 -22 M-12 -14 Q2 -10 14 -14'),
    lanternFlap: new Path2D('M5 -6 L1 0 L-4 3 M-7 5 L-5 11'),
    lanternArm: new Path2D('M7 -2 L14 -2 L16 -8 M16 -8 Q21 -10 22 -6 L22 0'),
    lanternCage: new Path2D('M17 1 Q22 -1 27 1 L26 9 Q22 12 18 9 Z'),
    lanternBars: new Path2D('M22 1v9 M19 2 L20 9 M25 2 L24 9'),
    smithBody: new Path2D('M-16 -5 Q-20 0 -15 8 L-11 11 L12 11 Q18 7 18 0 L15 -6 L9 -8 L-9 -8 Z'),
    smithApron: new Path2D('M-11 -6 L-7 -6 L-4 0 L4 0 L7 -6 L11 -6 L9 5 L11 14 L-11 14 L-9 5 Z'),
    smithTrim: new Path2D('M-5 5 H6 L5 10 H-5 Z M-10 -2 l3 3 M9 -2 L6 1'),
    smithHead: new Path2D('M-8 -16 Q-6 -22 1 -21 Q8 -21 10 -15 L9 -8 Q5 -3 -1 -4 L-7 -6 Z'),
    smithBeard: new Path2D('M-7 -10 Q-3 -8 1 -11 Q6 -8 9 -11 L8 -6 L3 -3 L-4 -4 Z'),
    hammer: new Path2D('M18 -24 L27 -24 L29 -14 L27 -10 L16 -10 L13 -14 L14 -22 Z'),
    hammerEdge: new Path2D('M16 -21 L25 -21 L27 -18 M16 -13 H26'),
    hammerGrip: new Path2D('M16 9 L21 -14'),
    starRobes: new Path2D('M-5 -8 L5 -7 Q6 4 11 14 L3 12 L0 16 L-4 13 L-10 15 L-6 0 Z'),
    starHat: new Path2D('M-11 -13 Q-7 -15 -6 -17 L-1 -27 L4 -25 L8 -15 L12 -13 Q0 -9 -11 -13 Z'),
    starTrim: new Path2D('M-6 -17 Q0 -14 8 -16 M-4 -6 L1 0 L1 11 M-2 7 l5 0'),
    starStaff: new Path2D('M15 -17 L13 14 M11 -18 Q14 -13 17 -18'),
    starGlyph: new Path2D('M16 -26 L17.4 -23 L21 -22 L17.4 -21 L16 -17 L14.6 -21 L11 -22 L14.6 -23 Z'),
    scoutBody: new Path2D('M-8 -7 L8 -6 L9 -1 L13 5 L9 7 L7 12 L0 8 L-8 12 L-9 5 L-12 3 Z'),
    scoutCowl: new Path2D('M-8 -11 Q-10 -22 -1 -24 L4 -20 L9 -20 L8 -15 L10 -12 L5 -9 L-2 -10 L-5 -8 Z'),
    scoutStitch: new Path2D('M-6 -11 L-3 -8 L4 -8 M-5 1 L7 5 M-6 7 L6 4'),
    scoutPouch: new Path2D('M-12 0 L-8 0 L-7 6 L-8 9 L-12 8 Z'),
    scoutBlade: new Path2D('M12 -1 Q22 -4 25 -14 Q26 -7 22 -1 Q19 2 12 3 L10 0 Z'),
  };

  function step(ctx, stride, span, length, boots) {
    for (const side of [-1, 1]) {
      const x = side * span + stride * side * 3.8, y = 14 - Math.max(0, stride * side) * 2.3;
      ellipse(ctx, x, y, span * 0.66 + 0.9, length, boots);
    }
  }

  return {
    lantern(ctx, stride, style) {
      step(ctx, stride, 4.6, 2.6, '#5a4434');
      shape(ctx, art.lanternCoat, style.main); stroke(ctx, art.lanternFlap, style.trim);
      ellipse(ctx, 1, -12, 7.1, 6.4, '#e3ad80'); ellipse(ctx, 4, -11.4, 0.92, 0.84, '#48312a');
      shape(ctx, art.lanternHat, '#c4a166', '#705536'); stroke(ctx, art.lanternRibs, '#f0d09a');
      stroke(ctx, art.lanternArm, '#a88758', 1.7);
      shape(ctx, art.lanternCage, '#ffe5a1', '#c78c55'); stroke(ctx, art.lanternBars, '#b57a45', 0.85);
    },
    smith(ctx, stride, style) {
      step(ctx, stride, 7, 3.25, '#352f35');
      shape(ctx, art.smithBody, '#68717a'); shape(ctx, art.smithApron, style.main); stroke(ctx, art.smithTrim, style.trim);
      shape(ctx, art.smithHead, '#c38f74'); shape(ctx, art.smithBeard, '#51413f');
      ellipse(ctx, 3, -14, 1.2, 0.95, ink); ellipse(ctx, -8, -16, 3.1, 2, '#a76048');
      stroke(ctx, art.hammerGrip, '#ab805c', 3.8); shape(ctx, art.hammer, '#788595', ink, 1.5);
      stroke(ctx, art.hammerEdge, '#d3ddde', 1.25); ellipse(ctx, 17, 2, 3.1, 3, '#c38f74');
    },
    astronomer(ctx, stride, style) {
      step(ctx, stride, 3.5, 1.75, '#333348');
      shape(ctx, art.starRobes, style.main); ellipse(ctx, 1, -10, 5.9, 5.8, '#e7c19f');
      ellipse(ctx, 3, -10, 0.9, 0.86, ink); shape(ctx, art.starHat, '#3f466e'); stroke(ctx, art.starTrim, style.trim);
      stroke(ctx, art.starStaff, '#baa076', 2.1); shape(ctx, art.starGlyph, '#d9e8ff', '#6f8bc9', 0.9);
    },
    ranger(ctx, stride, style) {
      step(ctx, stride * 1.25, 5.5, 2, '#433a36');
      shape(ctx, art.scoutBody, style.main); shape(ctx, art.scoutPouch, '#836544');
      ellipse(ctx, 2.3, -12, 6.7, 6.15, '#b98468'); ellipse(ctx, 5, -10.4, 0.95, 1.05, ink);
      shape(ctx, art.scoutCowl, '#345849'); stroke(ctx, art.scoutStitch, style.trim, 1.6);
      shape(ctx, art.scoutBlade, '#b6daca', '#42635c');
    },
  };
})();
