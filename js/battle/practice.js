'use strict';

// 作弊不写存档。全角色试玩只保留在当前页面，使用作弊的对局不参与正式结算。
const PracticeBattle = {
  practiceRoster: false,
  practiceChar: null,

  selectPracticeChar(id) {
    if (this.state !== 'menu' || this.coop) return false;
    if (id !== null && (!this.practiceRoster || typeof id !== 'string' || !Object.hasOwn(CHARS, id) || this.save.data.chars?.[id])) return false;
    this.practiceChar = id;
    return true;
  },

  usePractice(action) {
    if (this.coop || this.state !== 'practice') return false;
    const p = this.player;
    if (action === 'invincible') this.practiceInvincible = !this.practiceInvincible;
    else if (action === 'heal' && p.hp < p.st.maxHp) p.hp = p.st.maxHp;
    else if (action === 'coins') p.coins += 100;
    else if (action === 'xp') this.gainXp(50);
    else if (action === 'roster') {
      this.practiceRoster = !this.practiceRoster;
      if (!this.practiceRoster) this.practiceChar = null;
    }
    else return false;
    this.assisted = true;
    return true;
  },
};
