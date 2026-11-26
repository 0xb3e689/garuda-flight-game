// Deterministic ?shot= showcase scene setups for Garuda's 4 real browser screenshots.

import { resetFlightState } from './flight-physics.js';

export function applyShotPreset(
  shotName,
  { flightState, missionManager, world, aircraft, cockpit, cameraRig, effects, hud, camera },
) {
  cameraRig.setChaseLateralBias(0);
  effects.clearDebris();

  if (shotName === 'chase') {
    const mission = missionManager.loadMission(0);
    world.setAtmospherePreset(mission.atmosphere);
    resetFlightState(flightState, {
      x: -10,
      y: 62,
      z: 705,
      headingDeg: 356,
      pitchDeg: -2.2,
      rollDeg: -12,
      speedKts: 118,
      throttle: 0.72,
      flapStage: 1,
      gearDown: true,
      fuelPct: 82,
      hullPct: 100,
      engineHealth: 100,
    });
    flightState.vsiMps = -2.8;
    flightState.controlSurface.aileron = -0.32;
    flightState.controlSurface.flaps = 15;
    cameraRig.setMode('chase');
    cameraRig.setChaseLateralBias(-3.6);
    aircraft.updateAircraftModel(flightState, 0.016, 4.2, true);
    world.updateWorld(0.016, 4.2, flightState.position, mission.wind, flightState.quaternion);
    cameraRig.updateCamera(flightState, 0.016, true);
    effects.seedWingtipTrails(flightState);
    effects.updateEffects(0.016, 4.2, flightState, camera.position, 0, false);
    cockpit.updateCockpit(flightState, 358, false, false, 4.2, 0);
    return true;
  }

  if (shotName === 'cockpit') {
    const mission = missionManager.loadMission(1);
    missionManager.setShowcaseProgress(1, 200);
    missionManager.spawnShowcaseParachute(-945, 298, -1355);
    world.setAtmospherePreset(mission.atmosphere);
    resetFlightState(flightState, {
      x: -745,
      y: 302,
      z: -1155,
      headingDeg: 316,
      pitchDeg: -1.5,
      rollDeg: 9,
      speedKts: 126,
      throttle: 0.76,
      flapStage: 1,
      gearDown: false,
      fuelPct: 21,
      hullPct: 92,
      engineHealth: 95,
    });
    flightState.lowFuel = true;
    flightState.controlSurface.aileron = 0.36;
    flightState.controlSurface.flaps = 15;
    cameraRig.setMode('cockpit');
    aircraft.updateAircraftModel(flightState, 0.016, 6.4, false);
    world.updateWorld(0.016, 6.4, flightState.position, mission.wind, flightState.quaternion);
    cameraRig.updateCamera(flightState, 0.016, true);
    effects.updateEffects(0.016, 6.4, flightState, camera.position, 0, true);
    cockpit.updateCockpit(flightState, 316, true, true, 6.4, 0);
    return true;
  }

  if (shotName === 'landing') {
    const mission = missionManager.loadMission(2);
    missionManager.setShowcaseProgress(2, 400);
    world.setAtmospherePreset(mission.atmosphere);
    resetFlightState(flightState, {
      x: 946,
      y: 76.2,
      z: -1250,
      headingDeg: 86,
      pitchDeg: 4.5,
      rollDeg: -3.2,
      speedKts: 72,
      throttle: 0.24,
      flapStage: 2,
      gearDown: true,
      fuelPct: 54,
      hullPct: 96,
      engineHealth: 100,
    });
    flightState.vsiMps = -1.6;
    flightState.controlSurface.flaps = 30;
    flightState.controlSurface.rudder = 0.35;
    cameraRig.setMode('chase');
    cameraRig.setChaseLateralBias(-3.2);
    aircraft.updateAircraftModel(flightState, 0.05, 8.1, true);
    world.updateWorld(0.05, 8.1, flightState.position, mission.wind, flightState.quaternion);
    cameraRig.updateCamera(flightState, 0.05, true);
    effects.emitTouchdownSmoke(flightState.position, flightState.quaternion, false);
    effects.updateEffects(0.05, 8.1, flightState, camera.position, 0, false);
    cockpit.updateCockpit(flightState, 90, false, false, 8.1, 0);
    hud.showBanner('FLARE RWY 09 · FLAPS 30°', 'info', 5);
    return true;
  }

  if (shotName === 'debrief') {
    const mission = missionManager.loadMission(3);
    missionManager.setShowcaseProgress(2, 400);
    world.setAtmospherePreset(mission.atmosphere);
    resetFlightState(flightState, {
      x: -760,
      y: 10.35,
      z: 860,
      headingDeg: 48,
      pitchDeg: 0,
      rollDeg: 11,
      speedKts: 0,
      throttle: 0,
      flapStage: 2,
      gearDown: true,
      fuelPct: 19,
      hullPct: 12,
      engineHealth: 8,
      onGround: true,
    });
    flightState.status = 'crashed';
    flightState.crashMode = 'ground';
    flightState.crashSeverity = 'catastrophic';
    flightState.propRpm = 0;
    flightState.propRpmLeft = 0;
    flightState.gearIntact = false;
    flightState.incidentReport = {
      outcome: 'CRASHED',
      title: 'HARD LANDING — GEAR COLLAPSE',
      detail: 'Sink -9.8 m/s (max 4.6) at 79 kt, bank 19°.',
      sinkMps: 9.8,
      speedKts: 79,
      bankDeg: 19,
      onRunway: true,
      fuelPct: 19,
      hullPct: 12,
    };
    cameraRig.setMode('orbit');
    cameraRig.setCustomOrbitAngle(1.42);
    // Step detached tail rigid-body physics for ~1.1s so the snapped tail visibly tumbles & lands away on the runway!
    for (let k = 0; k < 28; k++) {
      aircraft.updateAircraftModel(flightState, 0.04, 10.3 + k * 0.04, true);
    }
    world.updateWorld(0.05, 11.4, flightState.position, mission.wind, flightState.quaternion);
    cameraRig.updateCamera(flightState, 0.05, true);
    effects.stampCrashGougeTrail(flightState.position, flightState.headingDeg, 36);
    effects.emitRoaringFireBurst(flightState.position, flightState.quaternion, 8.5, false);
    effects.emitTouchdownSmoke(flightState.position, flightState.quaternion, true);
    effects.updateEffects(0.18, 11.58, flightState, camera.position, 1.0, false);
    cockpit.updateCockpit(flightState, 35, false, false, 11.58, 1.0);
    return true;
  }

  return false;
}
