'use strict';

// 六位江湖客，名册、开场与实战共用剪影，腿脚随走位摆动。
const FolkFigures = (() => {
  const ink = '#242731';
  const paths = Object.fromEntries(Object.entries({
    paperCoat: 'M-9 -7 L8 -7 L13 3 L9 14 L-10 14 L-12 5Z',
    apron: 'M-6 -3 L5 -3 L9 12 L-8 13Z',
    paperHat: 'M-10 -14 L-12 -25 L-4 -21 L6 -25 L11 -15 L6 -13 L-5 -13Z',
    folded: 'M11 2 L16 -8 L18 -3 L26 -1 L21 2 L22 5 L17 5Z',
    watchCoat: 'M-11 -6 L9 -7 L14 1 L12 15 L-12 15 L-15 5Z',
    watchHat: 'M-11 -13 L-10 -23 L-6 -27 L7 -26 L10 -20 L11 -13Z',
    mallet: 'M11 3 L23 -11 M20 -13 L25 -10',
    herbDress: 'M-6 -8 L8 -8 L10 0 L14 13 Q5 17 -11 13 L-8 3Z',
    herbBraid: 'M-6 -20 Q-13 -16 -11 -4 L-16 2 L-11 6 L-6 1 L-6 -13Z',
    herbLeaves: 'M20 2 Q18 -8 21 -14 Q26 -9 22 -6 Q28 -8 28 -2 Q25 0 20 2Z',
    ferryCoat: 'M-11 -4 L7 -8 L13 -1 L12 12 L4 16 L-3 11 L-11 14Z',
    ferryHat: 'M-15 -16 Q-10 -23 0 -23 Q11 -24 15 -17 Q10 -14 -13 -14Z',
    oar: 'M9 13 L24 -16 L27 -18 L28 -15 L12 14Z',
    waterWrap: 'M-10 -4 Q-1 2 7 -4 L11 0 L6 5 L-8 2Z',
    silkDress: 'M-8 -8 L8 -7 L13 1 L8 5 L12 14 Q1 17 -12 13 L-6 4 L-12 2Z',
    silkEdge: 'M-8 -4 L1 1 L6 13 M-11 12 Q-1 17 10 13',
    silkHair: 'M-9 -12 Q-11 -19 -5 -23 Q0 -23 4 -20 Q9 -23 10 -15 L6 -16 L3 -18 L-3 -16 L-7 -11Z',
    ritualCoat: 'M-10 -8 L9 -8 L15 3 L11 14 L4 11 L0 17 L-5 12 L-14 14 L-15 2Z',
    ritualMask: 'M-9 -10 L-10 -24 L-5 -20 L0 -24 L5 -20 L9 -24 L10 -10 L7 -5 L-5 -5Z',
    maskBrow: 'M-7 -17 L-3 -15 M6 -17 L2 -15 M0 -14 L-1 -10 L2 -10 M-4 -8 H4',
    tassel: 'M17 -2 V-12 M14 -10 L20 -10 M14 -4 L13 5 M17 -4 V6 M20 -4 L21 5',
  }).map(([key, d]) => [key, new Path2D(d)]));

  function shape(ctx, id, fill, edge = ink) {
    ctx.strokeStyle = edge; ctx.fillStyle = fill; ctx.lineWidth = 1;
    ctx.fill(paths[id]); ctx.stroke(paths[id]);
  }

  function stroke(ctx, id, color, width = 1.4) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(paths[id]);
  }

  function oval(ctx, x, y, rw, rh, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, TAU); ctx.fill();
  }

  function step(ctx, stride, span) {
    for (const side of [-1, 1]) oval(ctx, side * span + stride * side * 4.2, 14 - Math.max(0, stride * side) * 2.4, 3.2, 2.35, ink);
  }

  function face(ctx, color, x = 0, width = 7) {
    oval(ctx, x, -13.1, width, 6.4, color);
    oval(ctx, x + 1, -12.9, 0.8, 0.93, ink);
    oval(ctx, x + 4.2, -13.2, 0.83, 0.95, ink);
  }

  return {
    papercraft(ctx, stride, style) {
      step(ctx, stride, 4.8);
      shape(ctx, 'paperCoat', style.main); shape(ctx, 'apron', '#e7d3ae', '#a28758');
      face(ctx, '#ddb288'); shape(ctx, 'paperHat', '#f0e2bb', '#917654');
      shape(ctx, 'folded', '#fff0cb', style.trim);
    },
    watchman(ctx, stride, style) {
      step(ctx, stride * 0.8, 6);
      shape(ctx, 'watchCoat', style.main); face(ctx, '#d2a179', 0, 8);
      shape(ctx, 'watchHat', '#344455', ink); oval(ctx, 0, -19.6, 2.1, 2.1, '#d7a366');
      oval(ctx, -7, 4.8, 6.2, 6.2, '#c9874f'); oval(ctx, -7, 4.8, 4.5, 4.5, '#e6b47d');
      stroke(ctx, 'mallet', style.trim, 3);
    },
    herbalist(ctx, stride, style) {
      step(ctx, stride, 4.4);
      shape(ctx, 'herbBraid', '#3e3431'); shape(ctx, 'herbDress', style.main);
      face(ctx, '#edc2a5'); oval(ctx, -2.7, -20, 7, 3, '#3e3431'); oval(ctx, -6, -21, 2.2, 1.4, style.trim);
      oval(ctx, 19, 5, 6.2, 5, '#906845'); shape(ctx, 'herbLeaves', '#8cc685', '#487c53');
    },
    ferry(ctx, stride, style) {
      step(ctx, stride, 5.5);
      shape(ctx, 'ferryCoat', style.main); face(ctx, '#c88e6d');
      shape(ctx, 'ferryHat', '#cbb280', '#86694f'); shape(ctx, 'waterWrap', style.trim, '#487e7a');
      shape(ctx, 'oar', '#a7784c', '#5b463b');
    },
    embroider(ctx, stride, style) {
      step(ctx, stride, 4.2);
      shape(ctx, 'silkDress', style.main); stroke(ctx, 'silkEdge', style.trim);
      oval(ctx, -5, -24, 4.3, 4.25, '#433236'); face(ctx, '#eac0a4'); shape(ctx, 'silkHair', '#433236');
      oval(ctx, 16, 3, 7.3, 7.0, '#793e4b'); oval(ctx, 16, 3, 5.6, 5.4, '#f7cec0');
      oval(ctx, 16, 3, 1.7, 1.7, '#ab4d67');
    },
    exorcist(ctx, stride, style) {
      step(ctx, stride * 0.86, 5.65);
      shape(ctx, 'ritualCoat', style.main); shape(ctx, 'ritualMask', '#ce785a', '#6a3533');
      stroke(ctx, 'maskBrow', '#ffe2a1', 1.25); stroke(ctx, 'tassel', style.trim, 1.8);
    },
  };
})();
