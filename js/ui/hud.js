'use strict';

const ACTIVE_HUD = [['dash', 'btnDash', '空格'], ['ward', 'btnWard', 'E']];

// 战斗信息与场景提示。
const HudUI = {
  initActives() {
    for (const [id, button] of ACTIVE_HUD) this.$(button).addEventListener('click', event => {
      Sfx.unlock();
      // 鼠标或触屏用完归还全局快捷键；用 Tab 聚焦时保留原生键盘操作。
      if (App.castActive(id) && event.detail > 0) event.currentTarget.blur();
    });
  },

  updateActiveHud(g) {
    this.set('activeDock', 'hidden', g.state !== 'playing' || g.player.hp <= 0);
    if (g.state !== 'playing' || g.player.hp <= 0) return;
    for (const [id, button, shortcut] of ACTIVE_HUD) {
      const wait = Math.max(0, (g.player.activeReady[id] ?? 0) - g.time);
      const remaining = Math.ceil(wait);
      const ready = g.canUseActive(g.player.slot, id);
      this.set(button, 'disabled', !ready);
      const ward = g.player.wardCharges;
      // 只更新有限个刻度，避免每帧重绘整个技能图章。
      const charge = id === 'ward' ? ward / ACTIVE_SKILLS.ward.capacity :
        Math.floor(Math.max(0, 1 - wait / ACTIVE_SKILLS.dash.cooldown) * 48) / 48;
      this.set(button, 'charge', `${charge * 100}%`);
      const label = id === 'ward' ? `${ready ? shortcut + ' · ' : ''}${ward}/${ACTIVE_SKILLS.ward.capacity}` :
        remaining > 0 ? `${remaining} 秒` : shortcut;
      this.set(button + 'State', 'text', label);
    }
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
    else if (prop === 'disabled') el.setAttribute('aria-disabled', String(v));
    else if (prop === 'charge') el.style.setProperty('--charge', v);
  },

  updateHud() {
    const g = Game, p = g.player;
    if (!p || g.state === 'menu') return;
    this.set('xpfill', 'width', (Math.min(1, p.xp / p.xpNeed) * 100).toFixed(1) + '%');
    this.set('lvl', 'text', '修为 ' + p.level);
    this.set('timer', 'text', U.fmtTime(Math.ceil(CFG.RUN_TIME - g.time)));
    this.set('kills', 'text', String(p.kills));
    this.set('coins', 'text', String(Math.floor(p.coins)));
    this.set('practiceFlag', 'hidden', !g.assisted);
    this.updateContractHud(g);
    this.set('lanHud', 'hidden', !g.coop);
    if (g.coop) {
      const mate = g.robot ? `AI·${CHARS[g.partner.char].name.split('·').at(-1)}` : '队友';
      this.set('lanFlag', 'text', `双人 · ${p.slot + 1} 号${p.hp <= 0 ? ' · 已倒下' : ''} · ${mate}${g.partner.hp > 0 ? '在场' : '已倒下'}`);
    }
    this.updateCoopHud(g);
    this.updateActiveHud(g);
    const boss = g.boss && !g.boss.dead ? g.boss : null;
    this.set('bossbar', 'hidden', !boss);
    if (boss) {
      const tactic = boss.plan === 'ward' ? ' · 镇守' : boss.plan === 'challenge' ? ' · 悬赏' : '';
      this.set('bossName', 'text', (boss.name || '夜魇') + tactic);
      this.set('bossfill', 'width', (Math.max(0, boss.hp / boss.maxHp) * 100).toFixed(1) + '%');
    }
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
