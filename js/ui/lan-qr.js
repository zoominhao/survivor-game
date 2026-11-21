'use strict';

const LanQrUI = {
  qrEpoch: 0,

  initLanQr(on) {
    on('btnLanScan', () => this.toggleLanCamera());
    const file = this.$('lanQrFile');
    on('btnLanImage', () => file.click());
    file.addEventListener('change', () => {
      const selected = file.files[0];
      file.value = '';
      if (selected) this.readLanImage(selected);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stopLanScan(); });
  },

  refreshLanQr(showOut, canScan) {
    this.$('lanQrOut').classList.toggle('hidden', !showOut);
    this.$('lanQrIn').classList.toggle('hidden', !canScan);
    if (!canScan) this.stopLanScan();
    const host = Lan.role === 'host';
    this.$('btnLanScan').disabled = !navigator.mediaDevices?.getUserMedia;
    this.$('lanQrScanTitle').textContent = host ? '② 扫描好友的应答二维码' : '① 扫描房主的邀请二维码';
    if (!showOut) { this.qrPayload = null; return; }
    const payload = LanQr.payload(Lan.out, location.href, host);
    if (payload === this.qrPayload) return;
    this.qrPayload = payload;
    const canvas = this.$('lanQrCode');
    const drawn = LanQr.paint(canvas, payload);
    canvas.classList.toggle('hidden', !drawn);
    canvas.setAttribute('aria-label', host ? '邀请二维码' : '应答二维码');
    this.$('lanQrCaption').textContent = !drawn ? '连接码太长，请展开下方的备用长码。' : !host ?
      '② 请房主在原页面扫描这个应答二维码。' : /^https?:$/.test(location.protocol) ?
        '① 好友用手机相机扫码打开邀请，或在游戏里扫描。' : '① 好友在游戏里扫描这个邀请二维码。';
  },

  stopLanScan() {
    this.qrEpoch++;
    this.qrCamera = false;
    clearTimeout(this.qrTimer);
    const video = this.$('lanQrVideo');
    for (const track of video.srcObject?.getTracks() ?? []) track.stop();
    video.srcObject = null;
    video.classList.add('hidden');
    this.$('btnLanScan').textContent = '打开相机';
    this.$('lanQrStatus').textContent = '';
  },

  async toggleLanCamera() {
    if (this.qrCamera) { this.stopLanScan(); return; }
    this.stopLanScan();
    const session = this.qrEpoch, video = this.$('lanQrVideo');
    this.qrCamera = true;
    this.$('btnLanScan').textContent = '关闭相机';
    this.$('lanQrStatus').textContent = '正在打开相机…';
    try {
      const feed = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (session !== this.qrEpoch) { for (const track of feed.getTracks()) track.stop(); return; }
      video.srcObject = feed;
      video.classList.remove('hidden');
      await video.play();
      if (session !== this.qrEpoch) return;
      video.scrollIntoView({ block: 'nearest' });
      this.$('lanQrStatus').textContent = '把二维码放进画面。';
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const scan = () => {
        if (session !== this.qrEpoch) return;
        const text = LanQr.read(ctx, video, video.videoWidth, video.videoHeight);
        if (text) {
          if (this.acceptLanQr(text)) return;
          this.$('lanQrStatus').textContent = '这不是本步骤需要的二维码，请检查是否扫反。';
        }
        this.qrTimer = setTimeout(scan, 220);
      };
      scan();
    } catch {
      if (session !== this.qrEpoch) return;
      this.stopLanScan();
      this.$('lanQrStatus').textContent = '无法打开相机，可改用二维码图片或备用长码。';
    }
  },

  async readLanImage(file) {
    this.stopLanScan();
    if (file.size > 15 * 1024 * 1024) { this.$('lanQrStatus').textContent = '请选择 15 MB 以内的图片。'; return; }
    const session = this.qrEpoch, image = new Image(), url = URL.createObjectURL(file);
    this.$('lanQrStatus').textContent = '正在读取二维码图片…';
    try {
      image.src = url;
      await image.decode();
      if (session !== this.qrEpoch) return;
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const text = LanQr.read(ctx, image, image.naturalWidth, image.naturalHeight);
      if (text && this.acceptLanQr(text)) return;
    } catch { /* 损坏图片和无法识别的图片使用同一个提示。 */ }
    finally { URL.revokeObjectURL(url); }
    if (session === this.qrEpoch) this.$('lanQrStatus').textContent = '没找到本步骤需要的二维码，请确认邀请与应答没有扫反。';
  },

  acceptLanQr(text) {
    const type = Lan.phase === 'offer-in' ? 'offer' : Lan.phase === 'answer-in' ? 'answer' : null;
    const code = type && LanQr.scanned(text, type);
    if (!code) return false;
    this.stopLanScan();
    this.$('lanIn').value = code;
    Lan.accept(code);
    return true;
  },
};
