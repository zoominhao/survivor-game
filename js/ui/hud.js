'use strict';

// 战斗信息与场景提示。
const HudUI = {
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
