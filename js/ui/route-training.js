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
    const scrollTop = list.scrollTop;
    const pool = Environment.stagePool(d), all = this.$('btnStageAll');
    all.setAttribute('aria-pressed', String(d.stageSelection === null));
    this.$('stagePoolCount').textContent = `${pool.length} / ${Environment.ownedStages(d).length} 张`;
    this.$('stagePoolGuide').textContent = Game.practiceStages ? '点锁定地图旁的「试玩」，下局单人会固定进入该图，不改变正式随机池。' :
      '每局从勾选的地图抽一张，整局不换图。锁定的地图购买后才能使用。';
    list.replaceChildren();
    for (const [id, item] of Object.entries(STAGES)) {
      const name = Environment.scenes[id].name, owned = Environment.canOpen(d, id);
      const selected = pool.includes(id), shortage = Math.max(0, item.cost - (Number.isFinite(d.coins) ? d.coins : 0));
      const { button, info } = this.growthRow(list, id, item.icon, name, item.desc);
      const label = owned ? `将${name}纳入随机池` : `购买${name}，${item.cost} 金币`;
      button.setAttribute('aria-label', label);
      button.title = label;
      if (owned) {
        button.classList.add('stage-toggle');
        button.setAttribute('aria-pressed', String(selected));
        button.disabled = selected && pool.length === 1;
        button.innerHTML = Icons.html(selected ? 'checked' : 'unchecked');
      } else {
        button.disabled = shortage > 0;
        button.innerHTML = `${Icons.html('lock')} ${item.cost}`;
        if (shortage) this.growthShortage(info, `还差 ${shortage} 金币`);
      }
      button.addEventListener('click', () => {
        const changed = owned ? Save.setStageSelection(selected ? pool.filter(stage => stage !== id) : [...pool, id]) : Save.buyRoute(id);
        if (!changed) return;
        if (Game.practiceStage === id && !Game.canPracticeStage(id)) Game.selectPracticeStage(null);
        Sfx.play(owned ? 'click' : 'coin');
        this.refreshGrowthAction('routes', list, button, 'btnShopRoutes', !owned ? `已解锁「${name}」${d.stageSelection ? '，勾选后才会抽到' : '，已加入随机池'}` : '');
      });
      if (Game.canPracticeStage(id)) {
        const actions = document.createElement('div'), trial = document.createElement('button');
        const active = Game.practiceStage === id;
        actions.className = 'stage-trial-actions';
        trial.type = 'button'; trial.dataset.growthId = `trial-${id}`;
        trial.setAttribute('aria-pressed', String(active));
        trial.setAttribute('aria-label', `试玩${name}`);
        trial.textContent = active ? '取消试玩' : '试玩';
        trial.addEventListener('click', () => {
          if (!Game.selectPracticeStage(active ? null : id)) return;
          Sfx.play('click');
          this.refreshGrowthAction('routes', list, trial, 'btnShopRoutes');
        });
        button.before(actions);
        actions.append(button, trial);
      }
    }
    list.scrollTop = scrollTop;
    this.$('routeShopStatus').textContent = message || (Game.canPracticeStage(Game.practiceStage) ?
      `下局试玩「${Environment.scenes[Game.practiceStage].name}」 · 不计战绩` : d.stageSelection ? '自选随机池' : '从全部已拥有场景随机');
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
