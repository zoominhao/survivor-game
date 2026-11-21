'use strict';

const ContractUI = {
  refreshContractMenu() {
    const id = Save.data.selectedContract;
    this.$('contractMenuState').textContent = id ? `本局：${CONTRACTS[id].name}` : '未接委托，可直接开局';
  },

  showContracts() {
    const list = this.$('contractList'), data = Save.data;
    list.replaceChildren();
    for (const [id, def] of Object.entries(CONTRACTS)) {
      const picked = data.selectedContract === id, claimed = !contractAvailable(data, id);
      const { button, info } = this.growthRow(list, id, def.icon, def.name, def.desc);
      const rewards = document.createElement('small');
      rewards.className = 'contract-reward';
      rewards.textContent = `奖励 ${def.coins} 金币 · ${def.seals} 枚守夜印`;
      info.appendChild(rewards);
      button.disabled = picked || claimed;
      button.textContent = claimed ? '已结算' : picked ? '已接' : '接下';
      button.setAttribute('aria-label', `${button.textContent}「${def.name}」`);
      button.addEventListener('click', () => this.selectContract(id));
    }
    this.$('btnClearContract').disabled = !data.selectedContract;
    this.show('contracts');
  },

  selectContract(id) {
    if (!Save.selectContract(id)) return;
    Sfx.play('click');
    this.showMenu();
  },

  updateContractHud(g) {
    const c = g.contract;
    this.set('contractHud', 'hidden', !c);
    if (!c) return;
    const name = CONTRACTS[c.id].name;
    this.set('contractHud', 'text', g.assisted ? '委托 · 练习不计' :
      c.done ? `委托完成 · ${name}` : `${name} · ${contractProgress(c)}`);
  },

  showContractResult(result) {
    const summary = this.$('resContract'), c = result.contract;
    summary.classList.toggle('hidden', !c);
    if (!c) return;
    const name = CONTRACTS[c.id].name;
    const details = result.assisted ? '练习局不发委托奖励' :
      c.coins || c.seals ? `额外 +${c.coins} 金币 · +${c.seals} 枚守夜印` :
      c.done ? '奖励已领取过' : `未完成（${contractProgress(c)}），下局可继续挑战`;
    summary.textContent = `${name} · ${details}`;
  },
};
