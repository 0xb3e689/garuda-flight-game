// Procedural multi-part 3D aircraft builder for the Garuda G-4 twin-turboprop utility plane:
// sculpted fuselage, lit canopy interior, articulated control surfaces, spinning twin props,
// retractable landing gear, nav strobes, damage smoke, and tire touchdown puffs.

import * as THREE from 'three';

function makeLiveryDecalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4efe2';
  ctx.fillRect(0, 0, 512, 128);
  // Ocean teal belly cheatline + vermilion Garuda flash
  ctx.fillStyle = '#155066';
  ctx.fillRect(0, 82, 512, 46);
  ctx.fillStyle = '#e85a24';
  ctx.fillRect(0, 68, 512, 14);
  ctx.fillStyle = '#f5a623';
  ctx.fillRect(0, 61, 512, 7);
  // Crisp registration lettering
  ctx.fillStyle = '#153445';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GARUDA  PK-GRD', 260, 44);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAircraftModel(scene) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const ivoryMat = new THREE.MeshStandardMaterial({ color: '#f3ede0', roughness: 0.42, metalness: 0.16 });
  const liveryMat = new THREE.MeshStandardMaterial({
    map: makeLiveryDecalTexture(),
    roughness: 0.4,
    metalness: 0.18,
  });
  const tealMat = new THREE.MeshStandardMaterial({ color: '#144c61', roughness: 0.44, metalness: 0.22 });
  const vermilionMat = new THREE.MeshStandardMaterial({ color: '#e65522', roughness: 0.38, metalness: 0.18 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#f4a922', roughness: 0.35, metalness: 0.32 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: '#272f38', roughness: 0.55, metalness: 0.6 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#181b1f', roughness: 0.9, metalness: 0.05 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#1b3847',
    roughness: 0.14,
    metalness: 0.65,
    transparent: true,
    opacity: 0.52,
  });

  // 1. Sculpted multi-section fuselage (nose -> cockpit -> main cabin -> tapered tailboom)
  const mainCabin = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.25, 5.8), liveryMat);
  mainCabin.position.set(0, 0.1, -0.1);
  body.add(mainCabin);

  // Rounded cabin dorsal roof
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.18, 5.7, 12), ivoryMat);
  roof.rotation.x = Math.PI / 2;
  roof.scale.set(1.0, 1.0, 0.48);
  roof.position.set(0, 1.18, -0.1);
  body.add(roof);

  // Amphibious ventral boat-hull keel
  const keel = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 6.2), tealMat);
  keel.position.set(0, -1.1, -0.2);
  body.add(keel);

  // Tapered nose cone & weather radome
  const noseUpper = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.35, 2.2), ivoryMat);
  noseUpper.position.set(0, -0.25, -4.05);
  body.add(noseUpper);

  const radome = new THREE.Mesh(new THREE.SphereGeometry(1.04, 14, 12), darkMetalMat);
  radome.scale.set(0.95, 0.72, 1.55);
  radome.position.set(0, -0.32, -5.25);
  body.add(radome);

  // Recessed cockpit windshield + glowing interior avionics console (visible even from chase cam!)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.18, 1.85), glassMat);
  windshield.position.set(0, 0.85, -3.25);
  windshield.rotation.x = 0.42;
  body.add(windshield);

  const canopyFrameCenter = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.24, 0.14), darkMetalMat);
  canopyFrameCenter.position.set(0, 0.88, -4.02);
  canopyFrameCenter.rotation.x = 0.42;
  body.add(canopyFrameCenter);

  // Lit cockpit interior glare & twin pilot silhouettes
  const cockpitGlow = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.42, 0.55),
    new THREE.MeshBasicMaterial({ color: '#3bf0c5' }),
  );
  cockpitGlow.position.set(0, 0.56, -3.45);
  body.add(cockpitGlow);

  const cockpitAmber = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.16, 0.25),
    new THREE.MeshBasicMaterial({ color: '#ffae2b' }),
  );
  cockpitAmber.position.set(0, 0.78, -3.35);
  body.add(cockpitAmber);

  for (const px of [-0.46, 0.46]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), darkMetalMat);
    head.position.set(px, 0.92, -2.55);
    body.add(head);
  }

  // Warm illuminated side cabin windows
  const winGlowMat = new THREE.MeshStandardMaterial({
    color: '#2c4f61',
    emissive: '#ffd58a',
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.62), winGlowMat);
      win.position.set(side * 1.19, 0.42, -1.55 + i * 1.12);
      body.add(win);
    }
  }

  // Tapered rear tailboom
  const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.32, 5.4, 10), ivoryMat);
  tailBoom.rotation.x = Math.PI / 2;
  tailBoom.scale.set(0.88, 1, 1.0);
  tailBoom.position.set(0, 0.35, 5.3);
  body.add(tailBoom);

  const tailStripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 4.8), vermilionMat);
  tailStripe.position.set(0, 0.18, 5.1);
  body.add(tailStripe);

  // Dorsal VHF antenna & beacon
  const dorsalAnt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.45), darkMetalMat);
  dorsalAnt.position.set(0, 1.95, 1.1);
  dorsalAnt.rotation.x = -0.35;
  body.add(dorsalAnt);

  // 2. High-Mounted Main Wing + Struts + Articulated Flaps & Ailerons
  const wingCenter = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.36, 2.35), ivoryMat);
  wingCenter.position.set(0, 1.35, -0.55);
  body.add(wingCenter);

  // Wing leading-edge de-ice boots & Garuda vermilion/gold wingtips
  const deIce = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.38, 0.32), darkMetalMat);
  deIce.position.set(0, 1.35, -1.68);
  body.add(deIce);

  for (const side of [-1, 1]) {
    const tipBand = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 2.38), vermilionMat);
    tipBand.position.set(side * 7.6, 1.35, -0.55);
    body.add(tipBand);

    const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.15, 1.45), goldMat);
    winglet.position.set(side * 8.48, 1.82, -0.35);
    winglet.rotation.z = -side * 0.24;
    body.add(winglet);

    // Wing bracing strut
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 8), tealMat);
    strut.position.set(side * 2.75, 0.1, -0.55);
    strut.rotation.z = side * 0.96;
    body.add(strut);
  }

  // Articulated Ailerons
  const leftAileronPivot = new THREE.Group();
  leftAileronPivot.position.set(-6.0, 1.32, 0.65);
  const leftAilMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.55), vermilionMat);
  leftAilMesh.position.z = 0.28;
  leftAileronPivot.add(leftAilMesh);
  body.add(leftAileronPivot);

  const rightAileronPivot = new THREE.Group();
  rightAileronPivot.position.set(6.0, 1.32, 0.65);
  const rightAilMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.55), vermilionMat);
  rightAilMesh.position.z = 0.28;
  rightAileronPivot.add(rightAilMesh);
  body.add(rightAileronPivot);

  // Articulated Inner Flaps
  const leftFlapPivot = new THREE.Group();
  leftFlapPivot.position.set(-2.7, 1.3, 0.62);
  const leftFlapMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.68), goldMat);
  leftFlapMesh.position.z = 0.34;
  leftFlapPivot.add(leftFlapMesh);
  body.add(leftFlapPivot);

  const rightFlapPivot = new THREE.Group();
  rightFlapPivot.position.set(2.7, 1.3, 0.62);
  const rightFlapMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.68), goldMat);
  rightFlapMesh.position.z = 0.34;
  rightFlapPivot.add(rightFlapMesh);
  body.add(rightFlapPivot);

  // 3. Twin Wing-Mounted Turboprop Nacelles + Spinning Propellers
  const props = [];
  for (const side of [-1, 1]) {
    const nac = new THREE.Group();
    nac.position.set(side * 3.1, 1.12, -1.65);

    const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.62, 2.9, 12), tealMat);
    cowl.rotation.x = Math.PI / 2;
    nac.add(cowl);

    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.9), darkMetalMat);
    intake.position.set(0, -0.45, -0.95);
    nac.add(intake);

    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.95, 12), vermilionMat);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.z = -1.85;
    nac.add(spinner);

    // 3-blade propeller + translucent motion blur disc
    const propHub = new THREE.Group();
    propHub.position.z = -1.68;
    const bladeGeo = new THREE.BoxGeometry(0.18, 2.35, 0.05);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(bladeGeo, darkMetalMat);
      blade.rotation.z = (b * Math.PI * 2) / 3;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.24, 0.06), goldMat);
      tip.position.y = 1.08;
      blade.add(tip);
      propHub.add(blade);
    }
    const blurDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.22, 20),
      new THREE.MeshBasicMaterial({
        color: '#dbe6ed',
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    propHub.add(blurDisc);
    nac.add(propHub);
    props.push({ propHub, blurDisc });
    body.add(nac);
  }

  // 4. Empennage (Vertical Fin + Garuda Flash + Rudder + Horizontal Stabilizer + Elevator)
  const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.25, 2.15), tealMat);
  vFin.position.set(0, 2.25, 7.25);
  vFin.rotation.x = -0.22;
  body.add(vFin);

  const finFlash = new THREE.Mesh(new THREE.BoxGeometry(0.31, 1.05, 1.85), vermilionMat);
  finFlash.position.set(0, 2.95, 7.12);
  finFlash.rotation.x = -0.22;
  body.add(finFlash);

  const rudderPivot = new THREE.Group();
  rudderPivot.position.set(0, 2.25, 8.22);
  const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.05, 0.78), goldMat);
  rudderMesh.position.z = 0.38;
  rudderPivot.add(rudderMesh);
  body.add(rudderPivot);

  const hStab = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.24, 1.35), ivoryMat);
  hStab.position.set(0, 1.45, 7.35);
  body.add(hStab);

  const elevatorPivot = new THREE.Group();
  elevatorPivot.position.set(0, 1.45, 8.02);
  const elevatorMesh = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.16, 0.58), vermilionMat);
  elevatorMesh.position.z = 0.28;
  elevatorPivot.add(elevatorMesh);
  body.add(elevatorPivot);

  // 5. Navigation & Strobe Lights (Port Red, Starboard Green, Tail White, Beacon)
  const portLight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
  portLight.position.set(-8.55, 1.45, -1.1);
  body.add(portLight);

  const stbdLight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: '#34d399' }));
  stbdLight.position.set(8.55, 1.45, -1.1);
  body.add(stbdLight);

  const tailStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: '#fff7d6' }));
  tailStrobe.position.set(0, 3.92, 7.45);
  body.add(tailStrobe);

  // 6. Retractable Tricycle Landing Gear
  const gearGroup = new THREE.Group();
  const makeWheelAssembly = (x, z, wheelR) => {
    const g = new THREE.Group();
    g.position.set(x, -1.05, z);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 1.25, 8), darkMetalMat);
    strut.position.y = -0.58;
    g.add(strut);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.34, 14), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.y = -1.2;
    g.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.48, wheelR * 0.48, 0.37, 10), ivoryMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.y = -1.2;
    g.add(hub);
    return g;
  };
  gearGroup.add(makeWheelAssembly(0, -3.7, 0.36));
  gearGroup.add(makeWheelAssembly(-1.65, 0.45, 0.46));
  gearGroup.add(makeWheelAssembly(1.65, 0.45, 0.46));
  body.add(gearGroup);

  scene.add(root);

  // 7. World-Space Particle Pools (Damage Smoke + Touchdown Tire Smoke + Sparks)
  const smokePool = [];
  const smokeGeo = new THREE.IcosahedronGeometry(1.1, 1);
  for (let i = 0; i < 36; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: '#343a40',
      transparent: true,
      opacity: 0,
      roughness: 1,
    });
    const m = new THREE.Mesh(smokeGeo, mat);
    m.visible = false;
    scene.add(m);
    smokePool.push({ mesh: m, mat, life: 0, maxLife: 1, vel: new THREE.Vector3(), grow: 1 });
  }
  let smokeCursor = 0;

  function spawnParticle(pos, vel, color, maxLife, baseScale, grow) {
    const p = smokePool[smokeCursor++ % smokePool.length];
    p.mesh.position.copy(pos);
    p.mesh.scale.setScalar(baseScale);
    p.mesh.visible = true;
    p.mat.color.set(color);
    p.mat.opacity = 0.78;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.vel.copy(vel);
    p.grow = grow;
  }

  function spawnTouchdownPuff(worldPos, hard) {
    for (let i = 0; i < (hard ? 10 : 6); i++) {
      const offset = new THREE.Vector3((Math.random() - 0.5) * 3.8, -1.6, (Math.random() - 0.5) * 2.5);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 6, 2.2 + Math.random() * 3.5, (Math.random() - 0.5) * 6);
      spawnParticle(
        worldPos.clone().add(offset),
        vel,
        hard && i % 2 === 0 ? '#ff8b3d' : '#eef2f6',
        1.2 + Math.random() * 0.6,
        0.9,
        2.6,
      );
    }
  }

  let smokeEmitTimer = 0;

  function updateAircraftModel(flightState, dt, timeSec, visibleInChase) {
    root.position.copy(flightState.position);
    root.quaternion.copy(flightState.quaternion);
    body.visible = visibleInChase;

    // Spin twin propellers
    props[0].propHub.rotation.z = flightState.propAngle;
    props[1].propHub.rotation.z = -flightState.propAngle * (flightState.engineHealth < 55 ? 0.45 : 1.0);
    const discOpacity = Math.min(0.32, 0.08 + flightState.throttle * 0.24);
    props[0].blurDisc.material.opacity = discOpacity;
    props[1].blurDisc.material.opacity = discOpacity * (flightState.engineHealth / 100);

    // Control surface deflections
    leftAileronPivot.rotation.x = flightState.controlSurface.aileron * 0.45;
    rightAileronPivot.rotation.x = -flightState.controlSurface.aileron * 0.45;
    const flapRad = (flightState.controlSurface.flaps * Math.PI) / 180;
    leftFlapPivot.rotation.x = -flapRad;
    rightFlapPivot.rotation.x = -flapRad;
    elevatorPivot.rotation.x = -flightState.controlSurface.elevator * 0.42;
    rudderPivot.rotation.y = flightState.controlSurface.rudder * 0.45;

    // Landing gear retraction
    gearGroup.visible = flightState.gearDown && flightState.gearIntact;

    // Strobe blink
    const blink = Math.sin(timeSec * 10) > 0.72;
    tailStrobe.scale.setScalar(blink ? 1.55 : 0.7);

    // Starboard engine damage smoke trail
    if (flightState.hullPct < 75 || flightState.engineHealth < 75 || flightState.status === 'crashed') {
      smokeEmitTimer += dt;
      const emitInterval = flightState.status === 'crashed' ? 0.08 : 0.055;
      if (smokeEmitTimer >= emitInterval) {
        smokeEmitTimer = 0;
        const stbdEngineWorld = new THREE.Vector3(3.1, 1.0, 0.2)
          .applyQuaternion(flightState.quaternion)
          .add(flightState.position);
        const drift = new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          3.5 + Math.random() * 2.5,
          (Math.random() - 0.5) * 3,
        );
        const isFire = flightState.hullPct < 40 && Math.random() < 0.35;
        spawnParticle(
          stbdEngineWorld,
          drift,
          isFire ? '#ff6a1a' : '#2d333b',
          1.6,
          isFire ? 0.85 : 1.1,
          3.4,
        );
      }
    }

    // Step particles
    for (const p of smokePool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      const ratio = 1 - p.life / p.maxLife;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(0.9 + ratio * p.grow);
      p.mat.opacity = (1 - ratio) * 0.72;
    }
  }

  return {
    root,
    updateAircraftModel,
    spawnTouchdownPuff,
  };
}
