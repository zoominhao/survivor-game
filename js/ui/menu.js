'use strict';

// 开场、角色名册和永久强化。
const SHOP_SECTIONS = {
  meta: ['btnShopMeta', 'shopList', 'drawMetaShop'],
  skills: ['btnShopSkills', 'skillShopPanel', 'drawSkillShop'],
  routes: ['btnShopRoutes', 'routeShopPanel', 'drawRouteShop'],
  training: ['btnShopTraining', 'trainingShopPanel', 'drawTrainingShop'],
};
const MenuUI = {
  ...RouteTrainingUI,
  // ---------- 开场与主菜单 ----------
  showIntro(charId, duration) {
    const c = CHARS[charId], w = WEAPONS[c.weapon];
    const [label, name] = c.name.split('·');
    this.$('introEpithet').textContent = name ? label : '';
    this.$('introName').textContent = name || label;
    this.$('introWeaponName').textContent = w.name;
    this.$('introWeaponIcon').innerHTML = Icons.html(c.weapon);
    this.$('introPortrait').replaceChildren(Render.avatar(charId, 8));
    const intro = this.$('intro');
    intro.style.setProperty('--intro-accent', c.color);
    intro.style.setProperty('--intro-duration', duration + 'ms');
    this.show('intro');
  },

  showMenu(group = this.rosterGroup) {
    Game.state = 'menu';
    const d = Save.data;
    const selectedChar = Game.practiceChar ?? d.lastChar;
    this.rosterGroup = group ?? CHARS[selectedChar].group ?? 'core';
    this.$('btnCoreRoster').setAttribute('aria-pressed', String(this.rosterGroup === 'core'));
    this.$('btnFolkRoster').setAttribute('aria-pressed', String(this.rosterGroup === 'folk'));
    this.$('rosterCurrent').textContent = `已选：${CHARS[selectedChar].name}${Game.practiceChar ? ' · 试玩' : ''}`;
    this.$('btnLan').disabled = !!Game.practiceChar;
    this.$('menuCoins').textContent = d.coins;
    this.$('menuBest').textContent = d.best ? U.fmtTime(d.best) : '--:--';
    this.$('menuWins').textContent = d.wins;
    const pool = Environment.stagePool(d);
    const practiceTime = this.$('menuPracticeTime');
    practiceTime.classList.toggle('hidden', !Game.practiceNextDuration);
    practiceTime.textContent = Game.practiceNextDuration ? `下局单人练习：${Game.practiceNextDuration / 60} 分钟` : '';
    this.$('menuRoute').textContent = Game.canPracticeStage(Game.practiceStage) ? `场景试玩：${STAGES[Game.practiceStage].name}` :
      pool.length === 1 ? `巡夜场景：${STAGES[pool[0]].name}` : `巡夜场景：从 ${pool.length} 张随机`;
    this.refreshContractMenu();
    this.$('charNotice').textContent = Game.practiceRoster ? '标有「试玩」的角色仅限单人，不计战绩和奖励。' : '';
    const list = this.$('charList');
    list.innerHTML = '';
    for (const id in CHARS) {
      const c = CHARS[id], owned = !!d.chars[id], w = WEAPONS[c.weapon];
      if ((c.group ?? 'core') !== this.rosterGroup) continue;
      const trial = !owned && Game.practiceRoster, selected = id === selectedChar;
      const b = document.createElement('button');
      b.className = 'char' + (selected ? ' sel' : '') + (owned || trial ? '' : ' locked');
      b.setAttribute('aria-pressed', String(selected));
      b.innerHTML =
        `<span class="char-art"></span><span class="char-info"><b>${c.name}</b>` +
        `<small class="starter">${Icons.html(c.weapon)} ${w.name}</small><small>${c.desc}</small></span>` +
        (trial ? '<span class="char-state">试玩</span>' : selected ? '<span class="char-state" aria-hidden="true">已选</span>' : '') +
        (owned || trial ? '' : `<span class="price">${Icons.html('lock')}<span class="sr-only">解锁所需金币：</span>${c.cost}</span>`);
      b.addEventListener('click', () => {
        Sfx.unlock();
        if (trial) {
          if (!Game.selectPracticeChar(id)) return;
        } else if (owned) {
          d.lastChar = id;
        } else if (Save.buyChar(id)) {
          Sfx.play('chest');
        } else {
          this.$('charNotice').textContent = `还差 ${c.cost - d.coins} 金币解锁${c.name}`;
          b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny');
          return;
        }
        const restoreFocus = document.activeElement === b;
        if (!trial) {
          Game.selectPracticeChar(null);
          if (owned) Save.write();
        }
        this.showMenu();
        if (restoreFocus) list.querySelector('.sel').focus({ preventScroll: true });
      });
      b.querySelector('.char-art').appendChild(Render.avatar(id));
      list.appendChild(b);
    }
    this.show('menu');
  },

  // ---------- 局外成长 ----------
  showShop(section = 'meta', message = '') {
    this.$('shopCoins').textContent = Save.data.coins;
    this.$('shopSeals').textContent = Save.data.seals;
    for (const [key, [tab, panel, draw]] of Object.entries(SHOP_SECTIONS)) {
      const active = key === section;
      this.$(tab).setAttribute('aria-pressed', String(active));
      this.$(panel).classList.toggle('hidden', !active);
      if (active) {
        this.$('shopSectionTitle').textContent = this.$(tab).getAttribute('aria-label');
        this[draw](message);
      }
    }
    this.show('shop');
  },

  drawSkillShop(message) {
    const d = Save.data, list = this.$('skillList');
    const balance = Number.isFinite(d.coins) ? d.coins : 0;
    const stock = Object.entries(WEAPONS).filter(([, w]) => w.unlockCost);
    list.replaceChildren();
    for (const [id, item] of stock) {
      const row = document.createElement('div');
      row.className = 'shopRow';
      const cost = item.unlockCost, owned = d.skills[id] === true, short = Math.max(0, cost - balance);
      row.innerHTML = `<span class="ico">${Icons.html(id)}</span><div class="info"><b>${item.name}</b><small>${item.desc}</small>` +
        (owned || !short ? '</div>' : `<small class="skill-short">还差 ${short} 金币</small></div>`);
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = owned || short > 0;
      button.innerHTML = owned ? '已解锁' : `${Icons.html('coin')} ${cost}`;
      button.setAttribute('aria-label', owned ? `${item.name}已解锁` : `购买${item.name}，${cost} 金币`);
      button.addEventListener('click', () => {
        if (!Save.buySkill(id)) return;
        Sfx.unlock();
        Sfx.play('coin');
        const hadFocus = document.activeElement === button;
        this.showShop('skills', `已解锁「${item.name}」`);
        if (hadFocus) (list.querySelector('button:not(:disabled)') || this.$('btnShopSkills')).focus();
      });
      row.appendChild(button);
      list.appendChild(row);
    }
    const owned = stock.filter(([id]) => d.skills[id] === true).length;
    this.$('skillShopStatus').textContent = `${message ? message + ' · ' : ''}已解锁 ${owned} / ${stock.length}`;
  },

  drawMetaShop() {
    const d = Save.data;
    const list = this.$('shopList');
    list.innerHTML = '';
    for (const id in META) {
      const m = META[id], lv = d.meta[id], maxed = lv >= m.max, cost = m.cost * (lv + 1);
      const row = document.createElement('div');
      row.className = 'shopRow';
      let pips = '';
      for (let i = 0; i < m.max; i++) pips += `<i class="${i < lv ? 'on' : ''}"></i>`;
      row.innerHTML =
        `<span class="ico">${Icons.html(m.icon || id)}</span>` +
        `<div class="info"><b>${m.name}</b><small>${m.desc}</small><div class="pips">${pips}</div></div>`;
      const btn = document.createElement('button');
      btn.innerHTML = maxed ? '已满' : `${Icons.html('coin')} ${cost}`;
      btn.setAttribute('aria-label', maxed ? `${m.name}已满` : `${m.name}，${cost} 金币`);
      btn.disabled = maxed || d.coins < cost;
      btn.addEventListener('click', () => {
        if (d.coins < cost || d.meta[id] >= m.max) return;
        d.coins -= cost; d.meta[id]++;
        Save.write();
        Sfx.play('coin');
        const restoreFocus = document.activeElement === btn;
        this.showShop();
        if (restoreFocus) {
          const next = list.children[Object.keys(META).indexOf(id)].querySelector('button');
          (next.disabled ? this.$('btnShopBack') : next).focus();
        }
      });
      row.appendChild(btn);
      list.appendChild(row);
    }
  },
};
