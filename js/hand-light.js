'use strict';
// 手持光源共用角色朝向、步伐和手部坐标；光锥贴图只生成一次。
const HandLight = {
  create(length, half, width, strength, color) {
    const sprites = new Map();
    return (ctx, p, { bob, aim }, x, y, lensX, lensY = 0, mask = false) => {
      let sprite = sprites.get(mask);
      if (!sprite) {
        sprite = document.createElement('canvas');
        sprite.width = length; sprite.height = half * 2;
        const c = sprite.getContext('2d'), image = c.createImageData(length, half * 2);
        for (let px = 0; px < length; px++) {
          const spread = 3 + px * width;
          const alpha = mask ? 0.98 * (1 - (px / length) ** 2.5) : strength * (1 - px / length) ** 1.3;
          for (let py = Math.ceil(half - spread); py <= Math.floor(half + spread); py++) {
            const off = (py - half) / spread, i = (py * length + px) * 4;
            image.data[i] = color[0]; image.data[i + 1] = color[1]; image.data[i + 2] = color[2];
            image.data[i + 3] = 255 * alpha * (1 - off * off) ** (mask ? 1.25 : 2);
          }
        }
        c.putImageData(image, 0, 0);
        sprites.set(mask, sprite);
      }
      ctx.save(); ctx.globalCompositeOperation = mask ? 'destination-out' : 'screen';
      ctx.translate(p.x, p.y + bob); ctx.scale(p.face, 1);
      ctx.translate(x, y); ctx.rotate(aim);
      ctx.drawImage(sprite, lensX, lensY - half);
      ctx.restore();
    };
  },
};
