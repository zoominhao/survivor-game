'use strict';

const LanUI = {
  initLan(on) {
    on('btnLan', () => Lan.open());
    on('btnLanHost', () => Lan.select('host'));
    on('btnLanJoin', () => Lan.select('guest'));
    on('btnLanAccept', () => Lan.accept(this.$('lanIn').value));
    on('btnLanCopy', () => this.copyLanCode());
    on('btnLanStart', () => Lan.start());
    on('btnLanBack', () => Lan.leave());
    on('btnLanLeave', () => Lan.leave());
    this.$('lanIn').addEventListener('input', () => this.refreshLan());
  },

  refreshLan() {
    const phase = Lan.phase;
    const show = (id, visible) => this.$(id).classList.toggle('hidden', !visible);
    this.$('lanStatus').textContent = Lan.status;
    show('lanModes', phase === 'pick');
    const canAccept = phase === 'answer-in' || phase === 'offer-in';
    show('lanOutBox', !!Lan.out && ['answer-in', 'answer-busy', 'answer-out'].includes(phase));
    show('lanInBox', canAccept);
    this.$('lanInLabel').textContent = Lan.role === 'host' ? '粘贴队友的应答码' : '粘贴房主的邀请码';
    this.$('lanOutLabel').textContent = Lan.role === 'host' ? '发给队友的邀请码' : '回传房主的应答码';
    const output = this.$('lanOut');
    if (output.value !== Lan.out) output.value = Lan.out;
    this.$('btnLanAccept').disabled = !canAccept || !this.$('lanIn').value.trim();
    const start = phase === 'connected' && Lan.role === 'host';
    show('btnLanStart', start);
    this.$('btnLanStart').disabled = !start || !Lan.otherChar;
    if (!this.$('lan').contains(document.activeElement) || !document.activeElement.getClientRects().length || document.activeElement.disabled) {
      (start && Lan.otherChar ? this.$('btnLanStart') : this.$('lanTitle')).focus({ preventScroll: true });
    }
  },

  async copyLanCode() {
    const field = this.$('lanOut');
    if (!field.value) return;
    try {
      await navigator.clipboard.writeText(field.value);
      if (this.overlayId === 'lan' && !field.closest('.hidden')) Lan.statusText('连接码已复制，可以发给队友。');
    } catch {
      if (this.overlayId !== 'lan' || field.closest('.hidden')) return;
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
