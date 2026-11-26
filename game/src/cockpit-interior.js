// 3D Garuda G-4 cockpit cabin: canopy frame, glareshield, HUD combiner, exterior props, overhead switches, rain wipers & live dash.
import * as T from 'three';
import { createCockpitControlsRig } from './cockpit-controls.js';
import { renderCockpitPanelCanvas } from './cockpit-gauges.js';
import { createCockpitMetalTexture, createSoftParticleTexture } from './procedural-textures.js';

const P = Math.PI / 2, bx = (w, h, d) => new T.BoxGeometry(w, h, d), cy = (a, b, h, s = 14) => new T.CylinderGeometry(a, b, h, s);

export function createCockpitInterior(root) {
  const g = new T.Group(); g.visible = false; root.add(g);
  const mT = createCockpitMetalTexture(), pT = createSoftParticleTexture('prop');
  const sm = (c, r, m = 0.2, map = null) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...(map ? { map } : {}) });
  const bm = (c, o = {}) => new T.MeshBasicMaterial({ color: c, ...o });
  const pM = sm('#34414f', 0.62, 0.48, mT), fM = sm('#465564', 0.5, 0.58, mT), lM = sm('#1b2128', 0.85, 0.1), aM = sm('#e55320', 0.35), bM = sm('#2b8bc2', 0.35, 0.25), iM = sm('#efe8d8', 0.38, 0.15), tM = sm('#13495e', 0.4, 0.28);
  const add = (p, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1]) => { const o = new T.Mesh(geo, m); o.position.set(...pos); o.rotation.set(...rot); o.scale.set(...sc); p.add(o); return o; };

  [
    [cy(0.75, 0.96, 2.3), iM, [0, 0.72, -4.75], [P, 0, 0], [1.05, 1, 0.45]], [bx(0.54, 0.08, 2), lM, [0, 0.93, -4.65]],
    [bx(2.44, 0.075, 0.44), lM, [0, 1.03, -3.52]], [bx(2.05, 0.018, 0.025), bm('#ffbd59'), [0, 0.99, -3.32]],
    [new T.PlaneGeometry(0.76, 0.48), bm('#45f5d2', { transparent: true, opacity: 0.09, side: T.DoubleSide, depthWrite: false }), [-0.08, 1.32, -3.46], [-0.22, 0, 0]],
    [bx(0.024, 0.44, 0.024), fM, [-0.47, 1.28, -3.44], [-0.22, 0, 0]], [bx(0.024, 0.44, 0.024), fM, [0.31, 1.28, -3.44], [-0.22, 0, 0]],
    [bx(0.095, 1.34, 0.11), fM, [-1.18, 1.58, -3.56], [0.42, 0, -0.16]], [bx(0.095, 1.34, 0.11), fM, [1.18, 1.58, -3.56], [0.42, 0, 0.16]],
    [bx(0.046, 1.34, 0.06), fM, [0.36, 1.58, -3.66], [0.42, 0, 0]], [bx(2.44, 0.14, 0.34), pM, [0, 2.09, -3.22]], [bx(0.22, 0.15, 0.16), fM, [0.36, 1.92, -3.32]],
  ].forEach((a) => add(g, ...a));

  const blM = sm('#1b2229', 0.45, 0.55), tpM = sm('#f5b42e', 0.4, 0);
  const sP = [-1, 1].map((s) => {
    const n = new T.Group(), h = new T.Group(); n.position.set(s * 2.55, 1.08, -3.95); h.position.z = -1.12;
    add(n, cy(0.36, 0.42, 1.9), tM, [0, 0, 0], [P, 0, 0]); add(n, new T.TorusGeometry(0.36, 0.045, 8, 14), aM, [0, 0, -0.95]);
    const spn = add(n, new T.ConeGeometry(0.22, 0.65, 12), aM, [0, 0, -1.25], [-P, 0, 0]);
    for (let b = 0; b < 3; b++) add(add(h, bx(0.11, 1.65, 0.03), blM, [0, 0, 0], [0, 0, (b * Math.PI * 2) / 3]), bx(0.12, 0.18, 0.035), tpM, [0, 0.74, 0]);
    const disc = add(n, new T.CircleGeometry(0.92, 20), new T.MeshBasicMaterial({ map: pT, transparent: true, opacity: 0.76, side: T.DoubleSide, depthWrite: false }), [0, 0, -1.12]);
    n.add(h); g.add(n); add(g, bx(2.6, 0.12, 1.1), iM, [s * 2.5, 1.48, -3.45]); return { h, disc, spn };
  });

  const ovh = Array.from({ length: 6 }, (_, i) => {
    const led = bm(i < 4 ? '#34d399' : '#ffbd3d'); add(g, bx(0.055, 0.025, 0.02), led, [-0.68 + i * 0.15, 2.04, -3.05]);
    return { led, tog: add(g, cy(0.01, 0.01, 0.075, 6), fM, [-0.68 + i * 0.15, 2, -3.09], [0.35, 0, 0]) };
  });
  const wip = [-0.46, 0.56].map((wx) => { const w = new T.Group(); w.position.set(wx, 1.04, -3.56); w.rotation.set(0.38, 0, -0.82); add(w, bx(0.022, 0.58, 0.02), fM, [0, 0.29, 0]); add(w, bx(0.032, 0.38, 0.018), lM, [0.012, 0.44, -0.01]); g.add(w); return w; });

  const rC = Object.assign(document.createElement('canvas'), { width: 512, height: 256 }), rX = rC.getContext('2d'), rT = new T.CanvasTexture(rC);
  const rM = add(g, new T.PlaneGeometry(2.26, 0.96), new T.MeshBasicMaterial({ map: rT, transparent: true, opacity: 0.72, depthWrite: false }), [0, 1.54, -3.54], [0.38, 0, 0]); rM.visible = false;
  const dC = Object.assign(document.createElement('canvas'), { width: 1280, height: 480 }), dX = dC.getContext('2d'), dT = new T.CanvasTexture(dC);
  dT.colorSpace = T.SRGBColorSpace; dT.anisotropy = 8; add(g, new T.PlaneGeometry(2.22, 0.8), new T.MeshBasicMaterial({ map: dT }), [0, 0.59, -3.4], [-0.14, 0, 0]);

  const rig = createCockpitControlsRig(g, { frameMat: fM, leatherMat: lM, blueLeverMat: bM, ivoryNoseMat: iM });
  let fN = 0, wA = -0.82;

  function renderRain(t, int, ang) {
    rX.clearRect(0, 0, 512, 256); if (int <= 0.05) return;
    rX.fillStyle = 'rgba(210,238,252,.52)'; rX.strokeStyle = 'rgba(220,244,255,.42)'; rX.lineWidth = 1.6;
    for (let i = 0, n = Math.round(65 + int * 95); i < n; i++) {
      const s = i * 37.7, x = ((Math.sin(s) * 0.5 + 0.5) * 512 + t * (12 + (i % 7) * 4)) % 512, y = ((Math.cos(s * 1.3) * 0.5 + 0.5) * 256 + t * (55 + (i % 9) * 14)) % 256;
      rX.beginPath(); rX.moveTo(x, y); rX.lineTo(x - 2, y + 7 + int * 6); rX.stroke(); rX.beginPath(); rX.arc(x, y, 1.8, 0, Math.PI * 2); rX.fill();
    }
    rX.globalCompositeOperation = 'destination-out'; rX.fillStyle = 'rgba(0,0,0,.68)';
    [154, 372].forEach((cx) => { rX.beginPath(); rX.moveTo(cx, 252); rX.arc(cx, 252, 165, -Math.PI * 0.92, -Math.PI * (0.92 - ((ang + 0.85) / 1.7) * 0.78)); rX.fill(); });
    rX.globalCompositeOperation = 'source-over'; rT.needsUpdate = true;
  }

  function updateCockpit(s, wpB, isC, force = false, t = 0, rain = 0) {
    g.visible = isC; if (!isC) return;
    const rL = s.propRpmLeft ?? 0, rR = s.propRpm ?? 0, oL = rL > 0.24 ? Math.min(0.76, (rL - 0.24) * 1.1) : 0, oR = rR > 0.24 ? Math.min(0.76, (rR - 0.24) * 1.1) : 0, gone = s.status === 'crashed' && s.crashMode !== 'water';
    sP[0].h.rotation.z = sP[0].disc.rotation.z = s.propAngleLeft ?? s.propAngle; sP[1].h.rotation.z = sP[1].disc.rotation.z = -s.propAngle;
    sP[0].h.visible = sP[0].spn.visible = !gone; sP[0].disc.visible = !gone && oL > 0.02; sP[0].disc.material.opacity = oL; sP[1].disc.visible = oR > 0.02; sP[1].disc.material.opacity = oR;
    rig.updateControlsRig(s, force, t);
    const rn = rain > 0.05;
    [true, s.gearDown, s.flapStage > 0, rn, s.lowFuel, s.throttle > 1].forEach((on, i) => { ovh[i].tog.rotation.x = on ? 0.42 : -0.38; ovh[i].led.color.set(on ? (i === 3 ? '#38bdf8' : i >= 4 ? '#ffaa1d' : '#34d399') : '#23303c'); });
    wA = rn ? Math.sin(t * (rain > 0.75 ? 5.6 : 3.4)) * 0.78 : wA + (-0.82 - wA) * (force ? 1 : 0.14);
    wip.forEach((w) => { w.rotation.z = wA; }); rM.visible = rn;
    if (rn && (force || fN % 2 === 0)) renderRain(t, rain, wA);
    if (force || fN++ % 2 === 0) { renderCockpitPanelCanvas(dX, s, wpB); dT.needsUpdate = true; }
  }
  return { group: g, updateCockpit };
}
