'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { loadGame } = require('./fixtures/load-game');

const scope = vm.createContext({ btoa, atob, URL, TextEncoder, TextDecoder, CompressionStream, DecompressionStream, Blob });
loadGame(scope, path => path.startsWith('js/vendor/') || /\/lan-(qr|code)\.js$/.test(path) && path.startsWith('js/net/'));
const { LanQr, encodeLanCode, decodeLanCode } = vm.runInContext('({ LanQr, encodeLanCode, decodeLanCode })', scope);

function pixelCanvas() {
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  let pixels;
  const ctx = {
    canvas,
    fillRect(x, y, w, h) {
      pixels ??= new Uint8ClampedArray(canvas.width * canvas.height * 4);
      for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
        const i = (row * canvas.width + col) * 4;
        pixels.fill(this.fillStyle === '#000' ? 0 : 255, i, i + 3);
        pixels[i + 3] = 255;
      }
    },
    drawImage() {},
    getImageData: () => ({ data: pixels }),
  };
  return canvas;
}

const sdp = 'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' +
  'a=candidate:1 1 UDP 123 192.168.1.25 34567 typ host\r\na=ice-ufrag:local\r\n';

test('邀请和应答二维码从像素识别后可无损恢复连接信息，不能扫反', async () => {
  for (const type of ['offer', 'answer']) {
    for (const legacy of [false, true]) {
      const code = await encodeLanCode(type, sdp, legacy);
      const payload = LanQr.payload(code, 'https://example.test/survivor-game/', type === 'offer');
      const canvas = pixelCanvas();
      assert.equal(LanQr.paint(canvas, payload), true);
      const decoded = LanQr.read(canvas.getContext(), canvas, canvas.width, canvas.height);
      assert.equal(decoded, payload);
      const restored = LanQr.scanned(decoded, type);
      assert.equal(restored, code);
      assert.equal((await decodeLanCode(restored, type)).sdp, sdp);
      assert.equal(LanQr.scanned(decoded, type === 'offer' ? 'answer' : 'offer'), null);
    }
  }
});

test('本地文件用原始邀请，普通 URL 和超长文本不会被当作连接码', () => {
  assert.equal(LanQr.payload('I2-test', 'file:///game/index.html', true), 'I2-test');
  assert.equal(LanQr.scanned('https://example.test/', 'offer'), null);
  assert.equal(LanQr.scanned('javascript:alert(1)', 'answer'), null);
  assert.equal(LanQr.paint(pixelCanvas(), 'A2-' + 'a'.repeat(3000)), false);
});
