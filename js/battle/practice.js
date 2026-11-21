'use strict';

// 练习操作只修改本局数据。标记一旦设置，就算关闭无敌也不会参与正式结算。
const PracticeBattle = {
  usePractice(action) {
    if (this.coop || this.state !== 'practice') return false;
    const p = this.player;
    if (action === 'invincible') this.practiceInvincible = !this.practiceInvincible;
    else if (action === 'heal' && p.hp < p.st.maxHp) p.hp = p.st.maxHp;
    else if (action === 'coins') p.coins += 100;
    else if (action === 'xp') this.gainXp(50);
    else return false;
    this.assisted = true;
    return true;
  },
};
