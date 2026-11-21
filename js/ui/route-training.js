'use strict';

const RouteTrainingUI = {
  growthRow(list, id, icon, title, desc) {
    const row = document.createElement('div');
    row.className = 'shopRow';
    row.innerHTML = `<span class="ico">${Icons.html(icon)}</span><div class="info"><b>${title}</b><small>${desc}</small></div>`;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.growthId = id;
    row.appendChild(button);
    list.appendChild(row);
    return { button, info: row.querySelector('.info') };
  },

  growthShortage(info, text) {
    const note = document.createElement('small');
    note.className = 'skill-short';
    note.textContent = text;
    info.appendChild(note);
  },

  refreshGrowthAction(section, list, button, tab, message) {
    const hadFocus = document.activeElement === button;
    const id = button.dataset.growthId;
    this.showShop(section, message);
    if (!hadFocus) return;
    const replacement = list.querySelector(`[data-growth-id="${id}"]:not(:disabled)`);
    (replacement || this.$(tab)).focus({ preventScroll: true });
  },

  drawRouteShop(message) {
    const d = Save.data, list = this.$('routeList');
    list.replaceChildren();
    for (const [id, item] of Object.entries(OPENING_ROUTES)) {
      const name = Environment.scenes[id].name, owned = Environment.canOpen(d, id);
      const selected = id === d.startScene, shortage = Math.max(0, item.cost - (Number.isFinite(d.coins) ? d.coins : 0));
      const { button, info } = this.growthRow(list, id, item.icon, name, item.desc);
      button.disabled = selected || (!owned && shortage > 0);
      button.innerHTML = selected ? '已选' : owned ? '使用' : `${Icons.html('coin')} ${item.cost}`;
      button.setAttribute('aria-label', selected ? `已选${name}` : owned ? `使用${name}` : `购买并使用${name}，${item.cost} 金币`);
      if (!owned && shortage) this.growthShortage(info, `还差 ${shortage} 金币`);
      button.addEventListener('click', () => {
        if (!(owned ? Save.selectRoute(id) : Save.buyRoute(id))) return;
        Sfx.play(owned ? 'click' : 'coin');
        this.refreshGrowthAction('routes', list, button, 'btnShopRoutes', !owned ? `已解锁「${name}」` : '');
      });
    }
    this.$('routeShopStatus').textContent = `${message ? message + ' · ' : ''}当前出发：${Environment.scenes[d.startScene].name}`;
  },

  drawTrainingShop(message) {
    const d = Save.data, list = this.$('trainingList'), char = d.lastChar;
    const stats = Game.statsFor(char);
    this.$('trainingHero').textContent = `当前英雄 · ${CHARS[char].name}`;
    this.$('trainingHp').textContent = stats.maxHp;
    this.$('trainingMight').textContent = `${Math.round(stats.might * 100)}%`;
    this.$('trainingSpeed').textContent = Math.round(stats.speed);
    list.replaceChildren();
    for (const [id, item] of Object.entries(HERO_TRAINING)) {
      const rank = d.training[char]?.[id] ?? 0, cost = HERO_TRAINING_COSTS[rank];
      const { info, button } = this.growthRow(list, id, id, item.name, `${item.desc} · ${rank} / ${HERO_TRAINING_COSTS.length} 级`);
      button.disabled = !cost || d.seals < cost;
      button.innerHTML = cost ? `${Icons.html('watchSeal')} ${cost}` : '已满';
      button.setAttribute('aria-label', cost ? `${item.name}，消耗 ${cost} 枚守夜印` : `${item.name}已满`);
      if (cost && d.seals < cost) this.growthShortage(info, `还差 ${cost - d.seals} 枚`);
      button.addEventListener('click', () => {
        if (!Save.trainHero(char, id)) return;
        Sfx.play('level');
        this.refreshGrowthAction('training', list, button, 'btnShopTraining', `${item.name}升至 ${rank + 1} 级`);
      });
    }
    this.$('trainingShopStatus').textContent = message || '要修炼另一位英雄，请先在主菜单切换角色。';
  },
};
