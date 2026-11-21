'use strict';

// 手动交换信令；只用本地 ICE 候选，不请求 STUN、TURN 或信令服务。
const LAN_PACKET_PART = 8000;
const LAN_PACKET_PARTS = 24;

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
    const input = type === 'answer' ? normalizeLanCode(offer) : '';
    if (type === 'answer') await this.pc.setRemoteDescription(await decodeLanCode(input, 'offer'));
    const d = await (type === 'offer' ? this.pc.createOffer() : this.pc.createAnswer());
    await this.pc.setLocalDescription(d);
    await waitForLanCandidates(this.pc);
    return this.localCode(type, LEGACY_LAN_CODE.test(input));
  }

  localCode(type, legacy = false) {
    const sdp = this.pc.localDescription.sdp.split('\r\n')
      .filter(s => !s.startsWith('a=candidate:') || localLanCandidate(s)).join('\r\n');
    if (!sdp.includes('\r\na=candidate:')) throw new Error('未找到可用地址，请确认已连 Wi-Fi 并允许浏览器访问本地网络。');
    return encodeLanCode(type, sdp, legacy);
  }

  async accept(answer) {
    await this.pc.setRemoteDescription(await decodeLanCode(answer, 'answer'));
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
