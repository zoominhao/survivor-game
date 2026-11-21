'use strict';

// 对外只接收移动向量、存档端口与事件回调；不调用界面或浏览器 API。
function createBattle({ save, emit = () => {}, play = () => {} }) {
  return {
    ...BattleProgression, ...BattleEnemies, ...NightmareBattle, ...BossBattle, ...BossDecisions,
    ...BattleDamage, ...BattleProjectiles, ...BattleDrops, ...BattleEffects, ...PracticeBattle, ...BattleCoop, ...BattleContracts, ...CoopSupport,
    ...RouteFork.battle, ...BattleActives,
    save, emit, play, uid: 0,
    state: 'menu', duration: CFG.RUN_TIME, view: { hw: 480, hh: 300 }, grid: new Grid(64), player: null,

    // ---------- 开局 ----------
    start(charId, partnerChar = null, { robot = false, peerStages = [] } = {}) {
      this.time = 0;
      this.coop = !!partnerChar;
      const plannedDuration = this.coop ? null : this.practiceNextDuration;
      this.duration = plannedDuration ?? CFG.RUN_TIME;
      if (!this.coop) this.practiceNextDuration = null;
      this.robot = this.coop && robot;
      this.bond = this.coop ? CoopBonds.forPair(charId, partnerChar) : null;
      this.bondActive = false;
      this.combo = this.coop ? CoopBonds.linkFor(charId, partnerChar) : null;
      this.comboReady = 0;
      this.robotBrain = this.robot ? RobotPartner.start(partnerChar) : null;
      this.signals = this.coop ? [null, null] : null;
      this.rescue = this.coop ? { used: false, progress: 0 } : null;
      const trialStage = !this.coop && this.canPracticeStage(this.practiceStage) ? this.practiceStage : null;
      this.assisted = !!(plannedDuration || trialStage) || !this.coop && this.practiceRoster && this.practiceChar === charId;
      this.practiceInvincible = false;
      this.environment = WorldInteractions.createRun();
      const data = this.save.data;
      const selected = Environment.stagePool(data);
      this.stage = trialStage ?? Environment.pickStage(this.coop && !this.robot ? Environment.sharedStages(selected, peerStages) : selected);
      this.contract = this.startContract(data);
      this.fork = null;
      this.spawnAcc = 0;
      this.evIdx = 0;
      this.eliteT = 45;
      this.voiceReady = {};
      this.voiceQuietUntil = 0;
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
      this.levelPlayer = null;
      this.boss = null;
      this.bossesDefeated = 0;
      this.bossDecision = null;
      this.pendingBosses = [];
      this.bossClearAt = -Infinity;
      this.choices = [];
      this.chest = null;
      this.result = null;
      this.dirty = true;  // 构筑有变化,通知 HUD 刷新
      this.player = this.makePlayer(charId, 0);
      this.partner = partnerChar ? this.makePlayer(partnerChar, 1, 34) : null;
      this.players = this.partner ? [this.player, this.partner] : [this.player];
      // 按抽中的地图校正出生点；整局只使用这一张地图的碰撞。
      for (const p of this.players) Terrain.move(p, 0, 0, CFG.PLAYER_R, 0, this.stage);
      this.stepBond();
      this.state = 'playing';
    },

    // ---------- 主循环 ----------
    update(dt, input = {}, partnerInput = {}) {
      if (this.state !== 'playing') return;
      this.time += dt;
      if (this.time >= this.duration) { this.finish(true); return; }
      if (this.stage === 'storm' && Environment.stormCycle(this.time) > Environment.stormCycle(this.time - dt)) {
        this.play('stormThunder', 0.68);
      }

      // 玩家移动
      this.movePlayer(this.player, input, dt);
      if (this.partner) this.movePlayer(this.partner, this.robot ? RobotPartner.input(this) : partnerInput, dt);
      this.stepBond();
      this.spawn(dt);
      if (this.state !== 'playing') return;
      this.stepRouteFork();
      if (this.state !== 'playing') return;

      // 重建空间网格
      this.grid.clear();
      for (const e of this.enemies) this.grid.insert(e);
      WorldInteractions.step(this);

      // 玩家可能在敌人/子弹阶段阵亡,此时本帧后续逻辑(尤其是拾取宝箱)不能再改状态
      this.updateEnemies(dt);
      if (this.state !== 'playing') return;
      for (const p of this.players) this.stepLoadout(p, dt);
      this.updateProjs(dt);
      this.updateZones(dt);
      this.updateBullets(dt);
      if (this.state !== 'playing') return;
      this.stepRescue(dt);
      this.stepContract(dt);
      this.updatePickups(dt);
      this.updateFx(dt);

      // 清理死亡敌人
      const es = this.enemies;
      let n = 0;
      for (let i = 0; i < es.length; i++) if (!es[i].dead) es[n++] = es[i];
      es.length = n;

      this.nextLevelUp();
    },

    // 结算:win = 是否撑到黎明
    finish(win) {
      if (this.state === 'victory' || this.state === 'gameover') return;
      const p = this.player, d = this.save.data;
      const ranked = !this.coop && !this.assisted;
      const time = Math.min(this.duration, this.time);
      const newBest = ranked && this.time > d.best;
      const contract = this.settleContract(ranked);
      const earned = ranked ? Math.floor(p.coins) + Math.floor(this.time / 10) + (win ? 200 : 0) + (contract?.coins ?? 0) : 0;
      const earnedSeals = ranked ? Math.floor(time / SEAL_REWARDS.interval) + this.bossesDefeated * SEAL_REWARDS.boss +
        (win ? SEAL_REWARDS.dawn : 0) + (contract?.seals ?? 0) : 0;
      if (ranked) {
        d.coins += earned;
        d.seals = (d.seals ?? 0) + earnedSeals;
        d.runs++;
        d.kills += p.kills;
        if (win) d.wins++;
        if (newBest) d.best = time;
        this.save.write();
      }
      this.result = { win, earned, earnedSeals, time, kills: p.kills + (this.partner?.kills ?? 0), level: p.level, newBest,
        assisted: this.assisted, coop: this.coop, contract };
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
