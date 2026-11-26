// 100% offline Web Audio synthesizer: twin-turboprop engine hum, wind rush, stall horn, chimes, and procedural VHF radio comms.
export function createAudioEngine() {
  let ctx = null, muted = false, eA, eB, eG, wG, sG, lastR = 0;
  const ch = (...ns) => { for (let i = 0; i < ns.length - 1; i++) ns[i].connect(ns[i + 1]); };
  const gn = (v = 0) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const os = (t, f) => { const o = ctx.createOscillator(); o.type = t; o.frequency.value = f; return o; };
  const bq = (t, f, q = 1) => { const fl = ctx.createBiquadFilter(); fl.type = t; fl.frequency.value = f; fl.Q.value = q; return fl; };
  const mkN = (dur, sc = 1) => {
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * sc;
    const s = ctx.createBufferSource(); s.buffer = b; return { s, d, n };
  };

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); eA = os('sawtooth', 72); eB = os('triangle', 145); const ef = bq('lowpass', 320); eG = gn();
    eA.connect(ef); eB.connect(ef); ch(ef, eG, ctx.destination); eA.start(); eB.start();
    const { s: ns } = mkN(2); ns.loop = true; wG = gn(); ch(ns, bq('bandpass', 540, 0.9), wG, ctx.destination); ns.start();
    const so = os('square', 880); sG = gn(); ch(so, sG, ctx.destination); so.start();
  }

  function updateAudio(s, tS) {
    if (!ctx || muted) { if (eG) eG.gain.value = wG.gain.value = sG.gain.value = 0; return; }
    const ok = s.status !== 'crashed' && s.fuelKg > 0.05, th = ok ? s.throttle : 0, t = ctx.currentTime;
    eA.frequency.setTargetAtTime(58 + th * 68, t, 0.08); eB.frequency.setTargetAtTime(118 + th * 138, t, 0.08);
    eG.gain.setTargetAtTime(ok ? 0.03 + th * 0.055 : 0, t, 0.1);
    wG.gain.setTargetAtTime(Math.min(0.06, Math.max(0, (s.airspeedKts - 40) / 180) * 0.055), t, 0.1);
    sG.gain.setTargetAtTime(s.stalling && Math.sin(tS * 22) > 0 ? 0.035 : 0, t, 0.02);
  }

  function playTone(f, d, type = 'sine', v = 0.09, to = null) {
    if (!ctx || muted) return;
    const o = os(type, f), g = gn(v), t = ctx.currentTime;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.exponentialRampToValueAtTime(0.001, t + d); ch(o, g, ctx.destination); o.start(); o.stop(t + d);
  }

  const sq = (d = 0.11, bp = false) => {
    if (!ctx || muted) return;
    const { s, d: arr, n } = mkN(d, 0.32); for (let i = 0; i < n; i++) arr[i] *= Math.sin((i / n) * Math.PI);
    ch(s, bq('bandpass', 1450, 1.6), gn(0.14), ctx.destination); s.start();
    if (bp) setTimeout(() => playTone(1240, 0.055, 'sine', 0.045, 1180), Math.round(d * 700));
  };

  function playRadioCall(text, urg = false) {
    if (!ctx || muted || !text) return;
    const now = performance.now(); if (!urg && now - lastR < 1800) return; lastR = now;
    const nw = Math.max(4, Math.min(12, text.split(/\s+/).length)), dur = Math.min(2.2, 0.35 + nw * 0.14), t0 = ctx.currentTime;
    sq(0.09);
    const { s: bs } = mkN(dur, 0.16), bp = bq('bandpass', 1350, 1.9), bg = gn(0.001);
    bg.gain.linearRampToValueAtTime(0.09, t0 + 0.06); bg.gain.setValueAtTime(0.085, t0 + dur - 0.08); bg.gain.linearRampToValueAtTime(0.001, t0 + dur);
    ch(bs, bp, bg, ctx.destination); bs.start(t0 + 0.04);
    const vo = os('sawtooth', 140), f1 = bq('bandpass', 900, 3.2), sh = ctx.createWaveShaper(), vg = gn(0.0001);
    sh.curve = Float32Array.from({ length: 256 }, (_, i) => Math.tanh(((i / 128) - 1) * 3.8));
    for (let w = 0, c = t0 + 0.1; w < nw && c <= t0 + dur - 0.12; w++) {
      const sd = 0.085 + (w % 3) * 0.025, pt = (urg ? 158 : 124) + ((w * 19) % 34) - 14;
      vo.frequency.setValueAtTime(pt, c); vo.frequency.linearRampToValueAtTime(pt * (w % 2 ? 0.91 : 1.08), c + sd);
      f1.frequency.setValueAtTime(720 + ((w * 290) % 980), c);
      vg.gain.setValueAtTime(0.001, c); vg.gain.linearRampToValueAtTime(0.065, c + 0.018); vg.gain.exponentialRampToValueAtTime(0.004, c + sd);
      c += sd + (w % 3 === 2 ? 0.055 : 0.028);
    }
    ch(vo, f1, sh, vg, bp); vo.start(t0 + 0.08); vo.stop(t0 + dur); setTimeout(() => sq(0.085, true), Math.round(dur * 1000));
  }

  return {
    unlock, updateAudio, playRadioCall, toggleMute: () => (muted = !muted), isMuted: () => muted,
    playRingChime: () => { playTone(660, 0.14, 'triangle', 0.09, 990); setTimeout(() => playTone(990, 0.2, 'triangle', 0.08, 1320), 90); },
    playTouchdown: (h) => playTone(h ? 130 : 180, h ? 0.35 : 0.16, 'sawtooth', h ? 0.14 : 0.07, 52),
    playCrash: () => playTone(110, 0.65, 'sawtooth', 0.18, 34),
    playClick: () => playTone(440, 0.06, 'square', 0.04, 340),
  };
}
