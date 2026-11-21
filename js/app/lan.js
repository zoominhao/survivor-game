'use strict';

// 大厅与浏览器会话。房主应用来客输入；来客的 Game 只读权威快照，不运行战斗。
const Lan = {
  phase: 'closed',
  get guest() { return this.running && this.role === 'guest'; },
  get host() { return this.running && this.role === 'host'; },
  get localTurn() { return !this.running || Game.levelPlayer?.slot === Game.player.slot; },

  open(message = '') {
    this.close();
    this.char = Save.data.lastChar;
    this.phase = 'pick';
    this.status = message || `已选 ${CHARS[this.char].name}。两台设备连同一个 Wi-Fi，最多两人；不计入单人存档。`;
    UI.$('lanIn').value = '';
    UI.show('lan');
    UI.refreshLan();
  },

  close() {
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
    this.role = null;
    this.phase = 'closed';
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
    if (!globalThis.RTCPeerConnection) { this.statusText('此浏览器不支持局域网联机。请用新版 Chrome、Edge 或 Safari。'); return; }
    if (role === 'host') this.makeLink();
    else {
      this.phase = 'offer-in';
      this.statusText('粘贴房主发来的邀请码，生成应答码。');
      UI.$('lanIn').focus();
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
      this.statusText(host ? '把邀请码发给队友，再粘贴对方回传的应答码。' : '把应答码回传房主，保持网页开启。');
    } catch (e) {
      if (this.link !== link && link) return;
      link?.close();
      this.link = null;
      this.phase = host ? 'pick' : 'offer-in';
      this.statusText(e instanceof DOMException ? '无法生成连接码，请检查局域网权限或重新复制邀请码。' : e.message);
    }
  },

  async accept(code) {
    if (this.phase === 'offer-in') { await this.makeLink(code); return; }
    if (this.phase !== 'answer-in') return;
    const link = this.link;
    this.phase = 'answer-busy';
    this.statusText('正在连接队友…');
    try { await link.accept(code); } catch (e) {
      if (link !== this.link) return;
      this.phase = 'answer-in';
      this.statusText(e instanceof DOMException ? '这不是当前邀请的应答码，请重新复制。' : e.message);
    }
  },

  connected() {
    this.phase = 'connected';
    this.statusText(this.role === 'host' ? '已连线，正在等队友确认角色。' : '已连线，等待房主开局。');
    if (this.role === 'guest') this.link.send({ t: 'hello', char: this.char }, true);
  },

  lost() {
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
    if (this.running || this.role !== 'host' || !this.otherChar || !this.link?.writable) return;
    const view = Game.view;
    const save = { data: Save.defaults() };
    Game = createBattle({ save, emit: (e, v) => this.battleEvent(e, v), play: (...a) => this.sound(a) });
    Game.view = view;
    this.running = true;
    Game.start(this.char, this.otherChar);
    UI.cache = {};
    Input.keys.clear();
    Input.endJoy();
    UI.show(null);
    this.sendFrame();
  },

  battleEvent(e, v) {
    if (e === 'levelup') {
      this.turn++;
      Input.endJoy();
      if (this.localTurn) UI.showLevelUp(); else UI.showLanWait('等候队友选卡', '队友正在选择自己的升级，本局暂时暂停。');
    } else {
      if (e === 'banner') this.events.push(['banner', v]);
      battleViews[e](v);
    }
    if (e !== 'banner') this.sendAt = 0;
  },

  sound(args) {
    Sfx.play(...args);
    if (this.events.length < 48 && !this.events.some(e => e[0] === 'sound' && e[1] === args[0])) this.events.push(['sound', ...args]);
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
    if (this.role === 'host') {
      if (!this.running && this.phase === 'connected' && data.t === 'hello' && !this.otherChar && LanState.own(CHARS, data.char)) {
        this.otherChar = data.char;
        this.statusText(`2 / 2 已就绪 · ${CHARS[this.char].name} / ${CHARS[this.otherChar].name}`);
      }
      if (!this.host) return;
      if (data.t === 'move' && LanState.number(data.x, -1, 1) && LanState.number(data.y, -1, 1)) {
        this.remote = { x: data.x, y: data.y, at: performance.now() };
      }
      if (data.t === 'pick' && Game.state === 'levelup' && Game.levelPlayer?.slot === 1 &&
          data.turn === this.turn && LanState.integer(data.index, 0, Game.choices.length - 1)) Game.choose(data.index);
    } else if (this.role === 'guest' && this.phase === 'connected' && data.t === 'frame') this.applyFrame(data);
  },

  applyFrame(data) {
    const { panel, slot, turn } = data;
    if (!['playing', 'levelup', 'decision', 'paused', 'audio', 'victory', 'gameover'].includes(panel) ||
        !LanState.integer(turn, this.turn, 20000)) return;
    const f = LanState.readFrame(data.frame);
    if (!f || f.player.char !== this.char || (this.running && f.time < Game.time)) return;
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
    else UI.showLanWait('巡夜暂停', '房主暂停了战斗，等待继续。');
  },

  pick(index) {
    if (Game.state === 'levelup' && this.localTurn && this.pickSent !== this.turn &&
        LanState.integer(index, 0, Game.choices.length - 1)) {
      if (this.link?.send({ t: 'pick', turn: this.turn, index }, true)) this.pickSent = this.turn;
    }
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
    if (this.host) {
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
