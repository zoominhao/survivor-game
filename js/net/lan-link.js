'use strict';

// 手动交换信令；只用本地 ICE 候选，不请求 STUN、TURN 或信令服务。
const LAN_CODE_PREFIX = 'NW1-';
const LAN_CODE_LIMIT = 24000;
const LAN_PACKET_PART = 8000;
const LAN_PACKET_PARTS = 24;

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

function lanDescription(code, type) {
  const text = code.trim();
  if (text.length > LAN_CODE_LIMIT || !/^NW1-[A-Za-z0-9+/]+={0,2}$/.test(text)) throw new Error('连接码不完整或版本不同。');
  let d;
  try { d = JSON.parse(atob(text.slice(LAN_CODE_PREFIX.length))); } catch { throw new Error('连接码格式不对。'); }
  if (d?.type !== type || typeof d.sdp !== 'string' || !d.sdp.startsWith('v=0\r\n')) {
    throw new Error(type === 'offer' ? '请粘贴房主的邀请码。' : '请粘贴队友生成的应答码。');
  }
  const lines = d.sdp.split('\r\n'), media = lines.filter(s => s.startsWith('m='));
  if (media.length !== 1 || !/^m=application \d+ UDP\/DTLS\/SCTP webrtc-datachannel$/.test(media[0]) ||
      /[\0\r\n]/.test(lines.join('')) || !lines.some(s => s.startsWith('a=candidate:') && localLanCandidate(s))) {
    throw new Error('连接码没有可用的局域网地址。');
  }
  return { type, sdp: lines.filter(s => !s.startsWith('a=candidate:') || localLanCandidate(s)).join('\r\n') };
}

function waitForLanCandidates(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = error => {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', changed);
      if (error) reject(error); else resolve();
    };
    const changed = () => { if (pc.iceGatheringState === 'complete') done(); };
    const timer = setTimeout(() => done(new Error('收集局域网地址超时，请确认已连接 Wi-Fi 后重试。')), 7000);
    pc.addEventListener('icegatheringstatechange', changed);
  });
}

class LanLink {
  constructor(host, hooks) {
    this.hooks = hooks;
    this.host = host;
    this.pc = new RTCPeerConnection({ iceServers: [] });
    this.pc.onconnectionstatechange = () => this.connectionChanged();
    this.pc.oniceconnectionstatechange = () => this.connectionChanged();
    if (host) this.useChannel(this.pc.createDataChannel('nightwatch-v1'));
    else this.pc.ondatachannel = e => this.useChannel(e.channel);
  }

  useChannel(dc) {
    if (this.dc || dc.label !== 'nightwatch-v1' || !dc.ordered || dc.maxRetransmits !== null || dc.maxPacketLifeTime !== null) {
      dc.close(); return;
    }
    this.dc = dc;
    dc.onopen = () => { clearTimeout(this.connectTimer); this.hooks.open(); };
    dc.onclose = () => this.lost();
    dc.onerror = () => this.lost();
    dc.onmessage = e => this.receive(e.data);
  }

  async code(type, offer = '') {
    if (type === 'answer') await this.pc.setRemoteDescription(lanDescription(offer, 'offer'));
    const d = await (type === 'offer' ? this.pc.createOffer() : this.pc.createAnswer());
    await this.pc.setLocalDescription(d);
    await waitForLanCandidates(this.pc);
    const sdp = this.pc.localDescription.sdp.split('\r\n')
      .filter(s => !s.startsWith('a=candidate:') || localLanCandidate(s)).join('\r\n');
    if (!sdp.includes('\r\na=candidate:')) throw new Error('未找到可用地址，请确认已连 Wi-Fi 并允许浏览器访问本地网络。');
    const code = LAN_CODE_PREFIX + btoa(JSON.stringify({ type, sdp }));
    if (code.length > LAN_CODE_LIMIT) throw new Error('本机网络接口过多，连接码过长。');
    return code;
  }

  async accept(answer) {
    await this.pc.setRemoteDescription(lanDescription(answer, 'answer'));
    if (!this.closed && this.dc?.readyState !== 'open') this.connectTimer = setTimeout(() => this.lost(), 20000);
  }

  get writable() { return this.dc?.readyState === 'open' && this.dc.bufferedAmount < 32000; }

  send(message, reliableControl = false) {
    if (!this.writable && (!reliableControl || this.dc?.readyState !== 'open' || this.dc.bufferedAmount > 256000)) return false;
    const text = JSON.stringify(message), total = Math.ceil(text.length / LAN_PACKET_PART);
    if (total > LAN_PACKET_PARTS) return false;
    try {
      for (let i = 0; i < total; i++) this.dc.send(`${i}/${total}:${text.slice(i * LAN_PACKET_PART, (i + 1) * LAN_PACKET_PART)}`);
      return true;
    } catch { this.lost(); return false; }
  }

  receive(text) {
    if (typeof text !== 'string' || text.length > LAN_PACKET_PART + 8) return;
    const header = /^(\d{1,2})\/(\d{1,2}):/.exec(text);
    if (!header) return;
    const i = +header[1], n = +header[2];
    if (n < 1 || n > LAN_PACKET_PARTS || i >= n) { this.parts = null; return; }
    if (!i) this.parts = { n, data: [] };
    const parts = this.parts;
    if (!parts || parts.n !== n || parts.data.length !== i) { this.parts = null; return; }
    parts.data.push(text.slice(header[0].length));
    if (i + 1 !== n) return;
    this.parts = null;
    let value;
    try { value = JSON.parse(parts.data.join('')); } catch { return; }
    if (value && typeof value === 'object' && !Array.isArray(value)) this.hooks.message(value);
  }

  connectionChanged() {
    clearTimeout(this.disconnectTimer);
    const states = [this.pc.connectionState, this.pc.iceConnectionState];
    if (states.includes('disconnected')) this.disconnectTimer = setTimeout(() => this.lost(), 6000);
    if (states.includes('failed') || states.includes('closed')) this.lost();
  }

  lost() { if (!this.closed) this.hooks.lost(); }

  close() {
    this.closed = true;
    clearTimeout(this.disconnectTimer);
    clearTimeout(this.connectTimer);
    this.dc?.close();
    this.pc.close();
  }
}
