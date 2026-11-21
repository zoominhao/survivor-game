'use strict';

const LanUI = {
  ...LanQrUI,
  initLan(on) {
    on('btnLan', () => Lan.open());
    on('btnLanHost', () => Lan.select('host'));
    on('btnLanJoin', () => Lan.select('guest'));
    on('btnLanAccept', () => Lan.accept(Lan.inviteCode));
    on('btnLanLegacy', () => Lan.useLegacyCode());
    on('btnLanReady', () => Lan.toggleReady());
    on('btnLanStart', () => Lan.start());
    on('btnLanBot', () => Lan.startBot());
    on('btnLanBack', () => Lan.leave());
    on('btnLanLeave', () => {
      if (this.overlayId !== 'lanWait' || !Lan.running) return;
      this.show('lanLeaveConfirm');
      this.$('btnLanStay').focus({ preventScroll: true });
    });
    on('btnLanStay', () => this.cancelLanLeave());
    on('btnLanConfirmLeave', () => {
      if (this.overlayId === 'lanLeaveConfirm' && Lan.running) Lan.leave();
    });
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
    this.refreshLanQr(showOut, canAccept);
    show('lanCountdown', !!Lan.fallbackAt);
    show('btnLanLegacy', hostOffer && !LEGACY_LAN_CODE.test(Lan.out));
    show('btnLanBot', !Lan.otherChar && !(Lan.role === 'guest' && phase === 'connected'));
    const invited = phase === 'offer-in' && !!Lan.inviteCode;
    show('btnLanAccept', invited);
    this.$('btnLanAccept').disabled = !invited;
    const inRoom = phase === 'connected' && !!Lan.otherChar;
    const host = Lan.role === 'host', start = this.$('btnLanStart'), ready = this.$('btnLanReady');
    show('lanRoom', inRoom);
    const bond = inRoom ? CoopBonds.forPair(Lan.char, Lan.otherChar) : null;
    const link = inRoom ? CoopBonds.linkFor(Lan.char, Lan.otherChar) : null;
    this.$('lanBond').textContent = bond ? `合契：${bond.name} · ${bond.label}（靠近时生效）${link ? `；${link.name}：${link.label}。` : ''}` :
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

  showLanWait(title, note) {
    this.$('lanWaitTitle').textContent = title;
    this.$('lanWaitNote').textContent = note;
    this.show('lanWait');
  },

  cancelLanLeave() {
    if (this.overlayId !== 'lanLeaveConfirm') return;
    this.show('lanWait');
    this.$('btnLanLeave').focus({ preventScroll: true });
  },
};
