// Instanced branching highland trees, coastal tropical palms, craggy basalt boulders, and cumulus cloud banks.
import * as T from 'three';
import { createCloudPuffTexture, createFoliageTexture } from './procedural-textures.js';
import { getRunwayAt, hash2 as h2, sampleTerrainHeight as sH, valueNoise as vN } from './terrain-height.js';

const P2 = Math.PI * 2, IM = (g, m, n) => new T.InstancedMesh(g, m, n);

function createCraggyRockGeometry() {
  const g = new T.IcosahedronGeometry(3.6, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 0.72 + vN(x * 0.65 + 4.1, z * 0.65 - y * 0.5) * 0.56; p.setXYZ(i, x * d, y * d * (y < 0 ? 0.7 : 1), z * d); }
  g.computeVertexNormals(); return g;
}

function displaceFoliage(r, tx, ty, tz, sx, sy, sz) {
  const g = new T.IcosahedronGeometry(r, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.8 + vN(p.getX(i) + tx, p.getZ(i) + tz) * 0.42; p.setXYZ(i, p.getX(i) * k * sx, p.getY(i) * k * sy, p.getZ(i) * k * sz); }
  g.translate(tx, ty, tz); g.computeVertexNormals(); return g;
}

export function buildArchipelagoFoliageAndClouds(scene, col) {
  const fT = createFoliageTexture(), MH = 860, MP = 340, MR = 640, sm = (c, r, map) => new T.MeshStandardMaterial({ color: c, roughness: r, ...(map ? { map } : {}) });
  const tM = sm('#4c3728', 0.95), cD = sm('#6ea86a', 0.9, fT), cM = sm('#8ac582', 0.86, fT), cS = sm('#aadf92', 0.82, fT);
  const hM = [
    IM(new T.CylinderGeometry(0.42, 0.92, 6.8, 7).translate(0, 3.4, 0), tM, MH),
    IM(new T.CylinderGeometry(0.22, 0.36, 4.2, 6).rotateZ(-0.68).translate(1.5, 6, 0.7), tM, MH),
    IM(displaceFoliage(4.5, 0, 8.6, 0, 1.2, 0.76, 1.1), cM, MH),
    IM(displaceFoliage(3.4, 2.7, 7.3, 1.4, 1.12, 0.72, 1.05), cD, MH),
    IM(displaceFoliage(3.2, -2.1, 7.9, -1.6, 1.08, 0.75, 1.1), cD, MH),
    IM(displaceFoliage(2.9, 0.4, 11.2, -0.5, 1, 0.82, 1), cS, MH),
  ];
  hM[2].castShadow = hM[3].castShadow = hM[5].castShadow = true;

  const fr = new T.Shape().moveTo(0, 0).quadraticCurveTo(2.4, 1.2, 5.2, -1.1).quadraticCurveTo(2.4, 0.1, 0, -0.25), pF = sm('#458a3e', 0.78);
  const pM = [IM(new T.CylinderGeometry(0.24, 0.56, 11.5, 7).rotateZ(0.14).translate(0.7, 5.6, 0), sm('#6b533b', 0.92), MP), ...Array.from({ length: 6 }, (_, f) => { const m = IM(new T.ExtrudeGeometry(fr, { depth: 0.45, bevelEnabled: false }).translate(0, 0, -0.22).rotateY((f / 6) * P2).translate(1.45, 11.1, 0), pF, MP); m.castShadow = true; return m; })];

  const d = new T.Object3D(); let hN = 0, pN = 0, rN = 0;
  for (let i = 0; i < 6800 && (hN < MH || pN < MP); i++) {
    const sp = i < 2600 ? 3400 : 8200, x = (h2(i * 1.7, 3.1) - 0.5) * sp, z = (h2(7.3, i * 2.3) - 0.5) * sp, y = sH(x, z);
    if (y < 3.6 || y > 142 || getRunwayAt(x, z, 54) || Math.abs(sH(x + 6, z) - y) > 4.6 || Math.abs(sH(x, z + 6) - y) > 4.6) continue;
    const sc = 0.74 + h2(i, 9.1) * 0.88;
    d.position.set(x, y - 0.6, z); d.scale.set(sc, sc * (0.9 + h2(i, 4.4) * 0.34), sc); d.rotation.set(0, h2(i, 1.2) * P2, 0); d.updateMatrix();
    if (y < 22 && pN < MP) { pM.forEach((m) => m.setMatrixAt(pN, d.matrix)); col.trees.push({ x, z, minY: y, maxY: y + 12.2 * sc, radius: 2.6 * sc }); pN++; }
    else if (y >= 14 && hN < MH) { hM.forEach((m) => m.setMatrixAt(hN, d.matrix)); col.trees.push({ x, z, minY: y, maxY: y + 12.8 * sc, radius: 4.1 * sc }); hN++; }
  }
  hM.forEach((m) => { m.count = hN; m.instanceMatrix.needsUpdate = true; scene.add(m); });
  pM.forEach((m) => { m.count = pN; m.instanceMatrix.needsUpdate = true; scene.add(m); });

  const rk = IM(createCraggyRockGeometry(), new T.MeshStandardMaterial({ color: '#5a554c', roughness: 0.92, metalness: 0.06, flatShading: true }), MR);
  rk.castShadow = rk.receiveShadow = true;
  for (let i = 0; i < 5200 && rN < MR; i++) {
    const sp = i < 2400 ? 3500 : 8200, x = (h2(i * 4.3, 1.9) - 0.5) * sp, z = (h2(5.1, i * 3.7) - 0.5) * sp, y = sH(x, z);
    if (y < -1 || y > 270 || getRunwayAt(x, z, 56) || (y > 7.5 && Math.hypot(sH(x + 6, z) - y, sH(x, z + 6) - y) < 3.1)) continue;
    const sy = 0.55 + h2(i, 4.9) * 1.6;
    d.position.set(x, y - sy * 0.85, z); d.scale.set(0.8 + h2(i, 2.3) * 2.5, sy, 0.8 + h2(i, 7.1) * 2.4); d.rotation.set(h2(i, 1.1) * 0.5, h2(i, 6.2) * P2, h2(i, 8.3) * 0.5); d.updateMatrix();
    rk.setMatrixAt(rN++, d.matrix);
  }
  rk.count = rN; rk.instanceMatrix.needsUpdate = true; scene.add(rk);

  const cT = createCloudPuffTexture(), cl = new T.Group(), mats = [];
  for (let i = 0; i < 64; i++) {
    const bk = new T.Group(), a = (i / 64) * P2 + h2(i, 2.2) * 0.4, dst = 620 + h2(i, 5.5) * 5800;
    bk.position.set(Math.cos(a) * dst, 320 + h2(i, 8.8) * 320, Math.sin(a) * dst);
    for (let p = 0, n = 8 + Math.floor(h2(i, 3.7) * 5); p < n; p++) {
      const m = new T.SpriteMaterial({ map: cT, color: '#fff6eb', transparent: true, opacity: 0.82 + h2(i * 19 + p, 1.3) * 0.14, depthWrite: false }), sp = new T.Sprite(m);
      mats.push(m); sp.scale.set(135 + h2(i * 11 + p, 1.1) * 145, 72 + h2(i * 11 + p, 2.1) * 70, 1);
      sp.position.set((h2(i * 13 + p, 4.1) - 0.5) * 200, (h2(i * 13 + p, 5.1) - 0.5) * 38, (h2(i * 13 + p, 6.1) - 0.5) * 145); bk.add(sp);
    }
    cl.add(bk);
  }
  scene.add(cl); return { clouds: cl, cloudSpriteMats: mats };
}
