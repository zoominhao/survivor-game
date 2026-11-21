'use strict';

const FORK_WINDOW = { start: 360, last: 414, end: 445 };
const ROUTE_BRANCHES = {
  bamboo: { icon: 'bambooRoute', name: '穿竹径', tag: '镇纸控场', landmarkBoost: 1.25, xp: 1,
    notes: '镇纸符作用范围 +25%。小心黄符僵尸近身合围。',
    wave: { enemy: 'jiangshi', n: 26, msg: '竹径伏兵 · 黄符僵尸合围', sound: 'corpseAmbush' } },
  rain: { icon: 'rainRoute', name: '走雨庭', tag: '冒雨赶修为', landmarkBoost: 1.25, xp: 1.15,
    notes: '引星符阵范围 +25%，获得经验 +15%。伞鬼会从四周投下弹雨。',
    wave: { enemy: 'umbrellaGhost', n: 16, msg: '雨庭伏兵 · 油纸伞鬼从四面袭来', sound: 'umbrellaOpen' } },
};

const RouteFork = {
  active(g, id) {
    return g.fork?.id === id && !g.boss && g.time < FORK_WINDOW.end && g.landscape === id;
  },

  scene(g) {
    if (!g.fork) return null;
    const { id, from, since } = g.fork;
    if (g.time < FORK_WINDOW.end) return Environment.transition(id, from, since, g.time);
    if (g.time < FORK_WINDOW.end + 5) return Environment.transition('snow', id, FORK_WINDOW.end, g.time);
    return null;
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
      this.fork = { id, from: Environment.landscape(Environment.forBattle(this)), since: this.time, ambushed: false };
      this.state = 'playing';
      this.emit('resume');
      return true;
    },
  },
};
