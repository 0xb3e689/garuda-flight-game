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
    playClick,
    toggleMute,
    isMuted: () => muted,
  };
}
