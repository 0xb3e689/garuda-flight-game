// Deterministic ?shot= showcase scene setups so every captured screenshot is a real,
// unmodified render of Garuda's 3D engine, physics telemetry, cockpit gauges, and HUD.

import * as THREE from 'three';
import { resetFlightState } from './flight-physics.js';

export function applyShotPreset(shotName, { flightState, missionManager, world, aircraft, cockpit, cameraRig, hud }) {
  if (shotName === 'chase') {
    // Shot 1 (Cover): Golden-hour chase view on Mission 1 approaching Gate 01 -> Merpati RWY 36,
    // right on the STOL glideslope (2 white / 2 red PAPI!), framing aircraft, target ring, runway, village, lighthouse & bridge!
    const mission = missionManager.loadMission(0);
    world.setAtmospherePreset(mission.atmosphere);
    resetFlightState(flightState, {
      x: 16,
      y: 65,
      z: 745,
      headingDeg: 357,
      pitchDeg: -2.5,
      rollDeg: -10,
      speedKts: 114,
      throttle: 0.68,
      flapStage: 1,
      gearDown: true,
      fuelPct: 82,
      hullPct: 100,
      engineHealth: 100,
    });
    flightState.vsiMps = -3.1;
    flightState.controlSurface.aileron = -0.35;
    flightState.controlSurface.flaps = 15;
    cameraRig.setMode('chase');
    aircraft.updateAircraftModel(flightState, 0.016, 4.2, true);
    world.updateWorld(0.016, 4.2, flightState.position, mission.wind);
    cameraRig.updateCamera(flightState, 0.016, true);
    cockpit.updateCockpit(flightState, 358, false);
    hud.showBanner('APPROACHING GATE 01 · ON GLIDESLOPE MERPATI RWY 36', 'good', 5);
    return true;
  }

  if (shotName === 'cockpit') {
    // Shot 2: True 3D Cockpit View inside Garuda G-4 with full illuminated 6-pack gauges, HSI & annunciators,
    // flying through Gunung Kawah volcanic canyon toward the glowing aerial ring on Mission 2!
    const mission = missionManager.loadMission(1);
    world.setAtmospherePreset(mission.atmosphere);
    resetFlightState(flightState, {
      x: -565,
      y: 256,
      z: -945,
      headingDeg: 316,
      pitchDeg: -2,
      rollDeg: 10,
      speedKts: 126,
      throttle: 0.78,
      flapStage: 1,
      gearDown: false,
      fuelPct: 21,
      hullPct: 92,
      engineHealth: 95,
    });
    flightState.lowFuel = true;
    flightState.controlSurface.aileron = 0.38;
    flightState.controlSurface.flaps = 15;
    cameraRig.setMode('cockpit');
    aircraft.updateAircraftModel(flightState, 0.016, 6.4, false);
    world.updateWorld(0.016, 6.4, flightState.position, mission.wind);
    cameraRig.updateCamera(flightState, 0.016, true);
    cockpit.updateCockpit(flightState, 316, true, true);
    return true;
  }

  if (shotName === 'landing') {
    // Shot 3: Dusk crosswind flare on Karang Cliffside Strip RWY 09 —
    // aligned on the STOL glideslope (2 white / 2 red PAPI visible ahead!), gear down, flaps 30 deg, windsock, tire smoke!
    const mission = missionManager.loadMission(2);
    missionManager.setShowcaseProgress(2, 400);
    world.setAtmospherePreset(mission.atmosphere);
    resetFlightState(flightState, {
      x: 942,
      y: 77.0,
      z: -1250,
      headingDeg: 86,
      pitchDeg: 4.5,
      rollDeg: -3.0,
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
    aircraft.spawnTouchdownPuff(new THREE.Vector3(944, 71.2, -1250), false);
    aircraft.updateAircraftModel(flightState, 0.05, 8.1, true);
    world.updateWorld(0.05, 8.1, flightState.position, mission.wind);
    cameraRig.updateCamera(flightState, 0.05, true);
    cockpit.updateCockpit(flightState, 90, false);
    hud.showBanner('FLARE RWY 09 · CROSSWIND 18 KT · FLAPS 30° · GEAR DOWN', 'info', 5);
    return true;
  }

  if (shotName === 'debrief') {
    // Shot 4: Readable crash / emergency incident on Mission 4 (Storm Sea Rescue) —
    // smoking Garuda G-4 cleanly framed left of the unobstructed diagnostic readout & 4-mission bar!
    const mission = missionManager.loadMission(3);
    missionManager.setShowcaseProgress(2, 400);
    world.setAtmospherePreset(mission.atmosphere);
    resetFlightState(flightState, {
      x: -760,
      y: 9.85,
      z: 860,
      headingDeg: 48,
      pitchDeg: -5,
      rollDeg: 18,
      speedKts: 0,
      throttle: 0,
      flapStage: 2,
      gearDown: true,
      fuelPct: 19,
      hullPct: 18,
      engineHealth: 15,
      onGround: true,
    });
    flightState.status = 'crashed';
    flightState.gearIntact = false;
    flightState.incidentReport = {
      outcome: 'CRASHED',
      title: 'HARD LANDING — GEAR COLLAPSE',
      detail: 'Touchdown sink -9.8 m/s (limit 4.6 m/s) at 79 kt, bank 19° in 24 kt storm gusts.',
      sinkMps: 9.8,
      speedKts: 79,
      bankDeg: 19,
      onRunway: true,
      fuelPct: 19,
      hullPct: 18,
    };
    cameraRig.setMode('orbit');
    cameraRig.setCustomOrbitAngle(1.32);
    for (let i = 0; i < 12; i++) {
      aircraft.updateAircraftModel(flightState, 0.12, 10 + i * 0.12, true);
    }
    aircraft.spawnTouchdownPuff(new THREE.Vector3(-760, 9.6, 860), true);
    world.updateWorld(0.05, 11.4, flightState.position, mission.wind);
    cameraRig.updateCamera(flightState, 0.05, true);
    cockpit.updateCockpit(flightState, 35, false);
    return true;
  }

  return false;
}
