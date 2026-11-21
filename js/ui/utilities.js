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
    this.$('menuWatchSeal').addEventListener('click', () => { Sfx.unlock(); App.tapPractice(); });
    for (const button of this.$('practice').querySelectorAll('[data-practice]')) {
      button.addEventListener('click', () => {
        if (!Game.usePractice(button.dataset.practice)) return;
        Sfx.play('click');
        this.refreshPractice();
      });
    }
    const minutes = this.$('practiceMinutes');
    minutes.min = PRACTICE_MINUTES.min;
    minutes.max = PRACTICE_MINUTES.max;
    this.$('practiceDurationForm').addEventListener('submit', event => {
      event.preventDefault();
      if (!Game.setPracticeDuration(minutes.valueAsNumber)) return;
      Sfx.play('click');
      this.refreshPracticeDuration();
    });
    this.refreshAudio();
  },

  refreshAudio() {
    for (const [channel, id, output] of this.mixControls) {
      const level = Sfx.levels[channel];
      this.$(id).value = level;
      this.$(output).value = `${level}%`;
    }
    const silent = Sfx.muted || (!Sfx.levels.music && !Sfx.levels.effects);
    const icon = Icons.html(silent ? 'mute' : 'sound');
    for (const id of ['btnAudio', 'btnAudioMenu']) this.$(id).innerHTML = icon;
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
    const inRun = Game.state === 'practice', p = Game.player, panel = this.$('practice');
    this.refreshSoundTests();
    this.$('practiceLiveStats').classList.toggle('hidden', !inRun);
    this.$('practiceLiveActions').classList.toggle('hidden', !inRun);
    if (inRun) {
      this.$('practiceLife').textContent = `生命 ${Math.ceil(p.hp)}/${p.st.maxHp}`;
      this.$('practiceCoins').textContent = `金币 ${Math.floor(p.coins)}`;
      this.$('practiceLevel').textContent = `修为 ${p.level}`;
      this.$('practiceGuard').textContent = `无敌${Game.practiceInvincible ? '开启' : '关闭'}`;
    }
    this.$('practiceRosterStatus').textContent = Game.practiceRoster ? '已开启试玩，返回名册选角' : '全角色试玩关闭';
    this.$('practiceStageStatus').textContent = Game.practiceStages ? '全场景试玩已开启，返回场景库选图' : '';
    panel.querySelector('[data-practice="invincible"]').setAttribute('aria-pressed', String(Game.practiceInvincible));
    this.$('btnPracticeRoster').setAttribute('aria-pressed', String(Game.practiceRoster));
    this.$('btnPracticeStages').setAttribute('aria-pressed', String(Game.practiceStages));
    this.refreshPracticeDuration();
    const heal = panel.querySelector('[data-practice="heal"]');
    const hadFocus = document.activeElement === heal;
    heal.disabled = !inRun || p.hp >= p.st.maxHp;
    if (heal.disabled && hadFocus) this.$('btnClosePractice').focus();
  },

  refreshPracticeDuration() {
    const setup = Game.state === 'practiceSetup';
    const minutes = (setup ? Game.practiceNextDuration ?? CFG.RUN_TIME : Game.duration) / 60;
    this.$('practiceTimeLabel').textContent = setup ? '下局单人时长' : '本局总时长';
    this.$('practiceMinutes').value = minutes;
    this.$('practiceTimeNote').textContent = setup ? (Game.practiceNextDuration ? `下局单人 ${minutes} 分钟 · 仅生效一次，不计战绩。` :
      `下一局使用默认时长。可设 ${PRACTICE_MINUTES.min}–${PRACTICE_MINUTES.max} 分钟。`) :
      Game.duration <= Game.time ? '已达到新时长，返回战斗即结算练习局。' :
      `本局 ${minutes} 分钟 · 允许 ${PRACTICE_MINUTES.min}–${PRACTICE_MINUTES.max} 分钟，重开恢复默认。`;
  },
};
