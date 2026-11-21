'use strict';

// [声源, 起始频率, 结束频率, 时长, 音量, 延迟, 低通频率/噪声带通 Q, 起音时长]。
// 人声层：[voice, 素材, 播放速率, 音量, 延迟]。
const BRIDE_CALL = ['voice', 'bride', 1, 0.96, 0.08];
const CORPSE_CALL = ['voice', 'corpse', 1, 0.92, 0];
const ARRIVAL_SOUNDS = {
  // 傩锣之后是两层不协和的喉鸣和拖长的喘息。
  boss: [1.9, ['triangle', 572, 319, 0.46, 0.53, 0, 1750], ['sine', 174, 49, 0.58, 0.50],
    ['noise', 2400, 830, 0.21, 0.54], ['triangle', 829, 480, 0.36, 0.51, 0.034, 2100, 0.05],
    ['sawtooth', 285, 101, 1.25, 0.42, 0.13, 1120, 0.15],
    ['sawtooth', 302, 108, 1.34, 0.29, 0.14, 1530, 0.19], ['noise', 1330, 410, 1.68, 0.57, 0.16, 0.8, 0.26]],
  // 两下砸棺、木板刮开，最后是棺底坠地。
  coffinKingArrival: [1.7, ['triangle', 422, 118, 0.43, 0.51, 0, 1200], ['sine', 139, 48, 0.40, 0.43],
    ['noise', 1840, 630, 0.22, 0.55], ['triangle', 354, 105, 0.36, 0.47, 0.25, 1000],
    ['noise', 570, 2830, 1.00, 0.78, 0.37, 0.7, 0.21], ['sawtooth', 250, 157, 0.86, 0.23, 0.43, 1050, 0.35],
    ['triangle', 318, 77, 0.50, 0.45, 0.98, 970], ['sine', 143, 36, 0.59, 0.44, 0.98]],
  // 先响一记喜铃，轿帘里的声音紧跟在前景，尾音才交给不协和的铃声。
  bridalQueenArrival: [2.6, ['voice', 'bride', 0.86, 1.0, 0.09], ['triangle', 807, 740, 0.48, 0.28, 0, 2600],
    ['sine', 851, 797, 0.42, 0.2], ['triangle', 861, 448, 1.05, 0.30, 1.18, 2040, 0.18]],
  paperChildArrival: [1.2, ['noise', 3240, 1490, 0.40, 0.73, 0, 0.7], ['triangle', 878, 551, 0.29, 0.45],
    ['sawtooth', 1310, 970, 0.30, 0.29, 0.06, 2310, 0.035], ['noise', 2800, 970, 0.31, 0.63, 0.26, 0.8],
    ['triangle', 1220, 719, 0.27, 0.35, 0.30], ['triangle', 816, 398, 0.60, 0.31, 0.50, 1720, 0.13]],
  corpseAmbush: [1.4, CORPSE_CALL, ['voice', 'corpse', 0.84, 0.42, 0.24],
    ['triangle', 371, 103, 0.37, 0.20, 0, 1070], ['triangle', 316, 98, 0.32, 0.19, 0.47, 910]],
  corpseSnarl: [4.5, CORPSE_CALL],
  umbrellaOpen: [1.2, ['noise', 740, 3080, 0.39, 0.77, 0, 0.65, 0.085], ['triangle', 723, 411, 0.25, 0.44],
    ['triangle', 1250, 586, 0.28, 0.38, 0.14], ['sine', 902, 624, 0.76, 0.43, 0.25],
    ['noise', 2320, 570, 0.89, 0.57, 0.28, 0.8, 0.17]],
  brideArrival: [2.5, BRIDE_CALL, ['triangle', 591, 572, 0.44, 0.21, 0, 1900],
    ['sine', 1280, 1138, 0.68, 0.19, 1.24], ['noise', 1950, 625, 0.68, 0.21, 0.92, 0.8, 0.16]],
  brideAccuse: [8, BRIDE_CALL],
  envoyCall: [1.35, ['triangle', 514, 207, 0.49, 0.48, 0, 1300], ['noise', 3460, 1350, 0.24, 0.68],
    ['sine', 1173, 823, 0.37, 0.25, 0.10], ['noise', 2800, 1130, 0.36, 0.71, 0.33, 1.1],
    ['sawtooth', 266, 106, 0.89, 0.40, 0.43, 1250, 0.19]],
  siegeArrival: [1.25, ['triangle', 614, 179, 0.35, 0.50, 0, 1550], ['noise', 2280, 810, 0.27, 0.61],
    ['triangle', 552, 147, 0.34, 0.45, 0.19, 1350], ['sine', 168, 45, 0.58, 0.45, 0.35],
    ['noise', 1730, 365, 0.88, 0.66, 0.35, 0.6, 0.17]],
};

// 试听另记冷却，不会吞掉接下来战斗里的实际登场声。
ARRIVAL_SOUNDS.sampleArrival = ARRIVAL_SOUNDS.paperChildArrival;
ARRIVAL_SOUNDS.sampleBride = [1.8, BRIDE_CALL];
ARRIVAL_SOUNDS.sampleCorpse = [0.95, CORPSE_CALL];

// 一个音频上下文只生成一小段白噪声；带通扫频把它变成纸响、喘息和刮擦。
const arrivalNoiseBuffers = new WeakMap();

function arrivalNoise(ctx) {
  if (!arrivalNoiseBuffers.has(ctx)) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      samples[i] = seed / 2147483648;
    }
    arrivalNoiseBuffers.set(ctx, buffer);
  }
  const source = ctx.createBufferSource();
  source.buffer = arrivalNoiseBuffers.get(ctx);
  source.loop = true;
  return source;
}

function playArrival(ctx, output, now, cue, gain, pan) {
  let duration = 0;
  for (let i = 1; i < cue.length; i++) {
    if (cue[i][0] === 'voice') {
      const [, id, rate, volume, delay = 0] = cue[i];
      const end = delay + playGhostVoice(ctx, output, now + delay, id, rate, volume * gain, pan);
      duration = Math.max(duration, end);
      continue;
    }
    const [wave, from, to, dur, volume, delay = 0, shape, attack] = cue[i];
    const at = now + delay;
    duration = Math.max(duration, delay + dur);
    if (wave !== 'noise') {
      audioTone(ctx, output, at, wave, from, to, dur, volume * gain, shape, pan, attack);
      continue;
    }
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = shape ?? 0.8;
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(to, at + dur);
    playAudioVoice(ctx, output, arrivalNoise(ctx), filter, at, dur, volume * gain, pan, attack);
  }
  return duration;
}
