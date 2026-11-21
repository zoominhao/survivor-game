'use strict';

const ContractUI = {
  refreshContractMenu() {
    const id = Save.data.selectedContract;
    const def = CONTRACTS[id];
    const stage = def?.stage;
    this.$('contractMenuState').textContent = def ? `委托：${def.name}${stage && !Environment.stagePool(Save.data).includes(stage) ? '（待启用场景）' : ''}` : '未接委托';
    this.$('btnContracts').dataset.picked = String(!!id);
  },

  showContracts(group = 'all') {
    const list = this.$('contractList'), data = Save.data;
    const entries = Object.entries(CONTRACTS);
    for (const [value, id] of [['all', 'btnContractAll'], ['map', 'btnContractMap'], ['fight', 'btnContractFight']]) {
      this.$(id).setAttribute('aria-pressed', String(value === group));
    }
    this.$('contractTally').textContent = `已结算 ${entries.filter(([id]) => !contractAvailable(data, id)).length}/${entries.length}`;
    list.replaceChildren();
    for (const [id, def] of entries) {
      if (group !== 'all' && def.group !== group) continue;
      const picked = data.selectedContract === id, claimed = !contractAvailable(data, id);
      const { button, info } = this.growthRow(list, id, def.icon, def.name, def.desc);
      const rewards = document.createElement('small');
      rewards.className = 'contract-reward';
      rewards.textContent = `奖励 ${def.coins} 金币 · ${def.seals} 枚守夜印`;
      info.appendChild(rewards);
      const stage = def.stage;
      const locked = stage && !Environment.canOpen(data, stage);
      if (locked) this.growthShortage(info, `需解锁「${Environment.scenes[stage].name}」`);
      else if (stage && !Environment.stagePool(data).includes(stage)) this.growthShortage(info, '在场景商店把此地图加入随机池后才能遇到。');
      button.disabled = picked || claimed || !!locked;
      button.textContent = claimed ? '已结算' : picked ? '已接' : '接下';
      button.setAttribute('aria-label', `${button.textContent}「${def.name}」`);
      button.addEventListener('click', () => this.selectContract(id));
    }
    list.scrollTop = 0;
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
