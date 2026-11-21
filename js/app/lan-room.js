'use strict';

const LAN_ROOM_VERSION = 7;
const LanRoom = {
  clearRoom() {
    this.guestReady = false;
    this.readyPending = false;
    this.oldRoomNotice = false;
    this.peerStages = [];
  },

  readStagePool(stages) {
    if (!Array.isArray(stages) || !stages.length || stages.length > Object.keys(STAGES).length ||
        !stages.every(id => Environment.isStage(id)) || new Set(stages).size !== stages.length) return null;
    return stages;
  },

  shareRoom() {
    this.link?.send({ t: 'room', version: LAN_ROOM_VERSION, char: this.char, ready: this.guestReady, stages: this.localStages }, true);
    this.statusText(this.guestReady ? '队友已准备，可以开始。' : '已在同一房间，等队友点准备。');
  },

  receiveRoom(data) {
    if (this.running || this.phase !== 'connected') return;
    if (this.role === 'host') {
      if (data.t === 'hello' && !this.otherChar) {
        if (data.version !== LAN_ROOM_VERSION) { this.statusText('双方游戏版本不同，请刷新后重试。'); return; }
        const stages = this.readStagePool(data.stages);
        if (!LanState.own(CHARS, data.char) || !stages) return;
        this.peerStages = stages;
        this.otherChar = data.char;
        this.fallbackAt = 0;
        this.shareRoom();
      } else if (data.t === 'ready' && this.otherChar && typeof data.ready === 'boolean') {
        this.guestReady = data.ready;
        this.shareRoom();
      }
    } else if (this.role === 'guest' && data.t === 'room' && data.version === LAN_ROOM_VERSION &&
               LanState.own(CHARS, data.char) && typeof data.ready === 'boolean') {
      const stages = this.readStagePool(data.stages);
      if (!stages) return;
      this.peerStages = stages;
      this.otherChar = data.char;
      this.guestReady = data.ready;
      this.readyPending = false;
      this.statusText(this.guestReady ? '你已准备，等房主开始。' : '已在同一房间，点准备后一起开局。');
    }
  },

  toggleReady() {
    if (this.running || this.phase !== 'connected' || this.role !== 'guest' || !this.otherChar || this.readyPending) return;
    if (this.link?.send({ t: 'ready', ready: !this.guestReady }, true)) {
      this.readyPending = true;
      this.statusText('正在同步准备状态…');
    }
  },
};
