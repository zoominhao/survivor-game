'use strict';

const CoopUI = {
  signalsOpen: false,

  initSignals(on) {
    on('btnSignal', () => this.toggleSignals());
    Object.values(COOP_SIGNALS).forEach((def, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = def.emoji;
      button.setAttribute('aria-label', def.label);
      button.setAttribute('aria-keyshortcuts', String(index + 1));
      button.addEventListener('click', () => this.chooseSignal(index));
      this.$('signalActions').appendChild(button);
    });
  },

  toggleSignals(fromShortcut = false) {
    if (this.signalsOpen) { this.closeSignals(true); return; }
    if (!Lan.running || Game.state !== 'playing' || this.overlayId) return;
    this.signalsOpen = true;
    this.signalReturnFocus = fromShortcut ? document.activeElement : this.$('btnSignal');
    this.setSignalWaiting(false);
    this.$('signalActions').classList.remove('hidden');
    this.$('btnSignal').setAttribute('aria-expanded', 'true');
    this.$('signalActions').firstElementChild.focus({ preventScroll: true });
  },

  closeSignals(restore = false) {
    if (!this.signalsOpen) return;
    this.signalsOpen = false;
    this.$('signalActions').classList.add('hidden');
    this.setSignalWaiting(false);
    this.$('btnSignal').setAttribute('aria-expanded', 'false');
    const focus = this.signalReturnFocus;
    this.signalReturnFocus = null;
    if (restore && focus !== document.body) focus?.focus({ preventScroll: true });
  },

  chooseSignal(index) {
    const id = Object.keys(COOP_SIGNALS)[index];
    if (!this.signalsOpen || !id || this.overlayId) return;
    if (Lan.sendSignal(id)) this.closeSignals(true);
    else this.setSignalWaiting(true);
  },

  setSignalWaiting(waiting) {
    this.$('signalStatus').textContent = waiting ? '表情暂不可发，请稍等' : '';
    this.$('signalHourglass').classList.toggle('hidden', !waiting);
    this.$('signalSmile').classList.toggle('hidden', waiting);
  },

  updateCoopHud(g) {
    this.set('signalDock', 'hidden', !g.coop || g.state !== 'playing');
    this.set('btnSignal', 'hidden', !g.coop || g.state !== 'playing');
    if (!g.coop) return;
    const down = g.player.hp <= 0 || g.partner.hp <= 0;
    this.set('bondMark', 'hidden', !g.bond || down);
    if (g.bond && !down) {
      this.set('bondMark', 'text', g.bondActive ? `${g.bond.name} · ${g.bond.label}` : `${g.bond.name} · 靠近恢复`);
    }
    this.set('rescueMark', 'hidden', !g.rescue || !down);
    if (!g.rescue || !down) return;
    const text = g.rescue.used ? '救援已用 · 击败 Boss 可复起' : g.rescue.progress > 0 ?
      `扶救中 · ${g.rescue.progress.toFixed(1)} / ${RESCUE_SECONDS} 秒` :
      g.player.hp <= 0 ? '倒下 · 队友靠近可扶救' : '靠近倒下的队友，站稳 2 秒';
    this.set('rescueMark', 'text', text);
  },
};
