'use strict';

const UtilityUI = {
  mixControls: [['music', 'volumeMusic', 'valueMusic'], ['effects', 'volumeEffects', 'valueEffects']],

  initUtilities(on) {
    for (const id of ['btnAudio', 'btnAudioMenu', 'btnAudioPause']) on(id, () => App.openUtility('audio'));
    for (const id of ['btnCloseAudio', 'btnClosePractice']) on(id, () => App.closeUtility());
    on('btnMute', () => App.toggleMute());
    const practice = this.$('practice');
    this.soundSamples = practice.querySelectorAll('[data-sound-sample]');
    this.musicSamples = practice.querySelectorAll('[data-music-sample]');
    for (const button of this.soundSamples) {
      button.addEventListener('click', () => { Sfx.unlock(); Sfx.play(button.dataset.soundSample); });
    }
    for (const button of this.musicSamples) {
      button.addEventListener('click', () => {
        Sfx.unlock();
        this.$('soundTestStatus').textContent = Sfx.previewTrack(button.dataset.musicSample) ? `「${button.textContent}」试听 8 秒` : '当前无法试听配乐';
      });
    }
    for (const [channel, id] of this.mixControls) {
      const slider = this.$(id);
      const change = persist => {
        Sfx.unlock();
        Sfx.setVolume(channel, slider.valueAsNumber, persist);
        this.refreshAudio();
      };
      slider.addEventListener('input', () => change(false));
      slider.addEventListener('change', () => change(true));
    }
    this.$('watchClock').addEventListener('click', () => App.tapPractice());
    for (const button of this.$('practice').querySelectorAll('[data-practice]')) {
      button.addEventListener('click', () => {
        if (!Game.usePractice(button.dataset.practice)) return;
        Sfx.play('click');
        this.refreshPractice();
      });
    }
    this.refreshAudio();
  },

  refreshAudio() {
    for (const [channel, id, output] of this.mixControls) {
      const level = Sfx.levels[channel];
      this.$(id).value = level;
      this.$(output).value = `${level}%`;
    }
    const silent = Sfx.muted || (!Sfx.levels.music && !Sfx.levels.effects);
    for (const id of ['btnAudio', 'btnAudioMenu']) this.$(id).innerHTML = Icons.html(silent ? 'mute' : 'sound');
    this.$('btnMute').setAttribute('aria-pressed', String(Sfx.muted));
    this.$('audioStatus').textContent = Sfx.muted ? '总静音已开启，解除后恢复滑杆音量。' :
      '两条音量独立，调到 0% 可单独静音。';
    this.refreshSoundTests();
  },

  refreshSoundTests() {
    for (const button of this.soundSamples) button.disabled = Sfx.muted || !Sfx.levels.effects;
    for (const button of this.musicSamples) button.disabled = Sfx.muted || !Sfx.levels.music;
    this.$('soundTestStatus').textContent = Sfx.muted ? '总静音已开启；按 M 可解除。' :
      !Sfx.levels.music || !Sfx.levels.effects ? '音量为 0% 的试听已停用，可在声音设置里调高。' : '配乐试听 8 秒，返回战斗后恢复。';
  },

  refreshPractice() {
    const p = Game.player, panel = this.$('practice');
    this.refreshSoundTests();
    this.$('practiceLife').textContent = `生命 ${Math.ceil(p.hp)}/${p.st.maxHp}`;
    this.$('practiceCoins').textContent = `金币 ${Math.floor(p.coins)}`;
    this.$('practiceLevel').textContent = `修为 ${p.level}`;
    this.$('practiceGuard').textContent = `无敌${Game.practiceInvincible ? '开启' : '关闭'}`;
    panel.querySelector('[data-practice="invincible"]').setAttribute('aria-pressed', String(Game.practiceInvincible));
    const heal = panel.querySelector('[data-practice="heal"]');
    const hadFocus = document.activeElement === heal;
    heal.disabled = p.hp >= p.st.maxHp;
    if (heal.disabled && hadFocus) this.$('btnClosePractice').focus();
  },
};
