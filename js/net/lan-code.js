'use strict';

const LAN_CODE_LIMIT = 24000;
const LAN_SDP_LIMIT = 18000;
const LEGACY_LAN_CODE = /^NW1-[A-Za-z0-9+/]+={0,2}$/;
const SHORT_LAN_CODE = /^([IA])2-([A-Za-z0-9_-]+)$/;

function localLanCandidate(line) {
  const fields = line.split(/\s+/), address = fields[4] || '';
  if (fields[6] !== 'typ' || fields[7] !== 'host') return false;
  if (/^[a-z0-9-]{1,63}\.local$/i.test(address)) return true;
  if (/^(?:fe[89ab][0-9a-f]:|f[cd][0-9a-f]{2}:|::1$)/i.test(address)) return /^[0-9a-f:]+$/i.test(address);
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return false;
  const [a, b, c, d] = address.split('.').map(Number);
  return Math.max(a, b, c, d) < 256 && (a === 10 || a === 127 || (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254));
}

function lanSdp(type, sdp) {
  const lines = typeof sdp === 'string' && sdp.length <= LAN_SDP_LIMIT ? sdp.split('\r\n') : [];
  const media = lines.filter(s => s.startsWith('m='));
  if (lines[0] !== 'v=0' || media.length !== 1 || !/^m=application \d+ UDP\/DTLS\/SCTP webrtc-datachannel$/.test(media[0]) ||
      /[\0\r\n]/.test(lines.join('')) || !lines.some(s => s.startsWith('a=candidate:') && localLanCandidate(s))) {
    throw new Error('连接码没有可用的局域网地址。');
  }
  return { type, sdp: lines.filter(s => !s.startsWith('a=candidate:') || localLanCandidate(s)).join('\r\n') };
}

function lanWrongCode(type) {
  return new Error(type === 'offer' ? '请扫描房主的邀请二维码。' : '请扫描队友的应答二维码。');
}

// 兼容旧编码和没有压缩 API 的浏览器。
function lanDescription(code, type) {
  const text = code.trim();
  if (text.length > LAN_CODE_LIMIT || !LEGACY_LAN_CODE.test(text)) throw new Error('连接码不完整或版本不同。');
  let data;
  try { data = JSON.parse(atob(text.slice(4))); } catch { throw new Error('连接码格式不对。'); }
  if (data?.type !== type) throw lanWrongCode(type);
  return lanSdp(type, data.sdp);
}

function lanInviteFromHash(hash) {
  if (!hash.startsWith('#invite=') || hash.length > LAN_CODE_LIMIT) return null;
  try {
    const code = decodeURIComponent(hash.slice(8));
    return /^I2-[A-Za-z0-9_-]+$/.test(code) || LEGACY_LAN_CODE.test(code) ? code : null;
  } catch { return null; }
}

// 连接数据只在本地读取，不会向二维码里的网址发请求。
function normalizeLanCode(input) {
  if (typeof input !== 'string' || input.length > LAN_CODE_LIMIT) throw new Error('连接码太长或不完整。');
  const text = input.trim();
  if (/^https?:\/\//i.test(text)) {
    try { return lanInviteFromHash(new URL(text).hash) || ''; } catch { return ''; }
  }
  return text.replace(/\s+/g, '');
}

async function runLanCodec(bytes, codec) {
  const reader = new Blob([bytes]).stream().pipeThrough(codec).getReader();
  const result = new Uint8Array(LAN_SDP_LIMIT);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return result.subarray(0, length);
      if (length + value.length > result.length) {
        await reader.cancel();
        throw new Error('连接数据过长。');
      }
      result.set(value, length);
      length += value.length;
    }
  } finally { reader.releaseLock(); }
}

async function encodeLanCode(type, sdp, legacy = false) {
  if (sdp.length > LAN_SDP_LIMIT) throw new Error('本机网络接口过多，连接码过长。');
  if (!legacy && typeof CompressionStream === 'function' && typeof DecompressionStream === 'function') {
    const bytes = new TextEncoder().encode(sdp);
    const packed = await runLanCodec(bytes, new CompressionStream('deflate'));
    const text = btoa(String.fromCharCode(...packed)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
    if (text.length < sdp.length) return `${type === 'offer' ? 'I' : 'A'}2-${text}`;
  }
  const code = 'NW1-' + btoa(JSON.stringify({ type, sdp }));
  if (code.length > LAN_CODE_LIMIT) throw new Error('本机网络接口过多，连接码过长。');
  return code;
}

async function decodeLanCode(input, type) {
  const text = normalizeLanCode(input), packed = SHORT_LAN_CODE.exec(text);
  if (!packed) return lanDescription(text, type);
  if (packed[1] !== (type === 'offer' ? 'I' : 'A')) throw lanWrongCode(type);
  if (typeof DecompressionStream !== 'function') throw new Error('浏览器不支持压缩，请让房主改用兼容二维码或更新浏览器。');
  let sdp;
  try {
    const bytes = Uint8Array.from(atob(packed[2].replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
    sdp = new TextDecoder('utf-8', { fatal: true }).decode(await runLanCodec(bytes, new DecompressionStream('deflate')));
  } catch { throw new Error('连接码已损坏或不完整，请重新复制完整的码。'); }
  return lanSdp(type, sdp);
}
