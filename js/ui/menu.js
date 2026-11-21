'use strict';

// 开场、角色名册和永久强化。
const MenuUI = {
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

  showMenu() {
    Game.state = 'menu';
    const d = Save.data;
    this.$('menuCoins').textContent = d.coins;
    this.$('menuBest').textContent = d.best ? U.fmtTime(d.best) : '--:--';
    this.$('menuWins').textContent = d.wins;
    this.$('charNotice').textContent = '';
    const list = this.$('charList');
    list.innerHTML = '';
    for (const id in CHARS) {
      const c = CHARS[id], owned = !!d.chars[id], w = WEAPONS[c.weapon];
      const selected = id === d.lastChar;
      const b = document.createElement('button');
      b.className = 'char' + (selected ? ' sel' : '') + (owned ? '' : ' locked');
      b.setAttribute('aria-pressed', String(selected));
      b.innerHTML =
        `<span class="char-art"></span><span class="char-info"><b>${c.name}</b>` +
        `<small class="starter">${Icons.html(c.weapon)} ${w.name}</small><small>${c.desc}</small></span>` +
        (selected ? '<span class="char-state" aria-hidden="true">已选</span>' : '') +
        (owned ? '' : `<span class="price">${Icons.html('lock')}<span class="sr-only">解锁所需金币：</span>${c.cost}</span>`);
      b.addEventListener('click', () => {
        Sfx.unlock();
        if (owned) {
          d.lastChar = id;
        } else if (d.coins >= c.cost) {
          d.coins -= c.cost; d.chars[id] = true; d.lastChar = id;
          Sfx.play('chest');
        } else {
          this.$('charNotice').textContent = `还差 ${c.cost - d.coins} 金币解锁${c.name}`;
          b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny');
          return;
        }
        const restoreFocus = document.activeElement === b;
        Save.write();
        this.showMenu();
        if (restoreFocus) list.querySelector('.sel').focus({ preventScroll: true });
      });
      b.querySelector('.char-art').appendChild(Render.avatar(id));
      list.appendChild(b);
    }
    this.show('menu');
  },

  // ---------- 永久强化 ----------
  showShop() {
    const d = Save.data;
    this.$('shopCoins').textContent = d.coins;
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
    this.show('shop');
  },
};
