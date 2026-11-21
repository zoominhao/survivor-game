'use strict';

// 战斗浮层：升级、战前抉择、宝箱、暂停和结算。
const BattlePanelsUI = {
  cardHtml(info, key) {
    return `<span class="card-layout"><span class="ico">${Icons.html(info.icon)}</span>` +
      `<span class="card-copy"><span class="card-heading"><span class="nm">${info.name}</span>` +
      (info.tag ? `<span class="tag">${info.tag}</span>` : '') +
      `</span><span class="ds">${info.desc.replace(/\n/g, '<br>')}</span></span></span>` +
      (key ? `<kbd>${key}</kbd>` : '');
  },

  showBossDecision() {
    const info = Game.describeBossDecision();
    this.$('decisionTitle').textContent = `${info.name}将至`;
    this.$('decisionScene').textContent = `${info.scene} · 选择只影响这一场 Boss 战`;
    this.$('decisionCoins').textContent = info.coins;
    this.$('decisionWallet').classList.remove('hidden');
    this.$('btnNormalFight').textContent = '照常迎战 · 不花金币';
    this.drawDecision([
      { plan: 'ward', icon: 'armor', name: '布符镇守', tag: `花 ${info.cost} 金币`, cls: 'passive',
        disabled: info.missing > 0,
        desc: info.wardEffect + (info.missing ? `\n还差 ${info.missing} 金币` : '') },
      { plan: 'challenge', icon: 'coin', name: '揭符悬赏', tag: `击败后 +${info.bounty} 金币`, cls: 'evo', desc: info.challengeEffect },
    ], plan => Game.chooseBossPlan(plan));
  },

  showRouteFork() {
    this.$('decisionTitle').textContent = '夜巡变阵';
    this.$('decisionScene').textContent = '不换地图，选一种应对下一波夜兽的战术。加成持续到 7:25。';
    this.$('decisionWallet').classList.add('hidden');
    this.$('btnNormalFight').textContent = '布符镇守 · Esc';
    const cards = Object.entries(ROUTE_BRANCHES).map(([plan, route]) => ({ ...route, plan,
      cls: plan === 'bamboo' ? 'passive' : 'evo', desc: route.notes }));
    this.drawDecision(cards, plan => Game.chooseFork(plan));
  },

  drawDecision(cards, choose) {
    const box = this.$('decisionCards');
    box.replaceChildren();
    cards.forEach((card, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = `card ${card.cls}`;
      b.disabled = !!card.disabled;
      b.setAttribute('aria-keyshortcuts', String(i + 1));
      b.innerHTML = this.cardHtml(card, i + 1);
      b.addEventListener('click', () => { Sfx.play('click'); choose(card.plan); });
      box.appendChild(b);
    });
    this.show('decision');
  },

  // ---------- 升级选卡 ----------
  showLevelUp() {
    const p = Game.player;
    const advice = recommendUpgrade(Game.choices, p);
    this.$('lvAdvice').hidden = !advice;
    this.$('lvAdvice').textContent = advice ? `AI 军师 · 建议第 ${advice.index + 1} 张：${advice.reason}` : '';
    this.$('lvTitle').textContent = '修为精进 · ' + (p.level - Game.pending + 1) + ' 级';
    const box = this.$('cards');
    box.innerHTML = '';
    Game.choices.forEach((c, i) => {
      const info = Game.describe(c);
      const b = document.createElement('button');
      b.className = 'card ' + info.cls;
      if (i === advice?.index) b.classList.add('advised');
      b.innerHTML = this.cardHtml(info, i + 1);
      b.addEventListener('click', () => { Sfx.play('click'); Game.choose(i); });
      box.appendChild(b);
    });
    const rr = this.$('btnReroll');
    this.$('rerollLabel').textContent = '重掷（' + p.rerolls + '）';
    rr.classList.toggle('hidden', Game.coop || Save.data.meta.reroll <= 0);
    rr.disabled = p.rerolls <= 0;
    this.show('levelup');
  },

  // ---------- 宝箱 ----------
  showChest() {
    const ch = Game.chest;
    this.$('chestTitle').textContent = ch.boss ? `${ch.bossName || '夜魇'}的宝藏` : '发现宝箱';
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
    this.$('pauseTitle').textContent = Lan.guest ? '本机菜单 · 战斗仍在继续' : '巡夜暂停';
    this.$('btnQuit').textContent = Lan.guest ? '退出联机' : '放弃本局';
    this.$('pauseBuild').innerHTML = this.buildHtml();
    const paper = Game.player.paperSkill ?? 'ward', skill = Game.activeSkill(Game.player, 'ward');
    this.$('pausePaperIcon').src = `art/skill-${paper}.svg`;
    this.$('pausePaperName').textContent = skill.name;
    this.$('pausePaperNote').textContent = `消耗 1 张符纸。${skill.desc} 精英和 Boss 会掉落符纸。`;
    this.show('pause');
  },

  // ---------- 结算 ----------
  showResult() {
    const r = Game.result, p = Game.player;
    this.$('resTitle').textContent = r.win ? '天亮了' : '长夜吞没了你';
    this.$('resSub').textContent = r.coop ? `${Game.robot ? '机器人搭档' : '双人战报'} · 小队击杀合计，不影响单人战绩和存档。` :
      r.assisted ? '本局使用了练习功能，不计战绩、金币或守夜印。' :
      r.win ? '你守到了黎明,夜兽在晨光中消散。' : '提灯熄灭了,但余烬仍在。';
    this.$('result').classList.toggle('win', r.win);
    this.$('resSeals').classList.toggle('hidden', r.coop || r.assisted);
    this.$('resSealCount').textContent = r.earnedSeals ?? 0;
    this.showContractResult(r);
    this.$('resStats').innerHTML =
      `<div><b>${U.fmtTime(r.time)}</b><small>坚持时间${r.newBest ? ' · 新纪录' : ''}</small></div>` +
      `<div><b>${r.level}</b><small>等级</small></div>` +
      `<div><b>${r.kills}</b><small>击杀</small></div>` +
      `<div><b>${Icons.html('coin')} ${r.earned}</b><small>获得金币</small></div>`;
    // 各武器伤害占比
    const rows = Object.entries(p.dmgBy).sort((a, b) => b[1] - a[1]);
    const top = rows.length ? rows[0][1] : 1;
    this.$('resDmg').innerHTML = rows.map(([id, v]) => {
      const d = WEAPONS[id] ?? PAPER_SKILLS[id];
      return `<li><span>${Icons.html(WEAPONS[id] ? id : d ? 'wardPaper' : 'lantern')} ${d ? d.name : '余烬'}</span><i><u style="width:${(v / top * 100).toFixed(1)}%"></u></i><em>${v}</em></li>`;
    }).join('');
    this.$('btnRetry').textContent = r.coop ? '重新组队' : '再来一局';
    this.show('result');
  },
};
