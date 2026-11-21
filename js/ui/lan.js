'use strict';

const LanUI = {
  ...LanQrUI,
  initLan(on) {
    on('btnLan', () => Lan.open());
    on('btnLanHost', () => Lan.select('host'));
    on('btnLanJoin', () => Lan.select('guest'));
    on('btnLanAccept', () => Lan.accept(this.$('lanIn').value));
    on('btnLanCopy', () => this.copyLanCode());
    on('btnLanCopyLink', () => this.copyLanCode(true));
    on('btnLanLegacy', () => Lan.useLegacyCode());
    on('btnLanReady', () => Lan.toggleReady());
    on('btnLanStart', () => Lan.start());
    on('btnLanBot', () => Lan.startBot());
    on('btnLanBack', () => Lan.leave());
    on('btnLanLeave', () => Lan.leave());
    this.$('lanIn').addEventListener('input', () => this.refreshLan());
    this.initLanQr(on);
  },

  refreshLan() {
    const phase = Lan.phase;
    const show = (id, visible) => this.$(id).classList.toggle('hidden', !visible);
    this.$('lanStatus').textContent = Lan.status;
    show('lanModes', phase === 'pick');
    const canAccept = phase === 'answer-in' || phase === 'offer-in';
    const hostOffer = Lan.role === 'host' && phase === 'answer-in';
    const showOut = !!Lan.out && ['answer-in', 'answer-busy', 'answer-out'].includes(phase);
    show('lanOutBox', showOut);
    show('lanInBox', canAccept);
    show('lanManual', showOut || canAccept);
    this.refreshLanQr(showOut, canAccept);
    show('lanCountdown', !!Lan.fallbackAt);
    show('btnLanCopyLink', hostOffer && /^https?:$/.test(location.protocol));
    show('btnLanLegacy', hostOffer && !LEGACY_LAN_CODE.test(Lan.out));
    show('btnLanBot', !Lan.otherChar && !(Lan.role === 'guest' && phase === 'connected'));
    this.$('lanInLabel').textContent = Lan.role === 'host' ? '② 粘贴队友的应答码' : '① 粘贴邀请码或邀请链接';
    this.$('lanOutLabel').textContent = Lan.role === 'host' ? '① 复制邀请码发给队友' : '② 复制应答码发回房主';
    this.$('btnLanCopy').setAttribute('aria-label', Lan.role === 'host' ? '复制邀请码' : '复制应答码');
    const output = this.$('lanOut');
    if (output.value !== Lan.out) output.value = Lan.out;
    const hasInput = canAccept && !!this.$('lanIn').value.trim();
    show('btnLanAccept', hasInput);
    this.$('btnLanAccept').disabled = !hasInput;
    this.$('btnLanAccept').textContent = Lan.role === 'host' ? '连接' : '生成应答二维码';
    const inRoom = phase === 'connected' && !!Lan.otherChar;
    const host = Lan.role === 'host', start = this.$('btnLanStart'), ready = this.$('btnLanReady');
    show('lanRoom', inRoom);
    const bond = inRoom ? CoopBonds.forPair(Lan.char, Lan.otherChar) : null;
    this.$('lanBond').textContent = bond ? `合契：${bond.name} · ${bond.label}（靠近时生效）` :
      `你的定位：${CoopBonds.roleName(Lan.char)} · 结伴靠近可获得合契，双人怪潮更强。`;
    show('btnLanStart', inRoom && host);
    show('btnLanReady', inRoom && !host);
    start.disabled = !inRoom || !host || !Lan.guestReady;
    ready.disabled = !inRoom || host || Lan.readyPending;
    ready.textContent = Lan.guestReady ? '取消准备' : '准备';
    ready.setAttribute('aria-pressed', String(Lan.guestReady));
    if (inRoom) {
      const member = id => `${CHARS[id].name} · ${CoopBonds.roleName(id)}`;
      this.$('lanRoomHost').textContent = member(host ? Lan.char : Lan.otherChar);
      this.$('lanRoomGuest').textContent = member(host ? Lan.otherChar : Lan.char);
      this.$('lanRoomReady').textContent = Lan.guestReady ? '已准备' : '未准备';
      this.$('lanRoomReady').dataset.ready = String(Lan.guestReady);
    }
    if (!this.$('lan').contains(document.activeElement) || !document.activeElement.getClientRects().length || document.activeElement.disabled) {
      (!start.disabled ? start : !ready.disabled ? ready : this.$('lanTitle')).focus({ preventScroll: true });
    }
  },

  updateLanCountdown(seconds) {
    const text = `${seconds} 秒内没有好友入房，将由机器人补位。`;
    if (this.$('lanCountdown').textContent !== text) this.$('lanCountdown').textContent = text;
  },

  async copyLanCode(asLink = false) {
    const field = this.$('lanOut');
    if (!field.value) return;
    let payload = field.value;
    if (asLink) {
      if (!/^https?:$/.test(location.protocol) || Lan.role !== 'host') return;
      payload = LanQr.payload(payload, location.href, true);
    }
    try {
      await navigator.clipboard.writeText(payload);
      if (this.overlayId === 'lan' && !field.closest('.hidden')) Lan.statusText(asLink ? '邀请链接已复制，队友打开就能填好码。' : '已复制，可以发给队友。');
    } catch {
      if (this.overlayId !== 'lan' || field.closest('.hidden')) return;
      this.$('lanManual').open = true;
      field.focus(); field.select();
      Lan.statusText('已选中连接码，请手动复制。');
    }
  },

  showLanWait(title, note) {
    this.$('lanWaitTitle').textContent = title;
    this.$('lanWaitNote').textContent = note;
    this.show('lanWait');
  },
};
