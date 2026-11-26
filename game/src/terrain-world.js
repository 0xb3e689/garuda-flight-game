// Procedural volcanic archipelago heightfield, runways with PAPI lights, windsocks,
// lighthouse, crimson suspension bridge, harbor, clouds, and animated sunlit ocean.

import * as THREE from 'three';
import { LANDMARKS, OCEAN_RADIUS, RUNWAYS, WORLD_SIZE } from './config.js';

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hash2(ix, iz) {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x, z, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += (valueNoise(x * freq, z * freq) - 0.5) * 2 * amp;
    freq *= 2.04;
    amp *= 0.48;
  }
  return sum;
}

function runwayLocalCoords(rwy, x, z) {
  const rad = (rwy.headingDeg * Math.PI) / 180;
  // Forward direction of runway: heading 0 -> -Z, heading 90 -> +X
  const fx = Math.sin(rad);
  const fz = -Math.cos(rad);
  const rx = Math.cos(rad);
  const rz = Math.sin(rad);
  const dx = x - rwy.x;
  const dz = z - rwy.z;
  return {
    along: dx * fx + dz * fz,
    lateral: dx * rx + dz * rz,
  };
}

export function getRunwayAt(x, z, margin = 4) {
  for (const rwy of RUNWAYS) {
    const { along, lateral } = runwayLocalCoords(rwy, x, z);
    if (Math.abs(along) <= rwy.length * 0.5 + margin && Math.abs(lateral) <= rwy.width * 0.5 + margin) {
      return { runway: rwy, along, lateral };
    }
  }
  return null;
}

export function sampleTerrainHeight(x, z) {
  let h = -18;

  // 1. Pulau Merpati (central main island)
  {
    const nx = (x - 20) / 560;
    const nz = (z - 10) / 680;
    const dist = Math.hypot(nx, nz);
    const islandMask = 1 - smoothstep(0.42, 1.08, dist + fbm(x * 0.0022, z * 0.0022, 3) * 0.22);
    if (islandMask > 0) {
      let mh = islandMask * 48;
      // Western volcanic spine ridge
      const wRidge = Math.exp(-(((x + 330) / 185) ** 2 + ((z + 40) / 360) ** 2));
      mh += wRidge * (118 + fbm(x * 0.006, z * 0.006, 4) * 34);
      // Eastern headland + lighthouse cape
      const eHead = Math.exp(-(((x - 290) / 160) ** 2 + ((z - 340) / 220) ** 2));
      mh += eHead * (64 + fbm(x * 0.007, z * 0.007, 3) * 18);
      // Bridge west abutment cape
      const bWest = Math.exp(-(((x - 380) / 120) ** 2 + ((z + 340) / 130) ** 2));
      mh += bWest * 58;
      h = Math.max(h, mh - 14);
    }
  }

  // East Bridge Island (Pulau Timur)
  {
    const d = Math.hypot((x - 980) / 260, (z + 340) / 290);
    const mask = 1 - smoothstep(0.38, 1.02, d + fbm(x * 0.003, z * 0.003, 3) * 0.18);
    if (mask > 0) {
      const peak = Math.exp(-(((x - 1040) / 140) ** 2 + ((z + 360) / 140) ** 2)) * 120;
      h = Math.max(h, mask * 58 + peak - 12);
    }
  }

  // 2. Gunung Kawah (North-West volcanic caldera + canyon pass)
  {
    const cx = LANDMARKS.calderaCenter.x;
    const cz = LANDMARKS.calderaCenter.z;
    const r = Math.hypot(x - cx, z - cz);
    const noise = fbm(x * 0.0028, z * 0.0028, 4);
    const baseMask = 1 - smoothstep(420, 1080, r + noise * 170);
    if (baseMask > 0) {
      let vh = baseMask * 145;
      // Crater rim ring around radius ~310m
      const rim = Math.exp(-(((r - 310) / 135) ** 2));
      vh += rim * (265 + noise * 65);
      // Inner caldera floor
      const bowl = 1 - smoothstep(130, 265, r);
      vh = vh * (1 - bowl * 0.35) + bowl * 185;
      // Carve dramatic eastern canyon pass for Mission 2 approach
      const canyonAxis = Math.abs((z - (cz + 260)) * 0.72 - (x - (cx + 310)) * 0.69);
      const canyonLen = Math.hypot(x - (cx + 310), z - (cz + 260));
      if (canyonLen < 430) {
        const carve = (1 - smoothstep(45, 130, canyonAxis)) * (1 - smoothstep(260, 430, canyonLen));
        vh -= carve * 145;
      }
      // Stepped basalt terraces
      const terraced = Math.floor(vh / 28) * 28 + smoothstep(0, 28, vh % 28) * 28;
      vh = vh * 0.78 + terraced * 0.22;
      h = Math.max(h, vh - 16);
    }
  }

  // 3. Tanjung Karang (North-East sheer cliff plateau)
  {
    const kx = 1200;
    const kz = -1250;
    const dist = Math.hypot((x - kx) / 480, (z - kz) / 310);
    const cliffMask = 1 - smoothstep(0.62, 0.94, dist + fbm(x * 0.0035, z * 0.0035, 3) * 0.12);
    if (cliffMask > 0) {
      let kh = cliffMask * 78;
      const northPeak = Math.exp(-(((x - 1220) / 210) ** 2 + ((z + 1480) / 120) ** 2)) * 95;
      kh += northPeak;
      h = Math.max(h, kh - 10);
    }
  }

  // 4. Karang Selatan / Shoal emergency island + sea stacks
  {
    const sx = -760;
    const sz = 860;
    const dist = Math.hypot((x - sx) / 360, (z - sz) / 320);
    const mask = 1 - smoothstep(0.45, 1.0, dist + fbm(x * 0.004, z * 0.004, 3) * 0.16);
    if (mask > 0) {
      h = Math.max(h, mask * 26 - 10);
    }
    // Sea stacks near rescue vessel
    const stack1 = Math.exp(-(((x + 1320) / 75) ** 2 + ((z - 590) / 75) ** 2)) * 88;
    const stack2 = Math.exp(-(((x + 1060) / 62) ** 2 + ((z - 840) / 62) ** 2)) * 66;
    const stack3 = Math.exp(-(((x + 420) / 75) ** 2 + ((z + 820) / 75) ** 2)) * 92;
    h = Math.max(h, stack1 - 14, stack2 - 14, stack3 - 14);
  }

  // Fine ridge detail above water
  if (h > 2) {
    h += fbm(x * 0.015, z * 0.015, 2) * 3.5;
  }

  // Flatten runways smoothly into surrounding ground
  for (const rwy of RUNWAYS) {
    const { along, lateral } = runwayLocalCoords(rwy, x, z);
    const halfL = rwy.length * 0.5 + 34;
    const halfW = rwy.width * 0.5 + 34;
    const dAlong = Math.max(0, Math.abs(along) - halfL);
    const dLat = Math.max(0, Math.abs(lateral) - halfW);
    const edgeDist = Math.hypot(dAlong, dLat);
    if (edgeDist < 120) {
      const blend = 1 - smoothstep(0, 120, edgeDist);
      h = h * (1 - blend) + rwy.elevation * blend;
    }
  }

  return h;
}

function makeRunwayTexture(codeA, codeB) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Weathered dark tarmac
  ctx.fillStyle = '#2c3138';
  ctx.fillRect(0, 0, 256, 1024);

  // Tire rubber streaks & grain
  for (let i = 0; i < 650; i++) {
    const px = Math.random() * 256;
    const py = Math.random() * 1024;
    const alpha = 0.03 + Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.6})`;
    ctx.fillRect(px, py, 2 + Math.random() * 5, 6 + Math.random() * 20);
  }
  // Dark touchdown rubber patches
  const rubberGrad = ctx.createLinearGradient(0, 740, 0, 910);
  rubberGrad.addColorStop(0, 'rgba(14,16,20,0)');
  rubberGrad.addColorStop(0.5, 'rgba(14,16,20,0.46)');
  rubberGrad.addColorStop(1, 'rgba(14,16,20,0)');
  ctx.fillStyle = rubberGrad;
  ctx.fillRect(58, 720, 140, 200);
  ctx.fillRect(58, 110, 140, 200);

  // Edge stripes
  ctx.fillStyle = '#e8ecf0';
  ctx.fillRect(10, 14, 7, 996);
  ctx.fillRect(239, 14, 7, 996);

  // Centerline dashes
  for (let y = 138; y < 886; y += 54) {
    ctx.fillRect(124, y, 8, 28);
  }

  // Threshold piano keys (both ends)
  for (let i = 0; i < 6; i++) {
    const x = 28 + i * 36;
    ctx.fillRect(x, 22, 18, 56);
    ctx.fillRect(x, 946, 18, 56);
  }

  // Aiming bars
  ctx.fillRect(54, 175, 24, 62);
  ctx.fillRect(178, 175, 24, 62);
  ctx.fillRect(54, 787, 24, 62);
  ctx.fillRect(178, 787, 24, 62);

  // Runway numbers
  ctx.fillStyle = '#f2f5f8';
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(codeA, 128, 898);
  ctx.save();
  ctx.translate(128, 124);
  ctx.rotate(Math.PI);
  ctx.fillText(codeB, 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSkyDome() {
  const geo = new THREE.SphereGeometry(9500, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color('#194c82') },
      midColor: { value: new THREE.Color('#5a98c4') },
      horizonColor: { value: new THREE.Color('#f7c78a') },
      sunDir: { value: new THREE.Vector3(0.55, 0.34, -0.76).normalize() },
      sunColor: { value: new THREE.Color('#fff1c4') },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      varying vec3 vWorldDir;
      void main() {
        vec3 d = normalize(vWorldDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.24, h));
        col = mix(col, topColor, smoothstep(0.22, 0.78, h));
        float sunAmt = max(dot(d, sunDir), 0.0);
        col += sunColor * pow(sunAmt, 14.0) * 0.42;
        col += vec3(1.0, 0.97, 0.88) * smoothstep(0.9965, 0.9994, sunAmt) * 1.4;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return { mesh: new THREE.Mesh(geo, mat), material: mat };
}

function makeOceanMesh() {
  const geo = new THREE.PlaneGeometry(OCEAN_RADIUS * 2, OCEAN_RADIUS * 2, 128, 128);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.55, 0.34, -0.76).normalize() },
      uDeepColor: { value: new THREE.Color('#0c3b59') },
      uShallowColor: { value: new THREE.Color('#1d7d8a') },
      uFogColor: { value: new THREE.Color('#e9c79b') },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying float vWave;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.018 + uTime * 1.1) * cos(p.z * 0.015 + uTime * 0.8) * 0.45
                + sin((p.x + p.z) * 0.032 - uTime * 1.4) * 0.22;
        p.y += w;
        vWave = w;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFogColor;
      varying vec3 vWorldPos;
      varying float vWave;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float dist = length(cameraPosition - vWorldPos);
        // Analytical ripple normal
        float nx = cos(vWorldPos.x * 0.05 + uTime * 1.4) * 0.08 + sin(vWorldPos.z * 0.09 - uTime * 1.8) * 0.05;
        float nz = sin(vWorldPos.z * 0.06 + uTime * 1.2) * 0.08 + cos(vWorldPos.x * 0.08 + uTime * 1.5) * 0.05;
        vec3 n = normalize(vec3(nx, 1.0, nz));
        float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.4);
        vec3 base = mix(uDeepColor, uShallowColor, clamp(vWave * 0.6 + 0.35 + fresnel * 0.55, 0.0, 1.0));
        vec3 halfV = normalize(uSunDir + viewDir);
        float spec = pow(max(dot(n, halfV), 0.0), 96.0);
        vec3 col = base + vec3(1.0, 0.88, 0.64) * spec * 1.35 + vec3(0.45, 0.65, 0.78) * fresnel * 0.35;
        float fogF = smoothstep(2600.0, 9200.0, dist);
        col = mix(col, uFogColor, fogF);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0;
  return { mesh, material: mat };
}

function buildTerrainGeometry() {
  const segs = 256;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = sampleTerrainHeight(x, z);
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const norm = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = norm.getY(i);
    const nTint = (valueNoise(x * 0.02, z * 0.02) - 0.5) * 0.08;

    if (y < -2.0) {
      c.set('#146273'); // Turquoise shoal seabed
    } else if (y < 4.2) {
      c.set('#d8c398'); // Warm coastal sand
    } else if (ny < 0.76) {
      // Exposed basalt rock cliff
      c.set(y > 160 ? '#4e545c' : '#5e5b55');
    } else if (y < 78) {
      // Lush archipelago emerald terraces
      c.set(y < 26 ? '#4e8344' : '#3a6e3d');
    } else if (y < 190) {
      // Highland mossy volcanic flank
      c.set('#4c6945');
    } else if (y < 295) {
      // Volcanic ochre-basalt ridge
      c.set('#7a6b5b');
    } else {
      // Sunlit caldera ash / pale summit crest
      c.set('#c9c5bc');
    }
    c.offsetHSL(0, 0, nTint);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.04,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

function buildRunwayPropGroup(rwy) {
  const group = new THREE.Group();
  group.position.set(rwy.x, rwy.elevation, rwy.z);
  group.rotation.y = (-rwy.headingDeg * Math.PI) / 180;

  // Paved runway surface
  const tex = makeRunwayTexture(rwy.code, rwy.reciprocal);
  const stripMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(rwy.width, rwy.length), stripMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = 0.28;
  strip.receiveShadow = true;
  group.add(strip);

  // Gravel shoulder apron
  const apronMat = new THREE.MeshStandardMaterial({ color: '#6b675c', roughness: 0.96 });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(rwy.width + 12, 0.5, rwy.length + 18), apronMat);
  apron.position.y = -0.02;
  apron.receiveShadow = true;
  group.add(apron);

  // Runway edge & threshold lights
  const edgeGeo = new THREE.SphereGeometry(0.65, 8, 8);
  const whiteLightMat = new THREE.MeshBasicMaterial({ color: '#fff7d6' });
  const greenLightMat = new THREE.MeshBasicMaterial({ color: '#38ef7d' });
  const redLightMat = new THREE.MeshBasicMaterial({ color: '#ff4b3e' });

  const halfL = rwy.length * 0.5;
  const halfW = rwy.width * 0.5 + 2.2;
  for (let z = -halfL + 15; z <= halfL - 15; z += 45) {
    for (const side of [-1, 1]) {
      const bulb = new THREE.Mesh(edgeGeo, whiteLightMat);
      bulb.position.set(side * halfW, 0.85, z);
      group.add(bulb);
    }
  }
  for (let x = -halfW + 4; x <= halfW - 4; x += 6) {
    const thA = new THREE.Mesh(edgeGeo, greenLightMat);
    thA.position.set(x, 0.85, halfL + 1.5);
    group.add(thA);
    const thB = new THREE.Mesh(edgeGeo, redLightMat);
    thB.position.set(x, 0.85, -halfL - 1.5);
    group.add(thB);
  }

  // 4-lamp PAPI glideslope bar (left of primary threshold)
  const papiLamps = [];
  const papiBaseMat = new THREE.MeshStandardMaterial({ color: '#222831', roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 1.6), papiBaseMat);
    const lx = rwy.papiOffset.lateral - i * 3.4;
    const lz = rwy.papiOffset.along;
    housing.position.set(lx, 0.8, lz);
    group.add(housing);
    const lampMat = new THREE.MeshBasicMaterial({ color: i < 2 ? '#ffffff' : '#ff3b30' });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 10), lampMat);
    lamp.position.set(lx, 1.25, lz + 0.7);
    group.add(lamp);
    papiLamps.push(lampMat);
  }

  // Animated Windsock
  const sockPivot = new THREE.Group();
  sockPivot.position.set(rwy.windsockOffset.lateral, 0, rwy.windsockOffset.along);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 9.5, 8),
    new THREE.MeshStandardMaterial({ color: '#d8dee9', metalness: 0.4, roughness: 0.5 }),
  );
  pole.position.y = 4.75;
  sockPivot.add(pole);

  const sockArm = new THREE.Group();
  sockArm.position.y = 9.2;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68 - i * 0.08, 0.76 - i * 0.08, 1.15, 10, 1, true),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? '#ff5722' : '#f8fafc',
        side: THREE.DoubleSide,
        roughness: 0.65,
      }),
    );
    seg.rotation.z = Math.PI / 2;
    seg.position.x = 0.8 + i * 1.1;
    sockArm.add(seg);
  }
  sockPivot.add(sockArm);
  group.add(sockPivot);

  // Control tower & hangar on Merpati main strip
  if (rwy.id === 'RWY36') {
    const hangar = new THREE.Group();
    hangar.position.set(48, 0, -45);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(28, 11, 36),
      new THREE.MeshStandardMaterial({ color: '#d9d3c5', roughness: 0.8 }),
    );
    body.position.y = 5.5;
    hangar.add(body);
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(14.6, 14.6, 36.6, 16, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: '#275c6e', roughness: 0.6, metalness: 0.25 }),
    );
    roof.rotation.x = Math.PI / 2;
    roof.rotation.z = Math.PI / 2;
    roof.position.y = 11;
    hangar.add(roof);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 8.5, 24),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 }),
    );
    door.position.set(-14.1, 4.25, 0);
    hangar.add(door);
    group.add(hangar);

    // Control tower
    const tower = new THREE.Group();
    tower.position.set(44, 0, 52);
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 19, 7.5),
      new THREE.MeshStandardMaterial({ color: '#e6dfd3', roughness: 0.75 }),
    );
    shaft.position.y = 9.5;
    tower.add(shaft);
    const cab = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 5.2, 4.4, 8),
      new THREE.MeshStandardMaterial({
        color: '#204a5c',
        emissive: '#f5b041',
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.4,
      }),
    );
    cab.position.y = 21.2;
    tower.add(cab);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(7.0, 6.8, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: '#c84b28', roughness: 0.6 }),
    );
    cap.position.y = 23.8;
    tower.add(cap);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#ff3b30' }),
    );
    beacon.position.y = 25.4;
    tower.add(beacon);
    group.add(tower);
  }

  return { group, papiLamps, sockArm, rwy };
}

function buildLandmarks(scene) {
  const animated = { lighthouseBeam: null, flareSmoke: [], rescueBeacon: null };

  // 1. Coastal Striped Lighthouse
  const lh = new THREE.Group();
  const lhY = sampleTerrainHeight(LANDMARKS.lighthouse.x, LANDMARKS.lighthouse.z);
  lh.position.set(LANDMARKS.lighthouse.x, lhY - 1, LANDMARKS.lighthouse.z);
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2 - i * 0.38, 4.6 - i * 0.38, 5.5, 14),
      new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? '#f8f5ee' : '#d64528', roughness: 0.75 }),
    );
    seg.position.y = 2.75 + i * 5.5;
    lh.add(seg);
  }
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 4.0, 12),
    new THREE.MeshBasicMaterial({ color: '#fff3b0' }),
  );
  lantern.position.y = 35.0;
  lh.add(lantern);
  const dome = new THREE.Mesh(
    new THREE.ConeGeometry(3.1, 3.2, 12),
    new THREE.MeshStandardMaterial({ color: '#263847', roughness: 0.5 }),
  );
  dome.position.y = 38.6;
  lh.add(dome);
  const beamGroup = new THREE.Group();
  beamGroup.position.y = 35.0;
  const beamCone = new THREE.Mesh(
    new THREE.ConeGeometry(8, 95, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#ffe89c',
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  beamCone.rotation.z = Math.PI / 2;
  beamCone.position.x = 48;
  beamGroup.add(beamCone);
  lh.add(beamGroup);
  animated.lighthouseBeam = beamGroup;
  scene.add(lh);

  // 2. Crimson Suspension Bridge across Pulau Merpati - Pulau Timur strait
  const br = new THREE.Group();
  const { xStart, xEnd, z: brZ, deckY } = LANDMARKS.bridge;
  const span = xEnd - xStart;
  const midX = (xStart + xEnd) * 0.5;
  const steelRed = new THREE.MeshStandardMaterial({ color: '#c8422b', roughness: 0.55, metalness: 0.35 });
  const deckMat = new THREE.MeshStandardMaterial({ color: '#394049', roughness: 0.85 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(span, 3.2, 14), deckMat);
  deck.position.set(midX, deckY, brZ);
  br.add(deck);

  for (const tx of [xStart + span * 0.28, xStart + span * 0.72]) {
    for (const tz of [brZ - 6.5, brZ + 6.5]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(4.2, deckY + 62, 4.2), steelRed);
      leg.position.set(tx, (deckY + 62) * 0.5 - 6, tz);
      br.add(leg);
    }
    const crossTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.6, 15.5), steelRed);
    crossTop.position.set(tx, deckY + 50, brZ);
    br.add(crossTop);
    const crossMid = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.0, 15.5), steelRed);
    crossMid.position.set(tx, deckY + 24, brZ);
    br.add(crossMid);
  }
  // Catenary cables
  const cableMat = new THREE.LineBasicMaterial({ color: '#e2674d' });
  for (const tz of [brZ - 6.2, brZ + 6.2]) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const px = xStart + t * span;
      let py = deckY + 4;
      if (t >= 0.28 && t <= 0.72) {
        const u = (t - 0.5) / 0.22;
        py = deckY + 10 + u * u * 44;
      } else if (t < 0.28) {
        py = deckY + 4 + (t / 0.28) * 50;
      } else {
        py = deckY + 4 + ((1 - t) / 0.28) * 50;
      }
      pts.push(new THREE.Vector3(px, py, tz));
    }
    br.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
  }
  scene.add(br);

  // 3. Caldera Supply Drop Pad + Orange Flare Marker
  const dropY = sampleTerrainHeight(LANDMARKS.calderaCenter.dropX, LANDMARKS.calderaCenter.dropZ);
  const pad = new THREE.Group();
  pad.position.set(LANDMARKS.calderaCenter.dropX, dropY + 0.5, LANDMARKS.calderaCenter.dropZ);
  const padDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 20, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: '#e0a938', roughness: 0.75 }),
  );
  pad.add(padDisc);
  const padCrossA = new THREE.Mesh(
    new THREE.BoxGeometry(22, 0.4, 4.5),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  );
  padCrossA.position.y = 0.5;
  pad.add(padCrossA);
  const padCrossB = padCrossA.clone();
  padCrossB.rotation.y = Math.PI / 2;
  pad.add(padCrossB);
  scene.add(pad);

  // 4. Stranded Research Vessel at Rescue Shoal
  const ship = new THREE.Group();
  ship.position.set(LANDMARKS.rescueVessel.x, 1.2, LANDMARKS.rescueVessel.z);
  ship.rotation.y = 0.55;
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(11, 5.2, 34),
    new THREE.MeshStandardMaterial({ color: '#b5382a', roughness: 0.7 }),
  );
  ship.add(hull);
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 7.5, 10),
    new THREE.MeshStandardMaterial({ color: '#edf2f4', roughness: 0.6 }),
  );
  bridge.position.set(0, 6.0, -5);
  ship.add(bridge);
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 10, 10),
    new THREE.MeshBasicMaterial({ color: '#ff5e1a' }),
  );
  beacon.position.set(0, 11.2, -5);
  ship.add(beacon);
  animated.rescueBeacon = beacon;
  scene.add(ship);

  // Orange distress smoke puffs above caldera pad and rescue vessel
  const smokeGeo = new THREE.IcosahedronGeometry(3.2, 1);
  const smokeMat = new THREE.MeshStandardMaterial({
    color: '#ff7b3b',
    transparent: true,
    opacity: 0.62,
    roughness: 1,
  });
  for (const origin of [
    new THREE.Vector3(LANDMARKS.calderaCenter.dropX + 12, dropY + 2, LANDMARKS.calderaCenter.dropZ),
    new THREE.Vector3(LANDMARKS.rescueVessel.x, 5, LANDMARKS.rescueVessel.z),
  ]) {
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(smokeGeo, smokeMat);
      puff.userData = { origin, phase: i / 6 };
      scene.add(puff);
      animated.flareSmoke.push(puff);
    }
  }

  // Coastal village houses & harbor pier near Merpati bay for recognizable scale
  const pier = new THREE.Group();
  const harborY = 1.6;
  pier.position.set(LANDMARKS.harbor.x, harborY, LANDMARKS.harbor.z);
  const deckWood = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1.4, 54),
    new THREE.MeshStandardMaterial({ color: '#7a5c43', roughness: 0.9 }),
  );
  pier.add(deckWood);
  // Moored white fishing boats
  const boatHullMat = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.6 });
  const boatTrimMat = new THREE.MeshStandardMaterial({ color: '#1b6b84', roughness: 0.6 });
  for (let b = 0; b < 3; b++) {
    const boat = new THREE.Group();
    boat.position.set(12 + b * 11, -0.4, -14 + b * 15);
    boat.rotation.y = 0.3 + b * 0.4;
    boat.add(new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 9.5), boatHullMat));
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 3.2), boatTrimMat);
    cabin.position.set(0, 1.4, -0.8);
    boat.add(cabin);
    pier.add(boat);
  }
  scene.add(pier);

  // Coastal village cluster with terracotta roofs on Pulau Merpati eastern shore
  const wallMat = new THREE.MeshStandardMaterial({ color: '#efe6d5', roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#c45232', roughness: 0.72 });
  const villageSpots = [
    [135, 195],
    [156, 212],
    [172, 185],
    [144, 240],
    [186, 232],
    [122, 265],
    [204, 260],
    [-128, 175],
    [-152, 205],
    [-112, 230],
  ];
  for (let i = 0; i < villageSpots.length; i++) {
    const [vx, vz] = villageSpots[i];
    const vy = sampleTerrainHeight(vx, vz);
    if (vy < 4) continue;
    const hGroup = new THREE.Group();
    hGroup.position.set(vx, vy, vz);
    hGroup.rotation.y = i * 0.6;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 6.2, 8.5), wallMat);
    wall.position.y = 3.1;
    hGroup.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 4.2, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 8.1;
    hGroup.add(roof);
    scene.add(hGroup);
  }

  return animated;
}

function buildForestAndClouds(scene) {
  // Instanced tropical/coastal pines on mid-elevation gentle slopes
  const treeCount = 720;
  const coneGeo = new THREE.ConeGeometry(4.6, 15.5, 6);
  coneGeo.translate(0, 8.8, 0);
  const treeMat = new THREE.MeshStandardMaterial({ color: '#2b5e36', roughness: 0.9 });
  const trees = new THREE.InstancedMesh(coneGeo, treeMat, treeCount);
  const dummy = new THREE.Object3D();
  let placed = 0;

  for (let i = 0; i < 2400 && placed < treeCount; i++) {
    const rx = (hash2(i * 1.7, 3.1) - 0.5) * 3400;
    const rz = (hash2(7.3, i * 2.3) - 0.5) * 3400;
    const y = sampleTerrainHeight(rx, rz);
    if (y < 9 || y > 135) continue;
    if (getRunwayAt(rx, rz, 48)) continue;
    // Slope check
    const hx = sampleTerrainHeight(rx + 6, rz);
    const hz = sampleTerrainHeight(rx, rz + 6);
    if (Math.abs(hx - y) > 4.2 || Math.abs(hz - y) > 4.2) continue;

    const sc = 0.75 + hash2(i, 9.1) * 0.9;
    dummy.position.set(rx, y - 1.2, rz);
    dummy.scale.set(sc, sc * (0.9 + hash2(i, 4.4) * 0.35), sc);
    dummy.rotation.y = hash2(i, 1.2) * Math.PI * 2;
    dummy.updateMatrix();
    trees.setMatrixAt(placed++, dummy.matrix);
  }
  trees.count = placed;
  trees.instanceMatrix.needsUpdate = true;
  scene.add(trees);

  // Layered stylized cumulus cloud clusters
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: '#fff6eb',
    emissive: '#f5cfa0',
    emissiveIntensity: 0.14,
    roughness: 0.95,
    metalness: 0,
  });
  const puffGeo = new THREE.IcosahedronGeometry(1, 1);

  for (let i = 0; i < 42; i++) {
    const cluster = new THREE.Group();
    const angle = (i / 42) * Math.PI * 2 + hash2(i, 2.2) * 0.5;
    const dist = 520 + hash2(i, 5.5) * 2800;
    const alt = 340 + hash2(i, 8.8) * 320;
    cluster.position.set(Math.cos(angle) * dist, alt, Math.sin(angle) * dist);
    const puffs = 3 + Math.floor(hash2(i, 3.7) * 4);
    for (let p = 0; p < puffs; p++) {
      const m = new THREE.Mesh(puffGeo, cloudMat);
      const sx = 42 + hash2(i * 11 + p, 1.1) * 58;
      const sy = 16 + hash2(i * 11 + p, 2.1) * 22;
      const sz = 36 + hash2(i * 11 + p, 3.1) * 48;
      m.scale.set(sx, sy, sz);
      m.position.set(
        (hash2(i * 13 + p, 4.1) - 0.5) * 95,
        (hash2(i * 13 + p, 5.1) - 0.5) * 18,
        (hash2(i * 13 + p, 6.1) - 0.5) * 75,
      );
      cluster.add(m);
    }
    clouds.add(cluster);
  }
  scene.add(clouds);
  return { clouds, cloudMat };
}

export function createArchipelagoWorld(scene) {
  const sky = makeSkyDome();
  scene.add(sky.mesh);

  const ocean = makeOceanMesh();
  scene.add(ocean.mesh);

  const terrain = buildTerrainGeometry();
  scene.add(terrain);

  const runwaySystems = RUNWAYS.map((rwy) => {
    const built = buildRunwayPropGroup(rwy);
    scene.add(built.group);
    return built;
  });

  const landmarks = buildLandmarks(scene);
  const atmosphere = buildForestAndClouds(scene);

  // Lighting rig (adjusted per mission weather preset)
  const sunLight = new THREE.DirectionalLight('#ffdfb0', 2.4);
  sunLight.position.set(1600, 1050, -2100);
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight('#8ec5e8', '#526045', 0.95);
  scene.add(hemiLight);

  const fillLight = new THREE.DirectionalLight('#77a9d4', 0.55);
  fillLight.position.set(-1200, 600, 1400);
  scene.add(fillLight);

  function setAtmospherePreset(preset) {
    if (preset === 'storm') {
      sky.material.uniforms.topColor.value.set('#1f2d3d');
      sky.material.uniforms.midColor.value.set('#445869');
      sky.material.uniforms.horizonColor.value.set('#8094a3');
      sky.material.uniforms.sunColor.value.set('#d5e3ed');
      ocean.material.uniforms.uDeepColor.value.set('#0b2436');
      ocean.material.uniforms.uShallowColor.value.set('#1f4e5f');
      ocean.material.uniforms.uFogColor.value.set('#7a8e9e');
      scene.fog = new THREE.FogExp2('#7c90a0', 0.00042);
      sunLight.color.set('#cfe0ec');
      sunLight.intensity = 1.4;
      hemiLight.intensity = 0.85;
      atmosphere.cloudMat.color.set('#8b9aa8');
      atmosphere.cloudMat.emissiveIntensity = 0.04;
    } else if (preset === 'dusk') {
      sky.material.uniforms.topColor.value.set('#1b335c');
      sky.material.uniforms.midColor.value.set('#6f7ea8');
      sky.material.uniforms.horizonColor.value.set('#f49d6e');
      sky.material.uniforms.sunColor.value.set('#ffd29d');
      ocean.material.uniforms.uDeepColor.value.set('#0d324d');
      ocean.material.uniforms.uShallowColor.value.set('#226d7a');
      ocean.material.uniforms.uFogColor.value.set('#e5a57e');
      scene.fog = new THREE.FogExp2('#e5a57e', 0.00024);
      sunLight.color.set('#ffbe85');
      sunLight.intensity = 2.25;
      hemiLight.intensity = 0.88;
      atmosphere.cloudMat.color.set('#ffe4cf');
      atmosphere.cloudMat.emissiveIntensity = 0.22;
    } else {
      // Golden archipelago daylight
      sky.material.uniforms.topColor.value.set('#194c82');
      sky.material.uniforms.midColor.value.set('#5a98c4');
      sky.material.uniforms.horizonColor.value.set('#f7c78a');
      sky.material.uniforms.sunColor.value.set('#fff1c4');
      ocean.material.uniforms.uDeepColor.value.set('#0c3b59');
      ocean.material.uniforms.uShallowColor.value.set('#1d7d8a');
      ocean.material.uniforms.uFogColor.value.set('#e8c79d');
      scene.fog = new THREE.FogExp2('#e8c79d', 0.00019);
      sunLight.color.set('#ffe3b5');
      sunLight.intensity = 2.45;
      hemiLight.intensity = 0.96;
      atmosphere.cloudMat.color.set('#fff6eb');
      atmosphere.cloudMat.emissiveIntensity = 0.14;
    }
  }

  function updateWorld(dt, timeSec, aircraftPos, windVec) {
    ocean.material.uniforms.uTime.value = timeSec;
    sky.mesh.position.copy(aircraftPos);
    ocean.mesh.position.set(aircraftPos.x, 0, aircraftPos.z);

    if (landmarks.lighthouseBeam) {
      landmarks.lighthouseBeam.rotation.y = timeSec * 0.75;
    }
    if (landmarks.rescueBeacon) {
      const pulse = 0.65 + 0.35 * Math.sin(timeSec * 6.5);
      landmarks.rescueBeacon.scale.setScalar(pulse);
    }

    // Update orange distress flare smoke plumes
    for (const puff of landmarks.flareSmoke) {
      const p = (puff.userData.phase + timeSec * 0.16) % 1;
      puff.position.set(
        puff.userData.origin.x + windVec.x * p * 5.2,
        puff.userData.origin.y + p * 58,
        puff.userData.origin.z + windVec.z * p * 5.2,
      );
      const sc = 0.6 + p * 2.8;
      puff.scale.setScalar(sc);
    }

    // Update PAPI lights & windsock orientation per runway
    const windHeading = Math.atan2(windVec.x, windVec.z);
    for (const sys of runwaySystems) {
      sys.sockArm.rotation.y = windHeading + Math.sin(timeSec * 3.8) * 0.12;

      const { along, lateral } = runwayLocalCoords(sys.rwy, aircraftPos.x, aircraftPos.z);
      // Primary approach enters from negative `along` toward aiming point at `-papiOffset.along`
      const aimAlong = -sys.rwy.papiOffset.along;
      const distToAim = Math.max(15, aimAlong - along);
      const altAbove = aircraftPos.y - sys.rwy.elevation;
      const glideDeg = (Math.atan2(altAbove, distToAim) * 180) / Math.PI;
      // 4 PAPI thresholds around 5.0 deg STOL archipelago glideslope (2W/2R = on path)
      const thresholds = [3.6, 4.4, 5.5, 6.4];
      const onApproach = along < aimAlong + 60 && Math.abs(lateral) < 650;
      for (let i = 0; i < 4; i++) {
        const isWhite = onApproach ? glideDeg >= thresholds[i] : i < 2;
        sys.papiLamps[i].color.set(isWhite ? '#fffdf0' : '#ff3329');
      }
    }
  }

  return {
    setAtmospherePreset,
    updateWorld,
    runwaySystems,
  };
}
