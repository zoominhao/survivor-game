'use strict';
// 照片参考转绘：头像保留双手比耶，战斗站姿共用头部和衣服图形。
const EchoFigure = (() => {
  const hair = '#25232a', skin = '#e2ab87', skinShade = '#bf856b';
  const ink = '#171822', yellow = '#f6c94e', navy = '#202839';
  const paths = {
    band: new Path2D('M-26 32 C-28 17 -19 5 -10 2 C-3 -1 7 0 13 3 C23 9 28 19 27 32 L23 34 C23 18 18 10 11 7 C4 4 -5 4 -12 8 C-20 13 -24 22 -22 34 Z'),
    bandShine: new Path2D('M-24 22 C-21 8 -10 1 0 1 C8 1 15 4 20 10'),
    face: new Path2D('M-19 16 C-17 9 -10 6 -1 6 C10 6 18 10 20 18 L20 35 C19 46 15 51 8 56 C4 59 0 61 -4 59 C-12 56 -19 50 -20 39 C-21 33 -21 25 -19 16 Z'),
    hair: new Path2D('M-21 35 C-24 28 -22 17 -19 12 C-15 5 -7 4 -1 4 C10 4 17 7 20 13 C23 20 23 30 20 36 L18 25 C17 17 15 13 12 12 C5 10 -8 10 -14 13 C-18 16 -19 22 -20 29 Z'),
    buzz: new Path2D('M-19 18 L-17 14 M-16 13 L-14 10 M-12 11 L-10 8 M-7 10 L-5 7 M-2 10 L0 7 M3 10 L5 7 M8 10 L10 8 M13 12 L15 10 M16 15 L18 13'),
    brows: new Path2D('M-16 29 C-13 26 -8 26 -5 29 M5 30 C8 27 13 28 16 31'),
    eyes: new Path2D('M-15 34 C-12 31 -8 31 -5 34.5 C-8 35.7 -12 35.6 -15 34 Z M5 35 C8 32 13 32 16 35.8 C12 37 8 36.5 5 35 Z'),
    nose: new Path2D('M-2 37 Q-2.5 40 -4 42 Q-4.5 44 -1 44 M1 44 Q4 44 3.5 42.5'),
    smile: new Path2D('M-8 48 C-3 50 2 50.7 9 47.8 C6 51 2 52 -1 51.6 C-5 51 -7 50 -8 48 Z'),
    collar: new Path2D('M-10 51 L-11 60 Q-7 68 0 69 Q7 67 11 60 L10 51 Z'),
    shirt: new Path2D('M-8 54 C-19 55 -26 59 -29 72 L-20 77 L-16 71 L-14 88 Q0 91 14 88 L16 71 L20 77 L29 72 C26 59 19 55 8 54 Q7 62 0 65 Q-7 62 -8 54 Z'),
    seam: new Path2D('M-18 65 L-16 71 M18 65 L16 71 M-10 56 Q-8 64 0 67 Q8 64 10 56 M-13 86 Q0 89 13 86'),
    mark: new Path2D('M7 71 L9 70 L9 75 L6 76 L6 73 L8 72 L8 69 L12 68 L12 73 L10 74 L10 72 L11 71 L11 70 Z'),
    arm: new Path2D('M-24 76 C-30 85 -42 91 -47 87 C-52 83 -45 72 -37 64 L-29 65 C-28 69 -30 74 -35 77 L-27 71 Z'),
    peace: new Path2D('M-40 68 C-43 65 -43 60 -41 56 C-39 53 -36 52 -34 52 L-32 38 Q-31 33 -28 35 Q-26 36 -27 41 L-28 54 L-19 46 Q-16 43 -14 46 Q-13 48 -16 52 L-23 60 Q-18 58 -18 62 Q-17 65 -22 69 C-26 74 -35 75 -40 68 Z'),
    fingers: new Path2D('M-37 55 Q-33 57 -32 62 Q-34 65 -37 62 L-39 58 M-33 56 Q-29 57 -28 61 M-27 64 Q-24 60 -22 60'),
  };

  function fill(ctx, path, color) { ctx.fillStyle = color; ctx.fill(path); }
  function stroke(ctx, path, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(path);
  }
  function oval(ctx, x, y, rx, ry, color, angle = 0) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, TAU); ctx.fill();
  }

  let headSprite;
  function paintHead(ctx) {
    fill(ctx, paths.band, ink);
    stroke(ctx, paths.bandShine, '#596070', 1.35);
    for (const side of [-1, 1]) {
      oval(ctx, 23 * side, 40, 5.8, 13.8, ink, 0.17 * side);
      oval(ctx, 25 * side, 39, 2.5, 10.7, '#414452', 0.17 * side);
      oval(ctx, 26 * side, 32, 1.4, 2, '#777a86');
    }
    const face = ctx.createLinearGradient(-19, 28, 22, 50);
    face.addColorStop(0, '#cc9376'); face.addColorStop(0.53, '#efbd98'); face.addColorStop(1, '#d59a7c');
    stroke(ctx, paths.face, '#6d4942', 1.1);
    fill(ctx, paths.face, face);
    fill(ctx, paths.hair, hair);
    stroke(ctx, paths.buzz, '#4b3f44', 0.9);
    oval(ctx, -13, 40.8, 4.7, 2.6, '#dc967d', -0.18);
    oval(ctx, 13.2, 42.2, 4.7, 2.5, '#dc967d', 0.18);
    stroke(ctx, paths.brows, '#674740', 1.2);
    fill(ctx, paths.eyes, '#38282b');
    oval(ctx, -9.4, 33.6, 0.95, 0.6, '#dfbdaf');
    oval(ctx, 11.1, 34.8, 0.95, 0.6, '#dfbdaf');
    stroke(ctx, paths.nose, '#b27d65', 0.8);
    fill(ctx, paths.smile, '#935c50');
  }

  function drawHead(ctx) {
    // 五官和耳机只栅格化一次，战斗逐帧复用。
    if (!headSprite) {
      headSprite = document.createElement('canvas');
      headSprite.width = 62 * 3; headSprite.height = 62 * 3;
      const x = headSprite.getContext('2d');
      x.scale(3, 3); x.translate(31, 1); x.lineCap = 'round';
      paintHead(x);
    }
    ctx.drawImage(headSprite, -31, -1, 62, 62);
  }

  function drawShirt(ctx) {
    stroke(ctx, paths.shirt, '#8d602f', 1.8);
    fill(ctx, paths.shirt, yellow);
    stroke(ctx, paths.seam, '#ce983a', 1.25);
    fill(ctx, paths.collar, skin);
    fill(ctx, paths.mark, navy);
  }

  function portrait(ctx) {
    // 让脸、耳机和两个手势在小头像里仍可辨认。
    drawShirt(ctx);
    drawHead(ctx);
    for (const side of [1, -1]) {
      ctx.save();
      ctx.scale(side, 1);
      if (side < 0) ctx.translate(0, 1);
      stroke(ctx, paths.arm, skinShade, 1.6); fill(ctx, paths.arm, skin);
      stroke(ctx, paths.peace, skinShade, 1.6); fill(ctx, paths.peace, skin);
      stroke(ctx, paths.fingers, skinShade, 1.1);
      ctx.restore();
    }
  }

  function line(ctx, color, width, x, y, endX, endY) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(endX, endY); ctx.stroke();
  }

  function stepLeg(ctx, side, stride) {
    const x = side * 3.15, step = stride * side, lift = Math.max(0, step) * 2.1;
    const knee = x + step * 2, foot = x + step * 5.4;
    line(ctx, navy, 4.7, x, 6, knee, 10 - lift * 0.35);
    line(ctx, skin, 3, knee, 10 - lift * 0.35, foot, 13 - lift);
    line(ctx, '#f1ede2', 3.2, foot, 12.7 - lift, foot + 0.8, 15 - lift);
    oval(ctx, foot + 0.85, 15 - lift, 2.2, 1.15, '#fff9eb');
  }

  function runner(ctx, stride) {
    ctx.save();
    ctx.lineCap = 'round';
    stepLeg(ctx, stride > 0 ? 1 : -1, stride);
    stepLeg(ctx, stride > 0 ? -1 : 1, stride);
    line(ctx, skinShade, 3.4, -8, 1.8, -10.2 + stride * 1.7, 7.4);
    ctx.save();
    ctx.translate(0, -24); ctx.scale(0.36, 0.36);
    drawShirt(ctx);
    ctx.restore();
    line(ctx, skin, 3.3, 8, 1.8, 9.8 - stride * 2.4, 6.7);
    ctx.translate(0.65 + stride * 0.65, -24.5);
    ctx.rotate(stride * 0.055);
    ctx.scale(0.4, 0.4);
    drawHead(ctx);
    ctx.restore();
  }

  return { portrait, runner };
})();
