// Velocity-aware chase camera, locked 3D cockpit camera, and crash/landing showcase camera
// engineered so the camera never fights the pilot's inputs.

import * as THREE from 'three';

export function createCameraRig(camera) {
  let mode = 'chase'; // 'chase' | 'cockpit' | 'orbit'
  const smoothPos = new THREE.Vector3();
  const smoothLook = new THREE.Vector3();
  let initialized = false;
  let orbitAngle = 0.65;

  function setMode(nextMode) {
    mode = nextMode;
    initialized = false;
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
      // Pilot eye inside 3D cockpit framing BOTH the full glowing 6-pack instrument panel AND panoramic windshield!
      const eyeLocal = new THREE.Vector3(-0.08, 1.24, -2.02);
      const eyeWorld = eyeLocal.applyQuaternion(flightState.quaternion).add(flightState.position);
      const targetWorld = flightState.position
        .clone()
        .addScaledVector(forward, 120)
        .addScaledVector(up, -17);

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
      const desiredPos = flightState.position
        .clone()
        .add(new THREE.Vector3(Math.cos(orbitAngle) * dist, 5.8, Math.sin(orbitAngle) * dist));
      const lookTarget = flightState.position.clone().add(new THREE.Vector3(5.6, 1.4, -2.5));

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
      camera.up.set(0, 1, 0);
      camera.lookAt(smoothLook);
      return;
    }

    // Velocity-aware Chase Cam: stays gently leveled with horizon, subtly anticipates bank/turn
    const worldUp = new THREE.Vector3(0, 1, 0);
    const desiredPos = flightState.position
      .clone()
      .addScaledVector(forward, -19.5)
      .addScaledVector(worldUp, 5.2)
      .addScaledVector(right, -flightState.controlSurface.aileron * 2.2);

    const lookTarget = flightState.position
      .clone()
      .addScaledVector(forward, 55)
      .addScaledVector(worldUp, 1.5);

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
    setCustomOrbitAngle,
    updateCamera,
  };
}
