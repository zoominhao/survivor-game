'use strict';
// ===== 界面:菜单、强化商店、升级选卡、宝箱、暂停、结算、HUD(均为 DOM) =====

const UI = {
  cache: {},
  overlayId: null,
  $(id) { return document.getElementById(id); },

  init() {
    for (const el of document.querySelectorAll('[data-icon]')) el.innerHTML = Icons.html(el.dataset.icon);
    document.addEventListener('keydown', e => this.trapDialogTab(e));
    const on = (id, fn) => this.$(id).addEventListener('click', () => { Sfx.unlock(); Sfx.play('click'); fn(); });
    on('btnStart', () => App.startRun());
    on('btnIntroSkip', () => App.finishIntro());
    on('btnShop', () => this.showShop());
    on('btnShopBack', () => this.showMenu());
    on('btnReroll', () => Game.reroll());
    on('btnChestOk', () => Game.closeChest());
    on('btnResume', () => App.resume());
    on('btnQuit', () => Game.finish(false));
    on('btnRetry', () => App.startRun());
    on('btnMenu', () => this.showMenu());
    on('btnPause', () => App.pause());
    on('btnMute', () => App.toggleMute());
    on('btnMute2', () => App.toggleMute());
    this.refreshMute();
    this.showMenu();
  },

  // 显示指定浮层(null = 全部隐藏),并同步 HUD 可见性
  show(id) {
    const previous = this.overlayId;
    this.overlayId = id;
    if (id === 'pause' && id !== previous) this.pauseFromHud = this.$('hud').contains(document.activeElement);
    for (const o of document.querySelectorAll('.overlay')) o.classList.toggle('hidden', o.id !== id);
    const inRun = !!Game.player && Game.state !== 'menu' && Game.state !== 'intro';
    const hud = this.$('hud');
    hud.classList.toggle('hidden', !inRun);
    hud.inert = !inRun || !!id;
    if (id === previous && (!id || id === 'menu' || this.$(id).contains(document.activeElement))) return;
    if (id && id !== 'menu') {
      const title = this.$(id).querySelector('h2');
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    } else if (id === 'menu' && previous) {
      this.$(previous === 'shop' ? 'btnShop' : 'btnStart').focus();
    } else if (previous === 'pause' && this.pauseFromHud) {
      this.$('btnPause').focus({ preventScroll: true });
    }
  },

  trapDialogTab(e) {
    const id = this.overlayId;
    if (e.key !== 'Tab' || !id || id === 'menu') return;
    const buttons = [...this.$(id).querySelectorAll('button:not(:disabled)')].filter(el => el.getClientRects().length);
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    const last = buttons.length - 1;
    if (current === -1 || (e.shiftKey ? current === 0 : current === last)) {
      e.preventDefault();
      buttons[e.shiftKey ? last : 0].focus();
    }
  },

  refreshMute() {
    for (const id of ['btnMute', 'btnMute2']) {
      const btn = this.$(id);
      btn.innerHTML = Icons.html(Sfx.muted ? 'mute' : 'sound');
      btn.setAttribute('aria-pressed', String(Sfx.muted));
    }
  },

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

  cardHtml(info, key) {
    return `<span class="ico">${Icons.html(info.icon)}</span><span class="nm">${info.name}</span>` +
      (info.tag ? `<span class="tag">${info.tag}</span>` : '') +
      `<span class="ds">${info.desc.replace(/\n/g, '<br>')}</span>` +
      (key ? `<kbd>${key}</kbd>` : '');
  },

  // ---------- 升级选卡 ----------
  showLevelUp() {
    const p = Game.player;
    this.$('lvTitle').textContent = '修为精进 · ' + (p.level - Game.pending + 1) + ' 级';
    const box = this.$('cards');
    box.innerHTML = '';
    Game.choices.forEach((c, i) => {
      const info = Game.describe(c);
      const b = document.createElement('button');
      b.className = 'card ' + info.cls;
      b.innerHTML = this.cardHtml(info, i + 1);
      b.addEventListener('click', () => { Sfx.play('click'); Game.choose(i); });
      box.appendChild(b);
    });
    const rr = this.$('btnReroll');
    this.$('rerollLabel').textContent = '重掷（' + p.rerolls + '）';
    rr.classList.toggle('hidden', Save.data.meta.reroll <= 0);
    rr.disabled = p.rerolls <= 0;
    this.show('levelup');
  },

  // ---------- 宝箱 ----------
  showChest() {
    const ch = Game.chest;
    this.$('chestTitle').textContent = ch.boss ? '夜魇的宝藏' : '发现宝箱';
    this.$('chestCoins').textContent = '+' + ch.coins;
    const box = this.$('chestCards');
    box.innerHTML = '';
    for (const info of ch.got) {
      const d = document.createElement('div');
      d.className = 'card ' + info.cls;
      d.innerHTML = this.cardHtml(info, '');
      box.appendChild(d);
    }
    this.show('chest');
  },

  buildHtml() {
    const p = Game.player;
    const item = (icon, name, lv, max) =>
      `<li>${Icons.html(icon)}<span>${name}</span><em>${lv >= max ? '已满' : 'Lv.' + lv}</em></li>`;
    return '<ul class="build">' +
      p.weapons.map(w => { const d = WEAPONS[w.id]; return item(w.id, d.name, w.lv, d.evolved ? 1 : d.max); }).join('') +
      p.passives.map(q => { const d = PASSIVES[q.id]; return item(q.id, d.name, q.lv, d.max); }).join('') +
      '</ul>';
  },

  // ---------- 暂停 ----------
  showPause() {
    this.$('pauseBuild').innerHTML = this.buildHtml();
    this.show('pause');
  },

  // ---------- 结算 ----------
  showResult() {
    const r = Game.result, p = Game.player;
    this.$('resTitle').textContent = r.win ? '天亮了' : '长夜吞没了你';
    this.$('resSub').textContent = r.win ? '你守到了黎明,夜兽在晨光中消散。' : '提灯熄灭了,但余烬仍在。';
    this.$('result').classList.toggle('win', r.win);
    this.$('resStats').innerHTML =
      `<div><b>${U.fmtTime(r.time)}</b><small>坚持时间${r.newBest ? ' · 新纪录' : ''}</small></div>` +
      `<div><b>${r.level}</b><small>等级</small></div>` +
      `<div><b>${r.kills}</b><small>击杀</small></div>` +
      `<div><b>${Icons.html('coin')} ${r.earned}</b><small>获得金币</small></div>`;
    // 各武器伤害占比
    const rows = Object.entries(p.dmgBy).sort((a, b) => b[1] - a[1]);
    const top = rows.length ? rows[0][1] : 1;
    this.$('resDmg').innerHTML = rows.map(([id, v]) => {
      const d = WEAPONS[id];
      return `<li><span>${Icons.html(d ? id : 'lantern')} ${d ? d.name : '余烬'}</span><i><u style="width:${(v / top * 100).toFixed(1)}%"></u></i><em>${v}</em></li>`;
    }).join('');
    this.show('result');
  },

  banner(text) {
    const b = this.$('banner');
    b.textContent = text;
    b.classList.remove('show');
    void b.offsetWidth; // 强制重排以重新触发动画
    b.classList.add('show');
  },

  // ---------- HUD ----------
  // 只在值变化时写 DOM
  set(id, prop, v) {
    const k = id + prop;
    if (this.cache[k] === v) return;
    this.cache[k] = v;
    const el = this.$(id);
    if (prop === 'text') el.textContent = v;
    else if (prop === 'width') el.style.width = v;
    else if (prop === 'hidden') el.classList.toggle('hidden', v);
  },

  updateHud() {
    const g = Game, p = g.player;
    if (!p || g.state === 'menu') return;
    this.set('xpfill', 'width', (Math.min(1, p.xp / p.xpNeed) * 100).toFixed(1) + '%');
    this.set('lvl', 'text', '修为 ' + p.level);
    this.set('timer', 'text', U.fmtTime(Math.ceil(CFG.RUN_TIME - g.time)));
    this.set('kills', 'text', String(p.kills));
    this.set('coins', 'text', String(Math.floor(p.coins)));
    const boss = g.boss && !g.boss.dead ? g.boss : null;
    this.set('bossbar', 'hidden', !boss);
    if (boss) this.set('bossfill', 'width', (Math.max(0, boss.hp / boss.maxHp) * 100).toFixed(1) + '%');
    if (g.dirty) {
      g.dirty = false;
      const slot = (id, data, lv) => {
        const max = data.evolved || lv >= data.max;
        return `<span class="slot${max ? ' max' : ''}" title="${data.name} · ${max ? '已满' : lv + '级'}">${Icons.html(id)}<i>${max ? '满' : lv}</i></span>`;
      };
      this.$('wslots').innerHTML = p.weapons.map(w => slot(w.id, WEAPONS[w.id], w.lv)).join('');
      this.$('pslots').innerHTML = p.passives.map(q => slot(q.id, PASSIVES[q.id], q.lv)).join('');
    }
  },
};
