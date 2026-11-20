'use strict';
// 手持光源共用角色朝向、步伐和手部坐标；光锥贴图只生成一次。
const HandLight = {
  create(length, half, width, strength, color) {
    let sprite;
    return (ctx, p, { bob, aim }, x, y, lensX, lensY = 0) => {
      if (!sprite) {
        sprite = document.createElement('canvas');
        sprite.width = length; sprite.height = half * 2;
        const c = sprite.getContext('2d'), image = c.createImageData(length, half * 2);
        for (let px = 0; px < length; px++) {
          const spread = 3 + px * width, alpha = strength * (1 - px / length) ** 1.3;
          for (let py = Math.ceil(half - spread); py <= Math.floor(half + spread); py++) {
            const off = (py - half) / spread, i = (py * length + px) * 4;
            image.data[i] = color[0]; image.data[i + 1] = color[1]; image.data[i + 2] = color[2];
            image.data[i + 3] = 255 * alpha * (1 - off * off) ** 2;
          }
        }
        c.putImageData(image, 0, 0);
      }
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.translate(p.x, p.y + bob); ctx.scale(p.face, 1);
      ctx.translate(x, y); ctx.rotate(aim);
      ctx.drawImage(sprite, lensX, lensY - half);
      ctx.restore();
    };
  },
};
