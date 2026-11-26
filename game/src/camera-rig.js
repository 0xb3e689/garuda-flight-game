// Gimbal-safe chase camera, dynamic G-load cockpit camera, and crash/landing orbit camera.
import * as THREE from 'three';

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), UP = v3(0, 1, 0);

export function createCameraRig(camera) {
  let mode = 'chase', init = false, orbitAng = 0.65, latBias = 0;
  const smP = v3(), smL = v3();

  function updateCamera(s, dt, snap = false) {
    const fwd = v3(0, 0, -1).applyQuaternion(s.quaternion), up = v3(0, 1, 0).applyQuaternion(s.quaternion), rt = v3(1, 0, 0).applyQuaternion(s.quaternion);

    if (mode === 'cockpit') {
      const dip = Math.max(-0.06, Math.min(0.06, (1 - s.gLoad) * 0.025)), sw = Math.max(-0.07, Math.min(0.07, s.controlSurface.aileron * 0.055)), sk = s.cameraShake > 0.01 ? (Math.random() - 0.5) * s.cameraShake * 0.14 : 0;
      camera.fov = 66; camera.updateProjectionMatrix();
      camera.position.copy(v3(-0.08 + sw + sk, 1.25 + dip + sk, -1.96).applyQuaternion(s.quaternion).add(s.position));
      camera.up.copy(up); camera.lookAt(s.position.clone().addScaledVector(fwd, 120).addScaledVector(up, -21.5).addScaledVector(rt, sw * 16));
      return;
    }
    if (mode === 'orbit' || s.status === 'crashed') {
      orbitAng += dt * 0.25; const w = s.crashMode === 'water';
      const dp = v3(s.position.x + Math.cos(orbitAng) * 20, w ? Math.max(4.5, s.position.y + 8.5) : s.position.y + 5.8, s.position.z + Math.sin(orbitAng) * 20);
      const lk = v3(s.position.x + 5.4, w ? Math.max(-2, s.position.y + 1.2) : s.position.y + 1.4, s.position.z - 2.4);
      camera.fov = 56; camera.updateProjectionMatrix();
      if (snap || !init) { smP.copy(dp); smL.copy(lk); init = true; } else { const k = Math.min(1, dt * 4.5); smP.lerp(dp, k); smL.lerp(lk, k); }
      camera.position.copy(smP);
      if (s.cameraShake > 0.01) { const k = s.cameraShake * 0.9; camera.position.add(v3((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, (Math.random() - 0.5) * k)); }
      camera.up.copy(UP); camera.lookAt(smL); return;
    }

    const sf = fwd.clone(); sf.y = Math.max(-0.62, Math.min(0.62, sf.y));
    if (Math.hypot(sf.x, sf.z) < 0.2) { const r = (-s.headingDeg * Math.PI) / 180; sf.x = -Math.sin(r); sf.z = -Math.cos(r); }
    sf.normalize(); const sr = v3().crossVectors(sf, UP).normalize();
    const dp = s.position.clone().addScaledVector(sf, -18.5).addScaledVector(UP, 4.9).addScaledVector(sr, latBias - s.controlSurface.aileron * 2.4);
    const lk = s.position.clone().addScaledVector(sf, 58).addScaledVector(UP, 1.2).addScaledVector(sr, -latBias * 0.35);
    camera.fov += (54 + Math.min(14, Math.max(0, (s.airspeedKts - 80) * 0.11)) - camera.fov) * (snap ? 1 : Math.min(1, dt * 4));
    camera.updateProjectionMatrix();
    if (snap || !init) { smP.copy(dp); smL.copy(lk); init = true; } else { smP.lerp(dp, Math.min(1, dt * 7.5)); smL.lerp(lk, Math.min(1, dt * 11)); }
    camera.position.copy(smP); camera.up.copy(UP); camera.lookAt(smL);
  }

  return { getMode: () => mode, setMode: (m) => { mode = m; init = false; }, toggleMode: () => { mode = mode === 'chase' ? 'cockpit' : 'chase'; init = false; return mode; }, setChaseLateralBias: (b) => { latBias = b; }, setCustomOrbitAngle: (r) => { orbitAng = r; }, updateCamera };
}
