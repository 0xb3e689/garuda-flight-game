// Sculpted, aerodynamic multi-part 3D aircraft builder for the Garuda G-4 twin-turboprop:
// contoured fuselage with riveted livery, NACA airfoil extruded wings & tail, tapered nacelles
// with motion-blurred props, glowing nav halos, landing beams, and real-time shadow casting.

import * as THREE from 'three';
import { GRAVITY } from './config.js';
import {
  createAircraftSkinTexture,
  createSoftParticleTexture,
  createWingTexture,
} from './procedural-textures.js';
import { sampleTerrainHeight } from './terrain-world.js';

function createAirfoilGeometry(chord, thickness, span) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(chord * 0.14, thickness * 0.95, chord * 0.45, thickness * 0.85, chord, 0);
  shape.bezierCurveTo(chord * 0.55, -thickness * 0.22, chord * 0.16, -thickness * 0.38, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: span,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.03,
  });
  // Align so span is centered along X (-span/2 .. +span/2), leading edge at -Z, trailing at +Z
  geo.rotateY(-Math.PI / 2);
  geo.translate(span * 0.5, 0, -chord * 0.45);
  geo.computeVertexNormals();

  // Assign crisp planar top-down UVs so leading-edge boot, panel ribs & wingtip bands map cleanly!
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const u = Math.max(0, Math.min(1, (x + span * 0.5) / span));
    const v = Math.max(0, Math.min(1, 1 - (z + chord * 0.45) / chord));
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  return geo;
}

function createSweptFinGeometry() {
  // 2D shape: x runs from 0 (leading root) to 2.9 (trailing root), y runs 0..3.35 (height)
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(2.95, 0);
  shape.lineTo(3.25, 3.25);
  shape.lineTo(1.85, 3.35);
  shape.lineTo(0.65, 1.15);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.03,
    bevelThickness: 0.03,
  });
  // Rotate -90 deg around Y so +X maps to +Z (aft toward tail!), centered on X = 0
  geo.rotateY(-Math.PI / 2);
  geo.translate(0.12, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function enableShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

export function createAircraftModel(scene) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skinTex = createAircraftSkinTexture();
  const wingTex = createWingTexture();
  const propDiscTex = createSoftParticleTexture('prop');
  const glowTex = createSoftParticleTexture('glow');

  const fuselageMat = new THREE.MeshStandardMaterial({
    map: skinTex,
    roughness: 0.36,
    metalness: 0.22,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    map: wingTex,
    roughness: 0.38,
    metalness: 0.18,
  });
  const ivoryMat = new THREE.MeshStandardMaterial({ color: '#f3ede0', roughness: 0.38, metalness: 0.18 });
  const tealMat = new THREE.MeshStandardMaterial({ color: '#13495e', roughness: 0.36, metalness: 0.28 });
  const vermilionMat = new THREE.MeshStandardMaterial({ color: '#e55320', roughness: 0.34, metalness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#f5ab29', roughness: 0.32, metalness: 0.36 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: '#242c34', roughness: 0.45, metalness: 0.68 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#d0dae2', roughness: 0.22, metalness: 0.85 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#181b1f', roughness: 0.92, metalness: 0.04 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#1b3e52',
    roughness: 0.1,
    metalness: 0.72,
    transparent: true,
    opacity: 0.46,
  });

  // 1. Contoured Aerodynamic Fuselage (nose radome -> stepped cockpit -> main cabin -> tapered tailcone)
  const mainCabin = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 5.7, 18), fuselageMat);
  mainCabin.rotation.x = Math.PI / 2;
  mainCabin.rotation.y = Math.PI / 2;
  mainCabin.scale.set(1.0, 0.96, 1.06);
  mainCabin.position.set(0, 0.12, -0.1);
  body.add(mainCabin);

  // Side flat livery panels for crisp Garuda registration readability
  const leftSidePanel = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.9), fuselageMat);
  leftSidePanel.position.set(-1.22, 0.12, -0.1);
  leftSidePanel.rotation.y = -Math.PI / 2;
  body.add(leftSidePanel);
  const rightSidePanel = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.9), fuselageMat);
  rightSidePanel.position.set(1.22, 0.12, -0.1);
  rightSidePanel.rotation.y = Math.PI / 2;
  body.add(rightSidePanel);

  // Amphibious stepped boat-hull keel + dorsal fairing spine
  const keel = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.75, 6.2, 12), tealMat);
  keel.rotation.x = Math.PI / 2;
  keel.scale.set(1.08, 1.0, 0.44);
  keel.position.set(0, -0.95, -0.35);
  body.add(keel);

  const wingRootFairing = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.15, 3.6, 14), ivoryMat);
  wingRootFairing.rotation.x = Math.PI / 2;
  wingRootFairing.scale.set(1.15, 1.0, 0.45);
  wingRootFairing.position.set(0, 1.26, -0.45);
  body.add(wingRootFairing);

  // Sculpted Tapered Nose + Weather Radome
  const noseTaper = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 1.16, 2.3, 16), ivoryMat);
  noseTaper.rotation.x = Math.PI / 2;
  noseTaper.scale.set(1.02, 1.0, 0.72);
  noseTaper.position.set(0, -0.18, -4.0);
  body.add(noseTaper);

  const radome = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), darkMetalMat);
  radome.scale.set(0.96, 0.74, 1.48);
  radome.position.set(0, -0.24, -5.25);
  body.add(radome);

  // Contoured Cockpit Greenhouse + Glowing Avionics Console & Pilots
  const canopyGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.18, 2.05, 14, 1, false, -Math.PI * 0.55, Math.PI * 1.1), glassMat);
  canopyGlass.rotation.x = Math.PI / 2 + 0.28;
  canopyGlass.rotation.z = Math.PI;
  canopyGlass.position.set(0, 0.76, -3.28);
  body.add(canopyGlass);

  for (const fx of [-0.72, 0, 0.72]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.18, 0.08), darkMetalMat);
    mullion.position.set(fx, 0.88, -3.72);
    mullion.rotation.x = 0.46;
    body.add(mullion);
  }

  // Warm + cyan glowing cockpit interior avionics (visible in chase view!)
  const cockpitGlow = new THREE.Mesh(
    new THREE.BoxGeometry(1.58, 0.36, 0.48),
    new THREE.MeshBasicMaterial({ color: '#45f5d2' }),
  );
  cockpitGlow.position.set(0, 0.58, -3.42);
  body.add(cockpitGlow);

  const cockpitAmber = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.14, 0.24),
    new THREE.MeshBasicMaterial({ color: '#ffbd3d' }),
  );
  cockpitAmber.position.set(0, 0.8, -3.32);
  body.add(cockpitAmber);

  for (const px of [-0.42, 0.42]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), darkMetalMat);
    head.position.set(px, 0.94, -2.55);
    body.add(head);
  }

  // Warm illuminated side cabin porthole windows with metallic frames
  const winGlowMat = new THREE.MeshStandardMaterial({
    color: '#254a5c',
    emissive: '#ffcf7d',
    emissiveIntensity: 0.62,
    roughness: 0.18,
  });
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, 0.72), darkMetalMat);
      frame.position.set(side * 1.21, 0.44, -1.55 + i * 1.14);
      body.add(frame);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.58), winGlowMat);
      win.position.set(side * 1.22, 0.44, -1.55 + i * 1.14);
      body.add(win);
    }
  }

  // Rear fractured cabin bulkhead (hidden intact; exposed when tailboom snaps off on crash!)
  const fractureBulkhead = new THREE.Group();
  fractureBulkhead.position.set(0, 0.14, 2.72);
  const darkCharMat = new THREE.MeshStandardMaterial({ color: '#14191e', roughness: 0.92, metalness: 0.45 });
  const tornCap = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.18, 0.18, 14), darkCharMat);
  tornCap.rotation.x = Math.PI / 2;
  fractureBulkhead.add(tornCap);
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * Math.PI * 2 + 0.3;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.65 + (s % 2) * 0.3), darkMetalMat);
    rib.position.set(Math.cos(a) * 0.85, Math.sin(a) * 0.72, 0.34);
    rib.rotation.set((s % 3 - 1) * 0.25, (s % 2 ? 1 : -1) * 0.3, a);
    fractureBulkhead.add(rib);
  }
  fractureBulkhead.visible = false;
  body.add(fractureBulkhead);

  const dorsalAnt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.42), darkMetalMat);
  dorsalAnt.position.set(0, 1.88, 1.35);
  dorsalAnt.rotation.x = -0.36;
  body.add(dorsalAnt);

  // 2. Continuous NACA Airfoil High-Mounted Wing SPLIT into Main Wing + REAL Detachable Left Outer Wing!
  // On high-energy crash, the actual left outer wing (+ aileron + winglet + red nav light) shears off & tumbles away!
  const wingAssembly = new THREE.Group();
  const mainWing = new THREE.Mesh(createAirfoilGeometry(2.45, 0.34, 12.6), wingMat);
  mainWing.position.set(2.1, 1.48, -0.55); // spans x = -4.2 .. +8.4
  wingAssembly.add(mainWing);

  // Torn wing-spar fracture stub at x = -4.2 (exposed ONLY when left outer wing physically breaks off!)
  const wingFractureStub = new THREE.Group();
  wingFractureStub.position.set(-4.2, 1.48, -0.55);
  for (const sz of [-0.45, 0.35]) {
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.14), darkCharMat);
    spar.position.set(-0.24, 0, sz);
    spar.rotation.z = 0.12;
    wingFractureStub.add(spar);
  }
  wingFractureStub.visible = false;
  wingAssembly.add(wingFractureStub);

  // Detachable Left Outer Wing Assembly (pivoted at fracture seam x = -4.2, y = 1.48, z = -0.55)
  const LEFT_WING_PIVOT = new THREE.Vector3(-4.2, 1.48, -0.55);
  const leftOuterWing = new THREE.Group();
  leftOuterWing.position.copy(LEFT_WING_PIVOT);
  const leftWingPanel = new THREE.Mesh(createAirfoilGeometry(2.45, 0.34, 4.2), wingMat);
  leftWingPanel.position.set(-2.1, 0, 0); // spans local x = -4.2 .. 0 -> world x = -8.4 .. -4.2
  leftOuterWing.add(leftWingPanel);

  const leftWinglet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.25, 1.48), goldMat);
  leftWinglet.position.set(-4.35, 2.02 - LEFT_WING_PIVOT.y, -0.2 - LEFT_WING_PIVOT.z);
  leftWinglet.rotation.z = 0.24;
  leftWinglet.rotation.y = -0.08;
  leftOuterWing.add(leftWinglet);

  const rightWinglet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.25, 1.48), goldMat);
  rightWinglet.position.set(8.55, 2.02, -0.2);
  rightWinglet.rotation.z = -0.24;
  rightWinglet.rotation.y = 0.08;
  wingAssembly.add(rightWinglet);

  for (const side of [-1, 1]) {
    const pA = new THREE.Vector3(side * 1.08, -0.58, -0.55);
    const pB = new THREE.Vector3(side * 3.85, 1.44, -0.55);
    const strutVec = pB.clone().sub(pA);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, strutVec.length(), 10), tealMat);
    strut.scale.set(1.0, 1.0, 1.9);
    strut.position.copy(pA).add(pB).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strutVec.clone().normalize());
    wingAssembly.add(strut);
  }
  wingAssembly.add(leftOuterWing);
  body.add(wingAssembly);

  // Articulated Ailerons & Inner Flaps (left aileron rides on leftOuterWing so it detaches WITH the broken wing!)
  const leftAileronPivot = new THREE.Group();
  leftAileronPivot.position.set(-6.1 - LEFT_WING_PIVOT.x, 1.54 - LEFT_WING_PIVOT.y, 0.68 - LEFT_WING_PIVOT.z);
  const leftAilMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.13, 0.56), vermilionMat);
  leftAilMesh.position.z = 0.28;
  leftAileronPivot.add(leftAilMesh);
  leftOuterWing.add(leftAileronPivot);

  const rightAileronPivot = new THREE.Group();
  rightAileronPivot.position.set(6.1, 1.54, 0.68);
  const rightAilMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.13, 0.56), vermilionMat);
  rightAilMesh.position.z = 0.28;
  rightAileronPivot.add(rightAilMesh);
  body.add(rightAileronPivot);

  const leftFlapPivot = new THREE.Group();
  leftFlapPivot.position.set(-2.75, 1.42, 0.66);
  const leftFlapMesh = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.14, 0.68), goldMat);
  leftFlapMesh.position.z = 0.34;
  leftFlapPivot.add(leftFlapMesh);
  body.add(leftFlapPivot);

  const rightFlapPivot = new THREE.Group();
  rightFlapPivot.position.set(2.75, 1.42, 0.66);
  const rightFlapMesh = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.14, 0.68), goldMat);
  rightFlapMesh.position.z = 0.34;
  rightFlapPivot.add(rightFlapMesh);
  body.add(rightFlapPivot);

  // 3. Sculpted Twin Wing-Mounted Turboprop Nacelles + Motion-Blurred Spinning Props
  const props = [];
  for (const side of [-1, 1]) {
    const nac = new THREE.Group();
    nac.position.set(side * 3.15, 1.24, -1.65);

    const cowlMain = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.64, 2.7, 16), tealMat);
    cowlMain.rotation.x = Math.PI / 2;
    nac.add(cowlMain);

    const cowlTail = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.24, 1.6, 14), ivoryMat);
    cowlTail.rotation.x = Math.PI / 2;
    cowlTail.position.z = 2.05;
    nac.add(cowlTail);

    const cowlRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.065, 8, 16), vermilionMat);
    cowlRing.position.z = -1.32;
    nac.add(cowlRing);

    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.38, 1.15), darkMetalMat);
    intake.position.set(0, -0.48, -0.78);
    nac.add(intake);

    // Metallic turbine exhaust stacks
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.72, 10), chromeMat);
    exhaust.rotation.z = side * 0.45;
    exhaust.rotation.x = 0.45;
    exhaust.position.set(side * 0.48, -0.18, -0.45);
    nac.add(exhaust);

    // Exposed shaft stub inside nacelle (visible if propeller breaks off on crash!)
    const shaftStub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.45, 10), chromeMat);
    shaftStub.rotation.x = Math.PI / 2;
    shaftStub.position.z = -1.48;
    nac.add(shaftStub);

    // Detachable Propeller + Spinner Assembly (physically shears off & tumbles away on prop strike / crash!)
    const propDetachGroup = new THREE.Group();
    propDetachGroup.position.set(0, 0, -1.64);

    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.98, 14), vermilionMat);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.z = -0.24;
    propDetachGroup.add(spinner);

    // 3-blade twisted propeller + textured radial motion-blur disc
    const propHub = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.17, 2.38, 0.045);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, darkMetalMat);
      blade.rotation.z = (b * Math.PI * 2) / 3;
      blade.rotation.y = 0.24;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.055), goldMat);
      tip.position.y = 1.08;
      blade.add(tip);
      propHub.add(blade);
    }
    const blurDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.28, 24),
      new THREE.MeshBasicMaterial({
        map: propDiscTex,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    propHub.add(blurDisc);
    propDetachGroup.add(propHub);
    nac.add(propDetachGroup);
    props.push({ propHub, blurDisc, detachGroup: propDetachGroup, nacelle: nac });
    body.add(nac);
  }

  // 4. Detachable Tailboom + Swept Empennage Assembly (pivoted at rear cabin seam z=2.75; shears off & tumbles away on crash!)
  const TAIL_PIVOT = new THREE.Vector3(0, 0.25, 2.75);
  const tailAssembly = new THREE.Group();
  tailAssembly.position.copy(TAIL_PIVOT);

  const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 1.22, 5.6, 16), ivoryMat);
  tailBoom.rotation.x = Math.PI / 2;
  tailBoom.scale.set(0.88, 1, 0.98);
  tailBoom.position.set(0, 0.28 - TAIL_PIVOT.y, 5.45 - TAIL_PIVOT.z);
  tailAssembly.add(tailBoom);

  const tailBelly = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.96, 5.3, 12), tealMat);
  tailBelly.rotation.x = Math.PI / 2;
  tailBelly.scale.set(0.92, 1, 0.5);
  tailBelly.position.set(0, -0.22 - TAIL_PIVOT.y, 5.3 - TAIL_PIVOT.z);
  tailAssembly.add(tailBelly);

  const tailSnapCap = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.14, 14), darkCharMat);
  tailSnapCap.rotation.x = Math.PI / 2;
  tailSnapCap.position.set(0, -0.05, 0.02);
  tailAssembly.add(tailSnapCap);

  const vFin = new THREE.Mesh(createSweptFinGeometry(), tealMat);
  vFin.position.set(0, 0.65 - TAIL_PIVOT.y, 5.02 - TAIL_PIVOT.z);
  tailAssembly.add(vFin);

  const finStripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.82, 1.38), vermilionMat);
  finStripe.position.set(0, 3.12 - TAIL_PIVOT.y, 7.36 - TAIL_PIVOT.z);
  finStripe.rotation.x = -0.1;
  tailAssembly.add(finStripe);

  const finGold = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.24, 1.48), goldMat);
  finGold.position.set(0, 2.6 - TAIL_PIVOT.y, 7.28 - TAIL_PIVOT.z);
  finGold.rotation.x = -0.1;
  tailAssembly.add(finGold);

  const rudderPivot = new THREE.Group();
  rudderPivot.position.set(0, 2.28 - TAIL_PIVOT.y, 8.22 - TAIL_PIVOT.z);
  const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 3.05, 0.72), goldMat);
  rudderMesh.position.z = 0.36;
  rudderPivot.add(rudderMesh);
  tailAssembly.add(rudderPivot);

  const hStab = new THREE.Mesh(createAirfoilGeometry(1.42, 0.18, 6.4), ivoryMat);
  hStab.position.set(0, 1.48 - TAIL_PIVOT.y, 7.22 - TAIL_PIVOT.z);
  tailAssembly.add(hStab);

  const elevatorPivot = new THREE.Group();
  elevatorPivot.position.set(0, 1.48 - TAIL_PIVOT.y, 7.98 - TAIL_PIVOT.z);
  const elevatorMesh = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.14, 0.56), vermilionMat);
  elevatorMesh.position.z = 0.28;
  elevatorPivot.add(elevatorMesh);
  tailAssembly.add(elevatorPivot);
  body.add(tailAssembly);

  // 5. Navigation & Anti-Collision Strobe Lights with Soft Additive Halo Sprites
  function makeLightHalo(color, pos, scale = 1.6, parent = body) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color }));
    bulb.position.copy(pos);
    parent.add(bulb);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.copy(pos);
    halo.scale.setScalar(scale);
    parent.add(halo);
    return halo;
  }

  // Standard ICAO/FAA wingtip navigation lights (Port Red on leftOuterWing so it detaches WITH broken wing; Starboard Green on right)
  makeLightHalo(
    '#ff3b30',
    new THREE.Vector3(-8.62 - LEFT_WING_PIVOT.x, 1.65 - LEFT_WING_PIVOT.y, -0.95 - LEFT_WING_PIVOT.z),
    1.35,
    leftOuterWing,
  );
  makeLightHalo('#34d399', new THREE.Vector3(8.62, 1.65, -0.95), 1.35);
  const tailStrobeHalo = makeLightHalo(
    '#fff7d6',
    new THREE.Vector3(0, 4.08 - TAIL_PIVOT.y, 7.62 - TAIL_PIVOT.z),
    1.7,
    tailAssembly,
  );

  // Warm embedded wing leading-edge landing light halos (clean aviation glow without intrusive cones)
  const landingLightGroup = new THREE.Group();
  for (const sx of [-1.55, 1.55]) {
    const lampHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#fff4c8',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    lampHalo.position.set(sx, 1.38, -1.78);
    lampHalo.scale.setScalar(1.8);
    landingLightGroup.add(lampHalo);
  }
  body.add(landingLightGroup);

  // 6. Detailed Retractable Tricycle Landing Gear (oleo chrome struts + wheel fairings)
  const gearGroup = new THREE.Group();
  const makeWheelAssembly = (x, z, wheelR) => {
    const g = new THREE.Group();
    g.position.set(x, -0.98, z);
    const upperStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.72, 10), darkMetalMat);
    upperStrut.position.y = -0.36;
    g.add(upperStrut);
    const oleo = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.56, 10), chromeMat);
    oleo.position.y = -0.92;
    g.add(oleo);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.36, 16), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.y = -1.24;
    g.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.46, wheelR * 0.46, 0.39, 12), chromeMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.y = -1.24;
    g.add(hub);
    return g;
  };
  gearGroup.add(makeWheelAssembly(0, -3.75, 0.36));
  gearGroup.add(makeWheelAssembly(-1.7, 0.45, 0.48));
  gearGroup.add(makeWheelAssembly(1.7, 0.45, 0.48));
  body.add(gearGroup);

  enableShadows(body);
  scene.add(root);

  // Generic real-part physical detachment engine: Tailboom, Left Outer Wing, and Left Propeller physically break off the model!
  const detachedParts = {
    tail: {
      detached: false,
      mesh: tailAssembly,
      parent: body,
      restPos: TAIL_PIVOT.clone(),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      floorOffset: 1.05,
    },
    leftWing: {
      detached: false,
      mesh: leftOuterWing,
      parent: wingAssembly,
      restPos: LEFT_WING_PIVOT.clone(),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      floorOffset: 0.45,
    },
    leftProp: {
      detached: false,
      mesh: props[0].detachGroup,
      parent: props[0].nacelle,
      restPos: new THREE.Vector3(0, 0, -1.64),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(),
      floorOffset: 0.55,
    },
  };

  function reattachAllParts() {
    for (const key of Object.keys(detachedParts)) {
      const p = detachedParts[key];
      if (!p.detached) continue;
      scene.remove(p.mesh);
      p.parent.add(p.mesh);
      p.mesh.position.copy(p.restPos);
      p.mesh.quaternion.identity();
      p.mesh.rotation.set(0, 0, 0);
      p.mesh.visible = true;
      p.detached = false;
    }
    fractureBulkhead.visible = false;
    wingFractureStub.visible = false;
  }

  function detachPartNow(key, flightState, impulseLocal, angVelVec) {
    const p = detachedParts[key];
    if (!p || p.detached) return;
    p.detached = true;
    if (key === 'tail') fractureBulkhead.visible = true;
    if (key === 'leftWing') wingFractureStub.visible = true;

    root.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    p.mesh.getWorldPosition(worldPos);
    p.mesh.getWorldQuaternion(worldQuat);
    p.parent.remove(p.mesh);
    scene.add(p.mesh);
    p.mesh.position.copy(worldPos);
    p.mesh.quaternion.copy(worldQuat);
    p.mesh.visible = true;

    const impulseWorld = impulseLocal.clone().applyQuaternion(flightState.quaternion);
    p.vel.copy(flightState.velocity).multiplyScalar(0.35).add(impulseWorld);
    p.vel.y = Math.max(p.vel.y, flightState.crashMode === 'water' ? 2.4 : impulseLocal.y);
    p.angVel.copy(angVelVec);
  }

  function stepDetachedParts(dt, crashMode, visibleInChase) {
    const stepDt = Math.min(0.05, dt);
    for (const key of Object.keys(detachedParts)) {
      const p = detachedParts[key];
      if (!p.detached) continue;
      p.mesh.visible = visibleInChase;

      const terrainY = sampleTerrainHeight(p.mesh.position.x, p.mesh.position.z);
      const overWater = terrainY < -0.25 || crashMode === 'water';

      if (overWater && p.mesh.position.y <= 0.35) {
        p.vel.x *= Math.max(0, 1 - stepDt * 4.2);
        p.vel.z *= Math.max(0, 1 - stepDt * 4.2);
        p.vel.y = Math.max(-1.6, p.vel.y - stepDt * 1.4);
        if (p.vel.y > 0) p.vel.y = 0;
        if (p.mesh.position.y > -11) p.mesh.position.addScaledVector(p.vel, stepDt);
        p.angVel.multiplyScalar(Math.max(0, 1 - stepDt * 2.5));
      } else {
        p.vel.y -= GRAVITY * stepDt;
        p.mesh.position.addScaledVector(p.vel, stepDt);
        const floorY = Math.max(0, terrainY) + p.floorOffset;
        if (p.mesh.position.y <= floorY) {
          p.mesh.position.y = floorY;
          if (p.vel.y < 0) p.vel.y = 0;
          const horizSpeed = Math.hypot(p.vel.x, p.vel.z);
          if (horizSpeed > 0.35) {
            const factor = Math.max(0, 1 - (15.5 * stepDt) / horizSpeed);
            p.vel.x *= factor;
            p.vel.z *= factor;
          } else {
            p.vel.set(0, 0, 0);
            p.angVel.set(0, 0, 0);
          }
          if (key === 'tail') {
            const e = new THREE.Euler().setFromQuaternion(p.mesh.quaternion, 'YXZ');
            e.x += (0.04 - e.x) * Math.min(1, stepDt * 5.5);
            e.z += (1.12 - e.z) * Math.min(1, stepDt * 5.0);
            p.mesh.quaternion.setFromEuler(e);
            p.angVel.multiplyScalar(Math.max(0, 1 - stepDt * 6.5));
            continue;
          }
          p.angVel.multiplyScalar(Math.max(0, 1 - stepDt * 6.0));
        }
      }

      if (p.angVel.lengthSq() > 0.0004) {
        const dq = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(p.angVel.x * stepDt, p.angVel.y * stepDt, p.angVel.z * stepDt, 'YXZ'),
        );
        p.mesh.quaternion.multiply(dq).normalize();
      }
    }
  }

  function updateAircraftModel(flightState, dt, timeSec, visibleInChase) {
    root.position.copy(flightState.position);
    root.quaternion.copy(flightState.quaternion);
    body.visible = visibleInChase;

    // Realistic propeller spin-down inertia: blur disc fades smoothly to 0 as RPM drops, exposing physical 3D blades slowing to a halt!
    const rpmR = flightState.propRpm ?? 0;
    const rpmL = flightState.propRpmLeft ?? 0;
    props[0].propHub.rotation.z = flightState.propAngleLeft ?? flightState.propAngle;
    props[1].propHub.rotation.z = -flightState.propAngle;
    const discOpL = rpmL > 0.24 ? Math.min(0.84, (rpmL - 0.24) * 1.15) : 0;
    const discOpR = rpmR > 0.24 ? Math.min(0.84, (rpmR - 0.24) * 1.15) : 0;
    props[0].blurDisc.visible = discOpL > 0.02 && !detachedParts.leftProp.detached;
    props[0].blurDisc.material.opacity = discOpL;
    props[1].blurDisc.visible = discOpR > 0.02;
    props[1].blurDisc.material.opacity = discOpR;

    // Articulated control surface deflections
    leftAileronPivot.rotation.x = flightState.controlSurface.aileron * 0.45;
    rightAileronPivot.rotation.x = -flightState.controlSurface.aileron * 0.45;
    const flapRad = (flightState.controlSurface.flaps * Math.PI) / 180;
    leftFlapPivot.rotation.x = -flapRad;
    rightFlapPivot.rotation.x = -flapRad;
    elevatorPivot.rotation.x = -flightState.controlSurface.elevator * 0.42;
    rudderPivot.rotation.y = flightState.controlSurface.rudder * 0.45;

    // Energy-tiered REAL structural detachment:
    // - Low-speed hard crash ('hard'): left propeller physically shears off on prop-strike; wings & tail stay intact!
    // - High-speed catastrophic crash ('catastrophic'): left propeller, left outer wing, AND entire tailboom physically snap off!
    if (flightState.status === 'crashed') {
      const cat = flightState.crashSeverity !== 'hard';
      wingAssembly.rotation.set(cat ? 0.05 : 0.02, cat ? 0.08 : 0.03, cat ? -0.14 : -0.06);
      wingAssembly.position.set(cat ? 0.28 : 0.08, cat ? -0.08 : -0.04, cat ? 0.18 : 0.06);

      // Left prop always shears off on dry ground crash (prop strike); wing & tail only break off on catastrophic crash!
      if (flightState.crashMode !== 'water' && !detachedParts.leftProp.detached) {
        detachPartNow('leftProp', flightState, new THREE.Vector3(-4.2, 5.2, -7.8), new THREE.Vector3(6.5, 4.2, 9.5));
      }
      if (cat) {
        if (!detachedParts.tail.detached) {
          detachPartNow('tail', flightState, new THREE.Vector3(-4.8, 6.4, 8.2), new THREE.Vector3(-1.35, -1.9, 2.4));
        }
        if (!detachedParts.leftWing.detached) {
          detachPartNow('leftWing', flightState, new THREE.Vector3(-8.4, 5.6, 1.5), new THREE.Vector3(1.4, -2.2, 3.1));
        }
      }
      stepDetachedParts(dt, flightState.crashMode, visibleInChase);
    } else {
      reattachAllParts();
      tailAssembly.rotation.set(0, 0, 0);
      wingAssembly.rotation.set(0, 0, 0);
      wingAssembly.position.set(0, 0, 0);
    }

    // Landing gear & landing beam visibility
    gearGroup.visible = flightState.gearDown && flightState.gearIntact;
    landingLightGroup.visible = flightState.gearDown && flightState.status !== 'crashed';

    // Anti-collision strobe pulse
    const blink = Math.sin(timeSec * 10) > 0.65;
    tailStrobeHalo.scale.setScalar(blink ? 2.2 : 0.9);
  }

  return {
    root,
    updateAircraftModel,
    getDetachedTailWorldPos: () => (detachedParts.tail.detached ? tailAssembly.position.clone() : null),
    getDetachedPartsSummary: () => ({
      tail: detachedParts.tail.detached,
      leftWing: detachedParts.leftWing.detached,
      leftProp: detachedParts.leftProp.detached,
    }),
  };
}
