// Offline procedural canvas textures for Garuda G-4 fuselage rivets & livery, airfoil wings,
// weathered runways, volcanic terrain detail, crinkle-enamel cockpit metal, and soft sprite particles.

import * as THREE from 'three';

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createAircraftSkinTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = seededRand(4041);

  // Warm weathered ivory upper fuselage
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
  baseGrad.addColorStop(0, '#f7f2e6');
  baseGrad.addColorStop(0.54, '#ebe3d2');
  baseGrad.addColorStop(0.56, '#d9cfc0');
  baseGrad.addColorStop(1, '#0e3c4f');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Brushed aluminum panel shading variation
  for (let i = 0; i < 16; i++) {
    const px = i * 64;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(15,30,40,0.035)';
    ctx.fillRect(px, 0, 64, 512);
  }

  // Deep ocean-teal amphibious hull belly
  ctx.fillStyle = '#12495e';
  ctx.fillRect(0, 316, 1024, 196);

  // Garuda vermilion & burnished gold swept cheatlines
  ctx.fillStyle = '#e55320';
  ctx.fillRect(0, 272, 1024, 34);
  ctx.fillStyle = '#f5ab29';
  ctx.fillRect(0, 250, 1024, 16);
  ctx.fillStyle = '#1b5f78';
  ctx.fillRect(0, 306, 1024, 12);

  // Panel seam lines & aircraft rivet rows
  ctx.strokeStyle = 'rgba(28, 38, 46, 0.28)';
  ctx.lineWidth = 2;
  for (let x = 64; x < 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();

    ctx.fillStyle = 'rgba(30, 42, 52, 0.36)';
    for (let y = 18; y < 500; y += 22) {
      ctx.fillRect(x - 6, y, 2, 2);
      ctx.fillRect(x + 4, y, 2, 2);
    }
  }
  for (const y of [118, 248, 320, 420]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Subtle exhaust & salt-spray weathering streaks
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(24, 30, 36, ${0.02 + rng() * 0.04})`;
    ctx.fillRect(rng() * 1024, 240 + rng() * 160, 24 + rng() * 60, 2 + rng() * 4);
  }

  // Crisp aviation registration stencil
  ctx.fillStyle = '#143344';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GARUDA  PK-GRD', 530, 212);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createWingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#eee7d8';
  ctx.fillRect(0, 0, 512, 512);

  // Leading-edge black pneumatic de-icing boot
  ctx.fillStyle = '#20272e';
  ctx.fillRect(0, 0, 512, 54);
  ctx.fillStyle = '#38434e';
  ctx.fillRect(0, 52, 512, 6);

  // Wing rib panel lines & inspection hatches
  ctx.strokeStyle = 'rgba(30, 42, 52, 0.25)';
  ctx.lineWidth = 2;
  for (let x = 32; x < 512; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 58);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (const y of [170, 320, 430]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // High-visibility vermilion & gold rescue wing bands
  ctx.fillStyle = '#e55320';
  ctx.fillRect(0, 58, 72, 454);
  ctx.fillRect(440, 58, 72, 454);
  ctx.fillStyle = '#f5ab29';
  ctx.fillRect(72, 58, 22, 454);
  ctx.fillRect(418, 58, 22, 454);

  // Registration & NO STEP stencil
  ctx.fillStyle = '#15384a';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PK-GRD', 256, 250);
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 3;
  ctx.strokeRect(160, 340, 192, 52);
  ctx.fillStyle = '#c0392b';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('NO STEP', 256, 372);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createTerrainDetailTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const rng = seededRand(90210);

  ctx.fillStyle = '#dad9d3';
  ctx.fillRect(0, 0, 1024, 1024);

  // Layered micro-foliage tufts, volcanic scree speckles & sunlit ridges
  for (let i = 0; i < 14000; i++) {
    const x = rng() * 1024;
    const y = rng() * 1024;
    const r = 1.2 + rng() * 11;
    const v = rng();
    ctx.fillStyle =
      v > 0.62
        ? 'rgba(255,253,242,0.11)'
        : v > 0.25
          ? 'rgba(28,42,30,0.11)'
          : 'rgba(72,58,44,0.09)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Volcanic rock strata & eroded gully lines
  for (let y = 0; y < 1024; y += 16) {
    ctx.strokeStyle = y % 32 === 0 ? 'rgba(32, 38, 34, 0.12)' : 'rgba(255, 250, 236, 0.08)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 48) {
      ctx.lineTo(x, y + Math.sin(x * 0.025 + y * 0.06) * 7 + Math.cos(x * 0.07 - y * 0.03) * 3);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(42, 42);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createTerrainNormalMap() {
  const size = 512;
  const height = new Float32Array(size * size);
  const rng = seededRand(51517);

  // Build seamless tileable multi-frequency height grid for crisp rock/grass bump lighting
  const grid = new Float32Array(64 * 64);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();

  const sampleTile = (u, v, freq) => {
    const x = ((u * freq) % 64 + 64) % 64;
    const y = ((v * freq) % 64 + 64) % 64;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const ix1 = (ix + 1) & 63;
    const iy1 = (iy + 1) & 63;
    const a = grid[iy * 64 + ix];
    const b = grid[iy * 64 + ix1];
    const c = grid[iy1 * 64 + ix];
    const d = grid[iy1 * 64 + ix1];
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const h =
        sampleTile(u, v, 8) * 0.5 +
        sampleTile(u, v, 16) * 0.28 +
        sampleTile(u, v, 32) * 0.14 +
        sampleTile(u, v, 64) * 0.08 +
        Math.sin(v * Math.PI * 16 + sampleTile(u, v, 8) * 4) * 0.09;
      height[y * size + x] = h;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const strength = 5.5;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (height[y * size + xp] - height[y * size + xm]) * strength;
      const dy = (height[yp * size + x] - height[ym * size + x]) * strength;
      const len = Math.hypot(dx, dy, 1.0);
      const idx = (y * size + x) * 4;
      img.data[idx] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      img.data[idx + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      img.data[idx + 2] = Math.round(((1.0 / len) * 0.5 + 0.5) * 255);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(42, 42);
  tex.anisotropy = 8;
  return tex;
}

export function createCloudPuffTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rng = seededRand(88123);

  // Fluffy painted cumulus cloud sprite with warm sunlit crown and cool shadowed base
  const lobes = [
    [128, 134, 86, '#9cb0c4', 0.42],
    [92, 146, 62, '#9aaec2', 0.38],
    [164, 146, 64, '#9aaec2', 0.38],
    [128, 114, 78, '#fff7ec', 0.68],
    [84, 124, 58, '#fff3e2', 0.62],
    [172, 124, 58, '#fff3e2', 0.62],
    [114, 92, 54, '#ffffff', 0.72],
    [148, 96, 48, '#fffcf5', 0.68],
  ];
  for (let i = 0; i < 12; i++) {
    const lx = 68 + rng() * 120;
    const ly = 82 + rng() * 76;
    const lr = 26 + rng() * 34;
    lobes.push([lx, ly, lr, ly < 124 ? '#ffffff' : '#cfdbe6', 0.28 + rng() * 0.22]);
  }

  for (const [cx, cy, r, hex, alpha] of lobes) {
    const g = ctx.createRadialGradient(cx, cy - r * 0.15, r * 0.08, cx, cy, r);
    g.addColorStop(0, hex);
    g.addColorStop(0.58, hex);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFoliageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rng = seededRand(31415);

  ctx.fillStyle = '#2d6338';
  ctx.fillRect(0, 0, 256, 256);

  // Overlapping leafy clusters for organic non-plastic tree canopy shading
  for (let i = 0; i < 650; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const r = 4 + rng() * 13;
    const v = rng();
    ctx.fillStyle = v > 0.66 ? '#4f9148' : v > 0.33 ? '#2c6536' : '#1b4326';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createCockpitMetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rng = seededRand(7721);

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#2a343f');
  grad.addColorStop(0.5, '#1d252d');
  grad.addColorStop(1, '#26303b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Aviation crinkle-coat enamel grain
  for (let i = 0; i < 6000; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Brushed metallic seam highlights & rivets
  ctx.strokeStyle = 'rgba(145, 175, 195, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 492, 492);
  ctx.fillStyle = 'rgba(180, 205, 220, 0.35)';
  for (let i = 28; i < 500; i += 44) {
    ctx.beginPath();
    ctx.arc(i, 20, 2.8, 0, Math.PI * 2);
    ctx.arc(i, 492, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createSoftParticleTexture(kind = 'smoke') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (kind === 'glow') {
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.28, 'rgba(255,245,215,0.72)');
    g.addColorStop(0.65, 'rgba(255,200,120,0.22)');
    g.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  } else if (kind === 'prop') {
    // Swept translucent spinning propeller blur disc
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    g.addColorStop(0, 'rgba(30,36,44,0.45)');
    g.addColorStop(0.45, 'rgba(215,228,236,0.28)');
    g.addColorStop(0.84, 'rgba(248,184,48,0.48)');
    g.addColorStop(0.95, 'rgba(248,184,48,0.65)');
    g.addColorStop(1, 'rgba(248,184,48,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);

    // Three faint motion-blurred blade wedges
    ctx.save();
    ctx.translate(64, 64);
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.fillStyle = 'rgba(20, 26, 34, 0.28)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 60, -0.18, 0.18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else {
    // Multi-lobe soft billowing smoke puff
    const blobs = [
      [64, 64, 48, 0.72],
      [48, 56, 34, 0.45],
      [80, 58, 32, 0.45],
      [62, 78, 36, 0.42],
    ];
    for (const [bx, by, br, alpha] of blobs) {
      const g = ctx.createRadialGradient(bx, by, 3, bx, by, br);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(0.55, `rgba(245,248,252,${alpha * 0.48})`);
      g.addColorStop(1, 'rgba(245,248,252,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHighResRunwayTexture(codeA, codeB) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  const rng = seededRand(codeA.charCodeAt(0) * 97 + codeB.charCodeAt(0));

  // Rich weathered asphalt tarmac
  ctx.fillStyle = '#282e35';
  ctx.fillRect(0, 0, 512, 2048);

  // Asphalt aggregate texture
  for (let i = 0; i < 2400; i++) {
    const px = rng() * 512;
    const py = rng() * 2048;
    const a = 0.03 + rng() * 0.06;
    ctx.fillStyle = rng() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.8})`;
    ctx.fillRect(px, py, 2 + rng() * 8, 8 + rng() * 28);
  }

  // Heavy dark rubber touchdown zone deposits
  for (const y0 of [210, 1460]) {
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + 380);
    grad.addColorStop(0, 'rgba(10,12,15,0)');
    grad.addColorStop(0.45, 'rgba(10,12,15,0.58)');
    grad.addColorStop(1, 'rgba(10,12,15,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(108, y0, 296, 380);
  }

  // Crisp runway markings
  ctx.fillStyle = '#eef2f6';
  ctx.fillRect(20, 28, 12, 1992);
  ctx.fillRect(480, 28, 12, 1992);

  // Centerline dashes
  for (let y = 290; y < 1760; y += 108) {
    ctx.fillRect(249, y, 14, 56);
  }

  // Threshold piano keys (8 bold bars)
  for (let i = 0; i < 8; i++) {
    const x = 52 + i * 54;
    if (i === 3 || i === 4) {
      // slight center gap
    }
    ctx.fillRect(x, 42, 30, 118);
    ctx.fillRect(x, 1888, 30, 118);
  }

  // Aiming point blocks + touchdown zone bars
  ctx.fillRect(104, 345, 48, 126);
  ctx.fillRect(360, 345, 48, 126);
  ctx.fillRect(104, 1577, 48, 126);
  ctx.fillRect(360, 1577, 48, 126);

  // Runway designation numbers
  ctx.fillStyle = '#f4f7fa';
  ctx.font = 'bold 104px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(codeA, 256, 1785);
  ctx.save();
  ctx.translate(256, 260);
  ctx.rotate(Math.PI);
  ctx.fillText(codeB, 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
