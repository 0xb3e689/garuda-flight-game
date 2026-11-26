// Tactile 3D Garuda G-4 cockpit interior: crinkle-enamel metallic glareshield, riveted
// canopy pillars, overhead switch panel, 3D glass HUD combiner, exterior spinning props visible
// through side windows, and high-res illuminated analog+glass instruments that look flown.

import * as THREE from 'three';
import { createCockpitMetalTexture, createSoftParticleTexture } from './procedural-textures.js';

function drawGlassReflection(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.clip();
  const glare = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.6, cy + r * 0.4);
  glare.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  glare.addColorStop(0.38, 'rgba(220, 242, 255, 0.05)');
  glare.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glare;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

function drawDialBezel(ctx, cx, cy, r, label) {
  // Deep recessed shadow ring
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.arc(cx + 3, cy + 4, r + 10, 0, Math.PI * 2);
  ctx.fill();

  // Raised machined aluminum outer bezel
  const bezelGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  bezelGrad.addColorStop(0, '#5a6977');
  bezelGrad.addColorStop(0.42, '#222b33');
  bezelGrad.addColorStop(0.85, '#11161c');
  bezelGrad.addColorStop(1, '#394652');
  ctx.fillStyle = bezelGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
  ctx.fill();

  // Inner chamfer lip
  ctx.strokeStyle = '#6c7d8d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.stroke();

  // Corner Phillips mounting screws with slot lines
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const px = cx + sx * (r * 0.88);
    const py = cy + sy * (r * 0.88);
    ctx.fillStyle = '#485664';
    ctx.beginPath();
    ctx.arc(px, py, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#151c22';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px - 2.4, py - 1.2);
    ctx.lineTo(px + 2.4, py + 1.2);
    ctx.stroke();
  }

  // Warm edge-lit instrument dial face
  const faceGrad = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  faceGrad.addColorStop(0, '#101922');
  faceGrad.addColorStop(0.82, '#0c131a');
  faceGrad.addColorStop(1, '#1b242d');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (label) {
    ctx.fillStyle = '#a3bcc9';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy + r * 0.64);
  }
}

function drawAttitudeIndicator(ctx, cx, cy, r, pitchDeg, rollDeg) {
  drawDialBezel(ctx, cx, cy, r, '');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.translate(cx, cy);
  ctx.rotate((-rollDeg * Math.PI) / 180);
  const pitchPx = Math.max(-r * 0.85, Math.min(r * 0.85, pitchDeg * 2.4));

  // Rich gyro sky & volcanic earth gradient hemispheres
  const skyG = ctx.createLinearGradient(0, -r, 0, pitchPx);
  skyG.addColorStop(0, '#125992');
  skyG.addColorStop(1, '#3696cc');
  ctx.fillStyle = skyG;
  ctx.fillRect(-r * 1.5, -r * 1.6 + pitchPx, r * 3, r * 1.6);

  const gndG = ctx.createLinearGradient(0, pitchPx, 0, r);
  gndG.addColorStop(0, '#8c5328');
  gndG.addColorStop(1, '#4d2b14');
  ctx.fillStyle = gndG;
  ctx.fillRect(-r * 1.5, pitchPx, r * 3, r * 1.6);

  // Horizon line & pitch ladder
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-r, pitchPx);
  ctx.lineTo(r, pitchPx);
  ctx.stroke();

  ctx.lineWidth = 1.8;
  for (const deg of [-20, -10, 10, 20]) {
    const y = pitchPx - deg * 2.4;
    const w = Math.abs(deg) === 10 ? 20 : 32;
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Top roll scale ticks
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  for (const ang of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
    const a = ((ang - 90) * Math.PI) / 180;
    const len = ang % 30 === 0 ? 13 : 8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - len), Math.sin(a) * (r - len));
    ctx.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
    ctx.stroke();
  }
  ctx.restore();

  // Fixed glowing orange miniature aircraft reference wings + center dot
  ctx.strokeStyle = '#ffab24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy);
  ctx.lineTo(cx - 11, cy);
  ctx.lineTo(cx - 11, cy + 8);
  ctx.moveTo(cx + 38, cy);
  ctx.lineTo(cx + 11, cy);
  ctx.lineTo(cx + 11, cy + 8);
  ctx.stroke();
  ctx.fillStyle = '#ffab24';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // Top orange roll pointer triangle
  ctx.fillStyle = '#ff6b2b';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 14);
  ctx.lineTo(cx - 6, cy - r + 24);
  ctx.lineTo(cx + 6, cy - r + 24);
  ctx.closePath();
  ctx.fill();

  drawGlassReflection(ctx, cx, cy, r);
}

function drawAirspeedDial(ctx, cx, cy, r, kts) {
  drawDialBezel(ctx, cx, cy, r, 'IAS KTS');
  const startA = Math.PI * 0.75;
  const spanA = Math.PI * 1.5;
  const toA = (v) => startA + (Math.max(0, Math.min(240, v)) / 240) * spanA;

  const arcs = [
    [35, 95, '#e2e8f0', 5],
    [52, 165, '#22c55e', 6],
    [165, 215, '#f59e0b', 6],
    [215, 240, '#ef4444', 7],
  ];
  for (const [a, b, col, lw] of arcs) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, toA(a), toA(b));
    ctx.stroke();
  }

  ctx.fillStyle = '#edf5fa';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= 240; v += 40) {
    const a = toA(v);
    ctx.strokeStyle = '#dbe6ef';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
    ctx.lineTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
    ctx.stroke();
    ctx.fillText(String(v), cx + Math.cos(a) * (r - 31), cy + Math.sin(a) * (r - 31));
  }

  // Drop-shadowed incandescent needle
  const na = toA(kts);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(na) * 12 + 2, cy - Math.sin(na) * 12 + 3);
  ctx.lineTo(cx + Math.cos(na) * (r - 14) + 2, cy + Math.sin(na) * (r - 14) + 3);
  ctx.stroke();

  ctx.strokeStyle = '#fff9e6';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(na) * 14, cy - Math.sin(na) * 14);
  ctx.lineTo(cx + Math.cos(na) * (r - 13), cy + Math.sin(na) * (r - 13));
  ctx.stroke();

  ctx.fillStyle = '#2d3740';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38f2d4';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(String(Math.round(kts)).padStart(3, '0'), cx, cy + 25);
  drawGlassReflection(ctx, cx, cy, r);
}

function drawAltimeterDial(ctx, cx, cy, r, altFt) {
  drawDialBezel(ctx, cx, cy, r, 'ALT FT');
  ctx.fillStyle = '#edf5fa';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    ctx.strokeStyle = '#dbe6ef';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16));
    ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.stroke();
    ctx.fillText(String(i), cx + Math.cos(a) * (r - 28), cy + Math.sin(a) * (r - 28));
  }

  // Kollsman barometric pressure window
  ctx.fillStyle = '#070c10';
  ctx.fillRect(cx + 22, cy - 10, 40, 18);
  ctx.strokeStyle = '#475968';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(cx + 22, cy - 10, 40, 18);
  ctx.fillStyle = '#ffcb6b';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('29.92', cx + 42, cy - 1);

  const a1000 = -Math.PI / 2 + ((altFt % 10000) / 10000) * Math.PI * 2;
  const a100 = -Math.PI / 2 + ((altFt % 1000) / 1000) * Math.PI * 2;
  ctx.strokeStyle = '#ffba3b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a1000) * (r * 0.54), cy + Math.sin(a1000) * (r * 0.54));
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a100) * (r - 13), cy + Math.sin(a100) * (r - 13));
  ctx.stroke();

  ctx.fillStyle = '#070b0f';
  ctx.fillRect(cx - 32, cy + 16, 64, 21);
  ctx.strokeStyle = '#38f2d4';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(cx - 32, cy + 16, 64, 21);
  ctx.fillStyle = '#38f2d4';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(String(Math.round(altFt)), cx, cy + 27);
  drawGlassReflection(ctx, cx, cy, r);
}

function drawCompassHSI(ctx, cx, cy, r, headingDeg, waypointBearingDeg) {
  drawDialBezel(ctx, cx, cy, r, '');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-headingDeg * Math.PI) / 180);

  const cards = ['N', '3', '6', 'E', '12', '15', 'S', '21', '24', 'W', '30', '33'];
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    ctx.fillStyle = i % 3 === 0 ? '#ffbd3d' : '#d6e3ec';
    ctx.fillText(cards[i], Math.cos(a) * (r - 20), Math.sin(a) * (r - 20));
  }

  if (Number.isFinite(waypointBearingDeg)) {
    const wa = ((waypointBearingDeg - 90) * Math.PI) / 180;
    ctx.strokeStyle = '#38f2d4';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(wa) * -(r - 26), Math.sin(wa) * -(r - 26));
    ctx.lineTo(Math.cos(wa) * (r - 12), Math.sin(wa) * (r - 12));
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#ff6b2b';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 2);
  ctx.lineTo(cx - 7, cy - r - 9);
  ctx.lineTo(cx + 7, cy - r - 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${String(Math.round(headingDeg) % 360).padStart(3, '0')}°`, cx, cy + 4);
  drawGlassReflection(ctx, cx, cy, r);
}

function drawStatusColumn(ctx, x, y, w, h, state) {
  ctx.fillStyle = '#0c131a';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#475b6d';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, w, h);

  const drawBar = (label, pct, col, rowY, valText) => {
    ctx.fillStyle = '#a9c1cf';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 16, rowY);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f2f7fa';
    ctx.fillText(valText, x + w - 16, rowY);
    ctx.fillStyle = '#18242e';
    ctx.fillRect(x + 16, rowY + 8, w - 32, 15);
    ctx.fillStyle = col;
    ctx.fillRect(x + 16, rowY + 8, Math.max(0, Math.min(1, pct / 100)) * (w - 32), 15);
  };

  drawBar('THROTTLE', (state.throttle / 1.1) * 100, state.throttle > 1 ? '#ff5722' : '#38f2d4', y + 28, `${Math.round(state.throttle * 100)}%`);
  drawBar('FUEL QTY', state.fuelPct, state.fuelPct < 25 ? '#ff4d4f' : '#f5a623', y + 80, `${Math.round(state.fuelPct)}%`);
  drawBar('HULL / ENG', state.hullPct, state.hullPct < 60 ? '#ff6b2b' : '#22c55e', y + 132, `${Math.round(state.hullPct)}%`);

  const lamps = [
    ['STALL', state.stalling, '#ff3b30'],
    ['LOW FUEL', state.lowFuel, '#ffaa1d'],
    ['GEAR DN', state.gearDown && state.gearIntact, '#22c55e'],
    ['FLAPS', state.flapStage > 0, '#38bdf8'],
    ['ENG DMG', state.engineHealth < 80, '#ff5722'],
    ['TOGA', state.throttle > 1.0, '#f59e0b'],
  ];
  for (let i = 0; i < lamps.length; i++) {
    const [text, lit, color] = lamps[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = x + 16 + col * ((w - 40) * 0.5 + 8);
    const by = y + 182 + row * 44;
    const bw = (w - 40) * 0.5;
    if (lit) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = lit ? color : '#15202a';
    ctx.fillRect(bx, by, bw, 32);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = lit ? '#ffffff' : '#354757';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(bx, by, bw, 32);
    ctx.fillStyle = lit ? '#080c10' : '#586977';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw * 0.5, by + 16);
  }
}

export function createCockpitInterior(aircraftRoot) {
  const group = new THREE.Group();
  group.visible = false;
  aircraftRoot.add(group);

  const metalTex = createCockpitMetalTexture();
  const propDiscTex = createSoftParticleTexture('prop');

  const panelMat = new THREE.MeshStandardMaterial({
    map: metalTex,
    color: '#34414f',
    roughness: 0.62,
    metalness: 0.48,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    map: metalTex,
    color: '#465564',
    roughness: 0.5,
    metalness: 0.58,
  });
  const leatherMat = new THREE.MeshStandardMaterial({ color: '#1b2128', roughness: 0.85, metalness: 0.1 });
  const accentMat = new THREE.MeshStandardMaterial({ color: '#e55320', roughness: 0.35, metalness: 0.2 });
  const blueLeverMat = new THREE.MeshStandardMaterial({ color: '#2b8bc2', roughness: 0.35, metalness: 0.25 });
  const ivoryNoseMat = new THREE.MeshStandardMaterial({ color: '#efe8d8', roughness: 0.38, metalness: 0.15 });
  const tealNacMat = new THREE.MeshStandardMaterial({ color: '#13495e', roughness: 0.4, metalness: 0.28 });

  // Visible sculpted exterior nose hood + matte anti-glare panel through front windshield
  const noseHood = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.96, 2.3, 14), ivoryNoseMat);
  noseHood.rotation.x = Math.PI / 2;
  noseHood.scale.set(1.05, 1.0, 0.45);
  noseHood.position.set(0, 0.72, -4.75);
  group.add(noseHood);

  const antiGlare = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 2.0), leatherMat);
  antiGlare.position.set(0, 0.93, -4.65);
  group.add(antiGlare);

  // Exterior wingtips, engine nacelles, 3D propeller blades & RPM-faded motion-blur discs VISIBLE outside cockpit windows!
  const sideProps = [];
  const sideBladeMat = new THREE.MeshStandardMaterial({ color: '#1b2229', roughness: 0.45, metalness: 0.55 });
  const sideTipMat = new THREE.MeshStandardMaterial({ color: '#f5b42e', roughness: 0.4 });
  for (const side of [-1, 1]) {
    const extNac = new THREE.Group();
    extNac.position.set(side * 2.55, 1.08, -3.95);
    const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 1.9, 14), tealNacMat);
    cowl.rotation.x = Math.PI / 2;
    extNac.add(cowl);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 8, 14), accentMat);
    ring.position.z = -0.95;
    extNac.add(ring);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 12), accentMat);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.z = -1.25;
    extNac.add(spinner);

    const bladeHub = new THREE.Group();
    bladeHub.position.z = -1.12;
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.65, 0.03), sideBladeMat);
      blade.rotation.z = (b * Math.PI * 2) / 3;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.035), sideTipMat);
      tip.position.y = 0.74;
      blade.add(tip);
      bladeHub.add(blade);
    }
    extNac.add(bladeHub);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.92, 20),
      new THREE.MeshBasicMaterial({
        map: propDiscTex,
        transparent: true,
        opacity: 0.76,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    disc.position.z = -1.12;
    extNac.add(disc);
    sideProps.push({ bladeHub, disc, spinner });
    group.add(extNac);

    const wingEdge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.1), ivoryNoseMat);
    wingEdge.position.set(side * 2.5, 1.48, -3.45);
    group.add(wingEdge);
  }

  // Padded leather-edge glareshield lip with warm recessed floodlight strip
  const glare = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.075, 0.44), leatherMat);
  glare.position.set(0, 1.03, -3.52);
  group.add(glare);

  const glareLightStrip = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.018, 0.025),
    new THREE.MeshBasicMaterial({ color: '#ffbd59' }),
  );
  glareLightStrip.position.set(0, 0.99, -3.32);
  group.add(glareLightStrip);

  // Smoked-emerald 3D Glass HUD Combiner perched above the glareshield!
  const combinerGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 0.48),
    new THREE.MeshBasicMaterial({
      color: '#45f5d2',
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  combinerGlass.position.set(-0.08, 1.32, -3.46);
  combinerGlass.rotation.x = -0.22;
  group.add(combinerGlass);

  for (const sx of [-0.39, 0.39]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.44, 0.024), frameMat);
    post.position.set(-0.08 + sx, 1.28, -3.44);
    post.rotation.x = -0.22;
    group.add(post);
  }

  // Windshield canopy structural pillars (riveted brushed slate)
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.095, 1.34, 0.11), frameMat);
  leftPillar.position.set(-1.18, 1.58, -3.56);
  leftPillar.rotation.x = 0.42;
  leftPillar.rotation.z = -0.16;
  group.add(leftPillar);

  const rightPillar = leftPillar.clone();
  rightPillar.position.x = 1.18;
  rightPillar.rotation.z = 0.16;
  group.add(rightPillar);

  const centerPillar = new THREE.Mesh(new THREE.BoxGeometry(0.046, 1.34, 0.06), frameMat);
  centerPillar.position.set(0.36, 1.58, -3.66);
  centerPillar.rotation.x = 0.42;
  group.add(centerPillar);

  // Overhead brow switch panel with physically flipping 3D toggle switches & glowing status LEDs
  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.14, 0.34), panelMat);
  topHeader.position.set(0, 2.09, -3.22);
  group.add(topHeader);

  const overheadSwitches = [];
  for (let i = 0; i < 6; i++) {
    const ledMat = new THREE.MeshBasicMaterial({ color: i < 4 ? '#34d399' : '#ffbd3d' });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.025, 0.02), ledMat);
    led.position.set(-0.68 + i * 0.15, 2.04, -3.05);
    group.add(led);
    const toggle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.075, 6), frameMat);
    toggle.position.set(-0.68 + i * 0.15, 2.0, -3.09);
    toggle.rotation.x = 0.35;
    group.add(toggle);
    overheadSwitches.push({ ledMat, toggle });
  }

  const compassHousing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.16), frameMat);
  compassHousing.position.set(0.36, 1.92, -3.32);
  group.add(compassHousing);

  // Automatic Twin 3D Windshield Wipers + Translucent Rain-Beaded Glass Layer (activates on Rain/Storm!)
  const wiperPivots = [];
  for (const wx of [-0.46, 0.56]) {
    const wp = new THREE.Group();
    wp.position.set(wx, 1.04, -3.56);
    wp.rotation.x = 0.38;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.58, 0.02), frameMat);
    arm.position.y = 0.29;
    wp.add(arm);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.38, 0.018), leatherMat);
    blade.position.set(0.012, 0.44, -0.01);
    wp.add(blade);
    wp.rotation.z = -0.82; // Parked neatly along bottom of windshield when dry
    group.add(wp);
    wiperPivots.push(wp);
  }

  const rainGlassCanvas = document.createElement('canvas');
  rainGlassCanvas.width = 512;
  rainGlassCanvas.height = 256;
  const rainGlassCtx = rainGlassCanvas.getContext('2d');
  const rainGlassTex = new THREE.CanvasTexture(rainGlassCanvas);
  const rainGlassMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.26, 0.96),
    new THREE.MeshBasicMaterial({
      map: rainGlassTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  rainGlassMesh.position.set(0, 1.54, -3.54);
  rainGlassMesh.rotation.x = 0.38;
  rainGlassMesh.visible = false;
  group.add(rainGlassMesh);

  // High-Res Live Illuminated Instrument Panel (1280x480)
  const dashCanvas = document.createElement('canvas');
  dashCanvas.width = 1280;
  dashCanvas.height = 480;
  const dashCtx = dashCanvas.getContext('2d');
  const dashTex = new THREE.CanvasTexture(dashCanvas);
  dashTex.colorSpace = THREE.SRGBColorSpace;
  dashTex.anisotropy = 8;

  const dashMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.22, 0.8),
    new THREE.MeshBasicMaterial({ map: dashTex }),
  );
  dashMesh.position.set(0, 0.59, -3.4);
  dashMesh.rotation.x = -0.14;
  group.add(dashMesh);

  // Sculpted Beechcraft King Air / Twin Otter Ergonomic Curved Control Yoke (TubeGeometry + contoured hub + trim switches!)
  const yokePivot = new THREE.Group();
  yokePivot.position.set(-0.54, 0.34, -2.86);

  const rubberGripMat = new THREE.MeshStandardMaterial({ color: '#171c22', roughness: 0.72, metalness: 0.14 });
  const brushedAlumMat = new THREE.MeshStandardMaterial({ color: '#8e9ba6', roughness: 0.32, metalness: 0.78 });
  const redSwitchMat = new THREE.MeshStandardMaterial({ color: '#d92b2b', roughness: 0.35, metalness: 0.2 });
  const goldBadgeMat = new THREE.MeshStandardMaterial({ color: '#e5b343', roughness: 0.3, metalness: 0.65 });

  // Steel steering column + rubber accordion boot emerging from instrument subpanel
  const yokeColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.44, 14), brushedAlumMat);
  yokeColumn.rotation.x = Math.PI / 2;
  yokeColumn.position.z = -0.22;
  yokePivot.add(yokeColumn);
  for (let b = 0; b < 4; b++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.011, 8, 16), rubberGripMat);
    rib.position.z = -0.26 - b * 0.028;
    yokePivot.add(rib);
  }

  // Sculpted smooth ram's-horn / molded W-wheel tube curve (zero boxy cubes!)
  const yokeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.235, 0.205, 0.025),
    new THREE.Vector3(-0.258, 0.115, 0.018),
    new THREE.Vector3(-0.238, 0.02, 0.008),
    new THREE.Vector3(-0.15, -0.028, 0.0),
    new THREE.Vector3(0.0, -0.018, 0.0),
    new THREE.Vector3(0.15, -0.028, 0.0),
    new THREE.Vector3(0.238, 0.02, 0.008),
    new THREE.Vector3(0.258, 0.115, 0.018),
    new THREE.Vector3(0.235, 0.205, 0.025),
  ]);
  const yokeTube = new THREE.Mesh(new THREE.TubeGeometry(yokeCurve, 44, 0.026, 12, false), rubberGripMat);
  yokePivot.add(yokeTube);

  // Rounded end-caps & ergonomic ribbed finger-grooves on left & right grips
  for (const sx of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), rubberGripMat);
    cap.position.set(sx * 0.235, 0.205, 0.025);
    yokePivot.add(cap);
    for (let g = 0; g < 4; g++) {
      const gripBand = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.004, 6, 12), leatherMat);
      gripBand.rotation.x = Math.PI / 2;
      gripBand.position.set(sx * 0.252, 0.065 + g * 0.032, 0.014 + g * 0.002);
      yokePivot.add(gripBand);
    }
  }
  // Left-horn red AP Disconnect thumb button & electric pitch-trim rocker switch
  const apBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.018, 10), redSwitchMat);
  apBtn.rotation.x = Math.PI / 2;
  apBtn.position.set(-0.228, 0.185, 0.044);
  yokePivot.add(apBtn);
  const trimRocker = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.02, 4, 8), brushedAlumMat);
  trimRocker.position.set(-0.244, 0.155, 0.042);
  yokePivot.add(trimRocker);

  // Contoured central yoke boss + beveled Garuda crest nameplate
  const yokeHub = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.055, 16), rubberGripMat);
  yokeHub.rotation.x = Math.PI / 2;
  yokeHub.position.set(0, -0.012, 0.006);
  yokePivot.add(yokeHub);
  const yokeCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.012, 16), goldBadgeMat);
  yokeCrest.rotation.x = Math.PI / 2;
  yokeCrest.position.set(0, -0.012, 0.034);
  yokePivot.add(yokeCrest);
  group.add(yokePivot);

  // Center Pedestal Quadrant (Beechcraft King Air / PT6 Twin-Turboprop Reference!)
  // Curved sloped quadrant housing with backlit painted gate markings (MAX / FLT IDLE / BETA / REV / FEATHER / CUTOFF)
  const quadCanvas = document.createElement('canvas');
  quadCanvas.width = 512;
  quadCanvas.height = 256;
  const qctx = quadCanvas.getContext('2d');
  qctx.fillStyle = '#182028';
  qctx.fillRect(0, 0, 512, 256);
  // Recessed lever slot channels
  for (const sx of [56, 104, 168, 212, 272, 314, 386, 458]) {
    qctx.fillStyle = '#070a0d';
    qctx.fillRect(sx - 6, 26, 12, 198);
    qctx.strokeStyle = '#3f4f5e';
    qctx.lineWidth = 2;
    qctx.strokeRect(sx - 6, 26, 12, 198);
  }
  // Authentic Beechcraft red-and-white diagonal Beta / Reverse warning stripes below Power Lever slots!
  qctx.save();
  qctx.beginPath();
  qctx.rect(36, 156, 88, 68);
  qctx.clip();
  for (let s = -40; s < 160; s += 16) {
    qctx.fillStyle = (s / 16) % 2 === 0 ? '#d9342b' : '#f1f5f9';
    qctx.beginPath();
    qctx.moveTo(36 + s, 156);
    qctx.lineTo(44 + s, 156);
    qctx.lineTo(14 + s, 224);
    qctx.lineTo(6 + s, 224);
    qctx.closePath();
    qctx.fill();
  }
  qctx.restore();
  qctx.fillStyle = '#e6f0f5';
  qctx.font = 'bold 16px monospace';
  qctx.textAlign = 'center';
  qctx.fillText('POWER', 80, 18);
  qctx.fillStyle = '#60b8f0';
  qctx.fillText('PROP', 190, 18);
  qctx.fillStyle = '#ff6b6b';
  qctx.fillText('COND', 293, 18);
  qctx.fillStyle = '#e6f0f5';
  qctx.fillText('FLAP', 386, 18);
  qctx.fillText('GEAR', 458, 18);
  qctx.font = 'bold 12px monospace';
  qctx.fillStyle = '#d4e2ea';
  qctx.fillText('MAX', 20, 44);
  qctx.fillText('IDLE', 20, 146);
  qctx.fillText('REV', 20, 210);
  qctx.fillText('UP', 356, 52);
  qctx.fillText('15', 356, 128);
  qctx.fillText('30', 356, 204);
  const quadTex = new THREE.CanvasTexture(quadCanvas);
  quadTex.colorSpace = THREE.SRGBColorSpace;

  const pedestalGroup = new THREE.Group();
  pedestalGroup.position.set(0.32, 0.29, -2.92);
  // Curved arched quadrant dome (instead of flat square box!)
  const quadDome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.17, 0.72, 20, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
    new THREE.MeshStandardMaterial({ map: quadTex, roughness: 0.55, metalness: 0.32 }),
  );
  quadDome.rotation.z = Math.PI / 2;
  quadDome.position.set(0, -0.05, 0);
  pedestalGroup.add(quadDome);
  for (const sx of [-0.365, 0.365]) {
    const cheek = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.022, 18), frameMat);
    cheek.rotation.z = Math.PI / 2;
    cheek.position.set(sx, -0.05, 0);
    pedestalGroup.add(cheek);
  }
  // Knurled metallic friction-lock thumbwheel on left flank of quadrant
  const frictionWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.024, 16), brushedAlumMat);
  frictionWheel.rotation.z = Math.PI / 2;
  frictionWheel.position.set(-0.39, -0.02, 0.02);
  pedestalGroup.add(frictionWheel);
  group.add(pedestalGroup);

  // 2A. Sculpted Twin Power (Throttle) Levers — tapered aluminum stalks + curved black palm grips + beta triggers
  const throttlePivot = new THREE.Group();
  throttlePivot.position.set(0.08, 0.29, -2.92);
  for (const lx of [-0.048, 0.022]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.24, 10), brushedAlumMat);
    stalk.position.set(lx, 0.12, 0);
    throttlePivot.add(stalk);
    // Ergonomic rounded-capsule matte-black King Air power knob
    const palmGrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.036, 8, 12), rubberGripMat);
    palmGrip.rotation.z = Math.PI / 2;
    palmGrip.position.set(lx, 0.242, 0.008);
    throttlePivot.add(palmGrip);
    // Reverse/Beta lift-trigger bar tucked beneath the knob
    const betaTrigger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.042, 8), brushedAlumMat);
    betaTrigger.rotation.z = Math.PI / 2;
    betaTrigger.position.set(lx, 0.208, 0.018);
    throttlePivot.add(betaTrigger);
  }

  // 2B. Twin Blue Fluted/Scalloped Propeller RPM Levers (authentic FAA/King Air blue scalloped knobs!)
  for (const lx of [0.11, 0.175]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.012, 0.225, 10), brushedAlumMat);
    stalk.position.set(lx, 0.112, 0.012);
    throttlePivot.add(stalk);
    const propHub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.032, 12), blueLeverMat);
    propHub.rotation.z = Math.PI / 2;
    propHub.position.set(lx, 0.228, 0.012);
    throttlePivot.add(propHub);
    // Scalloped fluted ridges around blue prop knob
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), blueLeverMat);
      lobe.position.set(lx, 0.228 + Math.cos(a) * 0.02, 0.012 + Math.sin(a) * 0.02);
      throttlePivot.add(lobe);
    }
  }

  // 2C. Twin Red Condition / Fuel Mixture Levers (shorter stalks + tapered crimson caps)
  for (const lx of [0.255, 0.312]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.011, 0.195, 10), brushedAlumMat);
    stalk.position.set(lx, 0.098, 0.025);
    throttlePivot.add(stalk);
    const condKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.036, 8), redSwitchMat);
    condKnob.rotation.z = Math.PI / 2;
    condKnob.position.set(lx, 0.198, 0.025);
    throttlePivot.add(condKnob);
  }
  group.add(throttlePivot);

  // 3. Authentic Aerofoil-Shaped 3D Flap Selector Lever (mini curved wing profile, zero flat box!)
  const flapLeverPivot = new THREE.Group();
  flapLeverPivot.position.set(0.495, 0.29, -2.92);
  const flapShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.21, 10), brushedAlumMat);
  flapShaft.position.y = 0.105;
  flapLeverPivot.add(flapShaft);
  const foilShape = new THREE.Shape();
  foilShape.moveTo(-0.028, 0);
  foilShape.quadraticCurveTo(-0.005, 0.016, 0.034, 0.002);
  foilShape.quadraticCurveTo(0.005, -0.006, -0.028, 0);
  const foilGeo = new THREE.ExtrudeGeometry(foilShape, { depth: 0.056, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003 });
  foilGeo.rotateY(Math.PI / 2);
  foilGeo.translate(-0.028, 0.212, 0.004);
  const flapKnob = new THREE.Mesh(foilGeo, ivoryNoseMat);
  flapLeverPivot.add(flapKnob);
  group.add(flapLeverPivot);

  // 4. Authentic King Air Transport-Category Tire-Wheel Landing Gear Lever + 3 Green Down-and-Locked LEDs!
  const gearLeverPivot = new THREE.Group();
  gearLeverPivot.position.set(0.605, 0.29, -2.92);
  const gearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.205, 10), brushedAlumMat);
  gearShaft.position.y = 0.102;
  gearLeverPivot.add(gearShaft);
  // Sculpted miniature rubber-treaded aircraft wheel handle (torus tire + white translucent hub + dual red transit lights!)
  const tireTread = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.011, 10, 18), rubberGripMat);
  tireTread.rotation.y = Math.PI / 2;
  tireTread.position.y = 0.215;
  gearLeverPivot.add(tireTread);
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), ivoryNoseMat);
  wheelHub.rotation.z = Math.PI / 2;
  wheelHub.position.y = 0.215;
  gearLeverPivot.add(wheelHub);
  group.add(gearLeverPivot);

  // 5. Realistic High-Visibility Articulated 3D Pilot Hands & Uniform Sleeves (tan aviation gloves + crisp white captain sleeves!)
  const gloveLeatherMat = new THREE.MeshStandardMaterial({ color: '#9c6c46', roughness: 0.58, metalness: 0.08 });
  const gloveStitchMat = new THREE.MeshStandardMaterial({ color: '#6b452a', roughness: 0.68, metalness: 0.08 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: '#e6eef5', roughness: 0.62, metalness: 0.05 });
  const cuffWhiteMat = new THREE.MeshStandardMaterial({ color: '#1b3147', roughness: 0.7 });

  function createGlovedHand(isRight) {
    const hand = new THREE.Group();
    const s = isRight ? 1 : -1;
    // Sculpted palm + knuckle ridge
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.078, 0.028), gloveLeatherMat);
    palm.position.set(0, 0, 0.008);
    hand.add(palm);
    const knuckleBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.048, 6, 8), gloveStitchMat);
    knuckleBar.rotation.z = Math.PI / 2;
    knuckleBar.position.set(0, 0.032, 0.002);
    hand.add(knuckleBar);
    // 4 articulated curled fingers wrapping naturally around the grip
    for (let f = 0; f < 4; f++) {
      const fx = (-0.024 + f * 0.016) * s;
      const prox = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, 0.024, 4, 8), gloveLeatherMat);
      prox.position.set(fx, 0.046, -0.008);
      prox.rotation.x = 0.75;
      hand.add(prox);
      const dist = new THREE.Mesh(new THREE.CapsuleGeometry(0.0064, 0.02, 4, 8), gloveLeatherMat);
      dist.position.set(fx, 0.042, -0.028);
      dist.rotation.x = 1.95;
      hand.add(dist);
    }
    // Opposable thumb wrapping over top/side of yoke horn or throttle lever
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.032, 4, 8), gloveLeatherMat);
    thumb.position.set(-0.036 * s, 0.018, -0.012);
    thumb.rotation.set(0.65, 0, 0.55 * s);
    hand.add(thumb);
    // Wrist cuff + captain's gold rank stripe
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.04, 12), gloveStitchMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(0, -0.018, 0.044);
    hand.add(cuff);
    return hand;
  }

  function createArmRig(isRight) {
    const armGroup = new THREE.Group();
    const hand = createGlovedHand(isRight);
    armGroup.add(hand);

    // Forearm sleeve with white shirt cuff + dual gold captain bars
    const forearm = new THREE.Group();
    const fSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.42, 12), jacketMat);
    fSleeve.rotation.x = Math.PI / 2;
    fSleeve.position.z = 0.21;
    forearm.add(fSleeve);
    const shirtRing = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.041, 0.018, 12), cuffWhiteMat);
    shirtRing.rotation.x = Math.PI / 2;
    shirtRing.position.z = 0.016;
    forearm.add(shirtRing);
    for (const gz of [0.055, 0.075]) {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.009, 12), goldBadgeMat);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.z = gz;
      forearm.add(stripe);
    }
    armGroup.add(forearm);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.42, 12), jacketMat);
    upperArm.rotation.x = Math.PI / 2;
    const upperPivot = new THREE.Group();
    upperArm.position.z = 0.21;
    upperPivot.add(upperArm);
    armGroup.add(upperPivot);

    group.add(armGroup);
    return { hand, forearm, upperPivot };
  }

  const leftArm = createArmRig(false);
  const rightArm = createArmRig(true);
  const LEFT_SHOULDER = new THREE.Vector3(-0.36, 0.46, -2.18);
  const RIGHT_SHOULDER = new THREE.Vector3(0.24, 0.46, -2.18);
  const smoothRightHandPos = new THREE.Vector3(0.08, 0.46, -3.02);
  let lastFlapStage = 0;
  let lastGearDown = true;
  let rightHandAction = 'throttle'; // 'throttle' | 'flaps' | 'gear'
  let rightHandActionTimer = 0;

  const Z_AXIS = new THREE.Vector3(0, 0, 1);
  function poseArm2Link(arm, wristPos, shoulderPos, elbowOutX) {
    const elbowPos = wristPos.clone().lerp(shoulderPos, 0.52);
    elbowPos.y -= 0.14;
    elbowPos.x += elbowOutX;
    const fDir = elbowPos.clone().sub(wristPos);
    const fLen = Math.max(0.05, fDir.length());
    arm.forearm.position.copy(wristPos);
    arm.forearm.quaternion.setFromUnitVectors(Z_AXIS, fDir.normalize());
    arm.forearm.scale.set(1, 1, fLen / 0.42);

    const uDir = shoulderPos.clone().sub(elbowPos);
    const uLen = Math.max(0.05, uDir.length());
    arm.upperPivot.position.copy(elbowPos);
    arm.upperPivot.quaternion.setFromUnitVectors(Z_AXIS, uDir.normalize());
    arm.upperPivot.scale.set(1, 1, uLen / 0.42);
  }
  const gearLampMat = new THREE.MeshBasicMaterial({ color: '#22c55e' });
  for (const [gx, gy] of [
    [0.605, 0.34],
    [0.575, 0.3],
    [0.635, 0.3],
  ]) {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.012, 10), frameMat);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(gx, gy, -2.86);
    group.add(bezel);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), gearLampMat);
    bulb.position.set(gx, gy, -2.855);
    group.add(bulb);
  }

  // Re-declare 3-green comment anchor cleanly above (already built right above)

  function renderPanelCanvas(flightState, waypointBearingDeg) {
    const ctx = dashCtx;
    // Brushed slate cockpit backing with warm incandescent top glow
    const bg = ctx.createLinearGradient(0, 0, 0, 480);
    bg.addColorStop(0, '#222b34');
    bg.addColorStop(0.14, '#141c24');
    bg.addColorStop(1, '#0e141a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1280, 480);

    // Subtle warm floodlight wash across top bezel
    const flood = ctx.createLinearGradient(0, 0, 0, 75);
    flood.addColorStop(0, 'rgba(255, 196, 104, 0.22)');
    flood.addColorStop(1, 'rgba(255, 196, 104, 0)');
    ctx.fillStyle = flood;
    ctx.fillRect(0, 0, 1280, 75);

    ctx.strokeStyle = '#3c4e5e';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 1264, 464);

    // Engraved placard nameplate
    ctx.fillStyle = '#e5bc69';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GARUDA G-4 · PK-GRD', 28, 36);

    // Primary Flight Six-Pack + HSI
    drawAirspeedDial(ctx, 162, 184, 106, flightState.airspeedKts);
    drawAttitudeIndicator(ctx, 412, 184, 114, flightState.pitchDeg, flightState.rollDeg);
    drawAltimeterDial(ctx, 662, 184, 106, flightState.altitudeFt);
    drawCompassHSI(ctx, 412, 382, 76, flightState.headingDeg, waypointBearingDeg);

    // Digital Engine & Aerodynamics Readout Pod
    ctx.fillStyle = '#0b1218';
    ctx.fillRect(52, 322, 234, 122);
    ctx.strokeStyle = '#43586b';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(52, 322, 234, 122);
    ctx.fillStyle = '#9db6c6';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('VSI (M/S)', 68, 354);
    ctx.fillText('G-LOAD', 68, 390);
    ctx.fillText('ENG EGT', 68, 426);
    ctx.textAlign = 'right';
    ctx.fillStyle = flightState.vsiMps < -5 ? '#ff5722' : '#38f2d4';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`${flightState.vsiMps >= 0 ? '+' : ''}${flightState.vsiMps.toFixed(1)}`, 270, 354);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${flightState.gLoad.toFixed(1)}G`, 270, 390);
    ctx.fillStyle = flightState.engineTempC > 750 ? '#ff5722' : '#f5a623';
    ctx.fillText(`${Math.round(flightState.engineTempC)}°C`, 270, 426);

    // Right-Side Fuel / Hull / Throttle & Illuminated Annunciator Cluster
    drawStatusColumn(ctx, 814, 54, 434, 392, flightState);

    dashTex.needsUpdate = true;
  }

  let frameCounter = 0;
  let smoothYokeRoll = 0;
  let smoothYokePitch = 0;
  let smoothThrottleAng = 0;
  let smoothFlapAng = 0;
  let smoothGearAng = 0;
  let wiperAngle = -0.82;

  function renderRainGlass(timeSec, rainIntensity, currentWiperAngle) {
    const rctx = rainGlassCtx;
    rctx.clearRect(0, 0, 512, 256);
    if (rainIntensity <= 0.05) return;

    // Animated glistening water droplets & wind-blown rain streaks on canopy glass
    const count = Math.round(65 + rainIntensity * 95);
    rctx.fillStyle = 'rgba(210, 238, 252, 0.52)';
    rctx.strokeStyle = 'rgba(220, 244, 255, 0.42)';
    rctx.lineWidth = 1.6;
    for (let i = 0; i < count; i++) {
      const seed = i * 37.7;
      const x = ((Math.sin(seed) * 0.5 + 0.5) * 512 + timeSec * (12 + (i % 7) * 4)) % 512;
      const y = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * 256 + timeSec * (55 + (i % 9) * 14)) % 256;
      rctx.beginPath();
      rctx.moveTo(x, y);
      rctx.lineTo(x - 2, y + 7 + rainIntensity * 6);
      rctx.stroke();
      rctx.beginPath();
      rctx.arc(x, y, 1.8, 0, Math.PI * 2);
      rctx.fill();
    }

    // Clear freshly-swept arc behind the twin wiper blades!
    rctx.globalCompositeOperation = 'destination-out';
    const sweepRatio = (currentWiperAngle + 0.85) / 1.7;
    for (const cx of [154, 372]) {
      rctx.fillStyle = 'rgba(0,0,0,0.68)';
      rctx.beginPath();
      rctx.moveTo(cx, 252);
      rctx.arc(cx, 252, 165, -Math.PI * 0.92, -Math.PI * (0.92 - sweepRatio * 0.78), false);
      rctx.closePath();
      rctx.fill();
    }
    rctx.globalCompositeOperation = 'source-over';
    rainGlassTex.needsUpdate = true;
  }

  function updateCockpit(flightState, waypointBearingDeg, isCockpitView, forceDraw = false, timeSec = 0, rainIntensity = 0) {
    group.visible = isCockpitView;
    if (!isCockpitView) return;

    // Cockpit exterior propellers obey REAL rotational spin-down inertia (blur disc disappears when RPM drops!)
    const rpmL = flightState.propRpmLeft ?? 0;
    const rpmR = flightState.propRpm ?? 0;
    sideProps[0].bladeHub.rotation.z = flightState.propAngleLeft ?? flightState.propAngle;
    sideProps[1].bladeHub.rotation.z = -flightState.propAngle;
    sideProps[0].disc.rotation.z = flightState.propAngleLeft ?? flightState.propAngle;
    sideProps[1].disc.rotation.z = -flightState.propAngle;
    const opL = rpmL > 0.24 ? Math.min(0.76, (rpmL - 0.24) * 1.1) : 0;
    const opR = rpmR > 0.24 ? Math.min(0.76, (rpmR - 0.24) * 1.1) : 0;
    const leftCrashedOff = flightState.status === 'crashed' && flightState.crashMode !== 'water';
    sideProps[0].bladeHub.visible = !leftCrashedOff;
    sideProps[0].spinner.visible = !leftCrashedOff;
    sideProps[0].disc.visible = !leftCrashedOff && opL > 0.02;
    sideProps[0].disc.material.opacity = opL;
    sideProps[1].disc.visible = opR > 0.02;
    sideProps[1].disc.material.opacity = opR;

    // Fluid spring-damped cockpit controls + subtle engine vibration micro-tremor
    const vib = Math.sin(timeSec * 46) * 0.004 * (flightState.status === 'crashed' ? 0 : 0.3 + flightState.throttle);
    const targetYokeRoll = -flightState.controlSurface.aileron * 0.78;
    const targetYokePitch = flightState.controlSurface.elevator * 0.11;
    const targetThrAng = -0.4 + flightState.throttle * 0.8;
    const targetFlapAng = -0.35 + flightState.flapStage * 0.38;
    const targetGearAng = flightState.gearDown ? 0.36 : -0.36;

    const k = forceDraw ? 1 : 0.24;
    smoothYokeRoll += (targetYokeRoll - smoothYokeRoll) * k;
    smoothYokePitch += (targetYokePitch - smoothYokePitch) * k;
    smoothThrottleAng += (targetThrAng - smoothThrottleAng) * k;
    smoothFlapAng += (targetFlapAng - smoothFlapAng) * k;
    smoothGearAng += (targetGearAng - smoothGearAng) * k;

    yokePivot.rotation.z = smoothYokeRoll + vib * 2;
    yokePivot.position.z = -2.86 + smoothYokePitch;
    yokePivot.position.y = 0.34 + vib;
    throttlePivot.rotation.x = smoothThrottleAng;
    flapLeverPivot.rotation.x = smoothFlapAng;
    gearLeverPivot.rotation.x = smoothGearAng;
    gearLampMat.color.set(!flightState.gearIntact ? '#ff3b30' : flightState.gearDown ? '#22c55e' : '#ffaa1d');

    // Animate Articulated 3D Pilot Hands & Uniform Arms clearly gripping upper yoke horn & King Air pedestal!
    const breath = Math.sin(timeSec * 1.9) * 0.005;
    const leftGripLocal = new THREE.Vector3(-0.244, 0.145, 0.036);
    leftGripLocal.applyAxisAngle(new THREE.Vector3(0, 0, 1), yokePivot.rotation.z);
    const leftWristPos = yokePivot.position.clone().add(leftGripLocal);
    leftArm.hand.position.copy(leftWristPos);
    leftArm.hand.rotation.set(0.22 + breath, 0.22, yokePivot.rotation.z - 0.14);
    poseArm2Link(leftArm, leftWristPos, LEFT_SHOULDER, -0.11);

    if (flightState.flapStage !== lastFlapStage) {
      lastFlapStage = flightState.flapStage;
      rightHandAction = 'flaps';
      rightHandActionTimer = 0.9;
    }
    if (flightState.gearDown !== lastGearDown) {
      lastGearDown = flightState.gearDown;
      rightHandAction = 'gear';
      rightHandActionTimer = 0.9;
    }
    if (rightHandActionTimer > 0) {
      rightHandActionTimer = Math.max(0, rightHandActionTimer - 0.016);
      if (rightHandActionTimer <= 0) rightHandAction = 'throttle';
    }

    const rTarget = new THREE.Vector3();
    if (rightHandAction === 'flaps' && !forceDraw) {
      rTarget.set(0.495, 0.29 + Math.cos(smoothFlapAng) * 0.215, -2.92 + Math.sin(smoothFlapAng) * 0.215 + 0.035);
    } else if (rightHandAction === 'gear' && !forceDraw) {
      rTarget.set(0.605, 0.29 + Math.cos(smoothGearAng) * 0.215, -2.92 + Math.sin(smoothGearAng) * 0.215 + 0.035);
    } else {
      // Gripping twin matte-black King Air Power Levers clearly in foreground
      rTarget.set(0.068, 0.29 + Math.cos(smoothThrottleAng) * 0.242, -2.92 + Math.sin(smoothThrottleAng) * 0.242 + 0.038);
    }
    if (forceDraw) smoothRightHandPos.copy(rTarget);
    else smoothRightHandPos.lerp(rTarget, 0.18);

    rightArm.hand.position.copy(smoothRightHandPos);
    rightArm.hand.rotation.set(
      (rightHandAction === 'throttle' || forceDraw ? smoothThrottleAng : 0.1) - 1.15 + breath,
      -0.14,
      0.08,
    );
    poseArm2Link(rightArm, smoothRightHandPos, RIGHT_SHOULDER, 0.1);

    // Physically flip overhead toggle switches & LEDs (Wiper switch auto-lights cyan in rain/storm!)
    const raining = rainIntensity > 0.05;
    const states = [true, flightState.gearDown, flightState.flapStage > 0, raining, flightState.lowFuel, flightState.throttle > 1.0];
    for (let i = 0; i < overheadSwitches.length; i++) {
      const on = states[i];
      overheadSwitches[i].toggle.rotation.x = on ? 0.42 : -0.38;
      overheadSwitches[i].ledMat.color.set(
        on ? (i === 3 ? '#38bdf8' : i >= 4 ? '#ffaa1d' : '#34d399') : '#23303c',
      );
    }

    // Automatic twin windshield wipers sweep continuously during Rain & Storm!
    if (raining) {
      const sweepSpeed = rainIntensity > 0.75 ? 5.6 : 3.4;
      wiperAngle = Math.sin(timeSec * sweepSpeed) * 0.78;
    } else {
      wiperAngle += (-0.82 - wiperAngle) * (forceDraw ? 1 : 0.14);
    }
    for (const wp of wiperPivots) {
      wp.rotation.z = wiperAngle;
    }
    rainGlassMesh.visible = raining;
    if (raining && (forceDraw || frameCounter % 2 === 0)) {
      renderRainGlass(timeSec, rainIntensity, wiperAngle);
    }

    if (forceDraw || frameCounter++ % 2 === 0) {
      renderPanelCanvas(flightState, waypointBearingDeg);
    }
  }

  return {
    group,
    updateCockpit,
  };
}
