'use strict';
// 照片参考转绘：头像保留双手比耶，战斗站姿共用头部和衣服图形。
const EchoFigure = (() => {
  const hair = '#282530', skin = '#f1bb97', skinShade = '#bd826e';
  const ink = '#171822', yellow = '#fbd35a', navy = '#253044';
  const paths = {
    band: new Path2D('M-26 32 C-28 17 -19 5 -10 2 C-3 -1 7 0 13 3 C23 9 28 19 27 32 L23 34 C23 18 18 10 11 7 C4 4 -5 4 -12 8 C-20 13 -24 22 -22 34 Z'),
    bandShine: new Path2D('M-24 22 C-21 8 -10 1 0 1 C8 1 15 4 20 10'),
    face: new Path2D('M-20 17 C-18 9 -9 6 -1 6 C10 6 19 10 21 19 C23 26 21 31 23 37 C27 47 20 55 10 57 Q0 61 -10 57 C-20 55 -26 48 -23 37 C-21 30 -23 24 -20 17 Z'),
    hair: new Path2D('M-21 35 C-24 28 -22 17 -19 12 C-15 5 -7 4 -1 4 C10 4 17 7 20 13 C23 20 23 30 20 36 L18 25 C17 17 15 13 12 12 C5 10 -8 10 -14 13 C-18 16 -19 22 -20 29 Z'),
    buzz: new Path2D('M-19 17 Q-17 13 -15 11 M-14 12 Q-11 8 -8 8 M-7 10 Q-4 7 -1 7 M0 10 Q3 7 6 8 M8 10 Q11 8 13 10 M15 12 Q18 13 19 15'),
    brows: new Path2D('M-16 28 Q-11 24 -6 28 M6 28.5 Q11 25 16 29'),
    lids: new Path2D('M-16 34 Q-11 28.5 -6 33.5 M6 34 Q11 29 16 34.5'),
    nose: new Path2D('M-1.8 41 Q-2.4 43.5 1 43.2'),
    smile: new Path2D('M-8 47.5 Q0 50.7 8 47 Q5 53.8 0 54.2 Q-5.8 54 -8 47.5 Z'),
    smileGlow: new Path2D('M-3.5 52.7 Q0 50.7 4 52.1 Q1 54.1 -3.5 52.7 Z'),
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
    stroke(ctx, paths.bandShine, '#666b82', 1.6);
    for (const side of [-1, 1]) {
      oval(ctx, 23.5 * side, 39, 6.1, 13.3, ink, 0.17 * side);
      oval(ctx, 26 * side, 38, 2.4, 10, '#474a61', 0.17 * side);
      oval(ctx, 26.2 * side, 32, 1.2, 2, '#8c8ca1');
    }
    const face = ctx.createLinearGradient(-18, 19, 20, 54);
    face.addColorStop(0, '#f5c3a0'); face.addColorStop(0.55, '#f9d0ad'); face.addColorStop(1, '#e9ad8c');
    stroke(ctx, paths.face, '#88574c', 1.2);
    fill(ctx, paths.face, face);
    fill(ctx, paths.hair, hair);
    stroke(ctx, paths.buzz, '#514653', 1.1);
    oval(ctx, -14.6, 42.8, 6.1, 3.5, '#e7807c73', -0.14);
    oval(ctx, 14.6, 43.2, 6.1, 3.5, '#e7807c73', 0.14);
    stroke(ctx, paths.brows, '#674740', 1.2);
    for (const side of [-1, 1]) {
      const x = 11 * side, y = side < 0 ? 34.2 : 34.8;
      oval(ctx, x, y, 5, 3.8, '#fff5df', 0.12 * side);
      oval(ctx, x + 0.35, y - 0.1, 3.6, 3.75, '#402832');
      oval(ctx, x + 0.7, y + 1.7, 2.05, 1.35, '#854d3e');
      oval(ctx, x - 1, y - 1.55, 1.3, 1.05, '#fff8e8');
      oval(ctx, x + 1.8, y + 0.85, 0.55, 0.6, '#f5d6b4');
    }
    stroke(ctx, paths.lids, '#4b3032', 1.35);
    stroke(ctx, paths.nose, '#c08571', 0.85);
    fill(ctx, paths.smile, '#93544f');
    fill(ctx, paths.smileGlow, '#df8f88');
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

  const handX = stride => 9.8 - stride * 2.4;
  const handY = 6.7, lensX = 9.1;

  function heldLight(ctx, stride, aim) {
    ctx.save(); ctx.translate(handX(stride), handY); ctx.rotate(aim);
    ctx.fillStyle = '#508d86'; ctx.strokeStyle = '#254a4c'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.roundRect(-1.5, -1.75, 8.4, 3.5, 1.1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#78b9a9'; ctx.fillRect(0.2, -1.2, 3.7, 1);
    ctx.fillStyle = '#e4ae62';
    ctx.beginPath(); ctx.moveTo(5.1, -1.75); ctx.lineTo(7.3, -2.7); ctx.lineTo(lensX, -2.7);
    ctx.lineTo(lensX, 2.7); ctx.lineTo(7.3, 2.7); ctx.lineTo(5.1, 1.75); ctx.closePath(); ctx.fill(); ctx.stroke();
    line(ctx, '#fff0b2', 1.4, lensX, -1.65, lensX, 1.65);
    ctx.restore();
  }

  const beam = HandLight.create(266, 100, 0.36, 0.34, [255, 220, 151]);
  const drawBeam = (ctx, p, pose) => beam(ctx, p, pose, handX(pose.stride), handY, lensX);

  function runner(ctx, stride, tier = 0, aim = 0) {
    ctx.save();
    ctx.lineCap = 'round';
    stepLeg(ctx, stride > 0 ? 1 : -1, stride);
    stepLeg(ctx, stride > 0 ? -1 : 1, stride);
    line(ctx, skinShade, 3.4, -8, 1.8, -10.2 + stride * 1.7, 7.4);
    ctx.save();
    ctx.translate(0, -24); ctx.scale(0.36, 0.36);
    drawShirt(ctx);
    ctx.restore();
    line(ctx, skin, 3.3, 8, 1.8, handX(stride), handY);
    heldLight(ctx, stride, aim);
    oval(ctx, handX(stride), handY, 1.55, 1.5, skin);
    ctx.translate(0.65 + stride * 0.65, -25.8);
    ctx.rotate(stride * 0.055);
    ctx.scale(0.43, 0.43);
    drawHead(ctx);
    if (tier > 0) {
      stroke(ctx, paths.bandShine, '#f5bf66', 2.3);
      for (const side of [-1, 1]) {
        const x = 24.5 * side;
        ctx.strokeStyle = '#f5bf66'; ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.ellipse(x, 40, 3.7, 10, 0.17 * side, 0, TAU); ctx.stroke();
        oval(ctx, x, 43, 2.1, 3.6, '#ffe0a8');
      }
    }
    ctx.restore();
  }

  return { portrait, runner, drawBeam };
})();
