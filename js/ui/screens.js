'use strict';
// ===== 界面:菜单、强化商店、升级选卡、宝箱、暂停、结算、HUD(均为 DOM) =====

const UI = {
  ...MenuUI, ...BattlePanelsUI, ...HudUI, ...UtilityUI, ...LanUI, ...ContractUI, ...CoopUI,
  cache: {},
  overlayId: null,
  $(id) { return document.getElementById(id); },

  init() {
    for (const el of document.querySelectorAll('[data-icon]')) el.innerHTML = Icons.html(el.dataset.icon);
    document.addEventListener('keydown', e => this.trapDialogTab(e));
    const on = (id, fn) => this.$(id).addEventListener('click', () => { Sfx.unlock(); Sfx.play('click'); fn(); });
    on('btnStart', () => App.startRun());
    on('btnCoreRoster', () => this.showMenu('core'));
    on('btnFolkRoster', () => this.showMenu('folk'));
    on('btnIntroSkip', () => App.finishIntro());
    on('btnShop', () => this.showShop());
    on('btnShopMeta', () => this.showShop('meta'));
    on('btnShopSkills', () => this.showShop('skills'));
    on('btnShopRoutes', () => this.showShop('routes'));
    on('btnShopTraining', () => this.showShop('training'));
    on('btnShopBack', () => this.showMenu());
    on('btnContracts', () => this.showContracts());
    on('btnContractAll', () => this.showContracts());
    on('btnContractMap', () => this.showContracts('map'));
    on('btnContractFight', () => this.showContracts('fight'));
    on('btnContractsBack', () => this.showMenu());
    on('btnClearContract', () => this.selectContract(null));
    on('btnReroll', () => Game.reroll());
    on('btnNormalFight', () => Game.state === 'route' ? Game.chooseFork('bamboo') : Game.chooseBossPlan('normal'));
    on('btnChestOk', () => Game.closeChest());
    on('btnResume', () => App.resume());
    on('btnQuit', () => Lan.guest ? Lan.leave() : Game.finish(false));
    on('btnRetry', () => App.startRun());
    on('btnMenu', () => Lan.running ? Lan.leave() : this.showMenu());
    on('btnPause', () => App.pause());
    this.initUtilities(on);
    this.initLan(on);
    this.initSignals(on);
    this.initActives();
    this.showMenu();
  },

  // 显示指定浮层(null = 全部隐藏),并同步 HUD 可见性
  show(id) {
    if (id) this.closeSignals();
    const previous = this.overlayId;
    this.overlayId = id;
    if (id === 'pause' && !['pause', 'audio', 'practice'].includes(previous)) {
      this.pauseFromHud = this.$('hud').contains(document.activeElement);
    }
    if (id === 'decision' && id !== previous) this.decisionFocus = this.$('hud').contains(document.activeElement) ? document.activeElement : null;
    for (const o of document.querySelectorAll('.overlay')) o.classList.toggle('hidden', o.id !== id);
    const inRun = !!Game.player && Game.state !== 'menu' && Game.state !== 'intro';
    const hud = this.$('hud');
    hud.classList.toggle('hidden', !inRun);
    hud.inert = !inRun || !!id;
    if (id === previous && (!id || id === 'menu' || this.$(id).contains(document.activeElement))) return;
    if (id && id !== 'menu') {
      const title = this.$(id).querySelector('h2');
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    } else if (id === 'menu' && previous) {
      const from = { shop: 'btnShop', lan: 'btnLan', contracts: 'btnContracts' };
      this.$(from[previous] || 'btnStart').focus();
    } else if (previous === 'pause' && this.pauseFromHud) {
      this.$('btnPause').focus({ preventScroll: true });
    } else if (previous === 'decision' && this.decisionFocus) {
      this.decisionFocus.focus({ preventScroll: true });
      this.decisionFocus = null;
    }
  },

  trapDialogTab(e) {
    const id = this.overlayId;
    if (e.key !== 'Tab' || !id || id === 'menu') return;
    const controls = [...this.$(id).querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter(el => el.getClientRects().length);
    if (!controls.length) return;
    const current = controls.indexOf(document.activeElement);
    const last = controls.length - 1;
    if (current === -1 || (e.shiftKey ? current === 0 : current === last)) {
      e.preventDefault();
      controls[e.shiftKey ? last : 0].focus();
    }
  },

};
