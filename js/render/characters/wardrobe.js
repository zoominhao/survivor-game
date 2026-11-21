'use strict';
// 本局衣色随已完成的升级改变；场景外套独立叠穿，不进入存档也不影响属性。
const Wardrobe = {
  stage(level, pending = 0) {
    const equipped = level - pending;
    return OUTFIT_MILESTONES.filter(level => equipped >= level).length;
  },

  forPlayer(g, p, look, landscape) {
    return this.style(look, this.stage(p.level, p.outfitPending ?? g.pendingFor(p)), landscape);
  },

  coats: {
    lantern: ['#bd7850', '#d29b53', '#a34d3f', '#efc680'],
    girl: ['#f4eedc', '#ecb0bb', '#ada0d2', '#f3d9a0'],
    echo: ['#e9b340', '#70c2b6', '#c89369', '#e5d499'],
    xiaoxiao: ['#f9f6ee', '#f4b8a8', '#a94b57', '#f2cf8c'],
    zhu: ['#263443', '#456c83', '#497266', '#587580'],
    smith: ['#675042', '#926346', '#566378', '#a85e48'],
    astronomer: ['#615488', '#5973a5', '#8664a1', '#51649e'],
    ranger: ['#477864', '#68965a', '#986c50', '#426c87'],
  },

  field: {
    dusk: { layer: 'none' },
    night: { layer: 'moon', color: '#627a9f', edge: '#bdd8eb' },
    bamboo: { layer: 'wind', color: '#609366', edge: '#c6df9a' },
    rain: { layer: 'rain', color: '#3c6477', edge: '#a9deea' },
    snow: { layer: 'snow', color: '#879ea6', edge: '#ebf3e0' },
    dawn: { layer: 'dawn', color: '#bf7d4b', edge: '#ffe2a0' },
  },

  style(look, tier = 0, landscape = 'dusk') {
    const coats = this.coats[look] || this.coats.lantern;
    const { color, layer, edge } = this.field[landscape] || this.field.dusk;
    const trim = tier === 3 ? '#ffe1a2' : this.scarf[look]?.edge ?? '#f3cd8f';
    return { tier, main: coats[tier], trim, layer, weather: color, edge };
  },

  scarf: {
    echo: { base: '#398f82', edge: '#94d8b5' },
    girl: { base: '#bd657b', edge: '#ffc9ce' },
    xiaoxiao: { base: '#bc4652', edge: '#f3bb92' },
    zhu: { base: '#367b73', edge: '#a5e6ca' },
    lantern: { base: '#9d624b', edge: '#f3cd8f' },
    smith: { base: '#7d5443', edge: '#dfac86' },
    astronomer: { base: '#55668b', edge: '#c8d8ff' },
    ranger: { base: '#537a58', edge: '#bbe398' },
    cloak: { base: '#546c94', edge: '#b8cbe3' },
  },

  drawWeatherBack(ctx, style, sway) {
    const { layer, weather, edge } = style;
    if (layer === 'none') return;
    ctx.save(); ctx.fillStyle = weather; ctx.strokeStyle = edge; ctx.lineWidth = 0.85;
    ctx.beginPath(); ctx.moveTo(-5, -6); ctx.quadraticCurveTo(2, -9, 8, -5);
    if (layer === 'rain') {
      // 戴斗笠的角色也保留面部剪影，雨披从肩头垂下。
      ctx.lineTo(15, 9); ctx.lineTo(10, 15); ctx.lineTo(-14 + sway, 15); ctx.lineTo(-17 + sway, 8);
    } else if (layer === 'snow') {
      ctx.quadraticCurveTo(16, -3, 16, 9); ctx.quadraticCurveTo(0, 19, -17, 12);
      ctx.quadraticCurveTo(-18, -3, -5, -6);
    } else if (layer === 'wind') {
      ctx.quadraticCurveTo(-5, 8, -24, 12 + sway); ctx.lineTo(-20, 6 + sway); ctx.lineTo(-27, 7 + sway);
      ctx.quadraticCurveTo(-15, -2, -5, -6);
    } else if (layer === 'moon') {
      ctx.lineTo(12, 3); ctx.lineTo(11, 12); ctx.lineTo(-3, 9); ctx.lineTo(-17, 13); ctx.lineTo(-15, 0);
    } else {
      ctx.lineTo(10, 14); ctx.lineTo(0, 11); ctx.lineTo(-12 + sway, 17); ctx.lineTo(-11, 0);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  },

  drawWeatherFront(ctx, style) {
    const { layer, edge } = style;
    if (layer === 'none') return;
    ctx.save(); ctx.strokeStyle = edge; ctx.lineCap = 'round'; ctx.lineWidth = layer === 'snow' ? 2.8 : 1.45;
    ctx.beginPath();
    if (layer === 'snow') {
      // 两肩厚绒边，不盖手持物与头灯。
      ctx.moveTo(-13, 0); ctx.quadraticCurveTo(-11, -3, -7, -2);
      ctx.moveTo(8, -2); ctx.quadraticCurveTo(11, -3, 13, 0);
    } else if (layer === 'rain') {
      ctx.moveTo(-13, 7); ctx.lineTo(-9, 12); ctx.moveTo(-16, 5); ctx.lineTo(-13, 11);
    } else if (layer === 'wind') {
      ctx.moveTo(-11, 6); ctx.quadraticCurveTo(-8, 2, -4, 4); ctx.moveTo(-10, 8); ctx.lineTo(-6, 6);
    } else if (layer === 'moon') {
      ctx.arc(-9, 2.3, 2.7, 0.25, Math.PI * 1.42);
    } else {
      ctx.moveTo(-9, 7); ctx.lineTo(0, 9); ctx.lineTo(8, 5); ctx.moveTo(-3, 12); ctx.lineTo(4, 10);
    }
    ctx.stroke(); ctx.restore();
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
