// High-detail volcanic archipelago world: 360x360 eroded ridged mountains with normal maps,
// craggy basalt boulders, coastal palms + branching highland canopy trees, volumetric Fresnel
// lighthouse beam, solid obstacle colliders (tower, hangar, lighthouse, bridge, trees),
// multi-wave Gerstner ocean with real-time aircraft water shadow, and 4 dynamic weather modes.

import * as THREE from 'three';
import { LANDMARKS, OCEAN_RADIUS, RUNWAYS, WORLD_SIZE } from './config.js';
import {
  createCloudPuffTexture,
  createFoliageTexture,
  createHighResRunwayTexture,
  createSoftParticleTexture,
  createTerrainDetailTexture,
  createTerrainNormalMap,
} from './procedural-textures.js';

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

function ridgedFbm(x, z, octaves = 4) {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  let weight = 1;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs((valueNoise(x * freq, z * freq) - 0.5) * 2);
    const signal = n * n * weight;
    weight = Math.max(0.25, Math.min(1, signal * 1.4));
    sum += signal * amp;
    freq *= 2.14;
    amp *= 0.48;
  }
  return sum;
}

function runwayLocalCoords(rwy, x, z) {
  const rad = (rwy.headingDeg * Math.PI) / 180;
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

  // 1. Pulau Merpati (central island with ridged volcanic spine & sculpted spurs)
  {
    const nx = (x - 20) / 560;
    const nz = (z - 10) / 680;
    const dist = Math.hypot(nx, nz);
    const islandMask = 1 - smoothstep(0.42, 1.08, dist + fbm(x * 0.0025, z * 0.0025, 3) * 0.24);
    if (islandMask > 0) {
      let mh = islandMask * 42;
      const wRidge = Math.exp(-(((x + 335) / 195) ** 2 + ((z + 40) / 365) ** 2));
      mh += wRidge * (84 + ridgedFbm(x * 0.0058, z * 0.0058, 5) * 102);
      const eHead = Math.exp(-(((x - 290) / 165) ** 2 + ((z - 340) / 225) ** 2));
      mh += eHead * (48 + ridgedFbm(x * 0.0068, z * 0.0068, 4) * 48);
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
      const peak = Math.exp(-(((x - 1040) / 145) ** 2 + ((z + 360) / 145) ** 2)) * (86 + ridgedFbm(x * 0.0072, z * 0.0072, 4) * 78);
      h = Math.max(h, mask * 54 + peak - 12);
    }
  }

  // 2. Gunung Kawah (jagged ridged volcanic peak with radial erosion ravines & canyon cleft)
  {
    const cx = LANDMARKS.calderaCenter.x;
    const cz = LANDMARKS.calderaCenter.z;
    const dx = x - cx;
    const dz = z - cz;
    const r = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const radialRavines = Math.sin(angle * 11 + fbm(x * 0.004, z * 0.004, 2) * 2.2) * 0.5 + 0.5;
    const noise = fbm(x * 0.0028, z * 0.0028, 4);
    const baseMask = 1 - smoothstep(420, 1100, r + noise * 175);
    if (baseMask > 0) {
      const crags = ridgedFbm(x * 0.0048, z * 0.0048, 5);
      let vh = baseMask * (112 + crags * 88 - radialRavines * 22);
      const rim = Math.exp(-(((r - 310) / 140) ** 2));
      vh += rim * (205 + crags * 138);
      const bowl = 1 - smoothstep(130, 265, r);
      vh = vh * (1 - bowl * 0.35) + bowl * 182;

      const canyonAxis = Math.abs((z - (cz + 260)) * 0.72 - (x - (cx + 310)) * 0.69);
      const canyonLen = Math.hypot(x - (cx + 310), z - (cz + 260));
      if (canyonLen < 430) {
        const carve = (1 - smoothstep(45, 132, canyonAxis)) * (1 - smoothstep(260, 430, canyonLen));
        vh -= carve * 155;
      }
      const terraced = Math.floor(vh / 22) * 22 + smoothstep(0, 22, vh % 22) * 22;
      vh = vh * 0.8 + terraced * 0.2;
      h = Math.max(h, vh - 16);
    }
  }

  // 3. Tanjung Karang (North-East sheer cliff mesa + jagged peak)
  {
    const kx = 1200;
    const kz = -1250;
    const dist = Math.hypot((x - kx) / 480, (z - kz) / 310);
    const cliffMask = 1 - smoothstep(0.62, 0.94, dist + fbm(x * 0.0035, z * 0.0035, 3) * 0.12);
    if (cliffMask > 0) {
      let kh = cliffMask * 78;
      const northPeak = Math.exp(-(((x - 1220) / 215) ** 2 + ((z + 1480) / 130) ** 2)) * (72 + ridgedFbm(x * 0.0062, z * 0.0062, 4) * 68);
      kh += northPeak;
      h = Math.max(h, kh - 10);
    }
  }

  // 4. Karang Selatan / Shoal emergency island + volcanic sea stacks
  {
    const sx = -760;
    const sz = 860;
    const dist = Math.hypot((x - sx) / 360, (z - sz) / 320);
    const mask = 1 - smoothstep(0.45, 1.0, dist + fbm(x * 0.004, z * 0.004, 3) * 0.16);
    if (mask > 0) {
      h = Math.max(h, mask * 26 - 10);
    }
    const stack1 = Math.exp(-(((x + 1320) / 72) ** 2 + ((z - 590) / 72) ** 2)) * (72 + ridgedFbm(x * 0.015, z * 0.015, 3) * 48);
    const stack2 = Math.exp(-(((x + 1060) / 60) ** 2 + ((z - 840) / 60) ** 2)) * (56 + ridgedFbm(x * 0.015, z * 0.015, 3) * 38);
    const stack3 = Math.exp(-(((x + 420) / 74) ** 2 + ((z + 820) / 74) ** 2)) * (76 + ridgedFbm(x * 0.015, z * 0.015, 3) * 45);
    h = Math.max(h, stack1 - 14, stack2 - 14, stack3 - 14);
  }

  // 5. Outer Archipelago Expansion (5 vast navigable outer islands across the 9.2 km x 9.2 km sea!)
  // 5A. Pulau Utara (Northern Twin-Peak Volcanic Island)
  {
    const d = Math.hypot((x + 240) / 820, (z + 3150) / 640);
    const mask = 1 - smoothstep(0.42, 1.04, d + fbm(x * 0.0022, z * 0.0022, 3) * 0.22);
    if (mask > 0) {
      const p1 = Math.exp(-(((x + 520) / 260) ** 2 + ((z + 3180) / 240) ** 2)) * (135 + ridgedFbm(x * 0.0052, z * 0.0052, 4) * 95);
      const p2 = Math.exp(-(((x - 140) / 230) ** 2 + ((z + 3060) / 220) ** 2)) * (115 + ridgedFbm(x * 0.0058, z * 0.0058, 4) * 85);
      h = Math.max(h, mask * 48 + p1 + p2 - 14);
    }
  }

  // 5B. Atol Karang Timur (Eastern Horseshoe Coral Atoll & Lagoon)
  {
    const dx = x - 2950;
    const dz = z + 350;
    const r = Math.hypot(dx, dz);
    const ang = Math.atan2(dz, dx);
    const channelGap = smoothstep(-0.38, 0.38, Math.cos(ang + 2.4)); // Western lagoon entrance
    const ring = Math.exp(-(((r - 580) / 145) ** 2)) * (1 - channelGap * 0.88);
    if (ring > 0.02) {
      const cay = ring * (26 + fbm(x * 0.006, z * 0.006, 3) * 14);
      h = Math.max(h, cay - 6);
    }
    const reefShelf = (1 - smoothstep(420, 920, r)) * -2.2;
    if (r < 920) h = Math.max(h, reefShelf);
  }

  // 5C. Pulau Batu Barat (Western Basalt Cliff Fortress)
  {
    const d = Math.hypot((x + 2850) / 740, (z + 450) / 860);
    const mask = 1 - smoothstep(0.45, 1.0, d + fbm(x * 0.0024, z * 0.0024, 3) * 0.2);
    if (mask > 0) {
      const mesa = mask * 94 + Math.exp(-(((x + 2920) / 310) ** 2 + ((z + 580) / 320) ** 2)) * (98 + ridgedFbm(x * 0.0055, z * 0.0055, 4) * 92);
      h = Math.max(h, mesa - 14);
    }
  }

  // 5D. Pulau Selatan (Southern Headland & Rolling Hills)
  {
    const d = Math.hypot((x - 1150) / 780, (z - 2650) / 620);
    const mask = 1 - smoothstep(0.4, 1.05, d + fbm(x * 0.0025, z * 0.0025, 3) * 0.22);
    if (mask > 0) {
      const hills = mask * 62 + Math.exp(-(((x - 1340) / 260) ** 2 + ((z - 2740) / 230) ** 2)) * (84 + ridgedFbm(x * 0.006, z * 0.006, 4) * 76);
      h = Math.max(h, hills - 14);
    }
  }

  // 5E. Gugusan Barat Daya (South-West Volcanic Chain)
  {
    const d = Math.hypot((x + 2350) / 660, (z - 2350) / 600);
    const mask = 1 - smoothstep(0.42, 1.02, d + fbm(x * 0.0028, z * 0.0028, 3) * 0.2);
    if (mask > 0) {
      const cone = Math.exp(-(((x + 2400) / 240) ** 2 + ((z - 2420) / 240) ** 2)) * (155 + ridgedFbm(x * 0.0056, z * 0.0056, 4) * 105);
      h = Math.max(h, mask * 44 + cone - 14);
    }
  }

  // Crisp gully & ridge micro-relief above water
  if (h > 1.5) {
    h += fbm(x * 0.02, z * 0.02, 3) * 5.6 + (ridgedFbm(x * 0.013, z * 0.013, 3) - 0.35) * Math.min(20, h * 0.14);
  }

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

export function sampleTerrainNormal(x, z) {
  const e = 2.0;
  const hL = sampleTerrainHeight(x - e, z);
  const hR = sampleTerrainHeight(x + e, z);
  const hD = sampleTerrainHeight(x, z - e);
  const hU = sampleTerrainHeight(x, z + e);
  return new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
}

export function sampleThermalLift(x, z, altM) {
  const cx = LANDMARKS.calderaCenter.x;
  const cz = LANDMARKS.calderaCenter.z;
  const dist = Math.hypot(x - cx, z - cz);
  if (dist < 420 && altM < 440) {
    return (1 - dist / 420) * 3.4;
  }
  return 0;
}

function buildShorelineDepthTexture() {
  const res = 384;
  const data = new Uint8Array(res * res * 4);
  const half = WORLD_SIZE * 0.5;
  for (let j = 0; j < res; j++) {
    const z = -half + (j / (res - 1)) * WORLD_SIZE;
    for (let i = 0; i < res; i++) {
      const x = -half + (i / (res - 1)) * WORLD_SIZE;
      const h = sampleTerrainHeight(x, z);
      const encoded = Math.max(0, Math.min(255, Math.round(((h + 20) / 40) * 255)));
      const idx = (j * res + i) * 4;
      data[idx] = encoded;
      data[idx + 1] = encoded;
      data[idx + 2] = encoded;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function makeSkyDome() {
  const geo = new THREE.SphereGeometry(16500, 36, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      topColor: { value: new THREE.Color('#144780') },
      midColor: { value: new THREE.Color('#5a98c8') },
      horizonColor: { value: new THREE.Color('#f7c17e') },
      sunDir: { value: new THREE.Vector3(0.55, 0.34, -0.76).normalize() },
      sunColor: { value: new THREE.Color('#fff2c4') },
      cirrusOpacity: { value: 0.34 },
      uLightning: { value: 0.0 },
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
      uniform float uTime;
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      uniform float cirrusOpacity;
      uniform float uLightning;
      varying vec3 vWorldDir;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }
      float fbmSky(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += vnoise(p) * a;
          p = p * 2.15 + vec2(13.2, -7.4);
          a *= 0.5;
        }
        return s;
      }

      void main() {
        vec3 d = normalize(vWorldDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.24, h));
        col = mix(col, topColor, smoothstep(0.22, 0.78, h));

        if (d.y > 0.04) {
          vec2 skyUV = d.xz / (d.y + 0.22) * vec2(1.8, 0.75) + vec2(uTime * 0.004, 0.0);
          float wisp = fbmSky(skyUV * 1.4 + fbmSky(skyUV * 2.8) * 0.65);
          float band = smoothstep(0.52, 0.84, wisp) * smoothstep(0.04, 0.28, d.y) * (1.0 - smoothstep(0.55, 0.95, d.y));
          vec3 cirrusCol = mix(vec3(0.98, 0.95, 0.92), sunColor, 0.45);
          col = mix(col, cirrusCol, band * cirrusOpacity);
        }

        float sunAmt = max(dot(d, sunDir), 0.0);
        col += sunColor * pow(sunAmt, 8.0) * 0.34;
        col += sunColor * pow(sunAmt, 42.0) * 0.45;
        col += vec3(1.0, 0.98, 0.9) * smoothstep(0.9968, 0.9994, sunAmt) * 1.45;
        col += vec3(0.75, 0.86, 1.0) * uLightning * 0.55;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return { mesh: new THREE.Mesh(geo, mat), material: mat };
}

function makeOceanMesh(depthTex) {
  const geo = new THREE.PlaneGeometry(OCEAN_RADIUS * 2, OCEAN_RADIUS * 2, 180, 180);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.55, 0.34, -0.76).normalize() },
      uDeepColor: { value: new THREE.Color('#073250') },
      uMidColor: { value: new THREE.Color('#0f5b78') },
      uShallowColor: { value: new THREE.Color('#1ea0a8') },
      uSkyColor: { value: new THREE.Color('#7db4d8') },
      uFogColor: { value: new THREE.Color('#e9c494') },
      uTerrainMap: { value: depthTex },
      uWorldSize: { value: WORLD_SIZE },
      uPlanePos: { value: new THREE.Vector3(0, 100, 0) },
      uPlaneFwd: { value: new THREE.Vector3(0, 0, -1) },
      uPlaneRight: { value: new THREE.Vector3(1, 0, 0) },
      uPlaneActive: { value: 1.0 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying float vWaveH;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float w1 = sin(wp.x * 0.017 + wp.z * 0.011 + uTime * 1.35) * 0.62;
        float w2 = sin(-wp.x * 0.024 + wp.z * 0.019 + uTime * 1.05) * 0.42;
        float w3 = cos(wp.x * 0.041 + wp.z * 0.033 - uTime * 1.85) * 0.24;
        float w4 = sin(wp.z * 0.068 - wp.x * 0.022 + uTime * 2.2) * 0.14;
        float h = w1 + w2 + w3 + w4;
        wp.y += h;
        vWaveH = h;
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uDeepColor;
      uniform vec3 uMidColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSkyColor;
      uniform vec3 uFogColor;
      uniform sampler2D uTerrainMap;
      uniform float uWorldSize;
      uniform vec3 uPlanePos;
      uniform vec3 uPlaneFwd;
      uniform vec3 uPlaneRight;
      uniform float uPlaneActive;

      varying vec3 vWorldPos;
      varying float vWaveH;

      float waveNoise(vec2 p) {
        return sin(p.x * 0.08 + uTime * 1.6) * cos(p.y * 0.09 - uTime * 1.3) * 0.5
             + sin((p.x * 0.16 - p.y * 0.14) + uTime * 2.3) * 0.3
             + cos((p.x * 0.29 + p.y * 0.25) - uTime * 2.9) * 0.2;
      }

      float aircraftSilhouette(vec2 relXZ, vec2 fwdXZ, vec2 rightXZ, float blur) {
        float f = dot(relXZ, fwdXZ);
        float r = dot(relXZ, rightXZ);
        float dFuse = max(abs(r) - 1.35, abs(f - 0.5) - 6.6);
        float dWing = max(abs(r) - 8.5, abs(f - 0.6) - 1.45);
        float dTail = max(abs(r) - 3.3, abs(f + 6.9) - 0.85);
        float d = min(dFuse, min(dWing, dTail));
        return 1.0 - smoothstep(-blur * 0.35, blur, d);
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float dist = length(cameraPosition - vWorldPos);

        vec2 p = vWorldPos.xz;
        float eps = 0.65;
        float hC = waveNoise(p) + waveNoise(p * 2.1 + vec2(4.2, -3.1)) * 0.45;
        float hX = waveNoise(p + vec2(eps, 0.0)) + waveNoise((p + vec2(eps, 0.0)) * 2.1 + vec2(4.2, -3.1)) * 0.45;
        float hZ = waveNoise(p + vec2(0.0, eps)) + waveNoise((p + vec2(0.0, eps)) * 2.1 + vec2(4.2, -3.1)) * 0.45;
        float swellNx = cos(p.x * 0.017 + p.y * 0.011 + uTime * 1.35) * 0.09;
        float swellNz = sin(-p.x * 0.024 + p.y * 0.019 + uTime * 1.05) * 0.08;
        vec3 n = normalize(vec3((hC - hX) * 0.24 + swellNx, 1.0, (hC - hZ) * 0.24 + swellNz));

        vec2 mapUV = p / uWorldSize + 0.5;
        float inBounds = step(0.005, mapUV.x) * step(mapUV.x, 0.995) * step(0.005, mapUV.y) * step(mapUV.y, 0.995);
        float encodedH = texture2D(uTerrainMap, clamp(mapUV, 0.0, 1.0)).r;
        float terrainH = mix(-20.0, encodedH * 40.0 - 20.0, inBounds);
        float waterDepth = max(0.0, -terrainH);

        float shallowMask = (1.0 - smoothstep(0.0, 10.5, waterDepth)) * inBounds;
        float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.4);

        vec3 openSea = mix(uDeepColor, uMidColor, clamp(vWaveH * 0.35 + 0.45 + fresnel * 0.4, 0.0, 1.0));
        vec3 base = mix(openSea, uShallowColor, shallowMask * 0.82);

        float surfPhase = sin(waterDepth * 3.6 - uTime * 3.1 + hC * 2.4);
        float surfLine = smoothstep(0.45, 0.92, surfPhase) * (1.0 - smoothstep(0.3, 4.2, waterDepth)) * inBounds;
        float shoreHug = (1.0 - smoothstep(0.0, 1.25, waterDepth)) * inBounds;
        float openWhitecap = smoothstep(0.86, 1.38, vWaveH + hC * 0.55) * (1.0 - shallowMask * 0.5);
        float foam = clamp(surfLine * 0.78 + shoreHug * 0.92 + openWhitecap * 0.42, 0.0, 1.0);

        vec3 halfV = normalize(uSunDir + viewDir);
        float specTight = pow(max(dot(n, halfV), 0.0), 160.0);
        float specBroad = pow(max(dot(n, halfV), 0.0), 24.0);
        vec3 col = mix(base, uSkyColor, fresnel * 0.42);
        col += vec3(1.0, 0.91, 0.70) * (specTight * 1.85 + specBroad * 0.24);
        col = mix(col, vec3(0.95, 0.98, 1.0), foam * 0.85);

        if (uPlaneActive > 0.5 && uPlanePos.y > -0.5 && uPlanePos.y < 220.0) {
          vec2 fwdXZ = normalize(uPlaneFwd.xz + vec2(0.0001, 0.0));
          vec2 rightXZ = normalize(uPlaneRight.xz + vec2(0.0, 0.0001));
          // Organic wave-distorted shadow & shimmer-broken water reflection (never stiff geometric boxes!)
          vec2 waveWarp = vec2(hC - hX, hC - hZ) * (6.5 + max(0.0, uPlanePos.y) * 0.08);
          float rippleBreak = 0.62 + 0.38 * sin(p.x * 0.35 + uTime * 3.8 + hC * 5.0) * cos(p.y * 0.31 - uTime * 3.2);
          float sunY = max(0.32, uSunDir.y);
          vec2 sunProjCenter = uPlanePos.xz - uSunDir.xz * (max(0.0, uPlanePos.y) / sunY);
          float blur = 1.45 + max(0.0, uPlanePos.y) * 0.095;
          float shadowMask = aircraftSilhouette(p - sunProjCenter + waveWarp * 0.75, fwdXZ, rightXZ, blur);
          float altFade = 1.0 - smoothstep(8.0, 185.0, uPlanePos.y);
          col *= (1.0 - shadowMask * altFade * 0.54 * (0.82 + 0.18 * rippleBreak));

          float reflMask = aircraftSilhouette(p - uPlanePos.xz + waveWarp * 1.9, fwdXZ, rightXZ, 2.2 + max(0.0, uPlanePos.y) * 0.075);
          float reflFade = (1.0 - smoothstep(1.5, 68.0, uPlanePos.y)) * rippleBreak;
          col = mix(col, mix(uDeepColor * 0.65, vec3(0.75, 0.84, 0.88), 0.18), reflMask * reflFade * 0.32);

          if (uPlanePos.y < 26.0) {
            float dUnder = length(p - uPlanePos.xz + waveWarp * 0.5);
            float washFade = (1.0 - smoothstep(1.5, 26.0, uPlanePos.y)) * (1.0 - smoothstep(2.5, 25.0, dUnder));
            float rings = smoothstep(0.38, 0.92, sin(dUnder * 1.55 - uTime * 9.2 + hC * 2.8));
            col = mix(col, vec3(0.88, 0.96, 1.0), rings * washFade * 0.38);
          }
        }

        float fogF = smoothstep(4200.0, 15500.0, dist);
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
  const segs = 420;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, sampleTerrainHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const norm = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = norm.getY(i);
    const nTint = (valueNoise(x * 0.03, z * 0.03) - 0.5) * 0.11;

    if (y < -2.2) {
      c.set('#146a7d');
    } else if (y < 0.85) {
      c.set('#e5d8b8');
    } else if (y < 5.5) {
      c.set('#dcc69a');
    } else if (ny < 0.7) {
      const strata = Math.sin(y * 0.17 + valueNoise(x * 0.025, z * 0.025) * 3.2) * 0.06;
      c.set(y > 155 ? '#504e4b' : '#635b51');
      c.offsetHSL(0, 0, strata);
    } else if (y < 76) {
      c.set(y < 28 ? '#4c8641' : '#356d39');
    } else if (y < 185) {
      c.set('#44653d');
    } else if (y < 285) {
      c.set('#7d6955');
    } else {
      c.set('#d2ccc0');
    }
    c.offsetHSL(0, 0, nTint);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const detailTex = createTerrainDetailTexture();
  const normalTex = createTerrainNormalMap();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: detailTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughness: 0.9,
    metalness: 0.04,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

function makeVolumetricBeamMaterial() {
  // Soft volumetric Fresnel + axial-fade lighthouse light beam (zero hard cone edges!)
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color('#ffe599') },
      uIntensity: { value: 0.34 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying float vAlong;
      void main() {
        // ConeGeometry has tip at +height/2 and base at -height/2
        vAlong = clamp(0.5 - position.y / 115.0, 0.0, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying float vAlong;
      void main() {
        vec3 vd = normalize(vViewPos);
        float edgeSoft = pow(abs(dot(normalize(vNormalView), vd)), 2.2);
        float distFade = pow(1.0 - vAlong, 1.85) * smoothstep(0.0, 0.08, vAlong);
        float alpha = edgeSoft * distFade * uIntensity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

function createCraggyRockGeometry() {
  const geo = new THREE.IcosahedronGeometry(3.6, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const disp = 0.72 + valueNoise(vx * 0.65 + 4.1, vz * 0.65 - vy * 0.5) * 0.56;
    const facet = vy < 0 ? 0.7 : 1.0;
    pos.setXYZ(i, vx * disp, vy * disp * facet, vz * disp);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildRunwayPropGroup(rwy, glowTex, colliders) {
  const group = new THREE.Group();
  group.position.set(rwy.x, rwy.elevation, rwy.z);
  group.rotation.y = (-rwy.headingDeg * Math.PI) / 180;

  const tex = createHighResRunwayTexture(rwy.code, rwy.reciprocal);
  const stripMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.82,
    metalness: 0.06,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(rwy.width, rwy.length), stripMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = 0.28;
  strip.receiveShadow = true;
  group.add(strip);

  const apronMat = new THREE.MeshStandardMaterial({ color: '#6b665a', roughness: 0.95 });
  const apron = new THREE.Mesh(new THREE.BoxGeometry(rwy.width + 14, 0.5, rwy.length + 22), apronMat);
  apron.position.y = -0.02;
  apron.receiveShadow = true;
  group.add(apron);

  const edgeGeo = new THREE.SphereGeometry(0.62, 8, 8);
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
    thA.position.set(x, 0.88, halfL + 1.5);
    group.add(thA);
    const thB = new THREE.Mesh(edgeGeo, redLightMat);
    thB.position.set(x, 0.88, -halfL - 1.5);
    group.add(thB);
  }

  for (let k = 1; k <= 4; k++) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#ffdf9e',
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.set(0, 1.4, halfL + k * 28);
    halo.scale.setScalar(3.6);
    group.add(halo);
  }

  const papiLamps = [];
  const papiBaseMat = new THREE.MeshStandardMaterial({ color: '#222831', roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.6), papiBaseMat);
    const lx = rwy.papiOffset.lateral - i * 3.8;
    const lz = rwy.papiOffset.along;
    housing.position.set(lx, 0.8, lz);
    housing.castShadow = true;
    group.add(housing);
    const lampMat = new THREE.MeshBasicMaterial({ color: i < 2 ? '#ffffff' : '#ff3b30' });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 10), lampMat);
    lamp.position.set(lx, 1.3, lz + 0.75);
    group.add(lamp);

    const haloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: i < 2 ? '#fffdf0' : '#ff3329',
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(lx, 1.35, lz + 1.0);
    halo.scale.setScalar(4.8);
    group.add(halo);
    papiLamps.push({ lampMat, haloMat });
  }

  const sockPivot = new THREE.Group();
  sockPivot.position.set(rwy.windsockOffset.lateral, 0, rwy.windsockOffset.along);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 9.5, 8),
    new THREE.MeshStandardMaterial({ color: '#d8dee9', metalness: 0.4, roughness: 0.5 }),
  );
  pole.position.y = 4.75;
  pole.castShadow = true;
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

  if (rwy.id === 'RWY36') {
    const hangar = new THREE.Group();
    hangar.position.set(48, 0, -45);
    const body = new THREE.Mesh(new THREE.BoxGeometry(28, 11, 36), new THREE.MeshStandardMaterial({ color: '#dcd5c7', roughness: 0.78 }));
    body.position.y = 5.5;
    body.castShadow = true;
    body.receiveShadow = true;
    hangar.add(body);
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(14.6, 14.6, 36.6, 16, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: '#21586b', roughness: 0.55, metalness: 0.25 }),
    );
    roof.rotation.x = Math.PI / 2;
    roof.rotation.z = Math.PI / 2;
    roof.position.y = 11;
    roof.castShadow = true;
    hangar.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.5, 24), new THREE.MeshStandardMaterial({ color: '#1a2530', roughness: 0.7 }));
    door.position.set(-14.1, 4.25, 0);
    hangar.add(door);
    group.add(hangar);

    // Register solid Hangar AABB collider
    colliders.boxes.push({
      label: 'HANGAR IMPACT',
      minX: rwy.x + 34,
      maxX: rwy.x + 62,
      minY: rwy.elevation,
      maxY: rwy.elevation + 25,
      minZ: rwy.z - 64,
      maxZ: rwy.z - 26,
    });

    const tower = new THREE.Group();
    tower.position.set(44, 0, 52);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(7.5, 19, 7.5), new THREE.MeshStandardMaterial({ color: '#eae2d6', roughness: 0.74 }));
    shaft.position.y = 9.5;
    shaft.castShadow = true;
    tower.add(shaft);
    const cab = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 5.2, 4.4, 8),
      new THREE.MeshStandardMaterial({
        color: '#204a5c',
        emissive: '#ffbe55',
        emissiveIntensity: 0.52,
        roughness: 0.2,
        metalness: 0.4,
      }),
    );
    cab.position.y = 21.2;
    tower.add(cab);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 6.8, 1.1, 8), new THREE.MeshStandardMaterial({ color: '#d44b28', roughness: 0.6 }));
    cap.position.y = 23.8;
    tower.add(cap);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
    beacon.position.y = 25.4;
    tower.add(beacon);
    group.add(tower);

    // Register solid Control Tower cylinder collider
    colliders.cylinders.push({
      label: 'CONTROL TOWER IMPACT',
      x: rwy.x + 44,
      z: rwy.z + 52,
      radius: 7.2,
      minY: rwy.elevation,
      maxY: rwy.elevation + 26.5,
    });
  }

  return { group, papiLamps, sockArm, rwy };
}

function buildLandmarks(scene, smokeTex, glowTex, colliders) {
  const animated = { lighthouseBeam: null, flareSmoke: [], rescueBeacon: null };

  // 1. Coastal Striped Lighthouse with SOFT Volumetric Fresnel Beam + Solid Collider!
  const lh = new THREE.Group();
  const lhY = sampleTerrainHeight(LANDMARKS.lighthouse.x, LANDMARKS.lighthouse.z);
  lh.position.set(LANDMARKS.lighthouse.x, lhY - 1, LANDMARKS.lighthouse.z);
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2 - i * 0.38, 4.6 - i * 0.38, 5.5, 16),
      new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? '#f8f5ee' : '#d94526', roughness: 0.72 }),
    );
    seg.position.y = 2.75 + i * 5.5;
    seg.castShadow = true;
    lh.add(seg);
  }
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 4.0, 14), new THREE.MeshBasicMaterial({ color: '#fff3b0' }));
  lantern.position.y = 35.0;
  lh.add(lantern);

  const lhHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: '#ffea9c',
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  lhHalo.position.y = 35.2;
  lhHalo.scale.setScalar(20);
  lh.add(lhHalo);

  const dome = new THREE.Mesh(new THREE.ConeGeometry(3.1, 3.2, 14), new THREE.MeshStandardMaterial({ color: '#243645', roughness: 0.45 }));
  dome.position.y = 38.6;
  lh.add(dome);

  // Soft volumetric dual-beam shader (replaces rigid flat cone!)
  const beamGroup = new THREE.Group();
  beamGroup.position.y = 35.0;
  const beamMat = makeVolumetricBeamMaterial();
  const beamGeo = new THREE.ConeGeometry(16, 115, 24, 1, true);
  for (const dir of [-1, 1]) {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = dir * (Math.PI / 2);
    beam.position.x = dir * 58;
    beamGroup.add(beam);
  }
  lh.add(beamGroup);
  animated.lighthouseBeam = beamGroup;
  scene.add(lh);

  colliders.cylinders.push({
    label: 'LIGHTHOUSE TOWER IMPACT',
    x: LANDMARKS.lighthouse.x,
    z: LANDMARKS.lighthouse.z,
    radius: 5.2,
    minY: lhY - 2,
    maxY: lhY + 40,
  });

  // 2. Crimson Suspension Bridge + Solid Deck & Twin Tower Colliders (fly-under clearance preserved!)
  const br = new THREE.Group();
  const { xStart, xEnd, z: brZ, deckY } = LANDMARKS.bridge;
  const span = xEnd - xStart;
  const midX = (xStart + xEnd) * 0.5;
  const steelRed = new THREE.MeshStandardMaterial({ color: '#cb4129', roughness: 0.5, metalness: 0.35 });
  const deckMat = new THREE.MeshStandardMaterial({ color: '#394049', roughness: 0.85 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(span, 3.2, 14), deckMat);
  deck.position.set(midX, deckY, brZ);
  br.add(deck);

  colliders.boxes.push({
    label: 'BRIDGE DECK IMPACT',
    minX: xStart,
    maxX: xEnd,
    minY: deckY - 2.0,
    maxY: deckY + 2.4,
    minZ: brZ - 7.5,
    maxZ: brZ + 7.5,
  });

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

    colliders.boxes.push({
      label: 'BRIDGE TOWER IMPACT',
      minX: tx - 3.2,
      maxX: tx + 3.2,
      minY: 0,
      maxY: deckY + 56,
      minZ: brZ - 9.0,
      maxZ: brZ + 9.0,
    });
  }
  const cableMat = new THREE.LineBasicMaterial({ color: '#e86f54' });
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

  // 3. Caldera Supply Drop Pad + Distress Flare
  const dropY = sampleTerrainHeight(LANDMARKS.calderaCenter.dropX, LANDMARKS.calderaCenter.dropZ);
  const pad = new THREE.Group();
  pad.position.set(LANDMARKS.calderaCenter.dropX, dropY + 0.5, LANDMARKS.calderaCenter.dropZ);
  pad.add(new THREE.Mesh(new THREE.CylinderGeometry(19, 21, 0.9, 18), new THREE.MeshStandardMaterial({ color: '#e5a935', roughness: 0.72 })));
  const padCrossA = new THREE.Mesh(new THREE.BoxGeometry(24, 0.45, 4.6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  padCrossA.position.y = 0.55;
  pad.add(padCrossA);
  const padCrossB = padCrossA.clone();
  padCrossB.rotation.y = Math.PI / 2;
  pad.add(padCrossB);
  scene.add(pad);

  // 4. Stranded Research Vessel
  const ship = new THREE.Group();
  ship.position.set(LANDMARKS.rescueVessel.x, 1.2, LANDMARKS.rescueVessel.z);
  ship.rotation.y = 0.55;
  ship.add(new THREE.Mesh(new THREE.BoxGeometry(11, 5.2, 34), new THREE.MeshStandardMaterial({ color: '#b5382a', roughness: 0.7 })));
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(8.5, 7.5, 10), new THREE.MeshStandardMaterial({ color: '#edf2f4', roughness: 0.6 }));
  bridge.position.set(0, 6.0, -5);
  ship.add(bridge);
  const beacon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: '#ff6a1f',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  beacon.position.set(0, 12.2, -5);
  beacon.scale.setScalar(12);
  ship.add(beacon);
  animated.rescueBeacon = beacon;
  scene.add(ship);

  for (const origin of [
    new THREE.Vector3(LANDMARKS.calderaCenter.dropX + 12, dropY + 2, LANDMARKS.calderaCenter.dropZ),
    new THREE.Vector3(LANDMARKS.rescueVessel.x, 6, LANDMARKS.rescueVessel.z),
  ]) {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.SpriteMaterial({
        map: smokeTex,
        color: '#ff7d38',
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      });
      const puff = new THREE.Sprite(mat);
      puff.userData = { origin, phase: i / 8, mat };
      scene.add(puff);
      animated.flareSmoke.push(puff);
    }
  }

  // 5. Harbor Pier, Moored Boats & Coastal Village
  const pier = new THREE.Group();
  pier.position.set(LANDMARKS.harbor.x, 1.6, LANDMARKS.harbor.z);
  pier.add(new THREE.Mesh(new THREE.BoxGeometry(10, 1.4, 54), new THREE.MeshStandardMaterial({ color: '#7a5c43', roughness: 0.9 })));
  const boatHullMat = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.58 });
  const boatTrimMat = new THREE.MeshStandardMaterial({ color: '#1b6b84', roughness: 0.58 });
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

  const wallMat = new THREE.MeshStandardMaterial({ color: '#efe6d5', roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#c85230', roughness: 0.7 });
  const tealRoofMat = new THREE.MeshStandardMaterial({ color: '#216375', roughness: 0.68 });
  const villageSpots = [
    [135, 195], [156, 212], [172, 185], [144, 240], [186, 232],
    [122, 265], [204, 260], [-128, 175], [-152, 205], [-112, 230],
    [118, 145], [168, 150], [-142, 145],
  ];
  for (let i = 0; i < villageSpots.length; i++) {
    const [vx, vz] = villageSpots[i];
    const vy = sampleTerrainHeight(vx, vz);
    if (vy < 4) continue;
    const hGroup = new THREE.Group();
    hGroup.position.set(vx, vy, vz);
    hGroup.rotation.y = i * 0.6;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(10.5, 6.4, 8.8), wallMat);
    wall.position.y = 3.2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    hGroup.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8.0, 4.4, 4), i % 3 === 0 ? tealRoofMat : roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 8.4;
    roof.castShadow = true;
    hGroup.add(roof);
    scene.add(hGroup);
  }

  return animated;
}

function buildForestRocksAndClouds(scene, colliders) {
  const foliageTex = createFoliageTexture();

  // 1A. Branching Highland Canopy Trees across expanded 9.2 km archipelago
  const maxHighland = 860;
  const trunkGeo = new THREE.CylinderGeometry(0.42, 0.92, 6.8, 7);
  trunkGeo.translate(0, 3.4, 0);
  const branchGeo = new THREE.CylinderGeometry(0.22, 0.36, 4.2, 6);
  branchGeo.rotateZ(-0.68);
  branchGeo.translate(1.5, 6.0, 0.7);

  const displaceFoliage = (r, tx, ty, tz, sx, sy, sz) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 0.8 + valueNoise(p.getX(i) + tx, p.getZ(i) + tz) * 0.42;
      p.setXYZ(i, p.getX(i) * k * sx, p.getY(i) * k * sy, p.getZ(i) * k * sz);
    }
    g.translate(tx, ty, tz);
    g.computeVertexNormals();
    return g;
  };

  const c1Geo = displaceFoliage(4.5, 0, 8.6, 0, 1.2, 0.76, 1.1);
  const c2Geo = displaceFoliage(3.4, 2.7, 7.3, 1.4, 1.12, 0.72, 1.05);
  const c3Geo = displaceFoliage(3.2, -2.1, 7.9, -1.6, 1.08, 0.75, 1.1);
  const c4Geo = displaceFoliage(2.9, 0.4, 11.2, -0.5, 1.0, 0.82, 1.0);

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4c3728', roughness: 0.95 });
  const canopyDark = new THREE.MeshStandardMaterial({ map: foliageTex, color: '#6ea86a', roughness: 0.9 });
  const canopyMid = new THREE.MeshStandardMaterial({ map: foliageTex, color: '#8ac582', roughness: 0.86 });
  const canopySun = new THREE.MeshStandardMaterial({ map: foliageTex, color: '#aadf92', roughness: 0.82 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, maxHighland);
  const branches = new THREE.InstancedMesh(branchGeo, trunkMat, maxHighland);
  const crowns1 = new THREE.InstancedMesh(c1Geo, canopyMid, maxHighland);
  const crowns2 = new THREE.InstancedMesh(c2Geo, canopyDark, maxHighland);
  const crowns3 = new THREE.InstancedMesh(c3Geo, canopyDark, maxHighland);
  const crowns4 = new THREE.InstancedMesh(c4Geo, canopySun, maxHighland);
  crowns1.castShadow = crowns2.castShadow = crowns4.castShadow = true;
  crowns1.receiveShadow = crowns2.receiveShadow = true;

  // 1B. Coastal Tropical Palm Trees along beaches, coral atolls & lowlands
  const maxPalms = 340;
  const palmTrunkGeo = new THREE.CylinderGeometry(0.24, 0.56, 11.5, 7);
  palmTrunkGeo.rotateZ(0.14);
  palmTrunkGeo.translate(0.7, 5.6, 0);

  const frondShape = new THREE.Shape();
  frondShape.moveTo(0, 0);
  frondShape.quadraticCurveTo(2.4, 1.2, 5.2, -1.1);
  frondShape.quadraticCurveTo(2.4, 0.1, 0, -0.25);
  const palmCrownGroupGeo = [];
  for (let f = 0; f < 6; f++) {
    const fg = new THREE.ExtrudeGeometry(frondShape, { depth: 0.45, bevelEnabled: false });
    fg.translate(0, 0, -0.22);
    fg.rotateY((f / 6) * Math.PI * 2);
    fg.translate(1.45, 11.1, 0);
    palmCrownGroupGeo.push(fg);
  }
  const palmFrondMat = new THREE.MeshStandardMaterial({ color: '#458a3e', roughness: 0.78 });
  const palmTrunks = new THREE.InstancedMesh(palmTrunkGeo, new THREE.MeshStandardMaterial({ color: '#6b533b', roughness: 0.92 }), maxPalms);
  const palmFrondMeshes = palmCrownGroupGeo.map((fg) => {
    const im = new THREE.InstancedMesh(fg, palmFrondMat, maxPalms);
    im.castShadow = true;
    return im;
  });

  const dummy = new THREE.Object3D();
  let highPlaced = 0;
  let palmPlaced = 0;

  for (let i = 0; i < 6800 && (highPlaced < maxHighland || palmPlaced < maxPalms); i++) {
    // First 2600 samples keep dense detail on core mission islands, rest populate expanded outer archipelago!
    const spread = i < 2600 ? 3400 : 8200;
    const rx = (hash2(i * 1.7, 3.1) - 0.5) * spread;
    const rz = (hash2(7.3, i * 2.3) - 0.5) * spread;
    const y = sampleTerrainHeight(rx, rz);
    if (y < 3.6 || y > 142) continue;
    if (getRunwayAt(rx, rz, 54)) continue;
    const hx = sampleTerrainHeight(rx + 6, rz);
    const hz = sampleTerrainHeight(rx, rz + 6);
    if (Math.abs(hx - y) > 4.6 || Math.abs(hz - y) > 4.6) continue;

    const sc = 0.74 + hash2(i, 9.1) * 0.88;
    dummy.position.set(rx, y - 0.6, rz);
    dummy.scale.set(sc, sc * (0.9 + hash2(i, 4.4) * 0.34), sc);
    dummy.rotation.set(0, hash2(i, 1.2) * Math.PI * 2, 0);
    dummy.updateMatrix();

    if (y < 22 && palmPlaced < maxPalms) {
      palmTrunks.setMatrixAt(palmPlaced, dummy.matrix);
      for (const fm of palmFrondMeshes) fm.setMatrixAt(palmPlaced, dummy.matrix);
      colliders.trees.push({ x: rx, z: rz, minY: y, maxY: y + 12.2 * sc, radius: 2.6 * sc });
      palmPlaced++;
    } else if (y >= 14 && highPlaced < maxHighland) {
      trunks.setMatrixAt(highPlaced, dummy.matrix);
      branches.setMatrixAt(highPlaced, dummy.matrix);
      crowns1.setMatrixAt(highPlaced, dummy.matrix);
      crowns2.setMatrixAt(highPlaced, dummy.matrix);
      crowns3.setMatrixAt(highPlaced, dummy.matrix);
      crowns4.setMatrixAt(highPlaced, dummy.matrix);
      colliders.trees.push({ x: rx, z: rz, minY: y, maxY: y + 12.8 * sc, radius: 4.1 * sc });
      highPlaced++;
    }
  }

  trunks.count = branches.count = crowns1.count = crowns2.count = crowns3.count = crowns4.count = highPlaced;
  for (const m of [trunks, branches, crowns1, crowns2, crowns3, crowns4]) {
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
  }
  palmTrunks.count = palmPlaced;
  palmTrunks.instanceMatrix.needsUpdate = true;
  scene.add(palmTrunks);
  for (const fm of palmFrondMeshes) {
    fm.count = palmPlaced;
    fm.instanceMatrix.needsUpdate = true;
    scene.add(fm);
  }

  // 2. 640 Displaced Craggy Basalt Boulders & Coastal Rock Outcrops across expanded archipelago
  const maxRocks = 640;
  const rockGeo = createCraggyRockGeometry();
  const rockMat = new THREE.MeshStandardMaterial({
    color: '#5a554c',
    roughness: 0.92,
    metalness: 0.06,
    flatShading: true,
  });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, maxRocks);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  let rockPlaced = 0;

  for (let i = 0; i < 5200 && rockPlaced < maxRocks; i++) {
    const spread = i < 2400 ? 3500 : 8200;
    const rx = (hash2(i * 4.3, 1.9) - 0.5) * spread;
    const rz = (hash2(5.1, i * 3.7) - 0.5) * spread;
    const y = sampleTerrainHeight(rx, rz);
    if (y < -1.0 || y > 270) continue;
    if (getRunwayAt(rx, rz, 56)) continue;
    const hx = sampleTerrainHeight(rx + 6, rz);
    const hz = sampleTerrainHeight(rx, rz + 6);
    const slope = Math.hypot(hx - y, hz - y);
    if (y > 7.5 && slope < 3.1) continue;

    const sx = 0.8 + hash2(i, 2.3) * 2.5;
    const sy = 0.55 + hash2(i, 4.9) * 1.6;
    const sz = 0.8 + hash2(i, 7.1) * 2.4;
    dummy.position.set(rx, y - sy * 0.85, rz);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(hash2(i, 1.1) * 0.5, hash2(i, 6.2) * Math.PI * 2, hash2(i, 8.3) * 0.5);
    dummy.updateMatrix();
    rocks.setMatrixAt(rockPlaced++, dummy.matrix);
  }
  rocks.count = rockPlaced;
  rocks.instanceMatrix.needsUpdate = true;
  scene.add(rocks);

  // 3. Painted Volumetric Billboard Cumulus Cloud Banks
  const cloudTex = createCloudPuffTexture();
  const clouds = new THREE.Group();
  const cloudSpriteMats = [];

  for (let i = 0; i < 64; i++) {
    const bank = new THREE.Group();
    const angle = (i / 64) * Math.PI * 2 + hash2(i, 2.2) * 0.4;
    const dist = 620 + hash2(i, 5.5) * 5800;
    const alt = 320 + hash2(i, 8.8) * 320;
    bank.position.set(Math.cos(angle) * dist, alt, Math.sin(angle) * dist);

    const puffCount = 8 + Math.floor(hash2(i, 3.7) * 5);
    for (let p = 0; p < puffCount; p++) {
      const mat = new THREE.SpriteMaterial({
        map: cloudTex,
        color: '#fff6eb',
        transparent: true,
        opacity: 0.82 + hash2(i * 19 + p, 1.3) * 0.14,
        depthWrite: false,
      });
      cloudSpriteMats.push(mat);
      const sp = new THREE.Sprite(mat);
      const w = 135 + hash2(i * 11 + p, 1.1) * 145;
      const h = 72 + hash2(i * 11 + p, 2.1) * 70;
      sp.scale.set(w, h, 1);
      sp.position.set(
        (hash2(i * 13 + p, 4.1) - 0.5) * 200,
        (hash2(i * 13 + p, 5.1) - 0.5) * 38,
        (hash2(i * 13 + p, 6.1) - 0.5) * 145,
      );
      bank.add(sp);
    }
    clouds.add(bank);
  }
  scene.add(clouds);

  return { clouds, cloudSpriteMats };
}

export function createArchipelagoWorld(scene) {
  const smokeTex = createSoftParticleTexture('smoke');
  const glowTex = createSoftParticleTexture('glow');
  const depthTex = buildShorelineDepthTexture();
  const colliders = { boxes: [], cylinders: [], trees: [] };

  const sky = makeSkyDome();
  scene.add(sky.mesh);

  const ocean = makeOceanMesh(depthTex);
  scene.add(ocean.mesh);

  const terrain = buildTerrainGeometry();
  scene.add(terrain);

  const runwaySystems = RUNWAYS.map((rwy) => {
    const built = buildRunwayPropGroup(rwy, glowTex, colliders);
    scene.add(built.group);
    return built;
  });

  const landmarks = buildLandmarks(scene, smokeTex, glowTex, colliders);
  const atmosphere = buildForestRocksAndClouds(scene, colliders);

  const sunLight = new THREE.DirectionalLight('#ffe1b2', 2.45);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 20;
  sunLight.shadow.camera.far = 950;
  const shadowExtent = 160;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const sunOffset = new THREE.Vector3(240, 190, -290);
  const sunDirNorm = sunOffset.clone().normalize();
  sky.material.uniforms.sunDir.value.copy(sunDirNorm);
  ocean.material.uniforms.uSunDir.value.copy(sunDirNorm);

  const hemiLight = new THREE.HemisphereLight('#8ec5e8', '#526045', 0.96);
  scene.add(hemiLight);

  const fillLight = new THREE.DirectionalLight('#77a9d4', 0.58);
  fillLight.position.set(-1200, 600, 1400);
  scene.add(fillLight);

  let currentPreset = 'golden';
  let baseSunIntensity = 2.55;

  function setAtmospherePreset(preset) {
    currentPreset = preset;
    let cloudTint = '#fff7ed';
    if (preset === 'storm') {
      sky.material.uniforms.topColor.value.set('#182433');
      sky.material.uniforms.midColor.value.set('#374b5d');
      sky.material.uniforms.horizonColor.value.set('#6d8394');
      sky.material.uniforms.sunColor.value.set('#c4d8e8');
      sky.material.uniforms.cirrusOpacity.value = 0.62;
      ocean.material.uniforms.uDeepColor.value.set('#071d2c');
      ocean.material.uniforms.uMidColor.value.set('#123648');
      ocean.material.uniforms.uShallowColor.value.set('#1d5666');
      ocean.material.uniforms.uSkyColor.value.set('#586e80');
      ocean.material.uniforms.uFogColor.value.set('#6f8496');
      scene.fog = new THREE.FogExp2('#6f8496', 0.00042);
      sunLight.color.set('#cde0ee');
      baseSunIntensity = 1.5;
      hemiLight.intensity = 0.88;
      cloudTint = '#8291a0';
    } else if (preset === 'rain') {
      sky.material.uniforms.topColor.value.set('#284057');
      sky.material.uniforms.midColor.value.set('#547188');
      sky.material.uniforms.horizonColor.value.set('#96aebf');
      sky.material.uniforms.sunColor.value.set('#dce8f2');
      sky.material.uniforms.cirrusOpacity.value = 0.55;
      ocean.material.uniforms.uDeepColor.value.set('#0a2a3f');
      ocean.material.uniforms.uMidColor.value.set('#184c63');
      ocean.material.uniforms.uShallowColor.value.set('#257585');
      ocean.material.uniforms.uSkyColor.value.set('#7a94a8');
      ocean.material.uniforms.uFogColor.value.set('#92aab9');
      scene.fog = new THREE.FogExp2('#92aab9', 0.00032);
      sunLight.color.set('#ddebf5');
      baseSunIntensity = 1.85;
      hemiLight.intensity = 0.94;
      cloudTint = '#b4c2ce';
    } else if (preset === 'dusk') {
      sky.material.uniforms.topColor.value.set('#19315c');
      sky.material.uniforms.midColor.value.set('#747ea8');
      sky.material.uniforms.horizonColor.value.set('#f69c68');
      sky.material.uniforms.sunColor.value.set('#ffd49e');
      sky.material.uniforms.cirrusOpacity.value = 0.42;
      ocean.material.uniforms.uDeepColor.value.set('#0b2c46');
      ocean.material.uniforms.uMidColor.value.set('#164b68');
      ocean.material.uniforms.uShallowColor.value.set('#227684');
      ocean.material.uniforms.uSkyColor.value.set('#c48f88');
      ocean.material.uniforms.uFogColor.value.set('#e5a37a');
      scene.fog = new THREE.FogExp2('#e5a37a', 0.00022);
      sunLight.color.set('#ffbe82');
      baseSunIntensity = 2.35;
      hemiLight.intensity = 0.92;
      cloudTint = '#ffdcc4';
    } else {
      sky.material.uniforms.topColor.value.set('#144780');
      sky.material.uniforms.midColor.value.set('#5a98c8');
      sky.material.uniforms.horizonColor.value.set('#f7c17e');
      sky.material.uniforms.sunColor.value.set('#fff2c4');
      sky.material.uniforms.cirrusOpacity.value = 0.34;
      ocean.material.uniforms.uDeepColor.value.set('#073250');
      ocean.material.uniforms.uMidColor.value.set('#0f5b78');
      ocean.material.uniforms.uShallowColor.value.set('#1ea0a8');
      ocean.material.uniforms.uSkyColor.value.set('#7db4d8');
      ocean.material.uniforms.uFogColor.value.set('#e8c494');
      scene.fog = new THREE.FogExp2('#e8c494', 0.00018);
      sunLight.color.set('#ffe3b5');
      baseSunIntensity = 2.55;
      hemiLight.intensity = 0.98;
      cloudTint = '#fff7ed';
    }
    sunLight.intensity = baseSunIntensity;
    for (const m of atmosphere.cloudSpriteMats) m.color.set(cloudTint);
  }

  function checkObstacleCollision(point, radius = 1.6) {
    // 1. Check solid AABB boxes (hangar, bridge deck, bridge towers)
    for (const b of colliders.boxes) {
      if (
        point.x >= b.minX - radius &&
        point.x <= b.maxX + radius &&
        point.y >= b.minY - radius &&
        point.y <= b.maxY + radius &&
        point.z >= b.minZ - radius &&
        point.z <= b.maxZ + radius
      ) {
        return { kind: 'structure', label: b.label };
      }
    }
    // 2. Check solid cylinders (control tower, striped lighthouse)
    for (const c of colliders.cylinders) {
      if (point.y >= c.minY - radius && point.y <= c.maxY + radius) {
        const d = Math.hypot(point.x - c.x, point.z - c.z);
        if (d <= c.radius + radius) {
          return { kind: 'structure', label: c.label };
        }
      }
    }
    // 3. Check solid tree trunks & canopies
    for (const t of colliders.trees) {
      if (point.y >= t.minY && point.y <= t.maxY + radius) {
        const dx = point.x - t.x;
        const dz = point.z - t.z;
        const rSum = t.radius + radius;
        if (dx * dx + dz * dz <= rSum * rSum) {
          return { kind: 'tree', label: 'TREE COLLISION' };
        }
      }
    }
    return null;
  }

  const tmpFwd = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();

  function updateWorld(dt, timeSec, aircraftPos, windVec, aircraftQuat = null) {
    sky.material.uniforms.uTime.value = timeSec;
    ocean.material.uniforms.uTime.value = timeSec;
    sky.mesh.position.copy(aircraftPos);
    ocean.mesh.position.set(aircraftPos.x, 0, aircraftPos.z);

    // Occasional dramatic storm lightning flash
    let lightning = 0;
    if (currentPreset === 'storm') {
      const cyc = (timeSec * 0.28) % 1;
      if (cyc > 0.96 || (cyc > 0.91 && cyc < 0.93)) {
        lightning = 0.85;
      }
    }
    sky.material.uniforms.uLightning.value = lightning;
    sunLight.intensity = baseSunIntensity + lightning * 1.9;

    ocean.material.uniforms.uPlanePos.value.copy(aircraftPos);
    if (aircraftQuat) {
      tmpFwd.set(0, 0, -1).applyQuaternion(aircraftQuat);
      tmpRight.set(1, 0, 0).applyQuaternion(aircraftQuat);
      ocean.material.uniforms.uPlaneFwd.value.copy(tmpFwd);
      ocean.material.uniforms.uPlaneRight.value.copy(tmpRight);
    }

    sunLight.position.copy(aircraftPos).add(sunOffset);
    sunLight.target.position.copy(aircraftPos);
    sunLight.target.updateMatrixWorld();

    if (landmarks.lighthouseBeam) {
      landmarks.lighthouseBeam.rotation.y = timeSec * 0.75;
    }
    if (landmarks.rescueBeacon) {
      const pulse = 10 + 4 * Math.sin(timeSec * 6.5);
      landmarks.rescueBeacon.scale.setScalar(pulse);
    }

    for (const puff of landmarks.flareSmoke) {
      const p = (puff.userData.phase + timeSec * 0.14) % 1;
      puff.position.set(
        puff.userData.origin.x + windVec.x * p * 5.8,
        puff.userData.origin.y + p * 68,
        puff.userData.origin.z + windVec.z * p * 5.8,
      );
      puff.scale.setScalar(8 + p * 26);
      puff.userData.mat.opacity = 0.72 * (1 - p * 0.85);
    }

    const windHeading = Math.atan2(windVec.x, windVec.z);
    for (const sys of runwaySystems) {
      sys.sockArm.rotation.y = windHeading + Math.sin(timeSec * 3.8) * 0.12;

      const { along, lateral } = runwayLocalCoords(sys.rwy, aircraftPos.x, aircraftPos.z);
      const aimAlong = -sys.rwy.papiOffset.along;
      const distToAim = Math.max(15, aimAlong - along);
      const altAbove = aircraftPos.y - sys.rwy.elevation;
      const glideDeg = (Math.atan2(altAbove, distToAim) * 180) / Math.PI;
      const thresholds = [3.6, 4.4, 5.5, 6.4];
      const onApproach = along < aimAlong + 60 && Math.abs(lateral) < 650;
      for (let i = 0; i < 4; i++) {
        const isWhite = onApproach ? glideDeg >= thresholds[i] : i < 2;
        const col = isWhite ? '#fffdf0' : '#ff3329';
        sys.papiLamps[i].lampMat.color.set(col);
        sys.papiLamps[i].haloMat.color.set(col);
      }
    }
  }

  return {
    setAtmospherePreset,
    getAtmospherePreset: () => currentPreset,
    checkObstacleCollision,
    updateWorld,
    runwaySystems,
  };
}
