// Velocity-aware chase camera, locked 3D cockpit camera, and crash/landing showcase camera
// engineered so the camera never fights the pilot's inputs.

import * as THREE from 'three';

export function createCameraRig(camera) {
  let mode = 'chase'; // 'chase' | 'cockpit' | 'orbit'
  const smoothPos = new THREE.Vector3();
  const smoothLook = new THREE.Vector3();
  let initialized = false;
  let orbitAngle = 0.65;
  let chaseLateralBias = 0;

  function setMode(nextMode) {
    mode = nextMode;
    initialized = false;
  }

  function setChaseLateralBias(bias) {
    chaseLateralBias = bias;
  }

  function toggleMode() {
    mode = mode === 'chase' ? 'cockpit' : 'chase';
    initialized = false;
    return mode;
  }

  function updateCamera(flightState, dt, snap = false) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(flightState.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(flightState.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(flightState.quaternion);

    if (mode === 'cockpit') {
      // Dynamic pilot head inside 3D cockpit with G-load sink, turn-bank sway & engine micro-vibration!
      const gDip = Math.max(-0.06, Math.min(0.06, (1.0 - flightState.gLoad) * 0.025));
      const bankSway = Math.max(-0.07, Math.min(0.07, flightState.controlSurface.aileron * 0.055));
      const shake = flightState.cameraShake > 0.01 ? (Math.random() - 0.5) * flightState.cameraShake * 0.14 : 0;
      const eyeLocal = new THREE.Vector3(-0.08 + bankSway + shake, 1.25 + gDip + shake, -1.96);
      const eyeWorld = eyeLocal.applyQuaternion(flightState.quaternion).add(flightState.position);
      const targetWorld = flightState.position
        .clone()
        .addScaledVector(forward, 120)
        .addScaledVector(up, -21.5)
        .addScaledVector(right, bankSway * 16);

      camera.fov = 66;
      camera.updateProjectionMatrix();
      camera.position.copy(eyeWorld);
      camera.up.copy(up);
      camera.lookAt(targetWorld);
      return;
    }

    if (mode === 'orbit' || flightState.status === 'crashed') {
      orbitAngle += dt * 0.25;
      const dist = 20;
      const baseAlt = flightState.crashMode === 'water' ? Math.max(4.5, flightState.position.y + 8.5) : flightState.position.y + 5.8;
      const desiredPos = new THREE.Vector3(
        flightState.position.x + Math.cos(orbitAngle) * dist,
        baseAlt,
        flightState.position.z + Math.sin(orbitAngle) * dist,
      );
      const lookTarget = new THREE.Vector3(
        flightState.position.x + 5.4,
        flightState.crashMode === 'water' ? Math.max(-2, flightState.position.y + 1.2) : flightState.position.y + 1.4,
        flightState.position.z - 2.4,
      );

      camera.fov = 56;
      camera.updateProjectionMatrix();
      if (snap || !initialized) {
        smoothPos.copy(desiredPos);
        smoothLook.copy(lookTarget);
        initialized = true;
      } else {
        const k = Math.min(1, dt * 4.5);
        smoothPos.lerp(desiredPos, k);
        smoothLook.lerp(lookTarget, k);
      }
      camera.position.copy(smoothPos);
      if (flightState.cameraShake > 0.01) {
        const s = flightState.cameraShake * 0.9;
        camera.position.x += (Math.random() - 0.5) * s;
        camera.position.y += (Math.random() - 0.5) * s;
        camera.position.z += (Math.random() - 0.5) * s;
      }
      camera.up.set(0, 1, 0);
      camera.lookAt(smoothLook);
      return;
    }

    // Gimbal-safe Chase Cam: clamps vertical forward projection so camera NEVER flips even during steep climb/dive!
    const worldUp = new THREE.Vector3(0, 1, 0);
    const safeForward = forward.clone();
    safeForward.y = Math.max(-0.62, Math.min(0.62, safeForward.y));
    if (Math.hypot(safeForward.x, safeForward.z) < 0.2) {
      const hRad = (-flightState.headingDeg * Math.PI) / 180;
      safeForward.x = -Math.sin(hRad);
      safeForward.z = -Math.cos(hRad);
    }
    safeForward.normalize();
    const safeRight = new THREE.Vector3().crossVectors(safeForward, worldUp).normalize();

    const desiredPos = flightState.position
      .clone()
      .addScaledVector(safeForward, -18.5)
      .addScaledVector(worldUp, 4.9)
      .addScaledVector(safeRight, chaseLateralBias - flightState.controlSurface.aileron * 2.4);

    const lookTarget = flightState.position
      .clone()
      .addScaledVector(safeForward, 58)
      .addScaledVector(worldUp, 1.2)
      .addScaledVector(safeRight, -chaseLateralBias * 0.35);

    const speedFov = 54 + Math.min(14, Math.max(0, (flightState.airspeedKts - 80) * 0.11));
    camera.fov += (speedFov - camera.fov) * (snap ? 1 : Math.min(1, dt * 4));
    camera.updateProjectionMatrix();

    if (snap || !initialized) {
      smoothPos.copy(desiredPos);
      smoothLook.copy(lookTarget);
      initialized = true;
    } else {
      const posRate = Math.min(1, dt * 7.5);
      const lookRate = Math.min(1, dt * 11.0);
      smoothPos.lerp(desiredPos, posRate);
      smoothLook.lerp(lookTarget, lookRate);
    }

    camera.position.copy(smoothPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(smoothLook);
  }

  function setCustomOrbitAngle(rad) {
    orbitAngle = rad;
  }

  return {
    getMode: () => mode,
    setMode,
    toggleMode,
    setChaseLateralBias,
    setCustomOrbitAngle,
    updateCamera,
  };
}
