// 9.2 km ridged-multifractal volcanic archipelago heightmap, runway grading, thermals, and terrain mesh.
import * as T from 'three';
import { LANDMARKS, RUNWAYS, WORLD_SIZE } from './config.js';
import { createTerrainDetailTexture, createTerrainNormalMap } from './procedural-textures.js';

const { max: MX, min: MN, abs: A, floor: FL, sin: S, cos: C, exp: E, hypot: HY, atan2: AT, PI } = Math;

export const smoothstep = (a, b, x) => { const t = MX(0, MN(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const hash2 = (x, z) => { const s = S(x * 127.1 + z * 311.7) * 43758.5453123; return s - FL(s); };
export function valueNoise(x, z) {
  const ix = FL(x), iz = FL(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
export function fbm(x, z, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += (valueNoise(x * f, z * f) - 0.5) * 2 * a; f *= 2.04; a *= 0.48; } return s; }
export function ridgedFbm(x, z, o = 4) { let s = 0, a = 0.55, f = 1, w = 1; for (let i = 0; i < o; i++) { const n = 1 - A((valueNoise(x * f, z * f) - 0.5) * 2), g = n * n * w; w = MX(0.25, MN(1, g * 1.4)); s += g * a; f *= 2.14; a *= 0.48; } return s; }
export function runwayLocalCoords(rw, x, z) { const r = (rw.headingDeg * PI) / 180, dx = x - rw.x, dz = z - rw.z; return { along: dx * S(r) - dz * C(r), lateral: dx * C(r) + dz * S(r) }; }
export function getRunwayAt(x, z, m = 4) { for (const rw of RUNWAYS) { const { along, lateral } = runwayLocalCoords(rw, x, z); if (A(along) <= rw.length * 0.5 + m && A(lateral) <= rw.width * 0.5 + m) return { runway: rw, along, lateral }; } return null; }

const ISLES = [
  [20, 10, 560, 680, 0.42, 1.08, 0.0025, 0.24, 42, -14, [[-335, -40, 195, 365, 84, 102, 0.0058, 5], [290, 340, 165, 225, 48, 48, 0.0068, 4], [380, -340, 120, 130, 58, 0, 0, 0]]],
  [980, -340, 260, 290, 0.38, 1.02, 0.003, 0.18, 54, -12, [[1040, -360, 145, 145, 86, 78, 0.0072, 4]]],
  [1200, -1250, 480, 310, 0.62, 0.94, 0.0035, 0.12, 78, -10, [[1220, -1480, 215, 130, 72, 68, 0.0062, 4]]],
  [-760, 860, 360, 320, 0.45, 1, 0.004, 0.16, 26, -10, []],
  [-240, -3150, 820, 640, 0.42, 1.04, 0.0022, 0.22, 48, -14, [[-520, -3180, 260, 240, 135, 95, 0.0052, 4], [140, -3060, 230, 220, 115, 85, 0.0058, 4]]],
  [-2850, -450, 740, 860, 0.45, 1, 0.0024, 0.2, 94, -14, [[-2920, -580, 310, 320, 98, 92, 0.0055, 4]]],
  [1150, 2650, 780, 620, 0.4, 1.05, 0.0025, 0.22, 62, -14, [[1340, 2740, 260, 230, 84, 76, 0.006, 4]]],
  [-2350, 2350, 660, 600, 0.42, 1.02, 0.0028, 0.2, 44, -14, [[-2400, 2420, 240, 240, 155, 105, 0.0056, 4]]],
];

export function sampleTerrainHeight(x, z) {
  let h = -18;
  const pk = (cx, cz, rx, rz) => E(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
  for (const [ix, iz, rx, rz, e0, e1, nf, na, b, off, pks] of ISLES) {
    const m = 1 - smoothstep(e0, e1, HY((x - ix) / rx, (z - iz) / rz) + fbm(x * nf, z * nf, 3) * na);
    if (m <= 0) continue;
    let ih = m * b + off;
    for (const [px, pz, prx, prz, pb, amp, rf, o] of pks) ih += pk(px, pz, prx, prz) * (pb + (amp ? ridgedFbm(x * rf, z * rf, o) * amp : 0));
    h = MX(h, ih);
  }
  const { x: cx, z: cz } = LANDMARKS.calderaCenter, rC = HY(x - cx, z - cz), vM = 1 - smoothstep(420, 1100, rC + fbm(x * 0.0028, z * 0.0028, 4) * 175);
  if (vM > 0) {
    const cr = ridgedFbm(x * 0.0048, z * 0.0048, 5), rv = S(AT(z - cz, x - cx) * 11 + fbm(x * 0.004, z * 0.004, 2) * 2.2) * 0.5 + 0.5;
    let vh = vM * (112 + cr * 88 - rv * 22) + E(-(((rC - 310) / 140) ** 2)) * (205 + cr * 138);
    const bw = 1 - smoothstep(130, 265, rC); vh = vh * (1 - bw * 0.35) + bw * 182;
    const cL = HY(x - (cx + 310), z - (cz + 260));
    if (cL < 430) vh -= (1 - smoothstep(45, 132, A((z - (cz + 260)) * 0.72 - (x - (cx + 310)) * 0.69))) * (1 - smoothstep(260, 430, cL)) * 155;
    h = MX(h, vh * 0.8 + (FL(vh / 22) * 22 + smoothstep(0, 22, vh % 22) * 22) * 0.2 - 16);
  }
  const sN = ridgedFbm(x * 0.015, z * 0.015, 3);
  h = MX(h, pk(-1320, 590, 72, 72) * (72 + sN * 48) - 14, pk(-1060, 840, 60, 60) * (56 + sN * 38) - 14, pk(-420, -820, 74, 74) * (76 + sN * 45) - 14);
  const rA = HY(x - 2950, z + 350);
  if (rA < 920) { const rg = E(-(((rA - 580) / 145) ** 2)) * (1 - smoothstep(-0.38, 0.38, C(AT(z + 350, x - 2950) + 2.4)) * 0.88); if (rg > 0.02) h = MX(h, rg * (26 + fbm(x * 0.006, z * 0.006, 3) * 14) - 6); h = MX(h, (1 - smoothstep(420, 920, rA)) * -2.2); }
  if (h > 1.5) h += fbm(x * 0.02, z * 0.02, 3) * 5.6 + (ridgedFbm(x * 0.013, z * 0.013, 3) - 0.35) * MN(20, h * 0.14);
  for (const rw of RUNWAYS) { const { along, lateral } = runwayLocalCoords(rw, x, z), e = HY(MX(0, A(along) - (rw.length * 0.5 + 34)), MX(0, A(lateral) - (rw.width * 0.5 + 34))); if (e < 120) { const b = 1 - smoothstep(0, 120, e); h = h * (1 - b) + rw.elevation * b; } }
  return h;
}

export const sampleTerrainNormal = (x, z) => new T.Vector3(sampleTerrainHeight(x - 2, z) - sampleTerrainHeight(x + 2, z), 4, sampleTerrainHeight(x, z - 2) - sampleTerrainHeight(x, z + 2)).normalize();
export const sampleThermalLift = (x, z, alt) => { const d = HY(x - LANDMARKS.calderaCenter.x, z - LANDMARKS.calderaCenter.z); return d < 420 && alt < 440 ? (1 - d / 420) * 3.4 : 0; };

export function buildTerrainMesh() {
  const g = new T.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 420, 420).rotateX(-PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, sampleTerrainHeight(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const n = g.attributes.normal, cl = new Float32Array(p.count * 3), c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < -2.2) c.set('#146a7d'); else if (y < 0.85) c.set('#e5d8b8'); else if (y < 5.5) c.set('#dcc69a');
    else if (n.getY(i) < 0.7) { c.set(y > 155 ? '#504e4b' : '#635b51'); c.offsetHSL(0, 0, S(y * 0.17 + valueNoise(x * 0.025, z * 0.025) * 3.2) * 0.06); }
    else c.set(y < 28 ? '#4c8641' : y < 76 ? '#356d39' : y < 185 ? '#44653d' : y < 285 ? '#7d6955' : '#d2ccc0');
    c.offsetHSL(0, 0, (valueNoise(x * 0.03, z * 0.03) - 0.5) * 0.11); cl[i * 3] = c.r; cl[i * 3 + 1] = c.g; cl[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new T.BufferAttribute(cl, 3));
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, map: createTerrainDetailTexture(), normalMap: createTerrainNormalMap(), normalScale: new T.Vector2(1.25, 1.25), roughness: 0.9, metalness: 0.04 }));
  m.receiveShadow = m.castShadow = true; return m;
}
