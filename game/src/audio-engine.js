// 100% offline Web Audio synthesizer for Garuda G-4: twin-turboprop engine hum,
// propeller blade beat, airflow wind rush, stall warning horn, ring chimes, and touchdown audio.

export function createAudioEngine() {
  let ctx = null;
  let muted = false;
  let engineOscA = null;
  let engineOscB = null;
  let engineGain = null;
  let windGain = null;
  let stallOsc = null;
  let stallGain = null;

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();

    // Twin slightly detuned saw/triangle turboprop voices
    engineOscA = ctx.createOscillator();
    engineOscB = ctx.createOscillator();
    engineOscA.type = 'sawtooth';
    engineOscB.type = 'triangle';
    engineOscA.frequency.value = 72;
    engineOscB.frequency.value = 145;

    const engFilter = ctx.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 320;

    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;

    engineOscA.connect(engFilter);
    engineOscB.connect(engFilter);
    engFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOscA.start();
    engineOscB.start();

    // Filtered white-noise airflow wind
    const bufSize = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 540;
    windFilter.Q.value = 0.9;

    windGain = ctx.createGain();
    windGain.gain.value = 0.0;
    noiseSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    noiseSrc.start();

    // Stall warning horn
    stallOsc = ctx.createOscillator();
    stallOsc.type = 'square';
    stallOsc.frequency.value = 880;
    stallGain = ctx.createGain();
    stallGain.gain.value = 0;
    stallOsc.connect(stallGain);
    stallGain.connect(ctx.destination);
    stallOsc.start();
  }

  function updateAudio(flightState, timeSec) {
    if (!ctx || muted) {
      if (engineGain) engineGain.gain.value = 0;
      if (windGain) windGain.gain.value = 0;
      if (stallGain) stallGain.gain.value = 0;
      return;
    }
    const alive = flightState.status !== 'crashed' && flightState.fuelKg > 0.05;
    const thr = alive ? flightState.throttle : 0;
    engineOscA.frequency.setTargetAtTime(58 + thr * 68, ctx.currentTime, 0.08);
    engineOscB.frequency.setTargetAtTime(118 + thr * 138, ctx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(alive ? 0.03 + thr * 0.055 : 0.0, ctx.currentTime, 0.1);

    const windLevel = Math.min(0.06, Math.max(0, (flightState.airspeedKts - 40) / 180) * 0.055);
    windGain.gain.setTargetAtTime(windLevel, ctx.currentTime, 0.1);

    const beep = flightState.stalling && Math.sin(timeSec * 22) > 0;
    stallGain.gain.setTargetAtTime(beep ? 0.035 : 0, ctx.currentTime, 0.02);
  }

  function playTone(freq, duration, type = 'sine', volume = 0.09, slideTo = null) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    g.gain.setValueAtTime(volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playRingChime() {
    playTone(660, 0.14, 'triangle', 0.09, 990);
    setTimeout(() => playTone(990, 0.2, 'triangle', 0.08, 1320), 90);
  }

  function playTouchdown(hard) {
    playTone(hard ? 130 : 180, hard ? 0.35 : 0.16, 'sawtooth', hard ? 0.14 : 0.07, 52);
  }

  function playCrash() {
    playTone(110, 0.65, 'sawtooth', 0.18, 34);
  }

  function playRadioSquelch(durationSec = 0.11, endBeep = false) {
    if (!ctx || muted) return;
    // Authentic VHF radio PTT squelch burst (bandpass 450-2500 Hz static click)
    const frames = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const env = Math.sin((i / frames) * Math.PI);
      ch[i] = (Math.random() * 2 - 1) * env * 0.32;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1450;
    bp.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.value = 0.14;
    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start();
    if (endBeep) {
      setTimeout(() => playTone(1240, 0.055, 'sine', 0.045, 1180), Math.round(durationSec * 700));
    }
  }

  let lastRadioAt = 0;
  function playRadioCall(text, urgent = false) {
    // 100% Procedural Web Audio VHF Radio Comms (PTT click + AM static carrier + formant-filtered radio speech cadence + roger beep)
    // Zero robotic OS TTS — sounds like authentic bandpass-filtered aviation headset chatter paired with HUD VHF subtitle!
    if (!ctx || muted || !text) return;
    const now = performance.now();
    if (!urgent && now - lastRadioAt < 1800) return;
    lastRadioAt = now;

    const words = Math.max(4, Math.min(12, text.split(/\s+/).length));
    const totalDur = Math.min(2.2, 0.35 + words * 0.14);
    const t0 = ctx.currentTime;

    // 1. Opening PTT mic squelch click
    playRadioSquelch(0.09, false);

    // 2. Bandpass-filtered VHF static carrier bed (420 - 2300 Hz)
    const bedFrames = Math.floor(ctx.sampleRate * totalDur);
    const bedBuf = ctx.createBuffer(1, bedFrames, ctx.sampleRate);
    const bedData = bedBuf.getChannelData(0);
    for (let i = 0; i < bedFrames; i++) {
      bedData[i] = (Math.random() * 2 - 1) * 0.16;
    }
    const bedSrc = ctx.createBufferSource();
    bedSrc.buffer = bedBuf;
    const radioBp = ctx.createBiquadFilter();
    radioBp.type = 'bandpass';
    radioBp.frequency.value = 1350;
    radioBp.Q.value = 1.9;
    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(0.001, t0);
    bedGain.gain.linearRampToValueAtTime(0.09, t0 + 0.06);
    bedGain.gain.setValueAtTime(0.085, t0 + totalDur - 0.08);
    bedGain.gain.linearRampToValueAtTime(0.001, t0 + totalDur);
    bedSrc.connect(radioBp);
    radioBp.connect(bedGain);
    bedGain.connect(ctx.destination);
    bedSrc.start(t0 + 0.04);

    // 3. Soft-clipped formant-filtered human radio voice cadence (syllable pitch contours through VHF bandpass!)
    const voiceOsc = ctx.createOscillator();
    voiceOsc.type = 'sawtooth';
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 3.2;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 3.8);
    }
    shaper.curve = curve;
    const vGain = ctx.createGain();
    vGain.gain.setValueAtTime(0.0001, t0);

    const basePitch = urgent ? 158 : 124;
    let cursor = t0 + 0.1;
    for (let w = 0; w < words; w++) {
      const sylDur = 0.085 + (w % 3) * 0.025;
      const pitch = basePitch + ((w * 19) % 34) - 14;
      const formantHz = 720 + ((w * 290) % 980);
      voiceOsc.frequency.setValueAtTime(pitch, cursor);
      voiceOsc.frequency.linearRampToValueAtTime(pitch * (w % 2 === 0 ? 1.08 : 0.91), cursor + sylDur);
      f1.frequency.setValueAtTime(formantHz, cursor);
      vGain.gain.setValueAtTime(0.001, cursor);
      vGain.gain.linearRampToValueAtTime(0.065, cursor + 0.018);
      vGain.gain.exponentialRampToValueAtTime(0.004, cursor + sylDur);
      cursor += sylDur + (w % 3 === 2 ? 0.055 : 0.028);
      if (cursor > t0 + totalDur - 0.12) break;
    }

    voiceOsc.connect(f1);
    f1.connect(shaper);
    shaper.connect(vGain);
    vGain.connect(radioBp);
    voiceOsc.start(t0 + 0.08);
    voiceOsc.stop(t0 + totalDur);

    // 4. Closing VHF roger beep + squelch tail
    setTimeout(() => playRadioSquelch(0.085, true), Math.round(totalDur * 1000));
  }

  function playClick() {
    playTone(440, 0.06, 'square', 0.04, 340);
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return {
    unlock,
    updateAudio,
    playRingChime,
    playTouchdown,
    playCrash,
    playRadioCall,
    playClick,
    toggleMute,
    isMuted: () => muted,
  };
}
