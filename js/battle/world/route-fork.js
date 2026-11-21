'use strict';

const FORK_WINDOW = { start: 360, last: 414, end: 445 };
const ROUTE_BRANCHES = {
  bamboo: { icon: 'wardPaper', name: '布符镇守', tag: '控场', radiusBoost: 1.25,
    notes: '符纸技能范围 +25%。小心黄符僵尸近身合围。',
    wave: { enemy: 'jiangshi', n: 26, msg: '黄符僵尸合围', sound: 'corpseAmbush' } },
  rain: { icon: 'starlance', name: '引星诱敌', tag: '修为', xp: 1.15,
    notes: '获得经验 +15%。伞鬼会从四周投下弹雨。',
    wave: { enemy: 'umbrellaGhost', n: 16, msg: '油纸伞鬼从四面袭来', sound: 'umbrellaOpen' } },
};

const RouteFork = {
  active(g, id) {
    return g.fork?.id === id && !g.boss && g.time < FORK_WINDOW.end;
  },

  battle: {
    stepRouteFork() {
      if (this.fork) {
        if (!this.fork.ambushed && this.time >= this.fork.since + 14 && RouteFork.active(this, this.fork.id)) {
          this.fork.ambushed = true;
          const anchor = this.player.hp > 0 ? this.player : this.partner;
          this.spawnRing(ROUTE_BRANCHES[this.fork.id].wave, anchor);
        }
        return;
      }
      if (this.time < FORK_WINDOW.start || this.time > FORK_WINDOW.last || this.boss || this.pendingBosses.length ||
          this.time - this.bossClearAt < BOSS_REWARD_BEAT) return;
      this.state = 'route';
      this.emit('route');
    },

    chooseFork(id) {
      if (this.state !== 'route' || this.fork || !Object.hasOwn(ROUTE_BRANCHES, id)) return false;
      this.fork = { id, since: this.time, ambushed: false };
      this.state = 'playing';
      this.emit('resume');
      return true;
    },
  },
};
