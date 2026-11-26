// Main bootstrap, shadowed render loop, ESC pause/mission menu controller, and live flight simulation.

import * as THREE from 'three';
import { createAircraftModel } from './aircraft-model.js';
import { createAudioEngine } from './audio-engine.js';
import { createCameraRig } from './camera-rig.js';
import { createCockpitInterior } from './cockpit-interior.js';
import { createEffectsSystem } from './effects-particles.js';
import { createFlightState, resetFlightState, stepFlightPhysics } from './flight-physics.js';
import { createHudInstruments } from './hud-instruments.js';
import { createInputControls } from './input-controls.js';
import { createMissionManager, MISSIONS } from './missions.js';
import { applyShotPreset } from './shots.js';
import { createArchipelagoWorld, sampleTerrainHeight } from './terrain-world.js';

function bootGaruda() {
  const glCanvas = document.getElementById('flight-canvas');
  const hudCanvas = document.getElementById('hud-canvas');
  const briefingDialog = document.getElementById('briefing-dialog');
  const pauseDialog = document.getElementById('pause-dialog');
  const missionListEl = document.getElementById('mission-list');

  const renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.25, 24000);

  const world = createArchipelagoWorld(scene);
  const aircraft = createAircraftModel(scene);
  const cockpit = createCockpitInterior(aircraft.root);
  const effects = createEffectsSystem(scene);
  const cameraRig = createCameraRig(camera);
  const missionManager = createMissionManager(scene);
  const flightState = createFlightState();
  const hud = createHudInstruments(hudCanvas);
  const audio = createAudioEngine();

  const WEATHER_ORDER = ['golden', 'dusk', 'rain', 'storm'];
  const WEATHER_LABELS = { golden: 'CLEAR', dusk: 'DUSK', rain: 'RAIN', storm: 'STORM' };
  let activeWeather = 'golden';
  let currentMissionIndex = 0;
  let paused = false;
  let simTime = 0;

  function rainLevelFor(weather) {
    return weather === 'storm' ? 1.0 : weather === 'rain' ? 0.6 : 0;
  }

  function applyWeather(preset, notify = false) {
    activeWeather = preset;
    world.setAtmospherePreset(preset);
    const wBtn = document.getElementById('weather-btn');
    if (wBtn) wBtn.textContent = `SKY: ${WEATHER_LABELS[preset]} [V]`;
    if (notify) {
      const wiperNote = rainLevelFor(preset) > 0 ? ' · WIPERS AUTO' : '';
      hud.showBanner(`WEATHER: ${WEATHER_LABELS[preset]}${wiperNote}`, 'info', 2.0);
    }
  }

  function renderMissionButtons() {
    missionListEl.innerHTML = '';
    for (let i = 0; i < MISSIONS.length; i++) {
      const m = MISSIONS[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `mission-card${i === currentMissionIndex ? ' active' : ''}`;
      btn.innerHTML = `
        <span class="mission-badge">${m.shortTag} · ${m.windDesc} · TARGET ${m.targetRunwayId}</span>
        <strong>${m.name}</strong>
        <span class="mission-desc"><b>Goal:</b> ${m.goal}</span>
        <span class="mission-desc">${m.summary}</span>
      `;
      btn.addEventListener('click', () => {
        audio.unlock();
        audio.playClick();
        startMission(i, true);
      });
      missionListEl.appendChild(btn);
    }
  }

  function setPaused(nextPaused) {
    paused = nextPaused;
    if (paused) {
      controls.clearKeys();
      renderMissionButtons();
      if (!pauseDialog.open) pauseDialog.showModal();
    } else if (pauseDialog.open) {
      pauseDialog.close('resume');
    }
  }

  function triggerRadio(text, urgent = false) {
    hud.showRadioMessage(text, urgent ? 5.6 : 4.8);
    audio.playRadioCall(text, urgent);
  }

  function startMission(index, closeModal = true, announceRadio = true) {
    currentMissionIndex = index % MISSIONS.length;
    const mission = missionManager.loadMission(currentMissionIndex);
    applyWeather(mission.atmosphere, false);
    effects.clearDebris();
    resetFlightState(flightState, mission.spawn);
    cameraRig.setChaseLateralBias(0);
    cameraRig.setMode('chase');
    cameraRig.updateCamera(flightState, 0.016, true);
    hud.showBanner(`M${mission.number}: ${mission.name.toUpperCase()}`, 'info', 2.8);
    if (announceRadio && mission.radioIntro) {
      triggerRadio(mission.radioIntro, false);
    }
    if (closeModal && pauseDialog.open) {
      pauseDialog.close('launch');
    }
    if (closeModal && briefingDialog && briefingDialog.open) {
      briefingDialog.close('launch');
    }
    paused = false;
  }

  function openOnboardingBriefing() {
    if (!briefingDialog) return;
    const m = MISSIONS[currentMissionIndex];
    const titleEl = document.getElementById('briefing-title');
    const goalEl = document.getElementById('briefing-goal');
    if (titleEl) titleEl.textContent = `M${m.number} · ${m.name.toUpperCase()} (${m.windDesc})`;
    if (goalEl) goalEl.textContent = `GOAL: ${m.summary}`;
    paused = true;
    controls.clearKeys();
    if (!briefingDialog.open) briefingDialog.showModal();
  }

  if (briefingDialog) {
    const closeBriefing = () => {
      audio.unlock();
      audio.playClick();
      if (briefingDialog.open) briefingDialog.close('launch');
      paused = false;
      const m = MISSIONS[currentMissionIndex];
      if (m?.radioIntro) triggerRadio(m.radioIntro, false);
    };
    document.getElementById('launch-btn')?.addEventListener('click', closeBriefing);
    briefingDialog.addEventListener('close', () => {
      paused = false;
    });
    briefingDialog.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        closeBriefing();
      }
    });
  }

  // Native <dialog> close & Escape cancel handling
  pauseDialog.addEventListener('close', () => {
    pauseDialog.returnValue = '';
    paused = false;
  });

  if (!('closedBy' in HTMLDialogElement.prototype)) {
    let pressedOutside = false;
    const isOutside = (e) => {
      const r = pauseDialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    pauseDialog.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e);
    });
    pauseDialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e)) pauseDialog.close();
    });
  }

  document.getElementById('resume-btn').addEventListener('click', () => {
    audio.unlock();
    setPaused(false);
  });

  document.getElementById('weather-btn').addEventListener('click', () => {
    audio.unlock();
    audio.playClick();
    const next = WEATHER_ORDER[(WEATHER_ORDER.indexOf(activeWeather) + 1) % WEATHER_ORDER.length];
    applyWeather(next, true);
  });

  document.getElementById('restart-btn').addEventListener('click', () => {
    audio.unlock();
    audio.playClick();
    startMission(currentMissionIndex, true);
  });

  document.getElementById('mute-btn').addEventListener('click', (e) => {
    audio.unlock();
    const muted = audio.toggleMute();
    e.currentTarget.textContent = muted ? 'AUDIO: OFF' : 'AUDIO: ON';
  });

  const controls = createInputControls(glCanvas, {
    onUserInteract: () => audio.unlock(),
    onTogglePause: () => setPaused(!paused),
    onToggleCamera: () => {
      if (paused) return;
      audio.unlock();
      audio.playClick();
      const next = cameraRig.toggleMode();
      hud.showBanner(next === 'cockpit' ? 'COCKPIT' : 'CHASE', 'info', 1.4);
    },
    onToggleGear: () => {
      if (paused) return;
      audio.unlock();
      if (!flightState.gearIntact) {
        hud.showBanner('GEAR DAMAGED', 'danger', 2.0);
        return;
      }
      flightState.gearDown = !flightState.gearDown;
      audio.playClick();
      hud.showBanner(flightState.gearDown ? 'GEAR DOWN' : 'GEAR UP', 'info', 1.6);
    },
    onCycleFlaps: () => {
      if (paused) return;
      audio.unlock();
      if (flightState.malfunctions?.flapJammed) {
        hud.showBanner('FLAPS JAMMED — HYDRAULIC DAMAGE', 'danger', 2.2);
        return;
      }
      flightState.flapStage = (flightState.flapStage + 1) % 3;
      audio.playClick();
      hud.showBanner(`FLAPS ${[0, 15, 30][flightState.flapStage]}°`, 'info', 1.6);
    },
    onCycleWeather: () => {
      audio.unlock();
      audio.playClick();
      const next = WEATHER_ORDER[(WEATHER_ORDER.indexOf(activeWeather) + 1) % WEATHER_ORDER.length];
      applyWeather(next, true);
    },
    onSupplyDrop: () => {
      if (paused) return;
      audio.unlock();
      const res = missionManager.triggerSupplyDrop(flightState);
      if (res.dropped) {
        if (res.hit) audio.playRingChime();
        else audio.playClick();
        hud.showBanner(res.message, res.hit ? 'good' : 'warn', 3.0);
      }
    },
    onRestart: () => {
      audio.unlock();
      audio.playClick();
      startMission(currentMissionIndex, true);
    },
    onToggleMute: () => {
      const m = audio.toggleMute();
      hud.showBanner(m ? 'MUTED' : 'AUDIO ON', 'info', 1.4);
    },
    onNextMission: () => {
      if (flightState.incidentReport?.missionComplete) {
        audio.unlock();
        audio.playClick();
        startMission((currentMissionIndex + 1) % MISSIONS.length, true);
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

  // Expose minimal debug hooks for automated playtesting
  window.__GARUDA_STATE__ = flightState;
  window.__GARUDA_AIRCRAFT__ = aircraft;

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
      effects,
      hud,
      camera,
    });
    if (applied) {
      const mission = missionManager.getActiveMission();
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
      hud.renderHud(flightState, missionManager.getMissionSummary(flightState), mission.wind, cameraRig.getMode(), 0, camera);
      window.__GARUDA_READY__ = true;
      return;
    }
  }

  renderMissionButtons();
  startMission(0, false, false);
  openOnboardingBriefing();

  let lastTs = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
    lastTs = now;

    const mission = missionManager.getActiveMission();

    if (!paused) {
      simTime += dt;
      const input = controls.sampleControls();
      stepFlightPhysics(
        flightState,
        input,
        dt,
        mission.wind,
        {
          onTouchdown: (info) => {
            effects.emitTouchdownSmoke(flightState.position, flightState.quaternion, info.hard);
            audio.playTouchdown(info.hard);
            if (info.gearUp) {
              hud.showBanner('GEAR-UP SCRAPE — HULL DAMAGED', 'danger', 3.0);
            } else if (info.hard) {
              hud.showBanner(`HARD TOUCHDOWN (-${info.sinkMps.toFixed(1)} m/s) · HOLD [B]`, 'warn', 2.8);
            } else {
              hud.showBanner(`TOUCHDOWN (-${info.sinkMps.toFixed(1)} m/s) · HOLD [B] TO STOP`, 'good', 2.8);
            }
          },
          onMalfunction: (fault) => {
            audio.playTouchdown(true);
            hud.showBanner(`MALFUNCTION: ${fault.code}`, 'danger', 3.4);
            triggerRadio(`Caution Garuda 4! ${fault.code}. ${fault.detail}`, true);
          },
          onFullStop: (report) => {
            audio.playRingChime();
            hud.showBanner(report.title, 'good', 4.0);
            triggerRadio(
              report.missionComplete
                ? 'Merpati Tower: Garuda 4, full stop confirmed. Mission complete, outstanding flying!'
                : 'Merpati Tower: Full stop confirmed. Note: remaining mission gates are still open.',
              false,
            );
          },
          onCrash: (report) => {
            const floorY = Math.max(0, sampleTerrainHeight(flightState.position.x, flightState.position.z));
            effects.emitRoaringFireBurst(
              flightState.position,
              flightState.quaternion,
              floorY,
              report.crashMode === 'water',
              report.severity || 'catastrophic',
            );
            if (report.crashMode !== 'water') {
              effects.emitTouchdownSmoke(flightState.position, flightState.quaternion, true);
            }
            audio.playCrash();
            hud.showBanner(report.title, 'danger', 4.5);
            triggerRadio(
              report.crashMode === 'water'
                ? 'SAR Dispatch: Garuda 4 down in the water! Coast Guard rescue boats deploying.'
                : report.severity === 'hard'
                  ? 'Tower: Garuda 4 hard impact on deck — crash trucks rolling, cut all fuel!'
                  : 'Mayday! Garuda 4 catastrophic impact — emergency rescue teams dispatched!',
              true,
            );
          },
        },
        world.checkObstacleCollision,
      );

      missionManager.updateMission(dt, simTime, flightState, (kind, msg) => {
        if (kind === 'ring' || kind === 'drop') audio.playRingChime();
        hud.showBanner(msg, 'good', 2.8);
        if (kind === 'drop') {
          triggerRadio('Ground Crew: Cargo on target! Great drop Garuda 4, proceed to landing runway.', false);
        }
      });

      const rainLevel = rainLevelFor(activeWeather);
      world.updateWorld(dt, simTime, flightState.position, mission.wind, flightState.quaternion);
      const isCockpit = cameraRig.getMode() === 'cockpit';
      aircraft.updateAircraftModel(flightState, dt, simTime, !isCockpit);
      cameraRig.updateCamera(flightState, dt, false);
      effects.updateEffects(dt, simTime, flightState, camera.position, rainLevel, isCockpit);

      const summary = missionManager.getMissionSummary(flightState);
      const wp = summary.waypoint;
      const wpBearing = wp
        ? ((Math.atan2(wp.x - flightState.position.x, -(wp.z - flightState.position.z)) * 180) / Math.PI + 360) % 360
        : NaN;
      cockpit.updateCockpit(flightState, wpBearing, isCockpit, false, simTime, rainLevel);
      audio.updateAudio(flightState, simTime);
      hud.renderHud(flightState, summary, mission.wind, cameraRig.getMode(), dt, camera);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  window.__GARUDA_READY__ = true;
  requestAnimationFrame(frame);
}

bootGaruda();
