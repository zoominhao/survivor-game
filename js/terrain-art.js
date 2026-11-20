'use strict';
// 夜路里的松、石与灯：每种场景物件只绘制一次，战斗中复用贴图。
const TerrainArt = {
  sprites: {},
  width: 88,
  height: 124,
  anchorY: 94,

  draw(ctx, prop) {
    const { width, height, anchorY } = this;
    let image = this.sprites[prop.kind];
    if (!image) {
      image = document.createElement('canvas');
      image.width = width * 2;
      image.height = height * 2;
      const c = image.getContext('2d');
      c.scale(2, 2);
      c.translate(width / 2, anchorY);
      this[prop.kind](c);
      this.sprites[prop.kind] = image;
    }
    ctx.drawImage(image, prop.x - width / 2, prop.y - anchorY, width, height);
  },

  ellipse(ctx, x, y, rx, ry, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  },

  polygon(ctx, fill, pts, edge) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.stroke(); }
  },

  rock(ctx) {
    this.ellipse(ctx, 0, 6, 34, 16, '#0d1716b3');
    this.polygon(ctx, '#454e45', [-29, 1, -25, -19, -13, -31, 7, -34, 21, -23, 29, -8, 25, 11, 10, 17, -18, 14], '#263b35');
    this.polygon(ctx, '#748274', [-25, -19, -13, -31, 7, -34, 19, -23, 2, -13, -16, -15]);
    this.polygon(ctx, '#58665a', [2, -13, 19, -23, 29, -8, 25, 11, 9, 13, 7, 1]);
    ctx.strokeStyle = '#31423b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-7, -30); ctx.lineTo(-11, -23); ctx.lineTo(-2, -16);
    ctx.moveTo(-2, -16); ctx.lineTo(-5, -7); ctx.lineTo(0, 5); ctx.stroke();
    this.polygon(ctx, '#566e4e', [-27, 4, -18, 1, -11, 7, -7, 8, -8, 15, -19, 14]);
    this.polygon(ctx, '#647e54', [12, -29, 19, -23, 22, -18, 11, -23, 5, -25]);
    this.ellipse(ctx, 30, 13, 4.5, 2.6, '#69776a');
  },

  pine(ctx) {
    this.ellipse(ctx, 1, 6, 26, 12, '#0d1716bb');
    this.polygon(ctx, '#6f6050', [-6, 9, -3, -25, 5, -27, 6, 6, 13, 11, 4, 10, -11, 13], '#303929');
    this.polygon(ctx, '#344d3d', [0, -81, -30, -20, -19, -24, -37, -9, -10, -13, -3, -10, 12, -15, 34, -9, 23, -27], '#1a322d');
    this.polygon(ctx, '#4c6a50', [0, -83, -27, -36, -16, -38, -32, -25, -10, -28, 0, -25, 16, -30, 29, -25, 18, -40], '#284239');
    this.polygon(ctx, '#607b59', [0, -84, -19, -52, -12, -56, -23, -43, -9, -47, 1, -43, 11, -48, 23, -43, 13, -57], '#344e40');
    ctx.strokeStyle = '#9aab7480'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, -73); ctx.lineTo(-8, -61);
    ctx.moveTo(-12, -47); ctx.lineTo(-20, -35); ctx.moveTo(12, -42); ctx.lineTo(18, -32);
    ctx.moveTo(-20, -25); ctx.lineTo(-26, -18); ctx.stroke();
  },

  lantern(ctx) {
    const glow = ctx.createRadialGradient(0, -20, 0, 0, -20, 34);
    glow.addColorStop(0, '#edbf596b'); glow.addColorStop(1, '#edbf5900');
    ctx.fillStyle = glow; ctx.fillRect(-35, -55, 70, 70);
    this.ellipse(ctx, 0, 6, 18, 8, '#0b1919a6');
    this.polygon(ctx, '#4d5950', [-14, 4, -8, -2, 8, -2, 14, 4, 11, 9, -11, 9], '#35443e');
    this.polygon(ctx, '#88917a', [-4, 2, -3, -15, 4, -15, 5, 2]);
    this.polygon(ctx, '#a1a285', [-9, -12, -8, -26, 7, -26, 9, -12], '#474b3b');
    this.polygon(ctx, '#ffcf70', [-4, -15, -4, -23, 4, -23, 4, -15]);
    this.polygon(ctx, '#727f73', [-15, -25, -8, -29, 0, -40, 8, -29, 15, -25], '#4c584d');
    ctx.strokeStyle = '#aaa982'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-9, -27); ctx.lineTo(0, -34); ctx.lineTo(9, -27); ctx.stroke();
  },

  reeds(ctx) {
    this.ellipse(ctx, 0, 4, 19, 6, '#101e1980');
    ctx.lineCap = 'round'; ctx.lineWidth = 1.15;
    for (const [x, height, bend] of [[-12, 23, -7], [-5, 32, 4], [4, 26, 6], [8, 16, 9], [13, 21, 2]]) {
      ctx.strokeStyle = '#617650';
      ctx.beginPath(); ctx.moveTo(x, 6); ctx.quadraticCurveTo(x - 1, -8, x + bend, -height); ctx.stroke();
      ctx.strokeStyle = '#a28e5d';
      ctx.beginPath(); ctx.moveTo(x + bend, -height); ctx.lineTo(x + bend - 2, -height + 6); ctx.stroke();
    }
    this.polygon(ctx, '#526b48', [-9, 3, -19, -8, -11, -5, -3, 4, 2, 1, 14, -8, 10, 1, 4, 6]);
  },

  slabs(ctx) {
    this.ellipse(ctx, 0, 3, 27, 11, '#10201c99');
    this.polygon(ctx, '#617167', [-18, 0, -9, -8, 4, -10, 8, -6, 5, 2, -12, 6], '#43594d');
    this.polygon(ctx, '#53665d', [2, 4, 14, -1, 22, 2, 24, 8, 11, 13, 3, 10], '#40544d');
    this.polygon(ctx, '#748374', [-9, -8, 4, -10, 8, -6, -6, -4]);
    this.ellipse(ctx, -23, 5, 3.7, 2, '#68766a');
  },
};
