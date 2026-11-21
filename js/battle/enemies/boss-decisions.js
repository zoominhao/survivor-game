'use strict';

// 抉择只改变当前 Boss 的一个招式。展示和战斗读取同一套数值。
const BOSS_TACTICS = {
  nightmare: { cost: 12, bounty: 30, stat: 'chargeSpeed', values: { ward: 2.55, normal: 3.4, challenge: 4.25 },
    explain: (value, base) => `冲锋速度变为平常的 ${Math.round(value / base * 100)}%。` },
  coffinKing: { cost: 24, bounty: 50, stat: 'sealRadius', values: { ward: 40, normal: 52, challenge: 64 },
    explain: (value, base) => `震圈半径从 ${base} 变为 ${value}。` },
  bridalQueen: { cost: 36, bounty: 80, stat: 'fanWings', values: { ward: 2, normal: 4, challenge: 6 },
    explain: (value, base) => `每轮喜帖上限从 ${base * 2 + 1} 张变为 ${value * 2 + 1} 张，扇面宽度不变。` },
};

const BossDecisions = {
  offerBossDecision(encounter) {
    if (this.state !== 'playing' || this.boss) return;
    this.bossDecision = encounter;
    this.state = 'decision';
    this.emit('decision');
  },

  describeBossDecision() {
    const { variant, scene } = this.bossDecision;
    const tactic = BOSS_TACTICS[variant], { values, explain } = tactic;
    const coins = Math.floor(this.player.coins);
    return {
      name: BOSS_TYPES[variant].name, scene: Environment.scenes[scene].name, coins,
      cost: tactic.cost, bounty: tactic.bounty, missing: Math.max(0, tactic.cost - coins),
      wardEffect: explain(values.ward, values.normal), challengeEffect: explain(values.challenge, values.normal),
    };
  },

  chooseBossPlan(plan) {
    if (this.state !== 'decision' || !this.bossDecision) return false;
    const { variant, tier, scene } = this.bossDecision;
    const { cost, values } = BOSS_TACTICS[variant];
    if (!Object.hasOwn(values, plan)) return false;
    const p = this.player;
    if (plan === 'ward') {
      if (p.coins < cost) return false;
      p.coins -= cost;
    }
    this.bossDecision = null;
    this.state = 'playing';
    const a = Math.random() * TAU, r = this.spawnR();
    const anchor = p.hp > 0 ? p : this.partner || p;
    this.summonBoss(variant, tier, anchor.x + Math.cos(a) * r, anchor.y + Math.sin(a) * r, scene, plan);
    this.emit('resume');
    return true;
  },
};
