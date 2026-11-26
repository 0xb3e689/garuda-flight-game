// Four focused flight sorties with live step-by-step objective tracking, 3D target rings,
// vertical objective beacon pillars, supply drop parachutes, and mission-complete detection.

import * as THREE from 'three';
import { LANDMARKS, RUNWAYS } from './config.js';
import { sampleTerrainHeight } from './terrain-world.js';

export const MISSIONS = [
  {
    id: 'lighthouse-mail',
    number: 1,
    name: 'Lighthouse Mail',
    shortTag: 'M1 · MAIL',
    atmosphere: 'golden',
    wind: new THREE.Vector3(2.8, 0, 1.2),
    windDesc: '06 kt WSW',
    goal: 'Fly all 5 coastal rings, then land & stop on RWY 36.',
    summary: 'Fly through 5 orange gates past the suspension bridge and lighthouse, then touch down and brake to a stop on Merpati Strip RWY 36.',
    radioIntro: 'Merpati Tower: Garuda 4, cleared coastal mail run. Fly all 5 orange gates, then land Runway 36.',
    spawn: {
      x: 24,
      y: 118,
      z: 920,
      headingDeg: 358,
      pitchDeg: -2,
      rollDeg: 0,
      speedKts: 118,
      throttle: 0.68,
      flapStage: 1,
      gearDown: true,
      fuelPct: 84,
      hullPct: 100,
      engineHealth: 100,
    },
    targetRunwayId: 'RWY36',
    rings: [
      { x: 0, y: 82, z: 540, headingDeg: 0, radius: 24, label: 'GATE 1' },
      { x: 0, y: 48, z: 240, headingDeg: 0, radius: 22, label: 'GATE 2' },
      { x: 220, y: 95, z: -260, headingDeg: 55, radius: 26, label: 'GATE 3' },
      { x: 650, y: 82, z: -340, headingDeg: 90, radius: 26, label: 'BRIDGE GATE 4' },
      { x: 420, y: 115, z: 240, headingDeg: 215, radius: 26, label: 'LIGHTHOUSE GATE 5' },
    ],
    dropZone: null,
  },
  {
    id: 'caldera-drop',
    number: 2,
    name: 'Caldera Drop',
    shortTag: 'M2 · CALDERA',
    atmosphere: 'golden',
    wind: new THREE.Vector3(5.4, 0, -2.5),
    windDesc: '12 kt RIDGE',
    goal: 'Clear 3 canyon rings, drop cargo [SPACE] on flare, land RWY 36.',
    summary: 'Thread 3 mountain canyon gates on 44% fuel, press SPACE over the Caldera smoke flare to drop supplies, then glide home to RWY 36.',
    radioIntro: 'Garuda Ops: Fuel is 44 percent. Clear 3 caldera gates, drop cargo over the orange flare, and return to Runway 36.',
    spawn: {
      x: -480,
      y: 300,
      z: -840,
      headingDeg: 316,
      pitchDeg: -1,
      rollDeg: 0,
      speedKts: 124,
      throttle: 0.72,
      flapStage: 0,
      gearDown: false,
      fuelPct: 44,
      hullPct: 92,
      engineHealth: 95,
    },
    targetRunwayId: 'RWY36',
    rings: [
      { x: -720, y: 288, z: -1120, headingDeg: 316, radius: 25, label: 'CANYON GATE 1' },
      { x: -890, y: 296, z: -1300, headingDeg: 315, radius: 24, label: 'CLEFT GATE 2' },
      { x: -1020, y: 298, z: -1440, headingDeg: 300, radius: 28, label: 'CALDERA GATE 3' },
    ],
    dropZone: {
      x: LANDMARKS.calderaCenter.dropX,
      z: LANDMARKS.calderaCenter.dropZ,
      radius: 105,
      maxAgl: 125,
      label: 'CALDERA FLARE',
    },
  },
  {
    id: 'cliff-crosswind',
    number: 3,
    name: 'Cliff Crosswind',
    shortTag: 'M3 · CLIFF',
    atmosphere: 'dusk',
    wind: new THREE.Vector3(1.8, 0, 9.2),
    windDesc: '18 kt X-WIND',
    goal: 'Clear 2 approach rings in 18 kt crosswind & land on RWY 09.',
    summary: 'Hold centerline through 2 dusk approach gates against an 18 kt crosswind and land safely on cliffside RWY 09.',
    radioIntro: 'Karang Tower: Strong 18 knot crosswind across Runway 09. Fly both approach gates and crab into the wind.',
    spawn: {
      x: 540,
      y: 122,
      z: -1260,
      headingDeg: 90,
      pitchDeg: -2,
      rollDeg: 0,
      speedKts: 94,
      throttle: 0.48,
      flapStage: 2,
      gearDown: true,
      fuelPct: 58,
      hullPct: 100,
      engineHealth: 100,
    },
    targetRunwayId: 'RWY09',
    rings: [
      { x: 760, y: 102, z: -1250, headingDeg: 90, radius: 24, label: 'APPROACH GATE 1' },
      { x: 940, y: 84, z: -1250, headingDeg: 90, radius: 22, label: 'FINAL GATE 2' },
    ],
    dropZone: null,
  },
  {
    id: 'storm-rescue',
    number: 4,
    name: 'Storm Rescue',
    shortTag: 'M4 · RESCUE',
    atmosphere: 'storm',
    wind: new THREE.Vector3(10.5, 0, 6.2),
    windDesc: '24 kt STORM',
    goal: 'Clear 2 rings, drop rafts [SPACE] on ship, divert to RWY 04.',
    summary: 'Fly through 2 storm gates with a damaged engine, drop rescue rafts [SPACE] over the burning vessel, then make an emergency landing on RWY 04.',
    radioIntro: 'Coast Guard SAR: Burning vessel ahead in 24 knot storm! Clear 2 gates, drop rafts on target, then divert to Shoal Runway 04.',
    spawn: {
      x: -1480,
      y: 135,
      z: 340,
      headingDeg: 138,
      pitchDeg: -2,
      rollDeg: 0,
      speedKts: 112,
      throttle: 0.78,
      flapStage: 1,
      gearDown: false,
      fuelPct: 34,
      hullPct: 62,
      engineHealth: 66,
    },
    targetRunwayId: 'RWY04',
    rings: [
      { x: -1310, y: 92, z: 525, headingDeg: 138, radius: 26, label: 'SHOAL GATE 1' },
      { x: -1180, y: 58, z: 680, headingDeg: 135, radius: 28, label: 'SHIP PASS GATE 2' },
    ],
    dropZone: {
      x: LANDMARKS.rescueVessel.x,
      z: LANDMARKS.rescueVessel.z,
      radius: 120,
      maxAgl: 115,
      label: 'RESCUE VESSEL',
    },
  },
];

export function createMissionManager(scene) {
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  const dropCrateGroup = new THREE.Group();
  scene.add(dropCrateGroup);

  // Translucent vertical light beacon pillar marking the current mission objective from afar
  const beaconMat = new THREE.MeshBasicMaterial({
    color: '#ffaa2b',
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beaconPillar = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 9.0, 260, 12, 1, true), beaconMat);
  scene.add(beaconPillar);

  let activeMission = MISSIONS[0];
  let ringMeshes = [];
  let nextRingIndex = 0;
  let ringsCleared = 0;
  let dropCompleted = false;
  let score = 0;
  let landedOnTarget = false;
  let fallingCrates = [];

  function buildRingMesh(ring, idx) {
    const g = new THREE.Group();
    g.position.set(ring.x, ring.y, ring.z);
    g.rotation.y = (-ring.headingDeg * Math.PI) / 180;

    const torusMat = new THREE.MeshStandardMaterial({
      color: '#ff9d2e',
      emissive: '#ff7b00',
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.4,
    });
    g.add(new THREE.Mesh(new THREE.TorusGeometry(ring.radius, 1.15, 12, 36), torusMat));

    const innerMat = new THREE.MeshBasicMaterial({
      color: '#fff2b2',
      transparent: true,
      opacity: 0.78,
    });
    g.add(new THREE.Mesh(new THREE.TorusGeometry(ring.radius - 1.6, 0.35, 8, 36), innerMat));

    const finGeo = new THREE.ConeGeometry(2.1, 5.2, 4);
    const finMat = new THREE.MeshBasicMaterial({ color: '#38f2d4' });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(Math.cos(a) * (ring.radius + 2.8), Math.sin(a) * (ring.radius + 2.8), 0);
      fin.rotation.z = a + Math.PI / 2;
      g.add(fin);
    }

    g.userData = { index: idx, torusMat, innerMat, ring };
    return g;
  }

  function loadMission(missionIndex) {
    activeMission = MISSIONS[missionIndex] ?? MISSIONS[0];
    nextRingIndex = 0;
    ringsCleared = 0;
    dropCompleted = !activeMission.dropZone;
    score = 0;
    landedOnTarget = false;

    while (ringGroup.children.length) ringGroup.remove(ringGroup.children[0]);
    while (dropCrateGroup.children.length) dropCrateGroup.remove(dropCrateGroup.children[0]);
    fallingCrates = [];

    ringMeshes = activeMission.rings.map((r, i) => {
      const m = buildRingMesh(r, i);
      ringGroup.add(m);
      return m;
    });
    refreshRingColors();
    syncBeacon();
    return activeMission;
  }

  function refreshRingColors() {
    for (let i = 0; i < ringMeshes.length; i++) {
      const m = ringMeshes[i];
      const { torusMat, innerMat } = m.userData;
      if (i < nextRingIndex) {
        m.visible = false;
      } else if (i === nextRingIndex) {
        m.visible = true;
        torusMat.color.set('#ffaa2b');
        torusMat.emissive.set('#ff6f00');
        torusMat.emissiveIntensity = 0.85;
        innerMat.color.set('#fff6c7');
        innerMat.opacity = 0.9;
      } else {
        m.visible = true;
        torusMat.color.set('#22b8cf');
        torusMat.emissive.set('#0c8599');
        torusMat.emissiveIntensity = 0.35;
        innerMat.color.set('#a5f3fc');
        innerMat.opacity = 0.4;
      }
    }
  }

  function getActiveWaypoint() {
    if (nextRingIndex < activeMission.rings.length) {
      const r = activeMission.rings[nextRingIndex];
      return { x: r.x, y: r.y, z: r.z, label: r.label, kind: 'ring' };
    }
    if (activeMission.dropZone && !dropCompleted) {
      const dz = activeMission.dropZone;
      const y = Math.max(40, sampleTerrainHeight(dz.x, dz.z) + 45);
      return { x: dz.x, y, z: dz.z, label: `DROP · ${dz.label}`, kind: 'drop' };
    }
    const rwy = RUNWAYS.find((r) => r.id === activeMission.targetRunwayId) ?? RUNWAYS[0];
    return { x: rwy.x, y: rwy.elevation + 10, z: rwy.z, label: `LAND ${rwy.id}`, kind: 'runway' };
  }

  function syncBeacon() {
    const wp = getActiveWaypoint();
    if (!wp || landedOnTarget) {
      beaconPillar.visible = false;
      return;
    }
    beaconPillar.visible = true;
    beaconPillar.position.set(wp.x, wp.y + 95, wp.z);
    beaconMat.color.set(wp.kind === 'runway' ? '#38f2d4' : wp.kind === 'drop' ? '#ff6b2b' : '#ffaa2b');
  }

  function triggerSupplyDrop(flightState) {
    if (!activeMission.dropZone || dropCompleted) return { dropped: false, hit: false };
    const dz = activeMission.dropZone;
    const dist = Math.hypot(flightState.position.x - dz.x, flightState.position.z - dz.z);

    const crate = new THREE.Group();
    crate.position.copy(flightState.position).add(new THREE.Vector3(0, -3, 0));
    crate.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), new THREE.MeshStandardMaterial({ color: '#ff6b2b', roughness: 0.55 })));
    const chute = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: '#fff8ec', side: THREE.DoubleSide }),
    );
    chute.position.y = 6.2;
    crate.add(chute);
    dropCrateGroup.add(crate);
    fallingCrates.push({ mesh: crate, vy: -9 });

    if (dist <= dz.radius * 1.4 && flightState.aglM <= dz.maxAgl + 40) {
      dropCompleted = true;
      score += 400;
      syncBeacon();
      return { dropped: true, hit: true, message: `CARGO DELIVERED (+400) — LAND ${activeMission.targetRunwayId}` };
    }
    return { dropped: true, hit: false, message: `DROP MISSED (${Math.round(dist)}m) — ALIGN OVER FLARE` };
  }

  function updateMission(dt, timeSec, flightState, onEvent) {
    for (let i = nextRingIndex; i < ringMeshes.length; i++) {
      const m = ringMeshes[i];
      if (!m.visible) continue;
      const scale = i === nextRingIndex ? 1 + Math.sin(timeSec * 4.5) * 0.035 : 1;
      m.scale.setScalar(scale);
    }

    if (beaconPillar.visible) {
      beaconMat.opacity = 0.14 + Math.sin(timeSec * 3.2) * 0.05;
    }

    if (nextRingIndex < activeMission.rings.length) {
      const target = activeMission.rings[nextRingIndex];
      const dist = Math.hypot(
        flightState.position.x - target.x,
        flightState.position.y - target.y,
        flightState.position.z - target.z,
      );
      if (dist <= target.radius + 9) {
        ringsCleared += 1;
        score += 200;
        nextRingIndex += 1;
        refreshRingColors();
        syncBeacon();
        const nextWp = getActiveWaypoint();
        onEvent?.('ring', `GATE ${ringsCleared}/${activeMission.rings.length} (+200) → ${nextWp.label}`);
      }
    }

    if (activeMission.dropZone && !dropCompleted) {
      const dz = activeMission.dropZone;
      const dist = Math.hypot(flightState.position.x - dz.x, flightState.position.z - dz.z);
      if (dist <= dz.radius * 0.68 && flightState.aglM <= dz.maxAgl) {
        const res = triggerSupplyDrop(flightState);
        if (res.hit) onEvent?.('drop', res.message);
      }
    }

    for (const c of fallingCrates) {
      const gy = Math.max(0, sampleTerrainHeight(c.mesh.position.x, c.mesh.position.z));
      if (c.mesh.position.y > gy + 1.2) {
        c.mesh.position.y = Math.max(gy + 1.2, c.mesh.position.y + c.vy * dt);
      }
    }

    if (flightState.status === 'landed' && !landedOnTarget) {
      const allRings = ringsCleared >= activeMission.rings.length;
      const correctRwy = flightState.incidentReport?.runwayId === activeMission.targetRunwayId;
      landedOnTarget = true;
      syncBeacon();
      const bonus = (allRings && dropCompleted && correctRwy ? 600 : 250) + Math.round(flightState.fuelPct * 2 + flightState.hullPct * 2);
      score += bonus;
      if (allRings && dropCompleted && correctRwy && flightState.incidentReport) {
        flightState.incidentReport.title = `MISSION ${activeMission.number} COMPLETE`;
        flightState.incidentReport.missionComplete = true;
      }
    }
  }

  function getObjectives(flightState) {
    const list = [];
    const gatesDone = ringsCleared >= activeMission.rings.length;
    list.push({
      label: `Gates (${ringsCleared}/${activeMission.rings.length})`,
      done: gatesDone,
      active: !gatesDone,
    });
    if (activeMission.dropZone) {
      const dz = activeMission.dropZone;
      const dist = Math.round(Math.hypot(flightState.position.x - dz.x, flightState.position.z - dz.z));
      const inRange = dist <= dz.radius * 1.4 && flightState.aglM <= dz.maxAgl + 40;
      list.push({
        label: inRange && !dropCompleted ? 'DROP NOW [SPACE]' : `Drop cargo · ${dz.label}`,
        done: dropCompleted,
        active: gatesDone && !dropCompleted,
      });
    }
    list.push({
      label: `Land & stop on ${activeMission.targetRunwayId}`,
      done: landedOnTarget,
      active: gatesDone && dropCompleted && !landedOnTarget,
    });
    return list;
  }

  function getMissionSummary(flightState = null) {
    return {
      mission: activeMission,
      ringsCleared,
      ringsTotal: activeMission.rings.length,
      dropCompleted,
      hasDrop: Boolean(activeMission.dropZone),
      missionComplete: landedOnTarget && ringsCleared >= activeMission.rings.length && dropCompleted,
      score,
      waypoint: getActiveWaypoint(),
      objectives: flightState ? getObjectives(flightState) : [],
    };
  }

  function setShowcaseProgress(clearedCount, pts) {
    ringsCleared = Math.min(activeMission.rings.length, clearedCount);
    nextRingIndex = ringsCleared;
    score = pts;
    refreshRingColors();
    syncBeacon();
  }

  function spawnShowcaseParachute(x, y, z) {
    const crate = new THREE.Group();
    crate.position.set(x, y, z);
    crate.add(new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 2.8), new THREE.MeshStandardMaterial({ color: '#ff6b2b', roughness: 0.5 })));
    const chute = new THREE.Mesh(
      new THREE.SphereGeometry(6.2, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: '#fff8ec', side: THREE.DoubleSide, roughness: 0.65 }),
    );
    chute.position.y = 7.4;
    crate.add(chute);
    const cordMat = new THREE.LineBasicMaterial({ color: '#dbe4ec' });
    for (const [cx, cz] of [
      [-4.2, -2.5],
      [4.2, -2.5],
      [-4.2, 2.5],
      [4.2, 2.5],
    ]) {
      crate.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(cx, 7.2, cz)]),
          cordMat,
        ),
      );
    }
    dropCrateGroup.add(crate);
  }

  return {
    loadMission,
    updateMission,
    triggerSupplyDrop,
    getMissionSummary,
    setShowcaseProgress,
    spawnShowcaseParachute,
    getActiveMission: () => activeMission,
  };
}
