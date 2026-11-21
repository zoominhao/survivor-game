'use strict';

const SkillShopUI = {
  drawSkillShop(message) {
    const d = Save.data;
    const paperList = this.$('paperSkillList'), autoList = this.$('skillList');
    const scroll = this.$('skillShopStock'), scrollTop = scroll.scrollTop;
    const wallet = Number.isFinite(d.coins) ? d.coins : 0;
    paperList.replaceChildren();
    autoList.replaceChildren();

    for (const [id, skill] of Object.entries(PAPER_SKILLS)) {
      const owned = canEquipPaperSkill(d, id), equipped = d.paperSkill === id;
      const short = Math.max(0, skill.cost - wallet);
      const { button, info } = this.growthRow(paperList, id, 'wardPaper', skill.name, skill.desc);
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

    for (const [id, item] of Object.entries(WEAPONS)) {
      if (!item.unlockCost) continue;
      const cost = item.unlockCost, owned = d.skills[id] === true, short = Math.max(0, cost - wallet);
      const { button, info } = this.growthRow(autoList, id, id, item.name, item.desc);
      button.disabled = owned || short > 0;
      button.innerHTML = owned ? '已解锁' : `${Icons.html('coin')} ${cost}`;
      button.setAttribute('aria-label', owned ? `${item.name}已解锁` : `购买${item.name}，${cost} 金币`);
      if (!owned && short) this.growthShortage(info, `还差 ${short} 金币`);
      button.addEventListener('click', () => {
        if (!Save.buySkill(id)) return;
        Sfx.unlock();
        Sfx.play('coin');
        this.refreshGrowthAction('skills', autoList, button, 'btnShopSkills', `已解锁「${item.name}」`);
      });
    }

    scroll.scrollTop = scrollTop;
    this.$('skillShopStatus').textContent = `${message ? `${message} · ` : ''}单人 E 槽：${PAPER_SKILLS[d.paperSkill].name}`;
  },
};
