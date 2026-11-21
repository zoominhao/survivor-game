'use strict';

// 二维码只在本机编码和识别，不访问扫码内容中的网址。
const LanQr = {
  payload(code, href, offer) {
    const url = new URL(href);
    if (!offer || !/^https?:$/.test(url.protocol)) return code;
    url.hash = 'invite=' + encodeURIComponent(code);
    return url.href;
  },

  scanned(text, type) {
    try {
      const code = normalizeLanCode(text);
      if (LEGACY_LAN_CODE.test(code)) {
        lanDescription(code, type);
        return code;
      }
      return SHORT_LAN_CODE.exec(code)?.[1] === (type === 'offer' ? 'I' : 'A') ? code : null;
    } catch { return null; }
  },

  paint(canvas, text) {
    // 最大 QR 版本的字节容量；先用标准纠错，超出再试较低纠错。
    if (text.length > 2953 || /[^\x20-\x7e]/.test(text)) return false;
    let qr;
    for (const level of ['M', 'L']) {
      try {
        const next = qrcode(0, level);
        next.addData(text);
        next.make();
        qr = next;
        break;
      } catch { /* 连接参数较长时再试低纠错等级。 */ }
    }
    if (!qr) return false;
    const size = qr.getModuleCount(), cell = 4, border = 4;
    canvas.width = canvas.height = (size + border * 2) * cell;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (qr.isDark(y, x)) ctx.fillRect((x + border) * cell, (y + border) * cell, cell, cell);
    }
    return true;
  },

  read(ctx, source, width, height) {
    if (!width || !height) return null;
    const scale = Math.min(1, 1280 / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    if (ctx.canvas.width !== w || ctx.canvas.height !== h) {
      ctx.canvas.width = w; ctx.canvas.height = h;
    }
    ctx.drawImage(source, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h);
    return jsQR(pixels.data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null;
  },
};
