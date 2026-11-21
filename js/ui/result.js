'use strict';

const DAWN_DURATION = 3200;
const REWARD_LABELS = { loot: '本局余钱', time: '坚持时长', bosses: '击败 Boss', victory: '守到天明', contract: '守夜委托' };

const ResultUI = {
  presentResult(now = performance.now()) {
    const result = Game.result;
    if (!result || result === this.presentedResult) return;
    this.presentedResult = result;
    if (!result.win || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.showResult();
      return;
    }
    this.dawnEndsAt = now + DAWN_DURATION;
    this.$('dawnStage').textContent = STAGES[Game.stage].name;
    this.show('dawn');
  },

  tickDawn(now) {
    if (this.overlayId === 'dawn' && now >= this.dawnEndsAt) this.finishDawn();
  },

  finishDawn() {
    if (this.overlayId === 'dawn' && Game.result === this.presentedResult) this.showResult();
  },

  drawRewards(result) {
    const reward = result.rewards;
    this.$('resRewards').classList.toggle('hidden', !reward);
    this.$('resNoRewards').classList.toggle('hidden', !!reward);
    if (!reward) {
      this.$('resNoRewards').textContent = result.coop ? '双人战报不计入单人战绩，也不发放局外奖励。' : '练习局不计战绩，也不发放局外奖励。';
      return;
    }
    this.$('resCoinTotal').textContent = `+${result.earned}`;
    this.$('resSealCount').textContent = `+${result.earnedSeals}`;
    for (const [id, items] of [['resCoinBreakdown', reward.coins], ['resSealBreakdown', reward.seals]]) {
      const entries = Object.entries(items).filter(([, n]) => n > 0);
      const el = this.$(id);
      el.innerHTML = entries.map(([key, n]) => `<div><dt>${REWARD_LABELS[key]}</dt><dd>+${n}</dd></div>`).join('');
      el.classList.toggle('hidden', !entries.length);
    }
  },

  showResult() {
    const r = Game.result, p = Game.player, result = this.$('result');
    result.classList.toggle('win', r.win);
    this.$('resTitle').textContent = r.win ? '天亮了' : '长夜吞没了你';
    this.$('resStage').textContent = `${STAGES[Game.stage].name}${r.coop ? Game.robot ? ' · 机器人搭档' : ' · 双人' : r.assisted ? ' · 练习局' : ''}`;
    this.$('resSub').textContent = r.win ? '晨光越过山脊，长夜终于退去。' : '提灯熄灭了，但余烬仍在。';
    this.drawRewards(r);
    this.showContractResult(r);
    const stat = (icon, value, label) => `<div>${Icons.html(icon)}<b>${value}</b><small>${label}</small></div>`;
    this.$('resStats').innerHTML = stat('haste', U.fmtTime(r.time), `坚持时间${r.newBest ? ' · 新纪录' : ''}`) +
      stat('growth', r.level, '修为等级') + stat('kills', r.kills, r.coop ? '小队击杀' : '击杀') +
      stat('maskEcho', Number.isInteger(r.bosses) ? r.bosses : '—', '击败 Boss');
    const rows = Object.entries(p.dmgBy).filter(([, damage]) => damage > 0).sort((a, b) => b[1] - a[1]);
    const list = this.$('resDmg');
    this.$('resDamage').classList.toggle('hidden', !rows.length);
    list.innerHTML = rows.map(([id, v]) => {
      const d = WEAPONS[id] ?? PAPER_SKILLS[id];
      return `<li><span>${Icons.html(WEAPONS[id] ? id : d ? 'wardPaper' : 'lantern')} ${d ? d.name : '余烬'}</span><i><u style="width:${(v / rows[0][1] * 100).toFixed(1)}%"></u></i><em>${v}</em></li>`;
    }).join('');
    list.scrollTop = 0;
    this.$('btnRetry').textContent = r.coop ? '重新组队' : '再来一局';
    this.show('result');
    result.scrollTop = 0;
  },
};
