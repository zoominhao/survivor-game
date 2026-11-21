'use strict';

// 地图专属地标绘制成缓存贴图，互动物件各有可用与耗尽状态。
const MapPropsArt = {
  ghostLamp(c, lit) {
    this.ellipse(c, 0, 5, 18, 7, '#091c21');
    this.polygon(c, '#566d70', [-13, 5, -8, -2, -5, -2, -5, -17, 5, -17, 5, -2, 9, -2, 13, 5], '#233a44');
    this.polygon(c, '#789092', [-10, -15, -9, -31, 9, -31, 10, -15], '#355462');
    this.polygon(c, lit ? '#b9fbea' : '#385b61', [-5, -17, -5, -27, 5, -27, 5, -17]);
    this.polygon(c, '#4e696d', [-14, -29, -12, -33, 0, -39, 12, -33, 14, -29], '#789092');
  },

  weddingLamp(c, lit) {
    this.ellipse(c, 0, 5, 17, 7, '#1b1520');
    this.polygon(c, '#6d4b4f', [-13, 8, -10, -50, 15, -50, 15, -46, -6, -46, -7, 8], '#3b303b');
    this.ellipse(c, 6, -32, 14, 11, lit ? '#ff9b8e' : '#a75b68');
    this.ellipse(c, 6, -32, 8, 10, lit ? '#ffbc99' : '#bd6970');
    this.polygon(c, '#e2a975', [1, -44, 11, -44, 10, -42, 1, -42, 0, -44]);
    this.polygon(c, '#bf695d', [0, -23, 12, -23, 10, -20, 7, -20, 7, -13, 4, -14, 4, -20, 1, -20]);
  },

  dawnLamp(c, lit) {
    this.ellipse(c, 0, 4, 18, 8, '#34342b');
    this.polygon(c, '#9c8565', [-12, 6, -7, 0, -4, -3, -4, -20, 4, -20, 4, -3, 7, 0, 12, 6], '#64634e');
    this.ellipse(c, 0, -22, 11, 10, lit ? '#fff1ac' : '#c9a36e');
    this.ellipse(c, 0, -22, 6, 7, lit ? '#fff9d0' : '#d8b686');
    this.ellipse(c, 0, -30, 7, 2.8, '#af926a');
  },

  graveStele(c) {
    this.ellipse(c, 0, 4, 30, 12, '#102321');
    this.polygon(c, '#536b64', [-25, 4, -18, -5, 19, -5, 24, 4, 18, 12, -19, 11], '#283e3c');
    this.polygon(c, '#778477', [-15, 2, -15, -34, -9, -43, 0, -46, 9, -43, 15, -35, 15, 2], '#465b53');
    this.polygon(c, '#929988', [-10, -5, -10, -34, 0, -41, 10, -34, 10, -5], '#637a6d');
    c.strokeStyle = '#52675e'; c.lineWidth = 1.4; c.beginPath();
    c.moveTo(-4, -28); c.lineTo(4, -28); c.moveTo(0, -33); c.lineTo(0, -15); c.moveTo(-5, -20); c.lineTo(5, -20); c.stroke();
  },

  graveOffering(c) {
    this.ellipse(c, 0, 5, 23, 8, '#132928');
    this.ellipse(c, 0, 3, 18, 5, '#66786c');
    for (const x of [-8, 0, 8]) {
      c.fillStyle = '#af8d72'; c.fillRect(x - 1, -12 + (x ? 4 : 0), 2, x ? 10 : 14);
      this.ellipse(c, x, x ? -8 : -12, 1.3, 2.5, '#d9a181');
    }
  },

  waystone(c) {
    this.slabs(c);
    this.polygon(c, '#a59879', [9, 4, 9, -19, 13, -25, 19, -24, 23, -18, 23, 5], '#5f665b');
    c.fillStyle = '#86715e'; c.fillRect(14, -18, 3, 13);
  },

  bambooFence(c) {
    this.ellipse(c, 0, 4, 30, 11, '#11291f');
    for (const x of [-21, -10, 0, 11, 21]) {
      const h = -26 - Math.abs(x) * 0.27;
      this.polygon(c, '#738a56', [x - 2, 6, x - 3, h, x + 2, h + 2, x + 3, 6], '#405d3f');
    }
    this.polygon(c, '#9da36c', [-26, -12, 25, -19, 26, -15, -25, -8], '#4a6246');
    this.polygon(c, '#a35d54', [-3, -25, 5, -25, 6, -10, -4, -10], '#714f48');
  },

  courtyardGate(c) {
    this.ellipse(c, 0, 5, 31, 10, '#161d28');
    c.fillStyle = '#834e55'; c.fillRect(-21, -38, 7, 44); c.fillRect(14, -38, 7, 44);
    this.polygon(c, '#5d6170', [-36, -37, -25, -42, -17, -55, 0, -61, 18, -55, 26, -43, 36, -37, 25, -34, -26, -34], '#323d4e');
    this.polygon(c, '#818c94', [-33, -38, -20, -44, -12, -55, 0, -59, 12, -55, 22, -44, 33, -38, 19, -43, 8, -51, -8, -51, -19, -43]);
    this.polygon(c, '#a96563', [-14, -34, 14, -34, 10, -22, 0, -13, -10, -22], '#673f50');
  },

  stoneScreen(c) {
    this.ellipse(c, 0, 5, 35, 13, '#14212d');
    this.polygon(c, '#687c86', [-30, 5, -27, -26, 27, -26, 30, 5], '#3b4f5e');
    this.polygon(c, '#85969c', [-34, -26, -25, -31, -17, -39, 17, -39, 25, -31, 34, -26], '#405363');
    this.ellipse(c, 0, -12, 11, 10, '#4b606f');
    this.ellipse(c, 0, -12, 8, 7, '#8a8f92');
    this.polygon(c, '#b47475', [-6, -13, 0, -18, 6, -13, 0, -7]);
  },

  puddle(c) {
    this.ellipse(c, 0, 4, 30, 11, '#435965');
    this.ellipse(c, -3, 3, 22, 7, '#607782');
    this.ellipse(c, 4, 3, 12, 1.4, '#8fa4a8');
  },

  snowDrift(c) {
    this.ellipse(c, 0, 3, 34, 13, '#839a9d');
    this.polygon(c, '#bbd0cb', [-31, 4, -21, -5, -8, -7, 5, -13, 19, -9, 31, 1, 17, 7, -3, 6, -19, 9]);
    this.polygon(c, '#d4ded4', [-24, 1, -7, -7, 5, -12, 19, -8, 24, -4, 9, -6, 0, -3, -10, -4]);
  },

  paperWard(c, ready) {
    this.ellipse(c, 0, 4, 23, 8, '#122a21');
    this.polygon(c, '#788a61', [-18, 8, -16, -36, -12, -36, -12, 8, 12, 8, 12, -36, 16, -36, 18, 8], '#404e43');
    this.polygon(c, '#aa986e', [-22, -32, 22, -32, 22, -28, -22, -28], '#655646');
    for (const [x, y] of [[-12, -22], [-3, -28], [7, -23]]) {
      this.polygon(c, ready ? '#efd18e' : '#8c816d', [x, y, x + 7, y - 1, x + 8, y + 16, x + 2, y + 15], '#79594d');
      c.fillStyle = ready ? '#a45553' : '#6d635e'; c.fillRect(x + 3, y + 3, 2, 9);
    }
  },

  warmingShrine(c, ready) {
    this.ellipse(c, 0, 5, 31, 11, '#48616a');
    this.polygon(c, '#768a8d', [-21, 4, -20, -23, -12, -34, 12, -34, 20, -23, 21, 4], '#536870');
    this.polygon(c, '#cbdad1', [-26, -21, -19, -28, -12, -40, 0, -43, 12, -40, 19, -29, 26, -21, 16, -24, 7, -31, -6, -31, -15, -25]);
    this.polygon(c, '#3d545c', [-12, -1, -12, -19, -6, -24, 6, -24, 12, -19, 12, -1]);
    if (ready) this.polygon(c, '#ffc082', [-7, -4, -8, -13, -4, -11, 0, -20, 2, -13, 5, -16, 8, -8, 5, -4]);
  },

  dawnAltar(c, ready) {
    this.ellipse(c, 0, 5, 26, 10, '#453e2d');
    this.polygon(c, '#97896a', [-23, 6, -17, -5, 17, -5, 23, 6, 10, 11, -11, 11], '#67644e');
    this.polygon(c, '#9f805a', [-17, -13, 17, -13, 14, -3, -14, -3], '#766549');
    this.ellipse(c, 0, -13, 17, 4, ready ? '#c5a477' : '#8f856a');
    if (ready) for (const x of [-8, 0, 8]) {
      c.fillStyle = '#a46454'; c.fillRect(x - 1, -30, 2, 17);
      this.ellipse(c, x, -30, 1.6, 1.2, '#f9ca7e');
    }
  },
};
