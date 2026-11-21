'use strict';

// 对外只接收移动向量、存档端口与事件回调；不调用界面或浏览器 API。
function createBattle({ save, emit = () => {}, play = () => {} }) {
  return {
    ...BattleProgression, ...BattleEnemies, ...NightmareBattle, ...BossBattle, ...BossDecisions,
    ...BattleDamage, ...BattleProjectiles, ...BattleDrops, ...BattleEffects,
    save, emit, play, uid: 0,
    state: 'menu', view: { hw: 480, hh: 300 }, grid: new Grid(64), player: null,

    // ---------- 开局 ----------
    start(charId) {
      const c = CHARS[charId], m = this.save.data.meta;
      this.time = 0;
      this.environment = WorldInteractions.createRun();
      this.sceneId = this.landscape = 'dusk';
      this.spawnAcc = 0;
      this.evIdx = 0;
      this.eliteT = 45;
      this.enemies = [];
      this.projs = [];
      this.ebullets = [];
      this.gems = [];
      this.pickups = [];
      this.zones = [];
      this.fx = [];
      this.texts = [];
      this.parts = [];
      this.shake = 0;
      this.pending = 0;   // 待处理的升级次数
      this.boss = null;
      this.bossDecision = null;
      this.pendingBosses = [];
      this.bossClearAt = -Infinity;
      this.lastBossArena = null;
      this.choices = [];
      this.chest = null;
      this.result = null;
      this.dirty = true;  // 构筑有变化,通知 HUD 刷新
      this.player = {
        x: 0, y: 0, dirx: 1, diry: 0, face: 1, moving: false, walkT: 0,
        iframe: 0, hp: 0, level: 1, xp: 0, xpNeed: this.xpFor(1), char: charId,
        weapons: [], passives: [], evolved: {}, kills: 0, coins: 0, dmgBy: {},
        st: {}, rerolls: m.reroll, revives: m.revive,
      };
      this.recalc();
      this.player.hp = this.player.st.maxHp;
      this.addWeapon(c.weapon);
      this.state = 'playing';
    },

    // ---------- 主循环 ----------
    update(dt, input = { x: 0, y: 0 }) {
      if (this.state !== 'playing') return;
      const p = this.player, st = p.st;
      this.time += dt;
      if (this.time >= CFG.RUN_TIME) { this.finish(true); return; }

      const scene = Environment.forBattle(this), landscape = Environment.landscape(scene);
      if (this.landscape !== landscape) this.enterLandscape(landscape);
      if (this.sceneId !== scene.id) {
        this.sceneId = scene.id;
        const setting = Environment.scenes[scene.id];
        if (!this.boss?.arena) this.emit('banner', setting.name);
        if (setting.sound) this.play(setting.sound, 0.78);
      }

      // 玩家移动
      const { x: ix, y: iy } = input;
      const il = Math.hypot(ix, iy);
      p.moving = il > 0.08;
      if (p.moving) {
        const k = il > 1 ? 1 / il : 1;
        const x = p.x, y = p.y;
        Terrain.move(p, ix * k * st.speed * dt, iy * k * st.speed * dt, CFG.PLAYER_R, 0, this.landscape);
        p.dirx = ix / il; p.diry = iy / il;
        if (Math.abs(ix) > 0.05) p.face = ix < 0 ? -1 : 1;
        p.moving = Math.hypot(p.x - x, p.y - y) > 0.05;
        if (p.moving) p.walkT += dt;
      }
      if (p.iframe > 0) p.iframe -= dt;
      if (st.regen > 0 && p.hp < st.maxHp) p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
      this.spawn(dt);
      if (this.state !== 'playing') return;

      // 重建空间网格
      this.grid.clear();
      for (const e of this.enemies) this.grid.insert(e);
      WorldInteractions.step(this);

      // 玩家可能在敌人/子弹阶段阵亡,此时本帧后续逻辑(尤其是拾取宝箱)不能再改状态
      this.updateEnemies(dt);
      if (this.state !== 'playing') return;
      for (const w of p.weapons) WeaponFns[WEAPONS[w.id].kind](this, w, w.s, dt);
      this.updateProjs(dt);
      this.updateZones(dt);
      this.updateBullets(dt);
      if (this.state !== 'playing') return;
      this.updatePickups(dt);
      this.updateFx(dt);

      // 清理死亡敌人
      const es = this.enemies;
      let n = 0;
      for (let i = 0; i < es.length; i++) if (!es[i].dead) es[n++] = es[i];
      es.length = n;

      if (this.pending > 0 && this.state === 'playing' && this.time - this.bossClearAt >= BOSS_REWARD_BEAT) {
        this.state = 'levelup';
        this.choices = this.buildChoices(3);
        this.play('level');
        this.emit('levelup');
      }
    },

    enterLandscape(landscape) {
      this.landscape = landscape;
      // 地貌淡变到中点时切换碰撞，只移开被新障碍覆盖的对象。
      const unstick = (body, radius) => Terrain.move(body, 0, 0, radius, 0, landscape);
      unstick(this.player, CFG.PLAYER_R);
      for (const e of this.enemies) {
        if (!e.dead && !e.boss && !ENEMIES[e.type].ghost) unstick(e, e.r);
      }
      for (const pickup of this.pickups) if (pickup.type === 'chest') unstick(pickup, 4);
    },

    // 结算:win = 是否撑到黎明
    finish(win) {
      const p = this.player, d = this.save.data;
      const earned = Math.floor(p.coins) + Math.floor(this.time / 10) + (win ? 200 : 0);
      d.coins += earned;
      d.runs++;
      d.kills += p.kills;
      if (win) d.wins++;
      const newBest = this.time > d.best;
      if (newBest) d.best = Math.min(CFG.RUN_TIME, this.time);
      this.save.write();
      this.result = { win, earned, time: Math.min(CFG.RUN_TIME, this.time), kills: p.kills, level: p.level, newBest };
      this.state = win ? 'victory' : 'gameover';
      if (win) {
        for (const e of this.enemies) this.burst(e.x, e.y, '#ffe9a8', 2);
        this.enemies.length = 0;
        this.ebullets.length = 0;
        this.boss = null;
      }
      this.play(win ? 'victory' : 'defeat');
      this.emit('result');
    },
  };
}
