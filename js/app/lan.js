'use strict';

// 大厅与浏览器会话。房主应用来客输入；来客的 Game 只读权威快照，不运行战斗。
const LAN_FALLBACK_MS = 45000;
const Lan = {
  ...LanRoom,
  phase: 'closed',
  fallbackAt: 0,
  get guest() { return this.running && this.role === 'guest'; },
  get host() { return this.running && this.role === 'host'; },
  get localTurn() { return !this.running || Game.levelPlayer?.slot === Game.player.slot; },

  open(message = '') {
    this.close();
    this.char = Save.data.lastChar;
    this.localStages = Environment.stagePool(Save.data);
    this.phase = 'pick';
    this.status = message || `已选 ${CHARS[this.char].name}。同一 Wi-Fi 的好友可扫码加入；没人时可由机器人补位。`;
    UI.show('lan');
    UI.refreshLan();
  },

  openHashInvite() {
    const code = lanInviteFromHash(location.hash);
    if (!code) return;
    // 扫码打开链接后仍由来客确认应答；刷新时不反复消费同一份邀请。
    try { history.replaceState(history.state, '', location.pathname + location.search); } catch { /* 本地文件可能不允许改历史记录。 */ }
    this.open();
    this.select('guest');
    if (this.phase === 'offer-in') {
      this.inviteCode = code;
      this.statusText('已收到邀请，点击「生成应答二维码」。');
      UI.$('btnLanAccept').focus();
    }
  },

  close() {
    UI.stopLanScan();
    this.inviteCode = null;
    const link = this.link;
    this.link = null;
    link?.close();
    if (this.running) {
      SoloGame.view = Game.view;
      Game = SoloGame;
    }
    this.running = false;
    this.guestPause = false;
    this.otherChar = null;
    this.clearRoom();
    this.role = null;
    this.phase = 'closed';
    this.fallbackAt = 0;
    this.signalSentAt = -Infinity;
    this.sendAt = 0;
    this.lastSentPanel = '';
    this.lastSentTurn = -1;
    this.pickSent = -1;
    this.remote = null;
    this.motion = [];
    this.events = [];
    this.turn = 0;
    this.lastPanel = '';
    this.out = '';
    App.utilityReturn = null;
  },

  leave() {
    this.link?.send({ t: 'bye' }, true);
    this.close();
    Input.keys.clear();
    Input.endJoy();
    UI.showMenu();
  },

  statusText(text) { this.status = text; UI.refreshLan(); },

  select(role) {
    if (this.phase !== 'pick') return;
    this.role = role;
    if (!globalThis.RTCPeerConnection) { this.statusText('此浏览器不支持好友联机，仍可直接和机器人开局。'); return; }
    if (role === 'host') this.makeLink();
    else {
      this.phase = 'offer-in';
      this.statusText('扫描房主的邀请二维码，或读取二维码图片。');
      (UI.$('btnLanScan').disabled ? UI.$('btnLanImage') : UI.$('btnLanScan')).focus();
    }
  },

  async makeLink(offer = '') {
    const host = this.role === 'host';
    let link;
    this.phase = 'busy';
    this.statusText('正在准备本地网络地址…');
    try {
      link = new LanLink(host, {
        open: () => { if (this.link === link) this.connected(); },
        lost: () => { if (this.link === link) this.lost(); },
        message: data => { if (this.link === link) this.receive(data); },
      });
      this.link = link;
      const code = await link.code(host ? 'offer' : 'answer', offer);
      if (this.link !== link) return;
      this.out = code;
      this.phase = host ? 'answer-in' : 'answer-out';
      if (host) this.fallbackAt = performance.now() + LAN_FALLBACK_MS;
      this.statusText(host ? '让好友先扫码，再扫描好友的应答二维码。' : '请房主扫描应答二维码，保持网页开启。');
    } catch (e) {
      if (this.link !== link && link) return;
      link?.close();
      this.link = null;
      this.phase = host ? 'pick' : 'offer-in';
      this.statusText(e instanceof DOMException ? '无法生成连接码，请检查局域网权限或重新复制邀请码。' : e.message);
    }
  },

  async useLegacyCode() {
    if (this.role !== 'host' || this.phase !== 'answer-in' || LEGACY_LAN_CODE.test(this.out)) return;
    const link = this.link;
    try {
      const code = await link.localCode('offer', true);
      if (this.link !== link || this.phase !== 'answer-in') return;
      this.out = code;
      this.statusText('已切换为兼容二维码，请让好友重新扫描。');
    } catch (e) {
      if (this.link === link) this.statusText(e.message);
    }
  },

  async accept(code) {
    if (!code) return;
    if (this.phase === 'offer-in') { await this.makeLink(code); return; }
    if (this.phase !== 'answer-in') return;
    const link = this.link;
    const deadline = this.fallbackAt;
    this.fallbackAt = Math.max(deadline, performance.now() + 6500);
    this.phase = 'answer-busy';
    this.statusText('正在连接队友…');
    try { await link.accept(code); } catch (e) {
      if (link !== this.link) return;
      this.fallbackAt = deadline;
      this.phase = 'answer-in';
      this.statusText(e instanceof DOMException ? '这不是当前邀请的应答，请重新扫描应答二维码。' : e.message);
    }
  },

  connected() {
    this.phase = 'connected';
    this.statusText('已连线，正在同步房间…');
    if (this.role === 'guest') this.link.send({ t: 'hello', version: LAN_ROOM_VERSION, char: this.char, stages: this.localStages }, true);
  },

  lost() {
    if (!this.running && this.role === 'host' && this.fallbackAt) { this.startBot('未连上好友，机器人已补位'); return; }
    if (this.running && Game.result) {
      this.link.close(); this.link = null;
      return; // 断线后保留已经收到的战报，等玩家主动返回。
    }
    const text = this.running ? '联机已断开，本局结束。重新交换连接码可再开一局。' :
      '连接已断开。请确认两台设备在同一个 Wi-Fi，网络允许设备互访，再重新交换连接码。';
    Input.keys.clear();
    Input.endJoy();
    this.open(text);
  },

  start() {
    if (this.running || this.role !== 'host' || this.phase !== 'connected' || !this.otherChar || !this.guestReady || !this.link?.writable) return;
    this.begin(this.otherChar, false);
  },

  tickLobby(now) {
    if (!this.fallbackAt || this.otherChar || this.running || document.hidden) return;
    const remaining = Math.max(0, Math.ceil((this.fallbackAt - now) / 1000));
    UI.updateLanCountdown(remaining);
    if (!remaining) this.startBot('没有好友就绪，机器人已补位');
  },

  startBot(message = '机器人搭档已出发') {
    if (this.running || this.phase === 'closed' || this.otherChar ||
        (this.role === 'guest' && this.phase === 'connected')) return false;
    this.close();
    this.role = 'bot';
    const partner = RobotPartner.pick(this.char, this.lastBotChar);
    this.lastBotChar = partner;
    this.begin(partner, true);
    UI.banner(message);
    return true;
  },

  begin(partner, robot) {
    const view = Game.view;
    const save = { data: { ...Save.defaults(), routes: Save.data.routes, stageSelection: this.localStages } };
    Game = createBattle({ save, emit: (e, v) => this.battleEvent(e, v), play: (...a) => this.sound(a) });
    Game.view = view;
    this.running = true;
    this.fallbackAt = 0;
    this.phase = 'playing';
    Game.start(this.char, partner, { robot, peerStages: this.peerStages });
    UI.cache = {};
    Input.keys.clear();
    Input.endJoy();
    UI.show(null);
    this.battleEvent('banner', STAGES[Game.stage].name);
    this.sendFrame();
  },

  battleEvent(e, v) {
    if (e === 'levelup') {
      this.turn++;
      Input.endJoy();
      if (this.localTurn) UI.showLevelUp(); else UI.showLanWait('等候队友选卡', '队友正在选择自己的升级，本局暂时暂停。');
    } else {
      if (e === 'banner' && this.link) this.events.push(['banner', v]);
      battleViews[e](v);
    }
    if (e !== 'banner') this.sendAt = 0;
  },

  sound(args) {
    Sfx.play(...args);
    if (this.link && this.events.length < 48 && !this.events.some(e => e[0] === 'sound' && e[1] === args[0])) this.events.push(['sound', ...args]);
  },

  sendFrame() {
    if (!this.link?.writable) return;
    const panel = Game.state, slot = Game.levelPlayer?.slot;
    const message = { t: 'frame', panel, turn: this.turn, slot, frame: LanState.packFrame(Game), events: this.events.slice(-48) };
    if (panel === 'levelup' && slot === 1) { message.choices = Game.choices; message.pending = Game.partner.pending; }
    if (Game.result) {
      message.result = { win: Game.result.win, kills: Game.result.kills };
      message.dmg = Game.partner.dmgBy;
    }
    if (this.link.send(message)) {
      this.lastSentPanel = panel;
      this.lastSentTurn = this.turn;
      this.events.length = 0;
    }
  },

  receive(data) {
    if (data.t === 'bye') { this.lost(); return; }
    if (['hello', 'ready', 'room'].includes(data.t)) { this.receiveRoom(data); return; }
    if (this.role === 'host') {
      if (!this.host) return;
      if (data.t === 'move' && LanState.number(data.x, -1, 1) && LanState.number(data.y, -1, 1)) {
        this.remote = { x: data.x, y: data.y, at: performance.now() };
      }
      if (data.t === 'pick' && Game.state === 'levelup' && Game.levelPlayer?.slot === 1 &&
          data.turn === this.turn && LanState.integer(data.index, 0, Game.choices.length - 1)) Game.choose(data.index);
      if (data.t === 'signal') Game.sendSignal(1, data.id);
      if (data.t === 'active' && LanState.own(ACTIVE_SKILLS, data.id) && LanState.number(data.x, -1, 1) && LanState.number(data.y, -1, 1)) {
        Game.useActive(1, data.id, { x: data.x, y: data.y });
      }
    } else if (this.role === 'guest' && this.phase === 'connected' && data.t === 'frame') {
      if (this.running || this.guestReady) this.applyFrame(data);
      else if (!this.otherChar && !this.oldRoomNotice) {
        this.oldRoomNotice = true;
        this.statusText('房主版本不支持准备流程，请双方刷新后重试。');
      }
    }
  },

  applyFrame(data) {
    const { panel, slot, turn } = data;
    if (!['playing', 'levelup', 'decision', 'route', 'paused', 'audio', 'victory', 'gameover'].includes(panel) ||
        !LanState.integer(turn, this.turn, 20000)) return;
    const f = LanState.readFrame(data.frame);
    if (!f || f.player.char !== this.char || (this.running && (f.time < Game.time || f.stage !== Game.stage)) ||
        !Environment.sharedStages(this.localStages, this.peerStages).includes(f.stage)) return;
    const choices = panel === 'levelup' && slot === 1 ? LanState.choices(data.choices) : [];
    if (panel === 'levelup' && slot === 1 && (!choices.length || !LanState.integer(data.pending, 1, f.player.level))) return;
    if (!this.running) {
      const view = Game.view;
      Game = createBattle({ save: { data: Save.defaults() } });
      Object.assign(Game, { coop: true, view, choose: index => this.pick(index), reroll() {} });
      this.running = true;
      UI.cache = {};
      Input.keys.clear();
    }
    this.prepareMotion(f, panel);
    const build = p => p.weapons.map(w => `${w.id}:${w.lv}`).concat(p.passives.map(q => `${q.id}:${q.lv}`)).join();
    const dirty = !Game.player || build(Game.player) !== build(f.player);
    Object.assign(Game, f, {
      state: panel, choices, dirty: Game.dirty || dirty, pending: slot === 1 ? data.pending : 0,
      levelPlayer: panel === 'levelup' ? f.players[slot === 1 ? 1 : 0] : null,
    });
    this.turn = turn;
    if (panel === 'victory' || panel === 'gameover') this.setResult(data);
    this.syncGuestPanel();
    this.playEvents(data.events);
  },

  setResult(data) {
    const p = Game.player;
    const stats = data.dmg && typeof data.dmg === 'object' ? data.dmg : {};
    for (const id of [...Object.keys(WEAPONS), 'revive']) if (LanState.number(stats[id], 0)) p.dmgBy[id] = stats[id];
    Game.result = { win: Game.state === 'victory', earned: 0, time: Game.time, level: p.level,
      kills: LanState.integer(data.result?.kills, 0, 1e8) ? data.result.kills : p.kills || 0, coop: true };
  },

  playEvents(events) {
    if (!Array.isArray(events)) return;
    for (const e of events.slice(0, 48)) {
      if (!Array.isArray(e)) continue;
      if (e[0] === 'banner' && LanState.anyText(e[1])) UI.banner(e[1]);
      if (e[0] === 'sound' && (LanState.own(SOUNDS, e[1]) || LanState.own(ARRIVAL_SOUNDS, e[1]))) {
        Sfx.play(e[1], LanState.number(e[2], 0, 1) ? e[2] : 1, LanState.number(e[3], -1, 1) ? e[3] : 0);
      }
    }
  },

  syncGuestPanel(force = false) {
    const state = Game.state, turn = this.localTurn;
    const key = state + (state === 'levelup' ? `:${this.turn}` : '');
    if (!force && key === this.lastPanel) return;
    if (state === 'playing' && (this.guestPause || App.utilityReturn)) return;
    App.utilityReturn = null;
    this.guestPause = false;
    this.lastPanel = key;
    Input.endJoy();
    if (state === 'playing') UI.show(null);
    else if (state === 'levelup' && turn) UI.showLevelUp();
    else if (Game.result) UI.showResult();
    else if (state === 'levelup') UI.showLanWait('等候房主选卡', '房主正在选择升级，本局暂时暂停。');
    else if (state === 'decision') UI.showLanWait('守夜抉择', '等房主决定如何迎战 Boss。');
    else if (state === 'route') UI.showLanWait('夜巡变阵', '等房主选择镇守或诱敌。');
    else UI.showLanWait('巡夜暂停', '房主暂停了战斗，等待继续。');
  },

  pick(index) {
    if (Game.state === 'levelup' && this.localTurn && this.pickSent !== this.turn &&
        LanState.integer(index, 0, Game.choices.length - 1)) {
      if (this.link?.send({ t: 'pick', turn: this.turn, index }, true)) this.pickSent = this.turn;
    }
  },

  sendSignal(id) {
    if (!this.running || Game.state !== 'playing' || !LanState.own(COOP_SIGNALS, id)) return false;
    if (!this.guest) return Game.sendSignal(0, id);
    const now = performance.now();
    if (now - this.signalSentAt < 2500 || !this.link?.send({ t: 'signal', id }, true)) return false;
    this.signalSentAt = now;
    return true;
  },

  sendActive(id, { x, y }) {
    return this.guest && !!this.link?.send({ t: 'active', id, x, y }, true);
  },

  prepareMotion(frame, panel) {
    this.motion = [];
    if (panel !== 'playing' || Game.state !== 'playing') return;
    const before = new Map(Game.enemies.map(e => [e.id, e]));
    const start = (next, prev) => {
      if (!prev || Math.hypot(prev.x - next.x, prev.y - next.y) > 180) return;
      this.motion.push([next, next.x, next.y]);
      next.x = prev.x; next.y = prev.y;
    };
    for (const p of frame.players) start(p, Game.players[p.slot]);
    for (const e of frame.enemies) start(e, before.get(e.id));
    this.motionLeft = 1 / 15;
  },

  step(dt, now) {
    if (this.role === 'bot') Game.update(dt, Input);
    else if (this.host) {
      const r = this.remote;
      Game.update(dt, Input, r && now - r.at < 300 ? r : {});
      if (now >= this.sendAt) {
        this.sendAt = now + 1000 / 15;
        if (Game.state === 'playing' || this.lastSentPanel !== Game.state || this.lastSentTurn !== this.turn || this.events.length) this.sendFrame();
      }
    } else if (this.guest) {
      if (now >= this.sendAt) {
        this.sendAt = now + 1000 / 28;
        const move = Game.state === 'playing' && !this.guestPause && !App.utilityReturn && !document.hidden;
        const axis = x => Math.round(x * 100) / 100;
        this.link?.send({ t: 'move', x: move ? axis(Input.x) : 0, y: move ? axis(Input.y) : 0 });
      }
      const blend = Math.min(1, dt / (this.motionLeft || 1));
      for (const [e, x, y] of this.motion) { e.x += (x - e.x) * blend; e.y += (y - e.y) * blend; }
      this.motionLeft -= dt;
      if (this.motionLeft <= 0) this.motion.length = 0;
    }
  },
};
