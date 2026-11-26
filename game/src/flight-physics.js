// Newtonian 6-DOF aerodynamics (ISA altitude air density, aspect-ratio induced drag, lift/stall),
// 5-point airframe terrain & solid-obstacle collision (prevents tail/wing ground clipping),
// inelastic zero-bounce ground crash plowing, and quadratic hydro-drag water sinking.

import * as THREE from 'three';
import { AIRCRAFT_SPEC, FLAP_ANGLES, GRAVITY, MPS_TO_KTS, M_TO_FT, RUNWAYS } from './config.js';
import { getRunwayAt, sampleTerrainHeight, sampleTerrainNormal, sampleThermalLift } from './terrain-world.js';

const FORWARD_LOCAL = new THREE.Vector3(0, 0, -1);
const RIGHT_LOCAL = new THREE.Vector3(1, 0, 0);
const UP_LOCAL = new THREE.Vector3(0, 1, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Five rigid-body contact points on the Garuda G-4 airframe so nose, tail, and wingtips NEVER clip ground!
const AIRFRAME_PROBES = [
  { name: 'nose', local: new THREE.Vector3(0, -0.35, -5.3), radius: 1.0 },
  { name: 'tail', local: new THREE.Vector3(0, 0.25, 8.1), radius: 1.0 },
  { name: 'leftWing', local: new THREE.Vector3(-8.3, 1.5, -0.4), radius: 1.1 },
  { name: 'rightWing', local: new THREE.Vector3(8.3, 1.5, -0.4), radius: 1.1 },
  { name: 'belly', local: new THREE.Vector3(0, -1.25, -0.2), radius: 1.2 },
];

export function createFlightState() {
  return {
    position: new THREE.Vector3(0, 165, 920),
    velocity: new THREE.Vector3(0, -2, -62),
    quaternion: new THREE.Quaternion(),
    angularVel: new THREE.Vector3(0, 0, 0),
    throttle: 0.72,
    flapStage: 0,
    gearDown: true,
    brakes: false,
    fuelKg: AIRCRAFT_SPEC.fuelCapacityKg,
    fuelPct: 100,
    fuelRangeKm: 42.0,
    inThermal: false,
    hullPct: 100,
    engineHealth: 100,
    gearIntact: true,
    engineTempC: 540,
    propAngle: 0,
    propAngleLeft: 0,
    propRpm: 0.72,
    propRpmLeft: 0.72,
    airspeedMps: 62,
    airspeedKts: 120,
    altitudeM: 165,
    altitudeFt: 541,
    aglM: 150,
    headingDeg: 0,
    pitchDeg: 0,
    rollDeg: 0,
    vsiMps: 0,
    aoaDeg: 3.0,
    gLoad: 1.0,
    stalling: false,
    overspeed: false,
    lowFuel: false,
    onGround: false,
    status: 'flying', // 'flying' | 'landed' | 'crashed'
    crashMode: null, // 'ground' | 'water'
    crashSeverity: null, // 'hard' | 'catastrophic'
    crashImpactKts: 0,
    crashTime: 0,
    cameraShake: 0,
    touchdownTimer: 0,
    malfunctions: {
      leftEngineOut: false,
      fuelLeak: false,
      flapJammed: false,
      controlDamage: false,
      gearDamaged: false,
    },
    controlSurface: { aileron: 0, elevator: 0, rudder: 0, flaps: 0 },
    activeRunwayId: 'RWY36',
    papiGlideDeg: 4.5,
    papiWhiteCount: 2,
    incidentReport: null,
  };
}

export function resetFlightState(state, spawn) {
  state.position.set(spawn.x, spawn.y, spawn.z);
  const headingRad = (-spawn.headingDeg * Math.PI) / 180;
  const pitchRad = ((spawn.pitchDeg ?? 0) * Math.PI) / 180;
  const rollRad = ((spawn.rollDeg ?? 0) * Math.PI) / 180;
  const euler = new THREE.Euler(pitchRad, headingRad, rollRad, 'YXZ');
  state.quaternion.setFromEuler(euler);

  const forward = FORWARD_LOCAL.clone().applyQuaternion(state.quaternion);
  const speedMps = (spawn.speedKts ?? 115) / MPS_TO_KTS;
  state.velocity.copy(forward).multiplyScalar(speedMps);
  state.angularVel.set(0, 0, 0);

  state.throttle = spawn.throttle ?? 0.68;
  state.flapStage = spawn.flapStage ?? 0;
  state.gearDown = spawn.gearDown ?? false;
  state.brakes = false;
  state.fuelPct = spawn.fuelPct ?? 100;
  state.fuelKg = (state.fuelPct / 100) * AIRCRAFT_SPEC.fuelCapacityKg;
  state.hullPct = spawn.hullPct ?? 100;
  state.engineHealth = spawn.engineHealth ?? 100;
  state.gearIntact = true;
  state.engineTempC = 540;
  state.propRpm = Math.max(0.25, state.throttle);
  state.propRpmLeft = Math.max(0.25, state.throttle);
  state.onGround = Boolean(spawn.onGround);
  state.status = 'flying';
  state.crashMode = null;
  state.crashSeverity = null;
  state.crashImpactKts = 0;
  state.crashTime = 0;
  state.cameraShake = 0;
  state.touchdownTimer = 0;
  state.malfunctions = {
    leftEngineOut: false,
    fuelLeak: false,
    flapJammed: false,
    controlDamage: false,
    gearDamaged: false,
  };
  state.incidentReport = null;

  updateDerivedTelemetry(state, new THREE.Vector3(0, 0, 0));
}

function updateDerivedTelemetry(state, windVec) {
  const forward = FORWARD_LOCAL.clone().applyQuaternion(state.quaternion);
  const right = RIGHT_LOCAL.clone().applyQuaternion(state.quaternion);
  const up = UP_LOCAL.clone().applyQuaternion(state.quaternion);

  const airVel = state.velocity.clone().sub(windVec);
  const vForward = airVel.dot(forward);
  const vUp = airVel.dot(up);
  state.airspeedMps = Math.max(0, airVel.length());
  state.airspeedKts = state.airspeedMps * MPS_TO_KTS;
  state.aoaDeg = state.airspeedMps > 4 ? (Math.atan2(-vUp, Math.max(2, vForward)) * 180) / Math.PI : 0;

  // Gimbal-lock-free attitude telemetry directly from orthonormal basis vectors (never flips 180 deg at steep pitch!)
  const sinPitch = Math.max(-1, Math.min(1, forward.y));
  state.pitchDeg = (Math.asin(sinPitch) * 180) / Math.PI;
  state.rollDeg = (Math.atan2(right.y, up.y) * 180) / Math.PI;
  const horizLen = Math.hypot(forward.x, forward.z);
  if (horizLen > 0.02) {
    let hdg = ((Math.atan2(forward.x, -forward.z) * 180) / Math.PI) % 360;
    if (hdg < 0) hdg += 360;
    state.headingDeg = hdg;
  }

  state.altitudeM = Math.max(0, state.position.y);
  state.altitudeFt = state.altitudeM * M_TO_FT;
  const groundH = Math.max(0, sampleTerrainHeight(state.position.x, state.position.z));
  state.aglM = Math.max(0, state.position.y - groundH);
  state.vsiMps = state.velocity.y;
  state.fuelPct = Math.max(0, (state.fuelKg / AIRCRAFT_SPEC.fuelCapacityKg) * 100);
  const estBurn = Math.max(0.08, AIRCRAFT_SPEC.baseFuelBurnKgS * (0.18 + state.throttle * state.throttle));
  state.fuelRangeKm = ((state.fuelKg / estBurn) * Math.max(30, state.airspeedMps)) / 1000;
  state.lowFuel = state.fuelPct < 22;
  state.overspeed = state.airspeedKts > AIRCRAFT_SPEC.vneKts;

  let bestRwy = RUNWAYS[0];
  let bestDist = Infinity;
  for (const rwy of RUNWAYS) {
    const d = Math.hypot(state.position.x - rwy.x, state.position.z - rwy.z);
    if (d < bestDist) {
      bestDist = d;
      bestRwy = rwy;
    }
  }
  state.activeRunwayId = bestRwy.id;
  const rad = (bestRwy.headingDeg * Math.PI) / 180;
  const fx = Math.sin(rad);
  const fz = -Math.cos(rad);
  const along = (state.position.x - bestRwy.x) * fx + (state.position.z - bestRwy.z) * fz;
  const aimAlong = -bestRwy.papiOffset.along;
  const distAim = Math.max(15, aimAlong - along);
  const glideDeg = (Math.atan2(state.position.y - bestRwy.elevation, distAim) * 180) / Math.PI;
  state.papiGlideDeg = glideDeg;
  state.papiWhiteCount = [3.6, 4.4, 5.5, 6.4].filter((t) => glideDeg >= t).length;
}

function enforceAirframeAboveTerrain(state, minMargin = 0.45) {
  // Guarantees NO part of the aircraft (nose, tail, left wing, right wing, belly) ever clips into terrain!
  let maxPenetration = 0;
  const worldPt = new THREE.Vector3();
  for (const probe of AIRFRAME_PROBES) {
    worldPt.copy(probe.local).applyQuaternion(state.quaternion).add(state.position);
    const groundY = Math.max(0, sampleTerrainHeight(worldPt.x, worldPt.z));
    const penetration = groundY + minMargin - worldPt.y;
    if (penetration > maxPenetration) maxPenetration = penetration;
  }
  if (maxPenetration > 0) {
    state.position.y += maxPenetration;
  }
}

function stepCrashAnimation(state, stepDt, windVec) {
  state.crashTime += stepDt;
  state.cameraShake = Math.max(0, state.cameraShake - stepDt * 1.6);

  // Realistic rotational inertia: propellers smoothly wind down to a complete stop (never stay spinning fast!)
  state.propRpm = Math.max(0, state.propRpm - stepDt * 0.42);
  state.propRpmLeft = Math.max(0, state.propRpmLeft - stepDt * 0.65);
  state.propAngle += stepDt * state.propRpm * 46;
  state.propAngleLeft += stepDt * state.propRpmLeft * 46;

  if (state.crashMode === 'water') {
    // True high-density water physics (800x air density): ZERO flat-stone skipping!
    // Horizontal skim halts rapidly, then:
    // - Low-speed water ditching (severity === 'hard'): aircraft FLOATS & bobs gently on waves for ~7s before slowly flooding!
    // - High-speed water impact (severity === 'catastrophic'): nose digs in and plunges straight under!
    const hSpeed = Math.hypot(state.velocity.x, state.velocity.z);
    if (hSpeed > 0.12) {
      const hydroDecel = Math.min(hSpeed / stepDt, 6.4 + 0.42 * hSpeed * hSpeed);
      const scale = Math.max(0, 1 - (hydroDecel * stepDt) / hSpeed);
      state.velocity.x *= scale;
      state.velocity.z *= scale;
    } else {
      state.velocity.x = 0;
      state.velocity.z = 0;
    }

    const isDitchingFloat = state.crashSeverity === 'hard';
    if (isDitchingFloat && state.crashTime < 7.5) {
      // Buoyant amphibious hull floats half-submerged, gently bobbing with the swell after coming to a stop!
      const bobY = -0.35 + Math.sin(state.crashTime * 2.1) * 0.16;
      state.velocity.y = (bobY - state.position.y) * 2.6;
      state.position.y += state.velocity.y * stepDt;
      state.position.x += state.velocity.x * stepDt;
      state.position.z += state.velocity.z * stepDt;
      const e = new THREE.Euler().setFromQuaternion(state.quaternion, 'YXZ');
      e.x += (0.06 - e.x) * Math.min(1, stepDt * 2.4);
      e.z += (0.14 - e.z) * Math.min(1, stepDt * 1.8);
      state.quaternion.setFromEuler(e);
    } else {
      const sinkTarget = -13.5;
      if (state.position.y > sinkTarget) {
        const aboveSurface = state.position.y > -0.8;
        const targetVy = aboveSurface ? -4.8 : -(1.55 + Math.min(1, state.crashTime / 2.2) * 1.15);
        state.velocity.y += (targetVy - state.velocity.y) * Math.min(1, stepDt * 7.5);
        if (state.velocity.y > -0.6) state.velocity.y = -0.6; // Strict monotonic plunge — zero skip!
        state.position.addScaledVector(state.velocity, stepDt);
      } else {
        state.velocity.set(0, 0, 0);
      }

      const e = new THREE.Euler().setFromQuaternion(state.quaternion, 'YXZ');
      e.x += (-0.68 - e.x) * Math.min(1, stepDt * 3.4);
      e.z += (0.52 - e.z) * Math.min(1, stepDt * 1.6);
      e.y += stepDt * 0.05;
      state.quaternion.setFromEuler(e);
    }
  } else {
    // True inelastic ground / mountain / obstacle crash with Coulomb STATIC FRICTION LOCK so aircraft comes to a COMPLETE STOP!
    const terrainY = sampleTerrainHeight(state.position.x, state.position.z);
    const groundY = Math.max(0, terrainY);
    const normal = sampleTerrainNormal(state.position.x, state.position.z);

    // If already arrested by static friction on the ground, stay 100% stationary (no endless creeping down slopes!)
    if (state.position.y <= groundY + 1.55 && state.crashTime > 0.35 && state.velocity.length() < 1.35) {
      state.velocity.set(0, 0, 0);
      state.angularVel.set(0, 0, 0);
      enforceAirframeAboveTerrain(state, 0.35);
      updateDerivedTelemetry(state, windVec);
      return;
    }

    // Apply Newtonian gravity if airborne after hitting a tree/tower/mountain face
    state.velocity.y -= GRAVITY * stepDt;
    state.position.addScaledVector(state.velocity, stepDt);

    if (terrainY < -0.4 && state.position.y <= 0.8) {
      state.crashMode = 'water';
      state.velocity.y = Math.min(-1.2, state.velocity.y * 0.25);
      updateDerivedTelemetry(state, windVec);
      return;
    }

    if (state.position.y <= groundY + 1.35) {
      state.position.y = groundY + 1.35;
      const vn = state.velocity.dot(normal);
      if (vn < 0) state.velocity.addScaledVector(normal, -vn);
      if (state.velocity.y > 0) state.velocity.y = 0;

      // Strong Coulomb plowing kinetic friction + static friction lock below 1.35 m/s!
      const speed = state.velocity.length();
      const decel = 1.22 * GRAVITY + speed * 0.55;
      if (speed > 1.35) {
        state.velocity.multiplyScalar(Math.max(0, 1 - (decel * stepDt) / speed));
      } else {
        state.velocity.set(0, 0, 0);
        state.angularVel.set(0, 0, 0);
      }

      const slopePitch = Math.atan2(-normal.z, normal.y) * 0.65;
      const slopeRoll = Math.atan2(normal.x, normal.y) * 0.65;
      const e = new THREE.Euler().setFromQuaternion(state.quaternion, 'YXZ');
      e.x += (slopePitch - 0.03 - e.x) * Math.min(1, stepDt * 4.5);
      const wingList = e.z >= 0 ? 0.22 : -0.22;
      e.z += (slopeRoll + wingList - e.z) * Math.min(1, stepDt * 4.5);
      e.y += state.angularVel.y * stepDt;
      state.quaternion.setFromEuler(e);
      state.angularVel.multiplyScalar(Math.max(0, 1 - stepDt * 4.2));
    } else {
      const dq = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(state.angularVel.x * stepDt, state.angularVel.y * stepDt, state.angularVel.z * stepDt, 'YXZ'),
      );
      state.quaternion.multiply(dq).normalize();
    }

    enforceAirframeAboveTerrain(state, 0.35);
  }

  updateDerivedTelemetry(state, windVec);
}

export function stepFlightPhysics(state, controls, dt, windVec, events, checkObstacleCollision = null) {
  const stepDt = Math.min(dt, 0.05);

  if (state.status === 'crashed') {
    stepCrashAnimation(state, stepDt, windVec);
    return;
  }

  state.cameraShake = Math.max(0, state.cameraShake - stepDt * 2.5);

  // Throttle, fuel dynamics & realistic partial malfunction effects (engine-out, fuel leak, asymmetric yaw!)
  state.throttle = Math.max(0, Math.min(1.1, state.throttle + controls.throttleDelta * stepDt * 0.75));
  const hasFuel = state.fuelKg > 0.05;
  const effectiveThrottle = hasFuel ? state.throttle : 0;
  const engineOutScale = state.malfunctions.leftEngineOut ? 0.56 : 1.0;
  const healthScale = (0.45 + 0.55 * (state.engineHealth / 100)) * engineOutScale;
  const togaFactor = effectiveThrottle > 1.0 ? AIRCRAFT_SPEC.togaMultiplier : 1.0;

  if (hasFuel) {
    const leakRate = state.malfunctions.fuelLeak ? 0.95 : 0;
    const burnRate =
      AIRCRAFT_SPEC.baseFuelBurnKgS * (0.18 + effectiveThrottle * effectiveThrottle * (effectiveThrottle > 1 ? 1.85 : 1.0)) +
      leakRate;
    state.fuelKg = Math.max(0, state.fuelKg - burnRate * stepDt);
  }
  const targetTemp = 340 + effectiveThrottle * 360 + (effectiveThrottle > 1.0 ? 115 : 0) + (100 - state.engineHealth) * 1.4;
  state.engineTempC += (targetTemp - state.engineTempC) * Math.min(1, stepDt * 1.8);
  if (state.engineTempC > 790) {
    state.engineHealth = Math.max(25, state.engineHealth - stepDt * 2.8);
  }

  state.brakes = controls.brakes;
  // Smooth propeller RPM inertia (left engine spools down independently if port engine fails!)
  const targetRpm = hasFuel ? 0.24 + effectiveThrottle * 0.76 : 0;
  const targetRpmLeft = hasFuel && !state.malfunctions.leftEngineOut ? targetRpm : 0;
  state.propRpm += (targetRpm - state.propRpm) * Math.min(1, stepDt * 2.2);
  state.propRpmLeft += (targetRpmLeft - state.propRpmLeft) * Math.min(1, stepDt * (targetRpmLeft === 0 ? 0.85 : 2.2));
  state.propAngle += stepDt * state.propRpm * 62;
  state.propAngleLeft += stepDt * state.propRpmLeft * 62;

  state.controlSurface.aileron += (controls.roll - state.controlSurface.aileron) * Math.min(1, stepDt * 12);
  state.controlSurface.elevator += (controls.pitch - state.controlSurface.elevator) * Math.min(1, stepDt * 12);
  state.controlSurface.rudder += ((controls.yaw || controls.roll * 0.4) - state.controlSurface.rudder) * Math.min(1, stepDt * 12);
  state.controlSurface.flaps += (FLAP_ANGLES[state.flapStage] - state.controlSurface.flaps) * Math.min(1, stepDt * 4.5);

  const forward = FORWARD_LOCAL.clone().applyQuaternion(state.quaternion);
  const right = RIGHT_LOCAL.clone().applyQuaternion(state.quaternion);
  const up = UP_LOCAL.clone().applyQuaternion(state.quaternion);

  // Newtonian aerodynamics with ISA barometric air density rho(h) = rho_0 * exp(-h / 8500)
  const rho = AIRCRAFT_SPEC.airDensity * Math.exp(-Math.max(0, state.position.y) / 8500);
  const airVel = state.velocity.clone().sub(windVec);
  const speed = airVel.length();
  const vForward = Math.max(0.1, airVel.dot(forward));
  const vRight = airVel.dot(right);
  const vUp = airVel.dot(up);
  const aoaRad = Math.atan2(-vUp, Math.max(4, vForward));
  const aoaDeg = (aoaRad * 180) / Math.PI;

  const q = 0.5 * rho * speed * speed;
  const flapCl = AIRCRAFT_SPEC.flapLiftCl[state.flapStage];
  const stallDeg = AIRCRAFT_SPEC.stallAlphaDeg - state.flapStage * 1.2;
  const stallSpeedKts = 48 - state.flapStage * 6;
  let cl = 0.28 + flapCl + aoaDeg * 0.088;
  const isStalling = !state.onGround && (aoaDeg > stallDeg || (speed * MPS_TO_KTS < stallSpeedKts && state.aglM > 6));
  state.stalling = isStalling;

  if (aoaDeg > stallDeg) {
    cl -= Math.min(20, aoaDeg - stallDeg) * 0.095;
  }
  cl = Math.max(-0.8, Math.min(2.1, cl));

  const groundH = Math.max(0, sampleTerrainHeight(state.position.x, state.position.z));
  const agl = state.position.y - groundH;
  const groundEffect = agl < 14 ? 1 + (1 - Math.max(0, agl) / 14) * 0.24 : 1.0;

  // Aspect-ratio induced drag (AR = 8.3, Oswald e = 0.82 -> k = 1/(pi*AR*e) ≈ 0.0468)
  const cdInduced = (cl * cl) / (Math.PI * 8.3 * 0.82);
  const cd =
    AIRCRAFT_SPEC.baseDragCd0 +
    AIRCRAFT_SPEC.flapDragCd[state.flapStage] +
    (state.gearDown ? AIRCRAFT_SPEC.gearDragCd : 0) +
    cdInduced +
    (state.onGround && controls.brakes ? 0.2 : 0);

  // Dynamic mass decreases smoothly as fuel burns!
  const currentMass = AIRCRAFT_SPEC.massKg - (AIRCRAFT_SPEC.fuelCapacityKg - state.fuelKg);
  const liftMag = q * AIRCRAFT_SPEC.wingAreaM2 * cl * groundEffect;
  const dragMag = q * AIRCRAFT_SPEC.wingAreaM2 * cd;
  const thrustMag = effectiveThrottle * AIRCRAFT_SPEC.maxThrustN * healthScale * togaFactor * (rho / AIRCRAFT_SPEC.airDensity);

  // Sum of Newtonian forces: Weight + Thrust + Aerodynamic Lift + Drag + Lateral Keel Damping + Thermals
  const force = new THREE.Vector3(0, -currentMass * GRAVITY, 0);
  force.addScaledVector(forward, thrustMag);
  force.addScaledVector(up, liftMag);
  if (speed > 0.2) {
    force.addScaledVector(airVel, -dragMag / speed);
  }
  force.addScaledVector(right, -vRight * Math.max(12, speed) * 44);

  const thermalLiftMps = sampleThermalLift(state.position.x, state.position.z, state.position.y);
  state.inThermal = thermalLiftMps > 0.35;
  if (thermalLiftMps > 0 && !state.onGround) {
    force.y += thermalLiftMps * currentMass * 0.85;
  }

  state.gLoad = Math.max(-2.5, Math.min(6.5, liftMag / (currentMass * GRAVITY)));
  if (state.gLoad > 4.2 && !state.onGround) {
    state.hullPct = Math.max(15, state.hullPct - (state.gLoad - 4.2) * stepDt * 3.5);
  }
  if (state.overspeed) {
    state.hullPct = Math.max(20, state.hullPct - stepDt * 2.4);
  }

  // Responsive left/right turning + pitch/yaw inertia with realistic turboprop flight-envelope protection
  const pitchRadNow = Math.asin(Math.max(-1, Math.min(1, forward.y)));
  const rollRadNow = Math.atan2(right.y, up.y);
  const authority = Math.min(1.18, Math.max(0.42, speed / 44));

  // Soft pitch envelope: prevent twin-turboprop from looping past vertical into gimbal flip / stuck-inverted state!
  let pitchAuthority = 1.0;
  if (controls.pitch > 0 && pitchRadNow > 0.58) {
    pitchAuthority = Math.max(0, 1 - (pitchRadNow - 0.58) / 0.42);
  } else if (controls.pitch < 0 && pitchRadNow < -0.68) {
    pitchAuthority = Math.max(0, 1 - (-0.68 - pitchRadNow) / 0.36);
  }
  const controlScale = state.malfunctions.controlDamage ? 0.68 : 1.0;
  const asymYaw = !state.onGround && state.malfunctions.leftEngineOut ? 0.16 * effectiveThrottle : 0;
  const dmgRollBias = !state.onGround && state.malfunctions.controlDamage ? 0.14 : 0;
  const pitchCmd = controls.pitch * 1.45 * authority * pitchAuthority * controlScale;
  const rollCmd = -controls.roll * 2.25 * authority * controlScale + dmgRollBias;
  const groundSteer = state.onGround ? -(controls.yaw + controls.roll * 0.85) * 1.4 : 0;
  const airRudder = !state.onGround ? -controls.yaw * 1.05 * authority + asymYaw : 0;
  const aoaRestore = state.onGround ? 0 : -aoaRad * 0.65;
  // Aerodynamic nose-drop when stalling or pulling excessively steep climb (prevents vertical flip-over!)
  const steepClimbRestore = !state.onGround && pitchRadNow > 0.72 ? -(pitchRadNow - 0.72) * 3.8 : 0;
  const steepDiveRestore = !state.onGround && pitchRadNow < -0.82 ? (-0.82 - pitchRadNow) * 3.2 : 0;
  const stallDrop = isStalling ? -0.68 : 0;
  // Natural wing-dihedral self-righting torque (always rolls cleanly upright, never traps aircraft inverted!)
  const bankLimitRestore =
    !state.onGround && Math.abs(rollRadNow) > 1.08
      ? -Math.sign(rollRadNow) * (Math.abs(rollRadNow) - 1.08) * 3.6
      : 0;
  const gentleLevel =
    !state.onGround && controls.roll === 0 && Math.abs(rollRadNow) < 0.7 ? -rollRadNow * 1.25 : 0;

  state.angularVel.x +=
    (pitchCmd + aoaRestore + stallDrop + steepClimbRestore + steepDiveRestore - state.angularVel.x * 4.0) * stepDt * 4.8;
  state.angularVel.z += (rollCmd + bankLimitRestore + gentleLevel - state.angularVel.z * 4.5) * stepDt * 5.2;
  state.angularVel.y += (airRudder + groundSteer - state.angularVel.y * 4.0) * stepDt * 4.6;

  if (isStalling) {
    state.angularVel.z += Math.sin(performance.now() * 0.025) * 0.25 * stepDt;
  }

  const accel = force.divideScalar(currentMass);
  state.velocity.addScaledVector(accel, stepDt);
  state.position.addScaledVector(state.velocity, stepDt);

  const dq = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(state.angularVel.x * stepDt, state.angularVel.y * stepDt, state.angularVel.z * stepDt, 'YXZ'),
  );
  state.quaternion.multiply(dq).normalize();

  if (!state.onGround) {
    // Re-read basis after local rotation and clamp pitch/bank away from vertical gimbal pole
    const fwdPost = FORWARD_LOCAL.clone().applyQuaternion(state.quaternion);
    const rightPost = RIGHT_LOCAL.clone().applyQuaternion(state.quaternion);
    const upPost = UP_LOCAL.clone().applyQuaternion(state.quaternion);

    const pPost = Math.asin(Math.max(-1, Math.min(1, fwdPost.y)));
    const rPost = Math.atan2(rightPost.y, upPost.y);
    const maxPitch = 1.04; // ~59.6 deg max safe climb/dive for twin-turboprop (zero flip possible!)
    const maxBank = 1.32; // ~75.6 deg max safe bank
    if (Math.abs(pPost) > maxPitch || Math.abs(rPost) > maxBank || upPost.y < 0.12) {
      const clampedPitch = Math.max(-maxPitch, Math.min(maxPitch, pPost));
      const clampedRoll = Math.max(-maxBank, Math.min(maxBank, rPost));
      const hdgYaw = Math.atan2(-fwdPost.x, -fwdPost.z);
      state.quaternion.setFromEuler(new THREE.Euler(clampedPitch, hdgYaw, clampedRoll, 'YXZ'));
      if (Math.abs(pPost) > maxPitch) state.angularVel.x = Math.min(0, state.angularVel.x);
      if (Math.abs(rPost) > maxBank) state.angularVel.z *= 0.4;
    }

    const clampedRollNow = Math.max(-maxBank, Math.min(maxBank, rPost));
    const bankTurnRate = Math.sin(clampedRollNow) * 0.95 * authority + -controls.roll * 0.28 * authority;
    if (Math.abs(bankTurnRate) > 0.0005) {
      const worldTurnQ = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, bankTurnRate * stepDt);
      state.quaternion.premultiply(worldTurnQ).normalize();
      state.velocity.applyQuaternion(worldTurnQ);
    }
  }

  // --- SOLID WORLD OBSTACLE COLLISIONS (Towers, Hangar, Lighthouse, Bridge, Trees!) ---
  // Low-energy wingtip tree brush (<62 kt) causes survivable partial malfunction instead of instant explosion!
  const speedKts = state.velocity.length() * MPS_TO_KTS;
  if (checkObstacleCollision) {
    const probeWorld = new THREE.Vector3();
    for (const probe of AIRFRAME_PROBES) {
      probeWorld.copy(probe.local).applyQuaternion(state.quaternion).add(state.position);
      const hit = checkObstacleCollision(probeWorld, probe.radius);
      if (hit) {
        const isGlancingTree = hit.kind === 'tree' && (probe.name === 'leftWing' || probe.name === 'rightWing') && speedKts < 68;
        if (isGlancingTree && state.hullPct > 35) {
          state.hullPct = Math.max(24, state.hullPct - 24);
          state.engineHealth = Math.max(40, state.engineHealth - 18);
          state.cameraShake = 0.65;
          state.velocity.multiplyScalar(0.84);
          state.malfunctions.controlDamage = true;
          if (probe.name === 'leftWing') state.malfunctions.leftEngineOut = true;
          else state.malfunctions.fuelLeak = true;
          state.position.y += 2.6;
          events?.onMalfunction?.(
            probe.name === 'leftWing'
              ? { code: 'PORT ENGINE OUT', detail: 'Tree branch struck left wing — asymmetric thrust & sluggish roll.' }
              : { code: 'WING FUEL LEAK', detail: 'Tree graze punctured wing tank — monitor fuel & divert!' },
          );
          break;
        }
        const severity = speedKts >= 78 || hit.kind !== 'tree' ? 'catastrophic' : 'hard';
        triggerCrash(
          state,
          'ground',
          hit.label,
          `Struck ${hit.kind === 'tree' ? 'tree' : 'structure'} at ${Math.round(speedKts)} kt (${probe.name}).`,
          Math.abs(state.velocity.y),
          speedKts,
          Math.abs(state.rollDeg),
          false,
          severity,
        );
        events?.onCrash?.(state.incidentReport);
        updateDerivedTelemetry(state, windVec);
        return;
      }
    }
  }

  // --- 5-POINT MOUNTAIN / TERRAIN / RUNWAY / OCEAN CONTACT CHECK ---
  const terrainY = sampleTerrainHeight(state.position.x, state.position.z);
  const surfaceY = Math.max(0, terrainY);
  const gearClearance = state.gearDown && state.gearIntact ? 2.45 : 1.35;

  // Check if nose or wingtip struck a steep mountain cliff before the center of gravity did!
  if (!state.onGround) {
    const probeWorld = new THREE.Vector3();
    for (const probe of AIRFRAME_PROBES) {
      if (probe.name === 'belly' || probe.name === 'tail') continue;
      probeWorld.copy(probe.local).applyQuaternion(state.quaternion).add(state.position);
      const pTerrY = sampleTerrainHeight(probeWorld.x, probeWorld.z);
      if (pTerrY > 1.5 && probeWorld.y <= pTerrY + 0.4) {
        const normal = sampleTerrainNormal(probeWorld.x, probeWorld.z);
        const onRunway = Boolean(getRunwayAt(state.position.x, state.position.z, 6));
        if (!onRunway && (normal.y < 0.86 || speedKts > 55)) {
          triggerCrash(
            state,
            'ground',
            normal.y < 0.82 ? 'MOUNTAIN IMPACT' : 'TERRAIN IMPACT',
            `Airframe (${probe.name}) struck slope at ${Math.round(speedKts)} kt.`,
            Math.max(0, -state.velocity.y),
            speedKts,
            Math.abs(state.rollDeg),
            false,
          );
          events?.onCrash?.(state.incidentReport);
          updateDerivedTelemetry(state, windVec);
          return;
        }
      }
    }
  }

  if (state.position.y <= surfaceY + gearClearance) {
    const impactSink = -state.velocity.y;
    const hitWater = terrainY < 0.25;
    const rwyHit = getRunwayAt(state.position.x, state.position.z, 6);
    const absBank = Math.abs(state.rollDeg);

    if (!state.onGround && (impactSink > 0.5 || hitWater)) {
      if (hitWater) {
        // Low-speed controlled ditching (<75 kt & sink <6.5 m/s) lets the amphibious hull float on waves before flooding!
        const ditching = speedKts < 75 && impactSink < 6.5;
        triggerCrash(
          state,
          'water',
          ditching ? 'EMERGENCY WATER DITCHING' : 'WATER IMPACT — SINKING',
          ditching
            ? `Ditched on water at ${Math.round(speedKts)} kt (-${impactSink.toFixed(1)} m/s). Hull floating briefly before flooding.`
            : `Hit ocean at ${Math.round(speedKts)} kt (-${impactSink.toFixed(1)} m/s). Airframe flooding rapidly.`,
          impactSink,
          speedKts,
          absBank,
          false,
          ditching ? 'hard' : 'catastrophic',
        );
        events?.onCrash?.(state.incidentReport);
      } else if (impactSink > AIRCRAFT_SPEC.crashSinkMps || absBank > 28) {
        // Progressive damage cascade:
        // - If hull is still strong (>55%) and impact is moderate (<82 kt, sink <10.5, bank <=34), sustain severe
        //   in-flight malfunction (engine-out / control damage / gear collapse) rather than instant game over!
        const survivableHardHit = state.hullPct > 55 && speedKts < 82 && impactSink < 10.5 && absBank <= 34 && Boolean(rwyHit);
        if (survivableHardHit) {
          state.hullPct = Math.max(28, state.hullPct - 36);
          state.engineHealth = Math.max(35, state.engineHealth - 32);
          state.gearIntact = false;
          state.cameraShake = 0.72;
          state.malfunctions.leftEngineOut = true;
          state.malfunctions.gearDamaged = true;
          state.malfunctions.controlDamage = true;
          events?.onTouchdown?.({ sinkMps: impactSink, hard: true, onRunway: true, gearUp: false });
          events?.onMalfunction?.({
            code: 'PORT ENGINE & GEAR FAILURE',
            detail: 'Severe touchdown damaged left engine & gear — control impaired, brake to stop or abort!',
          });
        } else {
          // Low-speed crash (<88 kt & sink <13 m/s) -> 'hard' (no fireball, tail stays on, prop detaches);
          // High-speed crash (>=88 kt or sink >=13 m/s) -> 'catastrophic' (wing + tail snap off + fire!)
          const isCatastrophic = speedKts >= 88 || impactSink >= 13.0 || absBank > 45;
          const reason = absBank > 28 ? `WINGTIP STRIKE (${Math.round(absBank)}° BANK)` : 'HARD LANDING — GEAR COLLAPSE';
          triggerCrash(
            state,
            'ground',
            reason,
            `Sink -${impactSink.toFixed(1)} m/s (max 4.6) at ${Math.round(speedKts)} kt, bank ${Math.round(absBank)}°.`,
            impactSink,
            speedKts,
            absBank,
            Boolean(rwyHit),
            isCatastrophic ? 'catastrophic' : 'hard',
          );
          events?.onCrash?.(state.incidentReport);
        }
      } else if (!state.gearDown) {
        state.hullPct = Math.max(12, state.hullPct - 36);
        state.engineHealth = Math.max(40, state.engineHealth - 28);
        state.malfunctions.flapJammed = true;
        if (speedKts > 82) {
          triggerCrash(
            state,
            'ground',
            'GEAR-UP IMPACT',
            `Belly impact at ${Math.round(speedKts)} kt with gear retracted.`,
            impactSink,
            speedKts,
            absBank,
            Boolean(rwyHit),
            speedKts >= 98 ? 'catastrophic' : 'hard',
          );
          events?.onCrash?.(state.incidentReport);
        } else {
          state.cameraShake = 0.55;
          events?.onTouchdown?.({ sinkMps: impactSink, hard: true, onRunway: Boolean(rwyHit), gearUp: true });
          events?.onMalfunction?.({ code: 'BELLY SCRAPE · FLAPS JAMMED', detail: 'Belly touchdown damaged underside & jammed flap actuators.' });
        }
      } else if (!rwyHit && speedKts > 58) {
        const normal = sampleTerrainNormal(state.position.x, state.position.z);
        const isCatastrophic = speedKts >= 82 || normal.y < 0.78;
        triggerCrash(
          state,
          'ground',
          normal.y < 0.85 ? 'MOUNTAIN IMPACT' : 'TERRAIN IMPACT',
          `Impacted uneven terrain at ${Math.round(speedKts)} kt (-${impactSink.toFixed(1)} m/s).`,
          impactSink,
          speedKts,
          absBank,
          false,
          isCatastrophic ? 'catastrophic' : 'hard',
        );
        events?.onCrash?.(state.incidentReport);
      } else {
        const hard = impactSink > AIRCRAFT_SPEC.maxSafeSinkMps;
        if (hard) {
          state.hullPct = Math.max(25, state.hullPct - Math.round((impactSink - 3.5) * 9));
          state.gearIntact = impactSink < 7.2;
          state.cameraShake = 0.45;
          if (impactSink > 6.0) {
            state.malfunctions.gearDamaged = !state.gearIntact;
            state.malfunctions.leftEngineOut = impactSink > 6.8;
            events?.onMalfunction?.(
              impactSink > 6.8
                ? { code: 'PROP STRIKE · ENGINE #1 OUT', detail: 'Hard touchdown damaged left prop & engine.' }
                : { code: 'GEAR STRUT DAMAGED', detail: 'Hard landing bent main landing gear oleo.' },
            );
          }
        }
        events?.onTouchdown?.({
          sinkMps: impactSink,
          hard,
          onRunway: Boolean(rwyHit),
          runwayId: rwyHit?.runway.id ?? null,
          speedKts,
          bankDeg: absBank,
        });
      }
    }

    if (state.status !== 'crashed') {
      state.position.y = surfaceY + gearClearance;
      if (state.velocity.y < 0) state.velocity.y = 0;
      state.onGround = true;

      const e = new THREE.Euler().setFromQuaternion(state.quaternion, 'YXZ');
      e.z *= Math.max(0, 1 - stepDt * 7);
      if (e.x < -0.02) e.x *= Math.max(0, 1 - stepDt * 6);
      // Clamp pitch on ground so tail never strikes/clips runway
      e.x = Math.min(0.14, e.x);
      state.quaternion.setFromEuler(e);
      enforceAirframeAboveTerrain(state, 0.35);

      const friction = (rwyHit ? 0.25 : 1.15) + (controls.brakes ? 1.85 : 0);
      state.velocity.x *= Math.max(0, 1 - friction * stepDt);
      state.velocity.z *= Math.max(0, 1 - friction * stepDt);

      if (state.status === 'flying' && rwyHit && state.velocity.length() < 4.5 && state.throttle < 0.2) {
        state.touchdownTimer += stepDt;
        if (state.touchdownTimer > 1.2) {
          state.status = 'landed';
          state.incidentReport = {
            outcome: 'LANDED',
            title: `LANDED — ${rwyHit.runway.id}`,
            detail: `Stopped on ${rwyHit.runway.name}. Fuel ${Math.round(state.fuelPct)}%, Hull ${Math.round(state.hullPct)}%.`,
            runwayId: rwyHit.runway.id,
            fuelPct: state.fuelPct,
            hullPct: state.hullPct,
          };
          events?.onFullStop?.(state.incidentReport);
        }
      } else {
        state.touchdownTimer = 0;
      }
    }
  } else {
    state.onGround = false;
    state.touchdownTimer = 0;
  }

  const distOrigin = Math.hypot(state.position.x, state.position.z);
  if (distOrigin > 7600) {
    const pull = new THREE.Vector3(-state.position.x, 0, -state.position.z).normalize();
    state.velocity.addScaledVector(pull, stepDt * 22);
  }

  updateDerivedTelemetry(state, windVec);
}

function triggerCrash(state, mode, title, detail, sinkMps, speedKts, bankDeg, onRunway, severity = 'catastrophic') {
  state.status = 'crashed';
  state.crashMode = mode;
  state.crashSeverity = severity;
  state.crashImpactKts = speedKts;
  state.crashTime = 0;
  state.cameraShake = severity === 'catastrophic' ? 0.98 : 0.62;
  state.hullPct = Math.min(state.hullPct, severity === 'catastrophic' ? 12 : 34);
  state.engineHealth = Math.min(state.engineHealth, severity === 'catastrophic' ? 8 : 28);
  state.gearIntact = false;
  state.throttle = 0;

  if (mode === 'ground') {
    // STRICT ZERO-BOUNCE inelastic crash: absorb vertical impact completely, keep plowing momentum for realistic ground skid trench!
    state.velocity.multiplyScalar(severity === 'catastrophic' ? 0.54 : 0.44);
    state.velocity.y = Math.min(0, state.velocity.y * 0.12);
    state.angularVel.set(0, (Math.random() > 0.5 ? 1 : -1) * (severity === 'catastrophic' ? 0.85 : 0.4), 0);
    enforceAirframeAboveTerrain(state, 0.35);
  } else {
    // STRICT ZERO-SKIP water plunge: high-density water immediately grabs nose/gear, kills horizontal skim & pulls straight under!
    state.velocity.multiplyScalar(0.11);
    state.velocity.y = Math.min(-4.5, state.velocity.y * 0.45);
    state.position.y = Math.min(state.position.y, 0.45);
  }

  state.incidentReport = {
    outcome: 'CRASHED',
    crashMode: mode,
    severity,
    title,
    detail,
    sinkMps,
    speedKts,
    bankDeg,
    onRunway,
    fuelPct: state.fuelPct,
    hullPct: state.hullPct,
  };
}
