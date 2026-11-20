'use strict';
// 本局外观随已完成的升级叠加，不进入存档，也不影响属性。
const Wardrobe = {
  stage(level, pending = 0) {
    const equipped = level - pending;
    return equipped >= 10 ? 3 : equipped >= 5 ? 2 : equipped >= 2 ? 1 : 0;
  },

  scarf: {
    echo: { base: '#398f82', edge: '#94d8b5' },
    girl: { base: '#bd657b', edge: '#ffc9ce' },
    xiaoxiao: { base: '#bc4652', edge: '#f3bb92' },
    cloak: { base: '#546c94', edge: '#b8cbe3' },
  },

  drawTrail(ctx, look, tier, time, stride) {
    if (tier < 2 || look === 'xiaoxiao') return; // 霄霄直接升级身上的红围巾。
    const cloth = this.scarf[look] || this.scarf.cloak;
    const swing = Math.sin(time * 6) * 2.1 + stride * 2.6;
    const tail = -24 - Math.abs(stride) * 4;
    ctx.save();
    ctx.fillStyle = cloth.base;
    ctx.strokeStyle = tier >= 3 ? '#f5d590' : cloth.edge;
    ctx.lineWidth = tier >= 3 ? 1.15 : 0.8;
    ctx.beginPath(); ctx.moveTo(-2, -4);
    ctx.bezierCurveTo(-12, -3, tail + 7, -7 + swing, tail, -2 + swing);
    ctx.lineTo(tail + 2, 4 + swing); ctx.lineTo(tail + 6, 1 + swing);
    ctx.bezierCurveTo(-13, 5, -11, 4, -2, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  },

  drawClasp(ctx, look, tier) {
    if (tier < 2 || look === 'xiaoxiao') return;
    const cloth = this.scarf[look] || this.scarf.cloak;
    ctx.save();
    ctx.translate(look === 'echo' ? -5 : -6, look === 'echo' ? 0 : -2.2);
    ctx.rotate(-0.35);
    ctx.fillStyle = cloth.base;
    ctx.strokeStyle = tier >= 3 ? '#f5d590' : cloth.edge;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.roundRect(-3.2, -1.4, 6.4, 2.8, 1.15); ctx.fill(); ctx.stroke();
    ctx.restore();
  },

  drawFlower(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#f7aebc';
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 1.55, y + Math.sin(a) * 1.55, 1.3, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#fff2a6';
    ctx.beginPath(); ctx.arc(x, y, 0.95, 0, TAU); ctx.fill();
    ctx.restore();
  },

  drawSeal(ctx, x, y, look, time) {
    const cloth = this.scarf[look] || this.scarf.cloak;
    ctx.save();
    ctx.translate(x, y + 12);
    ctx.strokeStyle = '#f6d89988'; ctx.lineWidth = 1.15;
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 12, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#f6d89948';
    ctx.beginPath(); ctx.ellipse(0, 0, 25, 9, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = cloth.edge;
    for (let i = 0; i < 4; i++) {
      const a = time * 1.05 + i * TAU / 4;
      const px = Math.cos(a) * 30, py = Math.sin(a) * 12;
      ctx.beginPath(); ctx.moveTo(px, py - 2.7); ctx.lineTo(px + 2.5, py);
      ctx.lineTo(px, py + 2.1); ctx.lineTo(px - 2.5, py); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },
};
