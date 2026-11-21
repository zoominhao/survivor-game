'use strict';

const CoopSignalArt = {
  draw(ctx, g, camera, w, h, worldScale, pixelScale) {
    if (!g.signals?.some(signal => signal && signal.until > g.time)) return;
    const width = w / pixelScale, height = h / pixelScale, zoom = worldScale / pixelScale;
    ctx.save(); ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    ctx.font = '23px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const radius = 19;
    for (const member of g.players) {
      const signal = g.signals[member.slot];
      if (!signal || signal.until <= g.time) continue;
      const def = COOP_SIGNALS[signal.id];
      const rawX = width / 2 + (member.x - camera.x) * zoom;
      const rawY = height / 2 + (member.y - camera.y) * zoom - 58 * zoom;
      const x = U.clamp(rawX, radius + 10, width - radius - 10), y = U.clamp(rawY, 98, Math.max(98, height - 70));
      ctx.lineWidth = 1; ctx.strokeStyle = def.color; ctx.fillStyle = '#142521ed';
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.fillText(def.emoji, x, y + 0.5);
      if (x !== rawX || y !== rawY) {
        const a = Math.atan2(rawY - y, rawX - x), u = Math.cos(a), v = Math.sin(a);
        ctx.save(); ctx.translate(x + u * (radius + 2), y + v * (radius + 2)); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-2, -4); ctx.lineTo(-2, 4); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    ctx.restore();
  },
};
