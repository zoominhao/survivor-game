'use strict';

const SKILL_SHOP_GROUPS = [
  ['paper', 'btnPaperShop', 'paperShopSection'],
  ['passive', 'btnPassiveShop', 'passiveShopSection'],
  ['auto', 'btnAutoSkillShop', 'autoShopSection'],
];

const SkillShopUI = {
  skillShopGroup: 'paper',

  initSkillShop(on) {
    for (const [group, button] of SKILL_SHOP_GROUPS) on(button, () => {
      if (this.skillShopGroup === group) return;
      this.skillShopGroup = group;
      this.$('skillShopStock').scrollTop = 0;
      this.showShop('skills');
    });
  },

  drawSkillShop(message) {
    const d = Save.data;
    const scroll = this.$('skillShopStock'), scrollTop = scroll.scrollTop;
    const wallet = Number.isFinite(d.coins) ? d.coins : 0;
    for (const [group, button, section] of SKILL_SHOP_GROUPS) {
      const active = group === this.skillShopGroup;
      this.$(button).setAttribute('aria-pressed', String(active));
      this.$(section).classList.toggle('hidden', !active);
    }
    let status;
    if (this.skillShopGroup === 'paper') {
      this.drawPaperSkillShop(wallet);
      status = `单人 E 槽：${PAPER_SKILLS[d.paperSkill].name}`;
    } else {
      const passive = this.skillShopGroup === 'passive';
      const catalog = passive ? PASSIVES : WEAPONS;
      const stock = Object.keys(catalog).filter(id => catalog[id].unlockCost);
      this.drawLootSkillShop(passive ? 'passiveSkillList' : 'skillList', catalog, wallet);
      status = `已解锁 ${stock.filter(id => d.skills[id] === true).length} / ${stock.length}`;
    }
    scroll.scrollTop = scrollTop;
    this.$('skillShopStatus').textContent = message ? `${message} · ${status}` : status;
  },

  drawPaperSkillShop(wallet) {
    const d = Save.data, paperList = this.$('paperSkillList');
    paperList.replaceChildren();
    for (const [id, skill] of Object.entries(PAPER_SKILLS)) {
      const owned = canEquipPaperSkill(d, id), equipped = d.paperSkill === id;
      const short = Math.max(0, skill.cost - wallet);
      const { button, info } = this.growthRow(paperList, id, 'wardPaper', skill.name, `${skill.desc} 间隔 ${skill.cooldown} 秒。`);
      const badge = info.previousElementSibling;
      badge.classList.add('paper-shop-icon');
      badge.innerHTML = `<img src="art/skill-${id}.svg" alt="" width="28" height="28">`;
      button.disabled = equipped || (!owned && short > 0);
      button.innerHTML = equipped ? '已装备' : owned ? '装备' : `${Icons.html('coin')} ${skill.cost}`;
      button.setAttribute('aria-label', equipped ? `已装备${skill.name}` : owned ? `装备${skill.name}` : `购买${skill.name}，${skill.cost} 金币`);
      if (owned) button.setAttribute('aria-pressed', String(equipped));
      if (!owned && short) this.growthShortage(info, `还差 ${short} 金币`);
      button.addEventListener('click', () => {
        if (!(owned ? Save.selectPaperSkill(id) : Save.buyPaperSkill(id))) return;
        Sfx.unlock();
        Sfx.play(owned ? 'click' : 'coin');
        this.refreshGrowthAction('skills', paperList, button, 'btnShopSkills', owned ? '' : `已购买「${skill.name}」，可装备到 E 槽`);
      });
    }
  },

  drawLootSkillShop(idOfList, catalog, wallet) {
    const d = Save.data, list = this.$(idOfList);
    list.replaceChildren();
    for (const [id, item] of Object.entries(catalog)) {
      if (!item.unlockCost) continue;
      const cost = item.unlockCost, owned = d.skills[id] === true, short = Math.max(0, cost - wallet);
      const { button, info } = this.growthRow(list, id, id, item.name, item.desc);
      button.disabled = owned || short > 0;
      button.innerHTML = owned ? '已解锁' : `${Icons.html('coin')} ${cost}`;
      button.setAttribute('aria-label', owned ? `${item.name}已解锁` : `购买${item.name}，${cost} 金币`);
      if (!owned && short) this.growthShortage(info, `还差 ${short} 金币`);
      button.addEventListener('click', () => {
        if (!Save.buySkill(id)) return;
        Sfx.unlock();
        Sfx.play('coin');
        this.refreshGrowthAction('skills', list, button, idOfList === 'passiveSkillList' ? 'btnPassiveShop' : 'btnAutoSkillShop', `已解锁「${item.name}」`);
      });
    }
  },
};
