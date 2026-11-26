// True 3D Garuda G-4 cockpit interior: riveted canopy pillars, glareshield,
// animated control yoke & throttle levers, and live canvas-rendered illuminated gauges.

import * as THREE from 'three';

function drawDialBezel(ctx, cx, cy, r, label) {
  // Brushed gunmetal outer bezel + recessed glass rim
  const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#303942');
  grad.addColorStop(0.84, '#181e24');
  grad.addColorStop(1, '#0b0e12');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#566573';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.stroke();

  // Corner mounting screws
  ctx.fillStyle = '#485460';
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    ctx.beginPath();
    ctx.arc(cx + sx * (r * 0.88), cy + sy * (r * 0.88), 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dial face
  ctx.fillStyle = '#0e141a';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#9db4c4';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + r * 0.62);
}

function drawAttitudeIndicator(ctx, cx, cy, r, pitchDeg, rollDeg) {
  drawDialBezel(ctx, cx, cy, r, 'ATTITUDE');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.translate(cx, cy);
  ctx.rotate((-rollDeg * Math.PI) / 180);
  const pitchPx = Math.max(-r * 0.85, Math.min(r * 0.85, pitchDeg * 2.1));

  // Sky & Earth hemispheres
  ctx.fillStyle = '#1e78b4';
  ctx.fillRect(-r * 1.5, -r * 1.6 + pitchPx, r * 3, r * 1.6);
  ctx.fillStyle = '#7a4b2a';
  ctx.fillRect(-r * 1.5, pitchPx, r * 3, r * 1.6);

  // Horizon line & pitch bars
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-r, pitchPx);
  ctx.lineTo(r, pitchPx);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  for (const deg of [-20, -10, 10, 20]) {
    const y = pitchPx - deg * 2.1;
    const w = Math.abs(deg) === 10 ? 18 : 28;
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  // Fixed amber aircraft miniature wings
  ctx.strokeStyle = '#ffaa22';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx - 32, cy);
  ctx.lineTo(cx - 10, cy);
  ctx.lineTo(cx - 10, cy + 7);
  ctx.moveTo(cx + 32, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.lineTo(cx + 10, cy + 7);
  ctx.stroke();
  ctx.fillStyle = '#ffaa22';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawAirspeedDial(ctx, cx, cy, r, kts) {
  drawDialBezel(ctx, cx, cy, r, 'IAS KTS');
  const startA = Math.PI * 0.75;
  const spanA = Math.PI * 1.5;
  const toA = (v) => startA + (Math.max(0, Math.min(240, v)) / 240) * spanA;

  // Color speed arcs (white flap, green cruise, amber caution, red Vne)
  const arcs = [
    [35, 95, '#e2e8f0', 4],
    [52, 165, '#22c55e', 5],
    [165, 215, '#f59e0b', 5],
    [215, 240, '#ef4444', 6],
  ];
  for (const [a, b, col, lw] of arcs) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 9, toA(a), toA(b));
    ctx.stroke();
  }

  // Ticks and labels
  ctx.fillStyle = '#e5eef5';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= 240; v += 40) {
    const a = toA(v);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16));
    ctx.lineTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
    ctx.stroke();
    ctx.fillText(String(v), cx + Math.cos(a) * (r - 27), cy + Math.sin(a) * (r - 27));
  }

  // Glowing needle
  const na = toA(kts);
  ctx.strokeStyle = '#fff9e6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(na) * 12, cy - Math.sin(na) * 12);
  ctx.lineTo(cx + Math.cos(na) * (r - 13), cy + Math.sin(na) * (r - 13));
  ctx.stroke();
  ctx.fillStyle = '#38f2d4';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(String(Math.round(kts)).padStart(3, '0'), cx, cy + 20);
}

function drawAltimeterDial(ctx, cx, cy, r, altFt) {
  drawDialBezel(ctx, cx, cy, r, 'ALT FT');
  ctx.fillStyle = '#e5eef5';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14));
    ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.stroke();
    ctx.fillText(String(i), cx + Math.cos(a) * (r - 24), cy + Math.sin(a) * (r - 24));
  }

  // 1000-ft fat hand & 100-ft long hand
  const a1000 = -Math.PI / 2 + ((altFt % 10000) / 10000) * Math.PI * 2;
  const a100 = -Math.PI / 2 + ((altFt % 1000) / 1000) * Math.PI * 2;
  ctx.strokeStyle = '#ffba3b';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a1000) * (r * 0.52), cy + Math.sin(a1000) * (r * 0.52));
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a100) * (r - 12), cy + Math.sin(a100) * (r - 12));
  ctx.stroke();

  // Digital altitude drum
  ctx.fillStyle = '#070b0f';
  ctx.fillRect(cx - 28, cy + 12, 56, 18);
  ctx.strokeStyle = '#38f2d4';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 28, cy + 12, 56, 18);
  ctx.fillStyle = '#38f2d4';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(String(Math.round(altFt)), cx, cy + 21);
}

function drawCompassHSI(ctx, cx, cy, r, headingDeg, waypointBearingDeg) {
  drawDialBezel(ctx, cx, cy, r, '');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-headingDeg * Math.PI) / 180);

  const cards = ['N', '3', '6', 'E', '12', '15', 'S', '21', '24', 'W', '30', '33'];
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    ctx.fillStyle = i % 3 === 0 ? '#ffbd3d' : '#d6e3ec';
    ctx.fillText(cards[i], Math.cos(a) * (r - 18), Math.sin(a) * (r - 18));
  }

  // Cyan waypoint bearing pointer
  if (Number.isFinite(waypointBearingDeg)) {
    const wa = ((waypointBearingDeg - 90) * Math.PI) / 180;
    ctx.strokeStyle = '#38f2d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(wa) * -(r - 24), Math.sin(wa) * -(r - 24));
    ctx.lineTo(Math.cos(wa) * (r - 12), Math.sin(wa) * (r - 12));
    ctx.stroke();
  }
  ctx.restore();

  // Top lubber triangle
  ctx.fillStyle = '#ff6b2b';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 2);
  ctx.lineTo(cx - 6, cy - r - 8);
  ctx.lineTo(cx + 6, cy - r - 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${String(Math.round(headingDeg) % 360).padStart(3, '0')}°`, cx, cy + 4);
}

function drawStatusColumn(ctx, x, y, w, h, state) {
  ctx.fillStyle = '#0c1218';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3e4f5e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  const drawBar = (label, pct, col, rowY, valText) => {
    ctx.fillStyle = '#9fb5c4';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 12, rowY);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8f1f8';
    ctx.fillText(valText, x + w - 12, rowY);
    ctx.fillStyle = '#1b2630';
    ctx.fillRect(x + 12, rowY + 6, w - 24, 12);
    ctx.fillStyle = col;
    ctx.fillRect(x + 12, rowY + 6, Math.max(0, Math.min(1, pct / 100)) * (w - 24), 12);
  };

  drawBar('THROTTLE', (state.throttle / 1.1) * 100, state.throttle > 1 ? '#ff5722' : '#38f2d4', y + 24, `${Math.round(state.throttle * 100)}%`);
  drawBar('FUEL QTY', state.fuelPct, state.fuelPct < 25 ? '#ff4d4f' : '#f5a623', y + 66, `${Math.round(state.fuelPct)}%`);
  drawBar('HULL / ENG', state.hullPct, state.hullPct < 60 ? '#ff6b2b' : '#22c55e', y + 108, `${Math.round(state.hullPct)}%`);

  // Lit Annunciator Bulbs
  const lamps = [
    ['STALL', state.stalling, '#ff3b30'],
    ['LOW FUEL', state.lowFuel, '#ff9f1c'],
    ['GEAR DN', state.gearDown && state.gearIntact, '#22c55e'],
    ['FLAPS', state.flapStage > 0, '#38bdf8'],
    ['ENG DMG', state.engineHealth < 80, '#ff5722'],
    ['TOGA', state.throttle > 1.0, '#f59e0b'],
  ];
  for (let i = 0; i < lamps.length; i++) {
    const [text, lit, color] = lamps[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = x + 12 + col * ((w - 30) * 0.5 + 6);
    const by = y + 144 + row * 34;
    const bw = (w - 30) * 0.5;
    ctx.fillStyle = lit ? color : '#18212a';
    ctx.fillRect(bx, by, bw, 24);
    ctx.strokeStyle = lit ? '#ffffff' : '#32414f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, 24);
    ctx.fillStyle = lit ? '#080c10' : '#586977';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw * 0.5, by + 12);
  }
}

export function createCockpitInterior(aircraftRoot) {
  const group = new THREE.Group();
  group.visible = false;
  aircraftRoot.add(group);

  const panelMat = new THREE.MeshStandardMaterial({ color: '#1b2229', roughness: 0.72, metalness: 0.35 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#27313b', roughness: 0.55, metalness: 0.45 });
  const accentMat = new THREE.MeshStandardMaterial({ color: '#d95326', roughness: 0.45 });
  const ivoryNoseMat = new THREE.MeshStandardMaterial({ color: '#efe8d8', roughness: 0.45 });

  // Visible aircraft nose cowling & twin wing-root engine cowlings through windshield
  const noseHood = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.32, 2.2), ivoryNoseMat);
  noseHood.position.set(0, 0.72, -4.75);
  group.add(noseHood);

  const noseStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.34, 2.15),
    new THREE.MeshStandardMaterial({ color: '#1a232b', roughness: 0.85 }),
  );
  noseStripe.position.set(0, 0.73, -4.72);
  group.add(noseStripe);

  // Subtle metallic glareshield lip sitting cleanly ABOVE the illuminated instrument panel
  const glare = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.08, 0.42), panelMat);
  glare.position.set(0, 1.01, -3.52);
  group.add(glare);

  // Windshield canopy structural pillars (wider open panoramic cockpit view)
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.095, 1.32, 0.1), frameMat);
  leftPillar.position.set(-1.14, 1.56, -3.56);
  leftPillar.rotation.x = 0.42;
  leftPillar.rotation.z = -0.16;
  group.add(leftPillar);

  const rightPillar = leftPillar.clone();
  rightPillar.position.x = 1.14;
  rightPillar.rotation.z = 0.16;
  group.add(rightPillar);

  const centerPillar = new THREE.Mesh(new THREE.BoxGeometry(0.048, 1.32, 0.06), frameMat);
  centerPillar.position.set(0.32, 1.56, -3.65);
  centerPillar.rotation.x = 0.42;
  group.add(centerPillar);

  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.11, 0.3), panelMat);
  topHeader.position.set(0, 2.08, -3.22);
  group.add(topHeader);

  // Standby magnetic compass hanging from top header
  const compassHousing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.16), frameMat);
  compassHousing.position.set(0.32, 1.92, -3.32);
  group.add(compassHousing);

  // Live Canvas-Rendered Illuminated Instrument Panel (elevated so ALL 6-pack gauges + HSI + annunciators shine clearly!)
  const dashCanvas = document.createElement('canvas');
  dashCanvas.width = 1024;
  dashCanvas.height = 384;
  const dashCtx = dashCanvas.getContext('2d');
  const dashTex = new THREE.CanvasTexture(dashCanvas);
  dashTex.colorSpace = THREE.SRGBColorSpace;

  const dashMat = new THREE.MeshBasicMaterial({ map: dashTex });
  const dashMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.16, 0.78), dashMat);
  dashMesh.position.set(0, 0.59, -3.4);
  dashMesh.rotation.x = -0.14;
  group.add(dashMesh);

  // Control Yoke (rotates with roll & pitches forward/back, positioned cleanly on lower left)
  const yokePivot = new THREE.Group();
  yokePivot.position.set(-0.56, 0.24, -3.02);
  const yokeColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.42, 8), frameMat);
  yokeColumn.rotation.x = Math.PI / 2;
  yokeColumn.position.z = -0.2;
  yokePivot.add(yokeColumn);
  const yokeBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.055, 0.05), frameMat);
  yokePivot.add(yokeBar);
  for (const sx of [-0.23, 0.23]) {
    const horn = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.2, 0.055), panelMat);
    horn.position.set(sx, 0.09, 0);
    yokePivot.add(horn);
  }
  group.add(yokePivot);

  // Center Throttle Quadrant & Twin Levers
  const quadBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.34), panelMat);
  quadBase.position.set(0.28, 0.12, -3.08);
  group.add(quadBase);

  const throttlePivot = new THREE.Group();
  throttlePivot.position.set(0.28, 0.18, -3.08);
  for (const lx of [-0.055, 0.055]) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.22, 6), frameMat);
    shaft.position.set(lx, 0.11, 0);
    throttlePivot.add(shaft);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.065, 8), accentMat);
    knob.rotation.z = Math.PI / 2;
    knob.position.set(lx, 0.22, 0);
    throttlePivot.add(knob);
  }
  group.add(throttlePivot);

  function renderPanelCanvas(flightState, waypointBearingDeg) {
    const ctx = dashCtx;
    ctx.fillStyle = '#141a21';
    ctx.fillRect(0, 0, 1024, 384);

    // Subtle brushed panel border & rivets
    ctx.strokeStyle = '#334250';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 1012, 372);

    // Placard header
    ctx.fillStyle = '#d9b061';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GARUDA G-4 · PK-GRD · ARCHIPELAGO AVIONICS', 24, 30);

    // Primary Flight Six-Pack + HSI
    drawAirspeedDial(ctx, 130, 148, 86, flightState.airspeedKts);
    drawAttitudeIndicator(ctx, 330, 148, 92, flightState.pitchDeg, flightState.rollDeg);
    drawAltimeterDial(ctx, 530, 148, 86, flightState.altitudeFt);
    drawCompassHSI(ctx, 330, 306, 62, flightState.headingDeg, waypointBearingDeg);

    // VSI + G-load mini digital strip
    ctx.fillStyle = '#0c1218';
    ctx.fillRect(42, 260, 190, 96);
    ctx.strokeStyle = '#3b4d5e';
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 260, 190, 96);
    ctx.fillStyle = '#9bb2c2';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('VSI (M/S)', 56, 284);
    ctx.fillText('G-LOAD', 56, 314);
    ctx.fillText('ENG EGT', 56, 344);
    ctx.textAlign = 'right';
    ctx.fillStyle = flightState.vsiMps < -5 ? '#ff5722' : '#38f2d4';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`${flightState.vsiMps >= 0 ? '+' : ''}${flightState.vsiMps.toFixed(1)}`, 218, 284);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${flightState.gLoad.toFixed(1)}G`, 218, 314);
    ctx.fillStyle = flightState.engineTempC > 750 ? '#ff5722' : '#f5a623';
    ctx.fillText(`${Math.round(flightState.engineTempC)}°C`, 218, 344);

    // Right-side Engine / Fuel / Hull & Annunciator Column
    drawStatusColumn(ctx, 648, 44, 350, 316, flightState);

    dashTex.needsUpdate = true;
  }

  let frameCounter = 0;

  function updateCockpit(flightState, waypointBearingDeg, isCockpitView, forceDraw = false) {
    group.visible = isCockpitView;
    if (!isCockpitView) return;

    // Animate yoke & throttle levers
    yokePivot.rotation.z = -flightState.controlSurface.aileron * 0.65;
    yokePivot.position.z = -3.02 + flightState.controlSurface.elevator * 0.08;
    throttlePivot.rotation.x = -0.35 + flightState.throttle * 0.72;

    if (forceDraw || frameCounter++ % 2 === 0) {
      renderPanelCanvas(flightState, waypointBearingDeg);
    }
  }

  return {
    group,
    updateCockpit,
  };
}
