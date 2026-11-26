// Main bootstrap, render loop, mission briefing dialog controller, and live flight simulation for Garuda.

import * as THREE from 'three';
import { createAircraftModel } from './aircraft-model.js';
import { createAudioEngine } from './audio-engine.js';
import { createCameraRig } from './camera-rig.js';
import { createCockpitInterior } from './cockpit-interior.js';
import { createFlightState, resetFlightState, stepFlightPhysics } from './flight-physics.js';
import { createHudInstruments } from './hud-instruments.js';
import { createInputControls } from './input-controls.js';
import { createMissionManager, MISSIONS } from './missions.js';
import { applyShotPreset } from './shots.js';
import { createArchipelagoWorld } from './terrain-world.js';

function bootGaruda() {
  const glCanvas = document.getElementById('flight-canvas');
  const hudCanvas = document.getElementById('hud-canvas');
  const briefingDialog = document.getElementById('briefing-dialog');
  const missionListEl = document.getElementById('mission-list');

  const renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.25, 16000);

  const world = createArchipelagoWorld(scene);
  const aircraft = createAircraftModel(scene);
  const cockpit = createCockpitInterior(aircraft.root);
  const cameraRig = createCameraRig(camera);
  const missionManager = createMissionManager(scene);
  const flightState = createFlightState();
  const hud = createHudInstruments(hudCanvas);
  const audio = createAudioEngine();

  let currentMissionIndex = 0;
  let paused = false;
  let simTime = 0;

  function startMission(index, closeModal = true) {
    currentMissionIndex = index;
    const mission = missionManager.loadMission(index);
    world.setAtmospherePreset(mission.atmosphere);
    resetFlightState(flightState, mission.spawn);
    cameraRig.setMode('chase');
    cameraRig.updateCamera(flightState, 0.016, true);
    hud.showBanner(`SORTIE ${mission.number}: ${mission.name.toUpperCase()} — ${mission.windDesc}`, 'info', 4.0);
    if (closeModal && briefingDialog.open) {
      briefingDialog.close('launch');
    }
    paused = false;
  }

  // Populate Mission Briefing Dialog cards
  missionListEl.innerHTML = '';
  for (let i = 0; i < MISSIONS.length; i++) {
    const m = MISSIONS[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mission-card';
    btn.innerHTML = `
      <span class="mission-badge">${m.shortTag}</span>
      <strong>${m.name}</strong>
      <span class="mission-meta">WIND ${m.windDesc} · FUEL ${m.spawn.fuelPct}% · HULL ${m.spawn.hullPct}%</span>
      <span class="mission-desc">${m.brief}</span>
    `;
    btn.addEventListener('click', () => {
      audio.unlock();
      audio.playClick();
      startMission(i, true);
    });
    missionListEl.appendChild(btn);
  }

  // Dialog close handler (resets returnValue per modern <dialog> best practice)
  briefingDialog.addEventListener('close', () => {
    briefingDialog.returnValue = '';
    paused = false;
  });

  // Fallback for light dismiss if browser lacks <dialog closedby>
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    let pressedOutside = false;
    const isOutside = (e) => {
      const r = briefingDialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    briefingDialog.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e);
    });
    briefingDialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e)) briefingDialog.close();
    });
  }

  document.getElementById('open-briefing-btn').addEventListener('click', () => {
    audio.unlock();
    paused = true;
    briefingDialog.showModal();
  });

  document.getElementById('resume-flight-btn').addEventListener('click', () => {
    audio.unlock();
    if (briefingDialog.open) briefingDialog.close('resume');
  });

  const controls = createInputControls(glCanvas, {
    onUserInteract: () => audio.unlock(),
    onToggleCamera: () => {
      audio.unlock();
      audio.playClick();
      const next = cameraRig.toggleMode();
      hud.showBanner(next === 'cockpit' ? '3D COCKPIT VIEW' : 'CHASE VIEW', 'info', 1.8);
    },
    onToggleGear: () => {
      audio.unlock();
      if (!flightState.gearIntact) {
        hud.showBanner('LANDING GEAR DAMAGED', 'danger', 2.2);
        return;
      }
      flightState.gearDown = !flightState.gearDown;
      audio.playClick();
      hud.showBanner(flightState.gearDown ? 'LANDING GEAR DOWN & LOCKED' : 'LANDING GEAR RETRACTED', 'info', 2.0);
    },
    onCycleFlaps: () => {
      audio.unlock();
      flightState.flapStage = (flightState.flapStage + 1) % 3;
      audio.playClick();
      hud.showBanner(`FLAPS ${[0, 15, 30][flightState.flapStage]}°`, 'info', 1.8);
    },
    onSupplyDrop: () => {
      audio.unlock();
      const res = missionManager.triggerSupplyDrop(flightState);
      if (res.dropped) {
        if (res.hit) audio.playRingChime();
        else audio.playClick();
        hud.showBanner(res.message, res.hit ? 'good' : 'warn', 3.4);
      }
    },
    onRestart: () => {
      audio.unlock();
      audio.playClick();
      startMission(currentMissionIndex, true);
    },
    onToggleMute: () => {
      const m = audio.toggleMute();
      hud.showBanner(m ? 'AUDIO MUTED' : 'AUDIO ENABLED', 'info', 1.5);
    },
    onToggleBriefing: () => {
      if (briefingDialog.open) {
        briefingDialog.close();
      } else {
        paused = true;
        briefingDialog.showModal();
      }
    },
    onSelectMission: (idx) => {
      audio.unlock();
      audio.playClick();
      startMission(idx, true);
    },
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Check deterministic ?shot= showcase mode for real browser screenshots
  const params = new URLSearchParams(window.location.search);
  const shotName = params.get('shot');
  if (shotName) {
    const applied = applyShotPreset(shotName, {
      flightState,
      missionManager,
      world,
      aircraft,
      cockpit,
      cameraRig,
      hud,
    });
    if (applied) {
      const mission = missionManager.getActiveMission();
      renderer.render(scene, camera);
      hud.renderHud(flightState, missionManager.getMissionSummary(), mission.wind, cameraRig.getMode(), 0);
      window.__GARUDA_READY__ = true;
      return;
    }
  }

  // Normal interactive play boot
  startMission(0, false);

  let lastTs = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
    lastTs = now;

    const mission = missionManager.getActiveMission();

    if (!paused) {
      simTime += dt;
      const input = controls.sampleControls();
      stepFlightPhysics(flightState, input, dt, mission.wind, {
        onTouchdown: (info) => {
          aircraft.spawnTouchdownPuff(flightState.position, info.hard);
          audio.playTouchdown(info.hard);
          if (info.gearUp) {
            hud.showBanner('GEAR-UP BELLY SCRAPE — HULL DAMAGED!', 'danger', 3.5);
          } else if (info.hard) {
            hud.showBanner(`HARD TOUCHDOWN (-${info.sinkMps.toFixed(1)} m/s) — APPLY BRAKES [B]`, 'warn', 3.2);
          } else {
            hud.showBanner(`SMOOTH TOUCHDOWN (-${info.sinkMps.toFixed(1)} m/s) — HOLD [B] TO STOP`, 'good', 3.2);
          }
        },
        onFullStop: (report) => {
          audio.playRingChime();
          hud.showBanner(report.title, 'good', 5.0);
        },
        onCrash: (report) => {
          aircraft.spawnTouchdownPuff(flightState.position, true);
          audio.playCrash();
          hud.showBanner(report.title, 'danger', 5.0);
        },
      });

      missionManager.updateMission(dt, simTime, flightState, (kind, msg) => {
        if (kind === 'ring' || kind === 'drop') audio.playRingChime();
        hud.showBanner(msg, 'good', 3.0);
      });

      world.updateWorld(dt, simTime, flightState.position, mission.wind);
      const isCockpit = cameraRig.getMode() === 'cockpit';
      aircraft.updateAircraftModel(flightState, dt, simTime, !isCockpit);
      cameraRig.updateCamera(flightState, dt, false);

      const summary = missionManager.getMissionSummary();
      const wp = summary.waypoint;
      const wpBearing = wp
        ? ((Math.atan2(wp.x - flightState.position.x, -(wp.z - flightState.position.z)) * 180) / Math.PI + 360) % 360
        : NaN;
      cockpit.updateCockpit(flightState, wpBearing, isCockpit);
      audio.updateAudio(flightState, simTime);
      hud.renderHud(flightState, summary, mission.wind, cameraRig.getMode(), dt);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  window.__GARUDA_READY__ = true;
  requestAnimationFrame(frame);
}

bootGaruda();
