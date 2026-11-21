'use strict';

const PRACTICE_MINUTES = { min: 1, max: 30 };

// 作弊不写存档。试玩配置只保留在当前页面，使用作弊的对局不参与正式结算。
const PracticeBattle = {
  practiceRoster: false,
  practiceChar: null,
  practiceStages: false,
  practiceStage: null,
  practiceNextDuration: null,

  selectPracticeChar(id) {
    if (this.state !== 'menu' || this.coop) return false;
    if (id !== null && (!this.practiceRoster || typeof id !== 'string' || !Object.hasOwn(CHARS, id) || this.save.data.chars?.[id])) return false;
    this.practiceChar = id;
    return true;
  },

  canPracticeStage(id) {
    return this.practiceStages && Environment.isStage(id) && !Environment.canOpen(this.save.data, id);
  },

  selectPracticeStage(id) {
    if (this.state !== 'menu' || this.coop || (id !== null && !this.canPracticeStage(id))) return false;
    this.practiceStage = id;
    return true;
  },

  setPracticeDuration(minutes) {
    if (this.coop || !['practice', 'practiceSetup'].includes(this.state) || !Number.isInteger(minutes) ||
        minutes < PRACTICE_MINUTES.min || minutes > PRACTICE_MINUTES.max) return false;
    const seconds = minutes * 60;
    if (this.state === 'practiceSetup') {
      this.practiceNextDuration = seconds === CFG.RUN_TIME ? null : seconds;
    } else if (this.duration !== seconds) {
      this.duration = seconds;
      this.assisted = true;
    }
    return true;
  },

  usePractice(action) {
    const inRun = this.state === 'practice';
    if (this.coop || (!inRun && (this.state !== 'practiceSetup' || !['roster', 'stages'].includes(action)))) return false;
    const p = this.player;
    if (action === 'invincible') this.practiceInvincible = !this.practiceInvincible;
    else if (action === 'heal' && p.hp < p.st.maxHp) p.hp = p.st.maxHp;
    else if (action === 'coins') p.coins += 100;
    else if (action === 'xp') this.gainXp(50);
    else if (action === 'roster') {
      this.practiceRoster = !this.practiceRoster;
      if (!this.practiceRoster) this.practiceChar = null;
    }
    else if (action === 'stages') {
      this.practiceStages = !this.practiceStages;
      if (!this.practiceStages) this.practiceStage = null;
    }
    else return false;
    if (inRun) this.assisted = true;
    return true;
  },
};
