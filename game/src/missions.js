// Four distinct archipelago sorties with aerial target rings, supply drop zones,
// crosswind approaches, fuel/damage risk decisions, and 3D waypoint markers.

import * as THREE from 'three';
import { LANDMARKS, RUNWAYS } from './config.js';
import { sampleTerrainHeight } from './terrain-world.js';

export const MISSIONS = [
  {
    id: 'lighthouse-mail',
    number: 1,
    name: 'Lighthouse Ring Mail',
    shortTag: 'M1 · COASTAL RINGS',
    atmosphere: 'golden',
    wind: new THREE.Vector3(2.8, 0, 1.2), // ~6 kt gentle breeze
    windDesc: '06 kt WSW',
    brief:
      'Fly the coastal mail circuit past Merpati Lighthouse and the Crimson Bridge, threading every aerial gate before touching down on RWY 36.',
    spawn: {
      x: 24,
      y: 118,
      z: 920,
      headingDeg: 358,
      pitchDeg: -3,
      rollDeg: -8,
      speedKts: 118,
      throttle: 0.66,
      flapStage: 1,
      gearDown: true,
      fuelPct: 84,
      hullPct: 100,
      engineHealth: 100,
    },
    targetRunwayId: 'RWY36',
    rings: [
      { x: 0, y: 84, z: 540, headingDeg: 0, radius: 22, label: 'GATE 01 · APPROACH' },
      { x: 0, y: 42, z: 260, headingDeg: 0, radius: 20, label: 'GATE 02 · FINAL RWY 36' },
      { x: 220, y: 95, z: -260, headingDeg: 55, radius: 24, label: 'GATE 03 · STRAIT TURN' },
      { x: 650, y: 82, z: -340, headingDeg: 90, radius: 24, label: 'GATE 04 · BRIDGE ARCH' },
      { x: 420, y: 120, z: 240, headingDeg: 215, radius: 24, label: 'GATE 05 · LIGHTHOUSE CAPE' },
    ],
    dropZone: null,
  },
  {
    id: 'caldera-drop',
    number: 2,
    name: 'Caldera Supply Drop',
    shortTag: 'M2 · CALDERA DROP',
    atmosphere: 'golden',
    wind: new THREE.Vector3(5.4, 0, -2.5), // ~12 kt ridge wind
    windDesc: '12 kt RIDGE',
    brief:
      'Thread Gunung Kawah canyon on 44% fuel reserve, press SPACE to release medical supplies over the caldera flare, and conserve fuel for return.',
    spawn: {
      x: -480,
      y: 265,
      z: -840,
      headingDeg: 316,
      pitchDeg: -2,
      rollDeg: 11,
      speedKts: 124,
      throttle: 0.74,
      flapStage: 0,
      gearDown: false,
      fuelPct: 44,
      hullPct: 92,
      engineHealth: 95,
    },
    targetRunwayId: 'RWY36',
    rings: [
      { x: -720, y: 248, z: -1120, headingDeg: 316, radius: 24, label: 'CANYON ENTRY' },
      { x: -890, y: 256, z: -1300, headingDeg: 315, radius: 23, label: 'BASALT CLEFTS' },
      { x: -1020, y: 265, z: -1440, headingDeg: 300, radius: 28, label: 'CALDERA DROP PASS' },
    ],
    dropZone: {
      x: LANDMARKS.calderaCenter.dropX,
      z: LANDMARKS.calderaCenter.dropZ,
      radius: 95,
      maxAgl: 115,
      label: 'CALDERA FLARE PAD',
    },
  },
  {
    id: 'cliff-crosswind',
    number: 3,
    name: 'Crosswind Cliff Strip',
    shortTag: 'M3 · CROSSWIND',
    atmosphere: 'dusk',
    wind: new THREE.Vector3(1.8, 0, 9.2), // ~18 kt crosswind across RWY09
    windDesc: '18 kt X-WIND',
    brief:
      'Crab into an 18 kt dusk crosswind along Tanjung Karang ridge and stick a short-field landing on elevated Cliff Strip RWY 09.',
    spawn: {
      x: 540,
      y: 122,
      z: -1260,
      headingDeg: 90,
      pitchDeg: -3,
      rollDeg: 3,
      speedKts: 92,
      throttle: 0.48,
      flapStage: 2,
      gearDown: true,
      fuelPct: 58,
      hullPct: 100,
      engineHealth: 100,
    },
    targetRunwayId: 'RWY09',
    rings: [
      { x: 760, y: 102, z: -1250, headingDeg: 90, radius: 22, label: 'CLIFF FINAL GATE' },
      { x: 940, y: 84, z: -1250, headingDeg: 90, radius: 19, label: 'THRESHOLD RWY 09' },
    ],
    dropZone: null,
  },
  {
    id: 'storm-rescue',
    number: 4,
    name: 'Storm Sea Rescue',
    shortTag: 'M4 · STORM RESCUE',
    atmosphere: 'storm',
    wind: new THREE.Vector3(10.5, 0, 6.2), // ~24 kt storm gusts
    windDesc: '24 kt STORM',
    brief:
      'With starboard engine wear and 34% fuel, drop rescue rafts over the stranded vessel in Karang Shoal and divert to Shoal Strip RWY 04.',
    spawn: {
      x: -1480,
      y: 135,
      z: 340,
      headingDeg: 138,
      pitchDeg: -2,
      rollDeg: -7,
      speedKts: 110,
      throttle: 0.78,
      flapStage: 1,
      gearDown: false,
      fuelPct: 34,
      hullPct: 62,
      engineHealth: 66,
    },
    targetRunwayId: 'RWY04',
    rings: [
      { x: -1310, y: 92, z: 525, headingDeg: 138, radius: 24, label: 'SHOAL DISTRESS GATE' },
      { x: -1180, y: 58, z: 680, headingDeg: 135, radius: 26, label: 'RESCUE DROP PASS' },
    ],
    dropZone: {
      x: LANDMARKS.rescueVessel.x,
      z: LANDMARKS.rescueVessel.z,
      radius: 110,
      maxAgl: 110,
      label: 'STRANDED VESSEL',
    },
  },
];

export function createMissionManager(scene) {
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  const dropCrateGroup = new THREE.Group();
  scene.add(dropCrateGroup);

  let activeMission = MISSIONS[0];
  let ringMeshes = [];
  let nextRingIndex = 0;
  let ringsCleared = 0;
  let dropCompleted = false;
  let score = 0;
  let landedBonus = false;
  let fallingCrates = [];

  function buildRingMesh(ring, idx) {
    const g = new THREE.Group();
    g.position.set(ring.x, ring.y, ring.z);
    g.rotation.y = (-ring.headingDeg * Math.PI) / 180;

    // Outer structural frame ring (golden-amber active, teal upcoming)
    const torusMat = new THREE.MeshStandardMaterial({
      color: '#ff9d2e',
      emissive: '#ff7b00',
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.4,
    });
    const outer = new THREE.Mesh(new THREE.TorusGeometry(ring.radius, 1.15, 12, 36), torusMat);
    g.add(outer);

    // Inner bright guide ring
    const innerMat = new THREE.MeshBasicMaterial({
      color: '#fff2b2',
      transparent: true,
      opacity: 0.78,
    });
    const inner = new THREE.Mesh(new THREE.TorusGeometry(ring.radius - 1.6, 0.35, 8, 36), innerMat);
    g.add(inner);

    // 4 directional chevron fins around the ring
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
    landedBonus = false;

    while (ringGroup.children.length) ringGroup.remove(ringGroup.children[0]);
    while (dropCrateGroup.children.length) dropCrateGroup.remove(dropCrateGroup.children[0]);
    fallingCrates = [];

    ringMeshes = activeMission.rings.map((r, i) => {
      const m = buildRingMesh(r, i);
      ringGroup.add(m);
      return m;
    });
    refreshRingColors();
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

  function triggerSupplyDrop(flightState) {
    if (!activeMission.dropZone || dropCompleted) return { dropped: false, hit: false };
    const dz = activeMission.dropZone;
    const dist = Math.hypot(flightState.position.x - dz.x, flightState.position.z - dz.z);

    // Spawn visible parachute supply crate
    const crate = new THREE.Group();
    crate.position.copy(flightState.position).add(new THREE.Vector3(0, -3, 0));
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.2, 2.2),
      new THREE.MeshStandardMaterial({ color: '#ff6b2b', roughness: 0.6 }),
    );
    crate.add(box);
    const chute = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', side: THREE.DoubleSide }),
    );
    chute.position.y = 5.2;
    crate.add(chute);
    dropCrateGroup.add(crate);
    fallingCrates.push({ mesh: crate, vy: -9 });

    if (dist <= dz.radius * 1.35 && flightState.aglM <= dz.maxAgl + 35) {
      dropCompleted = true;
      score += 400;
      return { dropped: true, hit: true, message: `SUPPLY DROP CONFIRMED — ${dz.label} (+400)` };
    }
    return { dropped: true, hit: false, message: `DROP WIDE (${Math.round(dist)}m) — ALIGN OVER FLARE` };
  }

  function updateMission(dt, timeSec, flightState, onEvent) {
    // Subtle pulse on active ring
    for (let i = nextRingIndex; i < ringMeshes.length; i++) {
      const m = ringMeshes[i];
      if (!m.visible) continue;
      const scale = i === nextRingIndex ? 1 + Math.sin(timeSec * 4.5) * 0.035 : 1;
      m.scale.setScalar(scale);
    }

    // Check ring pass
    if (nextRingIndex < activeMission.rings.length) {
      const target = activeMission.rings[nextRingIndex];
      const dist = Math.hypot(
        flightState.position.x - target.x,
        flightState.position.y - target.y,
        flightState.position.z - target.z,
      );
      if (dist <= target.radius + 7) {
        ringsCleared += 1;
        score += 200;
        const clearedLabel = target.label;
        nextRingIndex += 1;
        refreshRingColors();
        onEvent?.('ring', `GATE CLEARED · ${clearedLabel} (+200)`);
      }
    }

    // Auto-drop assist if flying right over drop zone low enough
    if (activeMission.dropZone && !dropCompleted) {
      const dz = activeMission.dropZone;
      const dist = Math.hypot(flightState.position.x - dz.x, flightState.position.z - dz.z);
      if (dist <= dz.radius * 0.65 && flightState.aglM <= dz.maxAgl) {
        const res = triggerSupplyDrop(flightState);
        if (res.hit) onEvent?.('drop', res.message);
      }
    }

    // Update falling parachute crates
    for (const c of fallingCrates) {
      const gy = Math.max(0, sampleTerrainHeight(c.mesh.position.x, c.mesh.position.z));
      if (c.mesh.position.y > gy + 1.2) {
        c.mesh.position.y = Math.max(gy + 1.2, c.mesh.position.y + c.vy * dt);
      }
    }

    if (flightState.status === 'landed' && !landedBonus) {
      landedBonus = true;
      score += 500 + Math.round(flightState.fuelPct * 2 + flightState.hullPct * 2);
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
    return { x: rwy.x, y: rwy.elevation + 10, z: rwy.z, label: `LAND · ${rwy.id}`, kind: 'runway' };
  }

  function getMissionSummary() {
    return {
      mission: activeMission,
      ringsCleared,
      ringsTotal: activeMission.rings.length,
      dropCompleted,
      hasDrop: Boolean(activeMission.dropZone),
      score,
      waypoint: getActiveWaypoint(),
    };
  }

  function setShowcaseProgress(clearedCount, pts) {
    ringsCleared = Math.min(activeMission.rings.length, clearedCount);
    nextRingIndex = ringsCleared;
    score = pts;
    refreshRingColors();
  }

  return {
    loadMission,
    updateMission,
    triggerSupplyDrop,
    getMissionSummary,
    setShowcaseProgress,
    getActiveMission: () => activeMission,
  };
}
