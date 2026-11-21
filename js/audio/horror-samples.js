'use strict';

const horrorBanks = new WeakMap();

function warmHorrorAudio(ctx) {
  if (!ctx.decodeAudioData) return;
  if (horrorBanks.has(ctx)) return horrorBanks.get(ctx).ready;
  const buffers = new Map();
  const ready = Promise.all(Object.entries(HORROR_AUDIO_DATA).map(async ([id, source]) => {
    try {
      const bytes = Uint8Array.from(atob(source), ch => ch.charCodeAt(0));
      const file = await ctx.decodeAudioData(bytes.buffer);
      if (file?.duration > 0) buffers.set(id, file);
    } catch { /* 解码失败或浏览器不支持时，继续使用原有合成素材。 */ }
  }));
  horrorBanks.set(ctx, { buffers, ready });
  return ready;
}

function horrorSample(ctx, id) {
  return horrorBanks.get(ctx)?.buffers.get(id);
}

function playHorrorArrival(ctx, output, now, name, gain, pan) {
  const id = name === 'sampleArrival' ? 'paperChildArrival' : name === 'sampleCoffin' ? 'coffinKingArrival' : name;
  const buffer = horrorSample(ctx, id);
  if (!buffer) return 0;
  const source = ctx.createBufferSource(), volume = ctx.createGain();
  source.buffer = buffer;
  volume.gain.value = gain * 0.88;
  source.connect(volume);
  const stereo = pan ? ctx.createStereoPanner?.() : null;
  if (stereo) { stereo.pan.value = pan; volume.connect(stereo); stereo.connect(output); }
  else volume.connect(output);
  source.onended = () => { source.disconnect(); volume.disconnect(); stereo?.disconnect(); };
  source.start(now);
  return buffer.duration;
}
