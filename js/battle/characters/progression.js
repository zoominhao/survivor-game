'use strict';

// 角色属性、装备、升级和宝箱。
const BattleProgression = {
  xpFor(lv) { return Math.floor(5 + (lv - 1) * 5 + Math.pow(lv - 1, 1.6)); },

  // 汇总角色、局外强化、被动道具,得到当前面板
  recalc() {
    const p = this.player, c = CHARS[p.char], m = this.save.data.meta, st = p.st;
    const L = id => { const q = p.passives.find(x => x.id === id); return q ? q.lv : 0; };
    const oldMax = st.maxHp || 0;
    st.maxHp = Math.round((100 + (c.hp || 0)) * (1 + 0.1 * m.vital + 0.2 * L('vital')));
    st.speed = 150 * (1 + (c.speed || 0) + 0.04 * m.swift + 0.08 * L('swift'));
    st.might = 1 + (c.might || 0) + 0.05 * m.might + 0.1 * L('might');
    st.cd = Math.max(0.35, (1 - (c.haste || 0)) * (1 - 0.08 * L('haste')));
    st.area = 1 + 0.1 * L('area');
    st.amount = (c.amount || 0) + L('amount');
    st.armor = (c.armor || 0) + m.armor + L('armor');
    st.regen = 0.1 * m.regen + 0.3 * L('regen');
    st.magnet = 70 * (1 + (c.magnet || 0) + 0.15 * m.magnet + 0.3 * L('magnet'));
    st.growth = 1 + 0.05 * m.growth + 0.08 * L('wisdom');
    st.greed = 1 + 0.1 * m.greed;
    if (oldMax && st.maxHp > oldMax) p.hp += st.maxHp - oldMax; // 生命上限提高时同步补血
  },

  addWeapon(id) {
    const s = weaponStats(id, 1);
    this.player.weapons.push({ id, lv: 1, timer: 0, s, guards: s.guards || 0 });
    this.dirty = true;
  },

  // ---------- 升级选项 ----------
  buildChoices(n) {
    const p = this.player, out = [];
    // 可进化的武器必定出现
    for (const w of p.weapons) {
      const d = WEAPONS[w.id];
      if (d.evo && w.lv >= d.max && p.passives.some(x => x.id === d.evo.need)) {
        out.push({ kind: 'evo', id: w.id, to: d.evo.to });
      }
    }
    const pool = [];
    for (const w of p.weapons) {
      const d = WEAPONS[w.id];
      if (!d.evolved && w.lv < d.max) pool.push({ kind: 'weapon', id: w.id, lv: w.lv + 1, wt: 3 });
    }
    if (p.weapons.length < CFG.MAX_WEAPONS) {
      for (const id in WEAPONS) {
        const d = WEAPONS[id];
        if (d.evolved || (d.exclusive && d.exclusive !== p.char) || p.evolved[id] || p.weapons.some(w => w.id === id)) continue;
        pool.push({ kind: 'weapon', id, lv: 1, wt: 2 });
      }
    }
    for (const q of p.passives) {
      if (q.lv < PASSIVES[q.id].max) pool.push({ kind: 'passive', id: q.id, lv: q.lv + 1, wt: 3 });
    }
    if (p.passives.length < CFG.MAX_PASSIVES) {
      for (const id in PASSIVES) {
        if (!p.passives.some(q => q.id === id)) pool.push({ kind: 'passive', id, lv: 1, wt: 2 });
      }
    }
    // 多选升级时优先给一个尚未习得的专属武器，宝箱单次抽取照旧。
    if (n > 1 && out.length < n) {
      const exclusive = pool.filter(c => c.kind === 'weapon' && c.lv === 1 && WEAPONS[c.id].exclusive === p.char);
      if (exclusive.length) {
        const choice = exclusive[U.randInt(0, exclusive.length - 1)];
        out.push(...pool.splice(pool.indexOf(choice), 1));
      }
    }
    // 按权重不放回抽取
    while (out.length < n && pool.length) {
      let sum = 0;
      for (const c of pool) sum += c.wt;
      let r = Math.random() * sum, idx = 0;
      for (let i = 0; i < pool.length; i++) { r -= pool[i].wt; if (r <= 0) { idx = i; break; } }
      out.push(pool.splice(idx, 1)[0]);
    }
    out.length = Math.min(out.length, n);
    // 全部满级后的保底选项
    if (!out.length) out.push({ kind: 'coins' }, { kind: 'heal' });
    return out;
  },

  // 把选项转成卡片展示信息
  describe(c) {
    const p = this.player;
    if (c.kind === 'weapon') {
      const d = WEAPONS[c.id];
      let desc = c.lv === 1 ? d.desc : upgradeText(d.ups[c.lv - 2]);
      if (d.evo && (c.lv === 1 || d.exclusive)) {
        const need = PASSIVES[d.evo.need];
        desc += '\n进化搭档：' + need.name;
      }
      return { icon: c.id, name: d.name, tag: c.lv === 1 ? '新武器' : 'Lv.' + c.lv, desc, cls: 'weapon' };
    }
    if (c.kind === 'passive') {
      const d = PASSIVES[c.id];
      let desc = d.desc;
      // 提示这件被动能让哪把已持有的武器进化
      for (const w of p.weapons) {
        const wd = WEAPONS[w.id];
        if (wd.evo && wd.evo.need === c.id) desc += '\n可进化：' + wd.name;
      }
      return { icon: c.id, name: d.name, tag: c.lv === 1 ? '新道具' : 'Lv.' + c.lv, desc, cls: 'passive' };
    }
    if (c.kind === 'evo') {
      const d = WEAPONS[c.to];
      return { icon: c.to, name: d.name, tag: '进化', desc: d.desc, cls: 'evo' };
    }
    if (c.kind === 'coins') return { icon: 'coin', name: '一袋金币', tag: '', desc: '获得 25 金币', cls: 'passive' };
    return { icon: 'tonic', name: '治疗药剂', tag: '', desc: '回复 30% 生命', cls: 'passive' };
  },

  applyChoice(c) {
    const p = this.player;
    if (c.kind === 'weapon') {
      const w = p.weapons.find(x => x.id === c.id);
      if (w) {
        const oldGuards = w.s.guards || 0;
        w.s = weaponStats(w.id, ++w.lv);
        if (w.guards > 0) w.guards += Math.max(0, w.s.guards - oldGuards);
      } else this.addWeapon(c.id);
    } else if (c.kind === 'passive') {
      const q = p.passives.find(x => x.id === c.id);
      if (q) q.lv++; else p.passives.push({ id: c.id, lv: 1 });
      this.recalc();
    } else if (c.kind === 'evo') {
      const w = p.weapons.find(x => x.id === c.id);
      if (w) {
        p.evolved[c.id] = true;
        w.id = c.to; w.lv = 1; w.s = weaponStats(c.to, 1);
        w.timer = 0; w.on = 0; w.burst = 0;
      }
    } else if (c.kind === 'coins') {
      p.coins += 25;
    } else if (c.kind === 'heal') {
      p.hp = Math.min(p.st.maxHp, p.hp + p.st.maxHp * 0.3);
    }
    this.dirty = true;
  },

  // 玩家在升级界面选了第 i 项
  choose(i) {
    if (this.state !== 'levelup' || !this.choices[i]) return;
    this.applyChoice(this.choices[i]);
    this.pending--;
    if (this.pending > 0) {
      this.choices = this.buildChoices(3);
      this.emit('levelup');
    } else {
      const p = this.player;
      this.fx.push({ type: 'outfitPulse', x: p.x, y: p.y, life: 0.55, max: 0.55, c: CHARS[p.char].color });
      this.state = 'playing';
      this.emit('resume');
    }
  },

  reroll() {
    const p = this.player;
    if (this.state !== 'levelup' || p.rerolls <= 0) return;
    p.rerolls--;
    this.choices = this.buildChoices(3);
    this.emit('levelup');
  },

  // 宝箱:金币 + 直接获得若干次强化(优先进化)
  openChest(boss, bossName) {
    const p = this.player;
    const coins = Math.round((boss ? U.randInt(80, 120) : U.randInt(15, 35)) * p.st.greed);
    p.coins += coins;
    const got = [];
    for (let i = 0, n = boss ? 3 : 1; i < n; i++) {
      const c = this.buildChoices(1)[0];
      if (!c || c.kind === 'coins' || c.kind === 'heal') break;
      got.push(this.describe(c));
      this.applyChoice(c);
    }
    this.chest = { coins, got, boss, bossName };
    this.state = 'chest';
    this.play('chest');
    this.emit('chest');
  },

  closeChest() {
    if (this.state !== 'chest') return;
    this.state = 'playing';
    this.emit('resume');
  },
};
