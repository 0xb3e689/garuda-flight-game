// Core simulation constants, aerodynamic envelopes, and world landmarks for Garuda.
export const WORLD_SIZE = 9200, OCEAN_RADIUS = 19000, GRAVITY = 9.81, MPS_TO_KTS = 1.943844, M_TO_FT = 3.28084, FLAP_ANGLES = [0, 15, 30];

export const AIRCRAFT_SPEC = {
  massKg: 4200, wingAreaM2: 34, airDensity: 1.225, maxThrustN: 24500, togaMultiplier: 1.18,
  stallAlphaDeg: 16.5, maxSafeSinkMps: 4.6, crashSinkMps: 8.8, maxSafeBankLandDeg: 14, vneKts: 215,
  baseDragCd0: 0.032, flapDragCd: [0, 0.022, 0.052], flapLiftCl: [0, 0.34, 0.68], gearDragCd: 0.028,
  fuelCapacityKg: 320, baseFuelBurnKgS: 0.38,
};

export const RUNWAYS = [
  { id: 'RWY36', name: 'Merpati Coastal Strip', code: '36', reciprocal: '18', x: 0, z: 0, elevation: 14, headingDeg: 0, length: 620, width: 36, papiOffset: { lateral: -27, along: 195 }, windsockOffset: { lateral: 36, along: 120 } },
  { id: 'RWY09', name: 'Karang Cliffside Strip', code: '09', reciprocal: '27', x: 1200, z: -1250, elevation: 68, headingDeg: 90, length: 480, width: 32, papiOffset: { lateral: -24, along: 155 }, windsockOffset: { lateral: 30, along: 80 } },
  { id: 'RWY04', name: 'Shoal Emergency Strip', code: '04', reciprocal: '22', x: -760, z: 860, elevation: 8.5, headingDeg: 35, length: 420, width: 30, papiOffset: { lateral: -23, along: 130 }, windsockOffset: { lateral: 28, along: 60 } },
];

export const LANDMARKS = {
  lighthouse: { x: 250, z: 430, baseElevation: 24 },
  bridge: { xStart: 430, xEnd: 870, z: -340, deckY: 54 },
  calderaCenter: { x: -1040, z: -1460, floorY: 215, dropX: -1020, dropZ: -1440 },
  rescueVessel: { x: -1180, z: 680 },
  harbor: { x: -210, z: 320 },
};
