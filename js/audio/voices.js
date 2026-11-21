'use strict';

const ghostVoiceBuffers = new WeakMap();
const GHOST_VOICE_RATE = 16000;

function fillBrideVoice(samples) {
  const data = atob(BRIDE_VOICE_DATA);
  for (let i = 0; i < data.length; i++) {
    const b = data.charCodeAt(i);
    const amplitude = (256 ** ((b & 127) / 127) - 1) / 255;
    samples[i] = b & 128 ? -amplitude : amplitude;
  }
}

function voiceFormant(hz, width) {
  const decay = Math.exp(-Math.PI * width / GHOST_VOICE_RATE);
  const feedback = 2 * decay * Math.cos(TAU_AUDIO * hz / GHOST_VOICE_RATE);
  let last = 0, before = 0;
  return input => {
    const output = input * (1 - decay) + feedback * last - decay ** 2 * before;
    before = last; last = output;
    return output;
  };
}

const TAU_AUDIO = 2 * Math.PI;

function fillCorpseVoice(samples) {
  // 脉冲声门、口腔共鸣和咬牙摩擦分别塑形，不再用低音撞击冒充吼叫。
  const jaw = voiceFormant(570, 165), throat = voiceFormant(1150, 260), grit = voiceFormant(2630, 650);
  const pulse = (t, center, width) => Math.exp(-(((t - center) / width) ** 2));
  let phase = 0, seed = 251, low = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / GHOST_VOICE_RATE;
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const noise = seed / 2147483648;
    low += (noise - low) * 0.14;
    phase += TAU_AUDIO * (76 + 47 * Math.exp(-4.8 * t) + 19 * Math.sin(24 * t) + 11 * low) / GHOST_VOICE_RATE;
    const flutter = 0.56 + 0.44 * Math.sin(phase * 0.48 + 5.2 * t);
    const vocal = (Math.max(0, Math.sin(phase)) ** 7 - 0.146) * flutter * 0.8 + low * 0.51;
    const breath = pulse(t, 0.188, 0.098) * 0.83 + pulse(t, 0.402, 0.125) + pulse(t, 0.652, 0.116) * 0.51;
    const teeth = pulse(t, 0.075, 0.024) * 0.65 + pulse(t, 0.347, 0.017) * 0.50 + pulse(t, 0.675, 0.033);
    const body = 1.0 * jaw(vocal) + 1.1 * throat(vocal + low * 0.46);
    const fade = Math.min(1, t / 0.02, (samples.length - 1 - i) / (GHOST_VOICE_RATE * 0.095));
    samples[i] = Math.tanh(2.1 * (breath * body + grit(noise - low) * (breath * 0.58 + teeth * 1.35))) * 0.82 * fade;
  }
}

function ghostVoiceBuffer(ctx, id) {
  let assets = ghostVoiceBuffers.get(ctx);
  if (!assets) { assets = new Map(); ghostVoiceBuffers.set(ctx, assets); }
  if (!assets.has(id)) {
    const bride = id === 'bride';
    const length = bride ? Math.floor(BRIDE_VOICE_DATA.replace(/=+$/, '').length * 3 / 4) : Math.round(GHOST_VOICE_RATE * 0.91);
    const buffer = ctx.createBuffer(1, length, GHOST_VOICE_RATE);
    (bride ? fillBrideVoice : fillCorpseVoice)(buffer.getChannelData(0));
    assets.set(id, buffer);
  }
  return assets.get(id);
}

function playGhostVoice(ctx, output, at, id, rate, gain, pan) {
  const source = ctx.createBufferSource(), volume = ctx.createGain();
  source.buffer = ghostVoiceBuffer(ctx, id);
  source.playbackRate.value = rate;
  volume.gain.value = gain;
  const stereo = pan ? ctx.createStereoPanner?.() : null;
  source.connect(volume);
  if (stereo) { stereo.pan.value = pan; volume.connect(stereo); stereo.connect(output); }
  else volume.connect(output);
  source.onended = () => { source.disconnect(); volume.disconnect(); stereo?.disconnect(); };
  source.start(at);
  return source.buffer.duration / rate;
}
