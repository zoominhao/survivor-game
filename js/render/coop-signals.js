'use strict';

const CoopSignalArt = {
  draw(ctx, g, camera, w, h, worldScale, pixelScale) {
    if (!g.signals?.some(signal => signal && signal.until > g.time)) return;
    const width = w / pixelScale, height = h / pixelScale, zoom = worldScale / pixelScale;
    ctx.save(); ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const member of g.players) {
      const signal = g.signals[member.slot];
      if (!signal || signal.until <= g.time) continue;
      const def = COOP_SIGNALS[signal.id], label = `${def.glyph} ${def.label}`;
      const half = ctx.measureText(label).width / 2 + 9;
      const rawX = width / 2 + (member.x - camera.x) * zoom;
      const rawY = height / 2 + (member.y - camera.y) * zoom - 58 * zoom;
      const x = U.clamp(rawX, half + 10, width - half - 10), y = U.clamp(rawY, 98, Math.max(98, height - 58));
      ctx.lineWidth = 1; ctx.strokeStyle = def.color; ctx.fillStyle = '#142521ed';
      ctx.beginPath(); ctx.roundRect(x - half, y - 11, half * 2, 22, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.fillText(label, x, y + 0.5);
      if (x !== rawX || y !== rawY) {
        const a = Math.atan2(rawY - y, rawX - x), u = Math.cos(a), v = Math.sin(a);
        ctx.save(); ctx.translate(x + u * (half + 3), y + v * 13); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-2, -4); ctx.lineTo(-2, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    ctx.restore();
  },
};
