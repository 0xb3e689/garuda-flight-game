// Rigid-body physical detachment engine for aircraft parts (tailboom, left outer wing, and left propeller).
import * as THREE from 'three';
import { GRAVITY as G } from './config.js';
import { sampleTerrainHeight } from './terrain-world.js';

export function createBreakupController(scene, root, cfg) {
  const parts = {};
  for (const [k, c] of Object.entries(cfg)) parts[k] = { detached: false, mesh: c.mesh, parent: c.parent, restPos: c.restPos.clone(), stub: c.fractureStub ?? null, vel: new THREE.Vector3(), ang: new THREE.Vector3(), off: c.floorOffset };

  function reattachAllParts() {
    for (const p of Object.values(parts)) {
      if (p.stub) p.stub.visible = false; if (!p.detached) continue;
      scene.remove(p.mesh); p.parent.add(p.mesh); p.mesh.position.copy(p.restPos); p.mesh.quaternion.identity(); p.mesh.rotation.set(0, 0, 0); p.mesh.visible = true; p.detached = false;
    }
  }

  function detachPart(key, s, impLoc, angV) {
    const p = parts[key]; if (!p || p.detached) return;
    p.detached = true; if (p.stub) p.stub.visible = true; root.updateMatrixWorld(true);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(); p.mesh.getWorldPosition(wp); p.mesh.getWorldQuaternion(wq);
    p.parent.remove(p.mesh); scene.add(p.mesh); p.mesh.position.copy(wp); p.mesh.quaternion.copy(wq); p.mesh.visible = true;
    p.vel.copy(s.velocity).multiplyScalar(0.35).add(impLoc.clone().applyQuaternion(s.quaternion));
    p.vel.y = Math.max(p.vel.y, s.crashMode === 'water' ? 2.4 : impLoc.y); p.ang.copy(angV);
  }

  function stepDetachedParts(dt, mode, vis) {
    const h = Math.min(0.05, dt);
    for (const [key, p] of Object.entries(parts)) {
      if (!p.detached) continue; p.mesh.visible = vis;
      const tY = sampleTerrainHeight(p.mesh.position.x, p.mesh.position.z);
      if ((tY < -0.25 || mode === 'water') && p.mesh.position.y <= 0.35) {
        const d = Math.max(0, 1 - h * 4.2); p.vel.x *= d; p.vel.z *= d; p.vel.y = Math.min(0, Math.max(-1.6, p.vel.y - h * 1.4));
        if (p.mesh.position.y > -11) p.mesh.position.addScaledVector(p.vel, h); p.ang.multiplyScalar(Math.max(0, 1 - h * 2.5));
      } else {
        p.vel.y -= G * h; p.mesh.position.addScaledVector(p.vel, h); const fy = Math.max(0, tY) + p.off;
        if (p.mesh.position.y <= fy) {
          p.mesh.position.y = fy; if (p.vel.y < 0) p.vel.y = 0;
          const hs = Math.hypot(p.vel.x, p.vel.z);
          if (hs > 0.35) { const f = Math.max(0, 1 - (15.5 * h) / hs); p.vel.x *= f; p.vel.z *= f; } else { p.vel.set(0, 0, 0); p.ang.set(0, 0, 0); }
          if (key === 'tail') { const e = new THREE.Euler().setFromQuaternion(p.mesh.quaternion, 'YXZ'); e.x += (0.04 - e.x) * Math.min(1, h * 5.5); e.z += (1.12 - e.z) * Math.min(1, h * 5); p.mesh.quaternion.setFromEuler(e); p.ang.multiplyScalar(Math.max(0, 1 - h * 6.5)); continue; }
          p.ang.multiplyScalar(Math.max(0, 1 - h * 6));
        }
      }
      if (p.ang.lengthSq() > 0.0004) p.mesh.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(p.ang.x * h, p.ang.y * h, p.ang.z * h, 'YXZ'))).normalize();
    }
  }
  return { parts, reattachAllParts, detachPart, stepDetachedParts };
}
