'use strict';

const COOP_SIGNALS = {
  follow: { label: '跟我来', emoji: '👋', color: '#bdebc8' },
  danger: { label: '小心', emoji: '😱', color: '#f3c492' },
  help: { label: '救我', emoji: '🙏', color: '#ffc2ba' },
  cheer: { label: '打得好', emoji: '👍', color: '#f5e2aa' },
};
const RESCUE_RADIUS = 44;
const RESCUE_SECONDS = 2;

const CoopSupport = {
  sendSignal(slot, id) {
    if (!this.coop || this.state !== 'playing' || (slot !== 0 && slot !== 1) ||
        typeof id !== 'string' || !Object.hasOwn(COOP_SIGNALS, id)) return false;
    if ((this.signals[slot]?.until ?? 0) > this.time) return false;
    this.signals[slot] = { id, until: this.time + 2.5 };
    return true;
  },

  interruptRescue(p) {
    if (!this.rescue || !this.players.some(other => other !== p && other.hp <= 0)) return;
    this.rescue.progress = 0;
    this.rescue.interruptedAt = this.time;
  },

  stepRescue(dt) {
    const rescue = this.rescue;
    if (!rescue || rescue.used) return;
    const down = this.players.find(p => p.hp <= 0);
    const helper = down && this.players.find(p => p !== down && p.hp > 0);
    if (!helper || helper.moving || Math.hypot(helper.x - down.x, helper.y - down.y) > RESCUE_RADIUS ||
        rescue.interruptedAt === this.time) { rescue.progress = 0; return; }
    rescue.progress += dt;
    if (rescue.progress + 1e-8 < RESCUE_SECONDS) return;
    rescue.used = true;
    rescue.progress = 0;
    down.hp = Math.ceil(down.st.maxHp * 0.25);
    down.iframe = 1.5;
    this.stepBond();
    this.burst(down.x, down.y, '#a9e8ad', 10);
    this.play('nightmareClear');
    this.emit('banner', `${down.slot + 1} 号守夜人被扶起`);
  },
};
