// 6-DOF aerodynamics, lift/stall curve, flaps, gear, ground effect, crosswind shear,
// fuel consumption, structural G-load/impact damage, and readable landing/crash diagnostics.

import * as THREE from 'three';
import { AIRCRAFT_SPEC, FLAP_ANGLES, GRAVITY, MPS_TO_KTS, M_TO_FT, RUNWAYS } from './config.js';
import { getRunwayAt, sampleTerrainHeight } from './terrain-world.js';

const FORWARD_LOCAL = new THREE.Vector3(0, 0, -1);
const RIGHT_LOCAL = new THREE.Vector3(1, 0, 0);
const UP_LOCAL = new THREE.Vector3(0, 1, 0);

export function createFlightState() {
  return {
    position: new THREE.Vector3(0, 165, 920),
    velocity: new THREE.Vector3(0, -2, -62),
    quaternion: new THREE.Quaternion(),
    angularVel: new THREE.Vector3(0, 0, 0), // local pitch(x), yaw(y), roll(z)
    throttle: 0.72, // 0..1.10 (above 1.0 = TOGA emergency boost)
    flapStage: 0, // 0, 1, 2
    gearDown: true,
    brakes: false,
    fuelKg: AIRCRAFT_SPEC.fuelCapacityKg,
    fuelPct: 100,
    hullPct: 100,
    engineHealth: 100,
    gearIntact: true,
    engineTempC: 540,
    propAngle: 0,
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
    touchdownTimer: 0,
    controlSurface: { aileron: 0, elevator: 0, rudder: 0, flaps: 0 },
    activeRunwayId: 'RWY36',
    papiGlideDeg: 3.0,
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
  state.onGround = Boolean(spawn.onGround);
  state.status = 'flying';
  state.touchdownTimer = 0;
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

  const euler = new THREE.Euler().setFromQuaternion(state.quaternion, 'YXZ');
  state.pitchDeg = (euler.x * 180) / Math.PI;
  state.rollDeg = (euler.z * 180) / Math.PI;
  let hdg = ((-euler.y * 180) / Math.PI) % 360;
  if (hdg < 0) hdg += 360;
  state.headingDeg = hdg;

  state.altitudeM = Math.max(0, state.position.y);
  state.altitudeFt = state.altitudeM * M_TO_FT;
  const groundH = Math.max(0, sampleTerrainHeight(state.position.x, state.position.z));
  state.aglM = Math.max(0, state.position.y - groundH);
  state.vsiMps = state.velocity.y;
  state.fuelPct = Math.max(0, (state.fuelKg / AIRCRAFT_SPEC.fuelCapacityKg) * 100);
  state.lowFuel = state.fuelPct < 22;
  state.overspeed = state.airspeedKts > AIRCRAFT_SPEC.vneKts;

  // Nearest runway glideslope readout
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

export function stepFlightPhysics(state, controls, dt, windVec, events) {
  const stepDt = Math.min(dt, 0.05);

  if (state.status === 'crashed') {
    state.velocity.multiplyScalar(Math.max(0, 1 - stepDt * 3.5));
    state.propAngle += stepDt * 3;
    updateDerivedTelemetry(state, windVec);
    return;
  }

  // Throttle input & fuel burn
  state.throttle = Math.max(0, Math.min(1.1, state.throttle + controls.throttleDelta * stepDt * 0.75));
  const hasFuel = state.fuelKg > 0.05;
  const effectiveThrottle = hasFuel ? state.throttle : 0;
  const healthScale = 0.45 + 0.55 * (state.engineHealth / 100);
  const togaFactor = effectiveThrottle > 1.0 ? AIRCRAFT_SPEC.togaMultiplier : 1.0;

  // Fuel & engine heat dynamics
  if (hasFuel) {
    const burnRate =
      AIRCRAFT_SPEC.baseFuelBurnKgS * (0.18 + effectiveThrottle * effectiveThrottle * (effectiveThrottle > 1 ? 1.85 : 1.0));
    state.fuelKg = Math.max(0, state.fuelKg - burnRate * stepDt);
  }
  const targetTemp = 340 + effectiveThrottle * 360 + (effectiveThrottle > 1.0 ? 115 : 0) + (100 - state.engineHealth) * 1.4;
  state.engineTempC += (targetTemp - state.engineTempC) * Math.min(1, stepDt * 1.8);
  if (state.engineTempC > 790) {
    state.engineHealth = Math.max(25, state.engineHealth - stepDt * 2.8);
  }

  state.brakes = controls.brakes;
  state.propAngle += stepDt * (16 + effectiveThrottle * 58);

  // Smooth control surface animations
  state.controlSurface.aileron += (controls.roll - state.controlSurface.aileron) * Math.min(1, stepDt * 12);
  state.controlSurface.elevator += (controls.pitch - state.controlSurface.elevator) * Math.min(1, stepDt * 12);
  state.controlSurface.rudder += (controls.yaw - state.controlSurface.rudder) * Math.min(1, stepDt * 12);
  state.controlSurface.flaps += (FLAP_ANGLES[state.flapStage] - state.controlSurface.flaps) * Math.min(1, stepDt * 4.5);

  const forward = FORWARD_LOCAL.clone().applyQuaternion(state.quaternion);
  const right = RIGHT_LOCAL.clone().applyQuaternion(state.quaternion);
  const up = UP_LOCAL.clone().applyQuaternion(state.quaternion);

  // Relative air velocity
  const airVel = state.velocity.clone().sub(windVec);
  const speed = airVel.length();
  const vForward = Math.max(0.1, airVel.dot(forward));
  const vRight = airVel.dot(right);
  const vUp = airVel.dot(up);
  const aoaRad = Math.atan2(-vUp, Math.max(4, vForward));
  const aoaDeg = (aoaRad * 180) / Math.PI;

  // Dynamic pressure
  const q = 0.5 * AIRCRAFT_SPEC.airDensity * speed * speed;

  // Lift curve with smooth stall break & flaps
  const flapCl = AIRCRAFT_SPEC.flapLiftCl[state.flapStage];
  const stallDeg = AIRCRAFT_SPEC.stallAlphaDeg - state.flapStage * 1.2;
  const stallSpeedKts = 48 - state.flapStage * 6;
  let cl = 0.28 + flapCl + aoaDeg * 0.088;
  const isStalling = !state.onGround && (aoaDeg > stallDeg || (speed * MPS_TO_KTS < stallSpeedKts && state.aglM > 6));
  state.stalling = isStalling;

  if (aoaDeg > stallDeg) {
    const excess = Math.min(20, aoaDeg - stallDeg);
    cl -= excess * 0.095;
  }
  cl = Math.max(-0.8, Math.min(2.1, cl));

  // Ground effect cushions lift close to surface
  const groundH = Math.max(0, sampleTerrainHeight(state.position.x, state.position.z));
  const agl = state.position.y - groundH;
  const groundEffect = agl < 14 ? 1 + (1 - Math.max(0, agl) / 14) * 0.24 : 1.0;

  // Drag (parasitic + flaps + gear + induced + airbrake/spoilers on ground)
  const cd =
    AIRCRAFT_SPEC.baseDragCd0 +
    AIRCRAFT_SPEC.flapDragCd[state.flapStage] +
    (state.gearDown ? AIRCRAFT_SPEC.gearDragCd : 0) +
    0.045 * cl * cl +
    (state.onGround && controls.brakes ? 0.18 : 0);

  // Forces in world space
  const liftMag = q * AIRCRAFT_SPEC.wingAreaM2 * cl * groundEffect;
  const dragMag = q * AIRCRAFT_SPEC.wingAreaM2 * cd;
  const thrustMag = effectiveThrottle * AIRCRAFT_SPEC.maxThrustN * healthScale * togaFactor;

  const force = new THREE.Vector3(0, -AIRCRAFT_SPEC.massKg * GRAVITY, 0);
  force.addScaledVector(forward, thrustMag);
  force.addScaledVector(up, liftMag);
  if (speed > 0.2) {
    force.addScaledVector(airVel, -dragMag / speed);
  }
  // Side-slip aerodynamic keel stabilization
  force.addScaledVector(right, -vRight * Math.max(12, speed) * 42);

  // Compute G-load along aircraft vertical axis
  state.gLoad = Math.max(-2.5, Math.min(6.5, liftMag / (AIRCRAFT_SPEC.massKg * GRAVITY)));
  if (state.gLoad > 4.2 && !state.onGround) {
    state.hullPct = Math.max(15, state.hullPct - (state.gLoad - 4.2) * stepDt * 3.5);
  }
  if (state.overspeed) {
    state.hullPct = Math.max(20, state.hullPct - stepDt * 2.4);
  }

  // Angular authority scales gracefully with airspeed (responsive even at slow approach!)
  const authority = Math.min(1.15, Math.max(0.32, speed / 48));
  const pitchCmd = controls.pitch * 1.45 * authority;
  const rollCmd = -controls.roll * 2.15 * authority;
  const bankYawAssist = -Math.sin((state.rollDeg * Math.PI) / 180) * 0.42;
  const yawCmd = -controls.yaw * 0.95 * authority + (state.onGround ? -controls.yaw * 0.85 : bankYawAssist);

  // Natural weathervane stability + stall nose-drop
  const aoaRestore = state.onGround ? 0 : -aoaRad * 0.65;
  const stallDrop = isStalling ? -0.45 : 0;

  state.angularVel.x += (pitchCmd + aoaRestore + stallDrop - state.angularVel.x * 3.6) * stepDt * 4.5;
  state.angularVel.z += (rollCmd - state.angularVel.z * 4.2) * stepDt * 5.0;
  state.angularVel.y += (yawCmd - state.angularVel.y * 3.8) * stepDt * 4.2;

  if (isStalling) {
    // Subtle stall buffet
    state.angularVel.z += Math.sin(performance.now() * 0.025) * 0.35 * stepDt;
  }

  // Integrate velocity and position
  const accel = force.divideScalar(AIRCRAFT_SPEC.massKg);
  state.velocity.addScaledVector(accel, stepDt);
  state.position.addScaledVector(state.velocity, stepDt);

  // Integrate attitude quaternion in local body frame
  const dq = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      state.angularVel.x * stepDt,
      state.angularVel.y * stepDt,
      state.angularVel.z * stepDt,
      'YXZ',
    ),
  );
  state.quaternion.multiply(dq).normalize();

  // Ground / runway / ocean collision & landing detection
  const terrainY = sampleTerrainHeight(state.position.x, state.position.z);
  const surfaceY = Math.max(0, terrainY);
  const gearClearance = state.gearDown && state.gearIntact ? 2.45 : 1.35;

  if (state.position.y <= surfaceY + gearClearance) {
    const impactSink = -state.velocity.y;
    const hitWater = terrainY < 0.25;
    const rwyHit = getRunwayAt(state.position.x, state.position.z, 6);
    const absBank = Math.abs(state.rollDeg);
    const speedKts = state.velocity.length() * MPS_TO_KTS;

    if (!state.onGround && impactSink > 0.6) {
      // Initial touchdown or impact!
      if (hitWater && speedKts > 62) {
        triggerCrash(
          state,
          'HIGH-SPEED WATER IMPACT',
          `Impacted sea at ${Math.round(speedKts)} kt with -${impactSink.toFixed(1)} m/s sink rate.`,
          impactSink,
          speedKts,
          absBank,
          false,
        );
        events?.onCrash?.(state.incidentReport);
      } else if (impactSink > AIRCRAFT_SPEC.crashSinkMps || absBank > 28) {
        const reason =
          absBank > 28
            ? `WINGTIP STRIKE (${Math.round(absBank)}° BANK)`
            : 'HARD LANDING — GEAR COLLAPSE';
        triggerCrash(
          state,
          reason,
          `Touchdown sink -${impactSink.toFixed(1)} m/s (limit 4.6 m/s) at ${Math.round(speedKts)} kt, bank ${Math.round(absBank)}°.`,
          impactSink,
          speedKts,
          absBank,
          Boolean(rwyHit),
        );
        events?.onCrash?.(state.incidentReport);
      } else if (!state.gearDown && !hitWater) {
        // Gear-up belly scrape — survivable if slow, damages hull heavily
        state.hullPct = Math.max(12, state.hullPct - 42);
        state.engineHealth = Math.max(40, state.engineHealth - 28);
        if (speedKts > 78) {
          triggerCrash(
            state,
            'GEAR-UP BELLY IMPACT',
            `Landed with gear retracted at ${Math.round(speedKts)} kt (hull breached).`,
            impactSink,
            speedKts,
            absBank,
            Boolean(rwyHit),
          );
          events?.onCrash?.(state.incidentReport);
        } else {
          events?.onTouchdown?.({ sinkMps: impactSink, hard: true, onRunway: Boolean(rwyHit), gearUp: true });
        }
      } else if (!rwyHit && !hitWater && speedKts > 68) {
        // Rough off-runway terrain impact
        triggerCrash(
          state,
          'OFF-RUNWAY TERRAIN IMPACT',
          `Struck uneven volcanic terrain at ${Math.round(speedKts)} kt (-${impactSink.toFixed(1)} m/s).`,
          impactSink,
          speedKts,
          absBank,
          false,
        );
        events?.onCrash?.(state.incidentReport);
      } else {
        // Survivable touchdown!
        const hard = impactSink > AIRCRAFT_SPEC.maxSafeSinkMps;
        if (hard) {
          state.hullPct = Math.max(25, state.hullPct - Math.round((impactSink - 3.5) * 9));
          state.gearIntact = impactSink < 7.2;
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

    state.position.y = surfaceY + gearClearance;
    if (state.velocity.y < 0) state.velocity.y = 0;
    state.onGround = true;

    // Level wings on ground roll & apply rolling friction + brakes
    const e = new THREE.Euler().setFromQuaternion(state.quaternion, 'YXZ');
    e.z *= Math.max(0, 1 - stepDt * 7);
    if (e.x < -0.02) e.x *= Math.max(0, 1 - stepDt * 6);
    state.quaternion.setFromEuler(e);

    const friction = (rwyHit ? 0.25 : 1.15) + (controls.brakes ? 1.85 : 0);
    state.velocity.x *= Math.max(0, 1 - friction * stepDt);
    state.velocity.z *= Math.max(0, 1 - friction * stepDt);

    // Full-stop landing completion check
    if (state.status === 'flying' && rwyHit && state.velocity.length() < 4.5 && state.throttle < 0.2) {
      state.touchdownTimer += stepDt;
      if (state.touchdownTimer > 1.2) {
        state.status = 'landed';
        state.incidentReport = {
          outcome: 'LANDED',
          title: `SAFE LANDING — ${rwyHit.runway.name.toUpperCase()}`,
          detail: `Stopped cleanly on ${rwyHit.runway.id}. Fuel ${Math.round(state.fuelPct)}%, Hull ${Math.round(state.hullPct)}%.`,
          runwayId: rwyHit.runway.id,
          fuelPct: state.fuelPct,
          hullPct: state.hullPct,
        };
        events?.onFullStop?.(state.incidentReport);
      }
    } else {
      state.touchdownTimer = 0;
    }
  } else {
    state.onGround = false;
    state.touchdownTimer = 0;
  }

  // Keep inside outer sea boundary gracefully
  const distOrigin = Math.hypot(state.position.x, state.position.z);
  if (distOrigin > 3900) {
    const pull = new THREE.Vector3(-state.position.x, 0, -state.position.z).normalize();
    state.velocity.addScaledVector(pull, stepDt * 18);
  }

  updateDerivedTelemetry(state, windVec);
}

function triggerCrash(state, title, detail, sinkMps, speedKts, bankDeg, onRunway) {
  state.status = 'crashed';
  state.hullPct = Math.min(state.hullPct, 18);
  state.engineHealth = Math.min(state.engineHealth, 15);
  state.gearIntact = false;
  state.throttle = 0;
  state.incidentReport = {
    outcome: 'CRASHED',
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
