// Multi-layer soft billboard particle & crash debris engine for Garuda:
// roaring multi-tone engine fires, billowing dark smoke, flying wreckage shards,
// massive ocean crash splash plumes, tire touchdown smoke, wingtip contrails, and storm rain.

import * as THREE from 'three';
import { createSoftParticleTexture } from './procedural-textures.js';
import { sampleTerrainHeight, sampleTerrainNormal } from './terrain-world.js';

function createGougeMarkTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  // Torn dark-earth / charred asphalt furrow with rough displaced edges
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
  grad.addColorStop(0, 'rgba(18, 13, 9, 0.92)');
  grad.addColorStop(0.45, 'rgba(38, 26, 16, 0.78)');
  grad.addColorStop(0.75, 'rgba(72, 52, 34, 0.42)');
  grad.addColorStop(1, 'rgba(72, 52, 34, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(64, 64, 34, 56, 0, 0, Math.PI * 2);
  ctx.fill();
  // Deep twin parallel gouge ruts (belly keel + nacelle/gear scrape lines)
  ctx.fillStyle = 'rgba(10, 8, 6, 0.92)';
  ctx.fillRect(46, 12, 12, 104);
  ctx.fillRect(72, 16, 10, 96);
  // High-contrast scraped gravel/asphalt ridges + glowing hot-metal friction scorch edges!
  ctx.fillStyle = 'rgba(195, 168, 132, 0.56)';
  ctx.fillRect(35, 18, 6, 90);
  ctx.fillRect(86, 20, 6, 86);
  ctx.fillStyle = 'rgba(235, 120, 42, 0.28)';
  ctx.fillRect(50, 22, 4, 80);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEffectsSystem(scene) {
  const smokeTex = createSoftParticleTexture('smoke');
  const glowTex = createSoftParticleTexture('glow');

  // 1. Expanded 180-sprite pool for roaring layered fire, smoke, embers & ocean splash plumes
  const pool = [];
  for (let i = 0; i < 180; i++) {
    const mat = new THREE.SpriteMaterial({
      map: smokeTex,
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    scene.add(sprite);
    pool.push({
      sprite,
      mat,
      life: 0,
      maxLife: 1,
      vel: new THREE.Vector3(),
      gravity: 0,
      startScale: 2,
      endScale: 8,
      baseOpacity: 0.7,
    });
  }
  let cursor = 0;

  function emitSprite({
    pos,
    vel,
    gravity = 0,
    color = '#eef2f6',
    life = 1.4,
    startScale = 2.0,
    endScale = 7.5,
    opacity = 0.65,
    additive = false,
  }) {
    const p = pool[cursor++ % pool.length];
    p.sprite.position.copy(pos);
    p.sprite.scale.setScalar(startScale);
    p.sprite.visible = true;
    p.mat.map = additive ? glowTex : smokeTex;
    p.mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    p.mat.color.set(color);
    p.mat.opacity = opacity;
    p.life = life;
    p.maxLife = life;
    p.vel.copy(vel);
    p.gravity = gravity;
    p.startScale = startScale;
    p.endScale = endScale;
    p.baseOpacity = opacity;
  }

  // 2. Physical 3D Wreckage Debris Shards (detached prop blades, wing panels, gear struts on impact!)
  const debrisList = [];
  const debrisColors = ['#e55320', '#13495e', '#f3ede0', '#242c34', '#f5ab29'];
  for (let i = 0; i < 16; i++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.45 + (i % 3) * 0.45, 0.14 + (i % 2) * 0.12, 0.75 + (i % 4) * 0.35),
      new THREE.MeshStandardMaterial({
        color: debrisColors[i % debrisColors.length],
        roughness: 0.55,
        metalness: 0.35,
      }),
    );
    mesh.visible = false;
    mesh.castShadow = true;
    scene.add(mesh);
    debrisList.push({
      mesh,
      vel: new THREE.Vector3(),
      rotVel: new THREE.Vector3(),
      life: 0,
      floorY: 0,
    });
  }

  // 2B. Persistent 3D Terrain-Conforming Ground Gouge / Skid Trench Marks (prints permanent dark ruts as plane plows ground!)
  const gougeTex = createGougeMarkTexture();
  const gougeMat = new THREE.MeshBasicMaterial({
    map: gougeTex,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
  });
  const gougeGeo = new THREE.PlaneGeometry(5.6, 8.2);
  gougeGeo.rotateX(-Math.PI / 2);
  const gougePool = [];
  for (let i = 0; i < 96; i++) {
    const m = new THREE.Mesh(gougeGeo, gougeMat);
    m.visible = false;
    scene.add(m);
    gougePool.push(m);
  }
  let gougeCursor = 0;
  let lastGougePos = null;
  const UP_VEC = new THREE.Vector3(0, 1, 0);

  function stampGroundGouge(wx, wz, yawRad, scaleW = 1.0, scaleL = 1.0) {
    const ty = sampleTerrainHeight(wx, wz);
    if (ty < 0.25) return; // Never stamp dirt trenches on open water
    const normal = sampleTerrainNormal(wx, wz);
    const m = gougePool[gougeCursor++ % gougePool.length];
    m.position.set(wx, ty + 0.22, wz);
    const slopeQ = new THREE.Quaternion().setFromUnitVectors(UP_VEC, normal);
    const yawQ = new THREE.Quaternion().setFromAxisAngle(UP_VEC, yawRad);
    m.quaternion.copy(slopeQ).multiply(yawQ);
    m.scale.set(scaleW, 1, scaleL);
    m.visible = true;
  }

  function stampCrashGougeTrail(worldPos, headingDeg, lengthM = 34) {
    const hRad = (-headingDeg * Math.PI) / 180;
    const backX = Math.sin(hRad);
    const backZ = Math.cos(hRad);
    const steps = Math.max(4, Math.round(lengthM / 3.2));
    for (let i = 0; i < steps; i++) {
      const dist = 1.5 + i * 3.2;
      const jitter = Math.sin(i * 1.7) * 0.45;
      stampGroundGouge(worldPos.x + backX * dist + jitter, worldPos.z + backZ * dist - jitter, hRad, 0.95 + (i % 3) * 0.16, 1.1);
    }
  }

  function clearDebris() {
    for (const d of debrisList) {
      d.life = 0;
      d.mesh.visible = false;
    }
    for (const p of pool) {
      p.life = 0;
      p.sprite.visible = false;
    }
    for (const g of gougePool) {
      g.visible = false;
    }
    lastGougePos = null;
  }

  function emitTouchdownSmoke(worldPos, quaternion, hard = false) {
    const leftWheel = new THREE.Vector3(-1.75, -1.85, 0.5).applyQuaternion(quaternion).add(worldPos);
    const rightWheel = new THREE.Vector3(1.75, -1.85, 0.5).applyQuaternion(quaternion).add(worldPos);
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);

    for (const wheel of [leftWheel, rightWheel]) {
      for (let i = 0; i < (hard ? 7 : 4); i++) {
        const spread = new THREE.Vector3(
          (Math.random() - 0.5) * 2.4,
          0.7 + Math.random() * 1.6,
          (Math.random() - 0.5) * 2.4,
        ).addScaledVector(back, 2.5 + i * 1.6);
        emitSprite({
          pos: wheel.clone().addScaledVector(back, i * 0.9),
          vel: spread,
          color: hard && i % 2 === 0 ? '#ff9933' : '#f1f5f9',
          life: 1.0 + Math.random() * 0.5,
          startScale: 1.9,
          endScale: hard ? 7.5 : 5.4,
          opacity: hard ? 0.72 : 0.54,
          additive: hard && i % 2 === 0,
        });
      }
    }
  }

  function emitWaterSplash(worldPos, intensity = 1.0) {
    // Organic multi-stage ocean crash splash: asymmetric arching spray jets + foaming surface ring + drifting sea mist
    for (let i = 0; i < 34; i++) {
      const ang = (i / 34) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const isTallJet = i % 4 === 0;
      const spd = (isTallJet ? 4 + Math.random() * 7 : 8 + Math.random() * 14) * intensity;
      emitSprite({
        pos: new THREE.Vector3(
          worldPos.x + Math.cos(ang) * (1.5 + Math.random() * 5.5),
          0.4 + Math.random() * 1.4,
          worldPos.z + Math.sin(ang) * (1.5 + Math.random() * 5.5),
        ),
        vel: new THREE.Vector3(
          Math.cos(ang) * spd,
          (isTallJet ? 13 + Math.random() * 12 : 4.5 + Math.random() * 7.5) * intensity,
          Math.sin(ang) * spd,
        ),
        gravity: isTallJet ? -18 : -11,
        color: i % 3 === 0 ? '#d2f2ff' : i % 3 === 1 ? '#ffffff' : '#9ad8eb',
        life: (isTallJet ? 1.55 : 1.15) + Math.random() * 0.7,
        startScale: isTallJet ? 2.4 : 3.6,
        endScale: isTallJet ? 9.5 : 14.5,
        opacity: isTallJet ? 0.88 : 0.68,
      });
    }
  }

  let debrisCursor = 0;

  function emitShedParts(worldPos, velocity, floorY, count = 3) {
    // Progressive part shedding while plowing rapidly across ground (prop blades, cowling, wingtip fragments!)
    for (let i = 0; i < count; i++) {
      const d = debrisList[debrisCursor++ % debrisList.length];
      const ang = Math.random() * Math.PI * 2;
      const kick = 3.5 + Math.random() * 8.5;
      d.mesh.position.copy(worldPos).add(new THREE.Vector3((Math.random() - 0.5) * 4.2, 0.5 + Math.random() * 0.9, (Math.random() - 0.5) * 4.2));
      d.vel.set(velocity.x * 0.45 + Math.cos(ang) * kick, 3.2 + Math.random() * 5.2, velocity.z * 0.45 + Math.sin(ang) * kick);
      d.rotVel.set((Math.random() - 0.5) * 11, (Math.random() - 0.5) * 11, (Math.random() - 0.5) * 11);
      d.life = 8.0;
      d.floorY = floorY + 0.15;
      d.mesh.visible = true;
    }
  }

  function emitRoaringFireBurst(worldPos, quaternion, floorY, isWater = false, severity = 'catastrophic') {
    if (isWater) {
      // Water crash: ZERO fire! Massive hydro-impact water geysers + expanding white steam cloud only!
      emitWaterSplash(worldPos, 1.45);
      for (let i = 0; i < 14; i++) {
        emitSprite({
          pos: new THREE.Vector3(
            worldPos.x + (Math.random() - 0.5) * 8,
            1.0 + Math.random() * 2.5,
            worldPos.z + (Math.random() - 0.5) * 8,
          ),
          vel: new THREE.Vector3((Math.random() - 0.5) * 3.5, 2.2 + Math.random() * 2.6, (Math.random() - 0.5) * 3.5),
          color: '#e8f5fa',
          life: 2.0 + Math.random() * 0.8,
          startScale: 4.0,
          endScale: 13.0,
          opacity: 0.55,
        });
      }
      return;
    }

    // Low-speed hard crash: NO instant massive explosion! Just localized engine smoke, small sparks & 4 minor parts.
    if (severity === 'hard') {
      emitShedParts(worldPos, new THREE.Vector3(0, 0, 0), floorY, 5);
      for (let i = 0; i < 8; i++) {
        emitSprite({
          pos: worldPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3.2, 0.8 + i * 0.7, (Math.random() - 0.5) * 3.2)),
          vel: new THREE.Vector3((Math.random() - 0.5) * 2.0, 2.5 + Math.random() * 2.2, (Math.random() - 0.5) * 2.0),
          color: i < 2 ? '#ff8c2b' : '#2d333a',
          life: 1.5 + Math.random() * 0.8,
          startScale: 2.2,
          endScale: 8.0,
          opacity: i < 2 ? 0.85 : 0.62,
          additive: i < 2,
        });
      }
      return;
    }

    // Launch tumbling 3D wreckage debris shards on ground/mountain/tree/tower crash
    if (!isWater) {
      for (let i = 0; i < debrisList.length; i++) {
        const d = debrisList[i];
        const ang = (i / debrisList.length) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 6 + Math.random() * 15;
        d.mesh.position.copy(worldPos).add(new THREE.Vector3((Math.random() - 0.5) * 4, 0.8 + Math.random() * 1.4, (Math.random() - 0.5) * 4));
        d.vel.set(Math.cos(ang) * speed, 4.5 + Math.random() * 9.5, Math.sin(ang) * speed);
        d.rotVel.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
        d.life = 9.0;
        d.floorY = floorY + 0.15;
        d.mesh.visible = true;
      }
    }

    // Multi-point roaring inferno (both engines + wing root + fuselage breach)
    const fireAnchors = [
      new THREE.Vector3(3.15, 1.0, -0.5),
      new THREE.Vector3(1.6, 0.6, 0.3),
      new THREE.Vector3(-2.6, 1.1, -0.8),
      new THREE.Vector3(0.4, 0.9, -1.6),
    ];

    for (const localAnchor of fireAnchors) {
      const origin = localAnchor.clone().applyQuaternion(quaternion).add(worldPos);
      // 1. Bright incandescent yellow-white flame core
      for (let i = 0; i < 4; i++) {
        emitSprite({
          pos: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.4, i * 0.65, (Math.random() - 0.5) * 1.4)),
          vel: new THREE.Vector3((Math.random() - 0.5) * 1.6, 2.8 + Math.random() * 2.0, (Math.random() - 0.5) * 1.6),
          color: i < 2 ? '#fff0a6' : '#ff991a',
          life: 0.7 + Math.random() * 0.4,
          startScale: 2.8 + Math.random() * 1.4,
          endScale: 5.5,
          opacity: 0.95,
          additive: true,
        });
      }
      // 2. Deep orange-crimson roaring flame tongues
      for (let i = 0; i < 6; i++) {
        emitSprite({
          pos: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.2, 0.8 + i * 0.95, (Math.random() - 0.5) * 2.2)),
          vel: new THREE.Vector3((Math.random() - 0.5) * 2.2, 4.2 + Math.random() * 2.8, (Math.random() - 0.5) * 2.2),
          color: i % 2 === 0 ? '#ff5900' : '#e02401',
          life: 0.9 + Math.random() * 0.5,
          startScale: 3.4 + Math.random() * 1.6,
          endScale: 7.4,
          opacity: 0.9,
          additive: true,
        });
      }
      // 3. Thick rolling black-charcoal smoke column rising above the fire
      for (let i = 0; i < 7; i++) {
        const t = i / 7;
        emitSprite({
          pos: origin.clone().add(new THREE.Vector3(-t * 2.8 + (Math.random() - 0.5) * 2.4, 2.8 + t * 14.5, -t * 2.8 + (Math.random() - 0.5) * 2.4)),
          vel: new THREE.Vector3(-1.2, 3.2 + Math.random() * 1.6, -1.2),
          color: i < 2 ? '#3d2a22' : '#1f252b',
          life: 2.2 + Math.random() * 1.0,
          startScale: 4.0 + t * 4.5,
          endScale: 12.0 + t * 5.0,
          opacity: 0.72 * (1 - t * 0.25),
        });
      }
    }
  }

  // 3. Wingtip Vortex Ribbon Contrails
  const TRAIL_POINTS = 28;
  function makeTrailRibbon() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAIL_POINTS * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: '#f4f9fc', transparent: true, opacity: 0.48 });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    scene.add(line);
    return { line, positions, mat, filled: false };
  }
  const leftTrail = makeTrailRibbon();
  const rightTrail = makeTrailRibbon();

  function seedWingtipTrails(flightState) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(flightState.quaternion);
    const tips = [
      { trail: leftTrail, local: new THREE.Vector3(-8.55, 2.0, -0.1) },
      { trail: rightTrail, local: new THREE.Vector3(8.55, 2.0, -0.1) },
    ];
    for (const { trail, local } of tips) {
      const tipWorld = local.clone().applyQuaternion(flightState.quaternion).add(flightState.position);
      for (let i = 0; i < TRAIL_POINTS; i++) {
        const p = tipWorld.clone().addScaledVector(forward, -i * 2.1);
        trail.positions[i * 3] = p.x;
        trail.positions[i * 3 + 1] = p.y;
        trail.positions[i * 3 + 2] = p.z;
      }
      trail.line.geometry.attributes.position.needsUpdate = true;
      trail.filled = true;
    }
  }

  function updateWingtipTrails(flightState, visible) {
    const show = visible && !flightState.onGround && flightState.status === 'flying' && flightState.airspeedKts > 78;
    leftTrail.line.visible = show;
    rightTrail.line.visible = show;
    if (!show) return;

    const alpha = Math.min(0.55, 0.14 + Math.abs(flightState.rollDeg) * 0.015 + Math.max(0, flightState.gLoad - 1) * 0.25);
    leftTrail.mat.opacity = alpha;
    rightTrail.mat.opacity = alpha;

    const pairs = [
      [leftTrail, new THREE.Vector3(-8.55, 2.0, -0.1)],
      [rightTrail, new THREE.Vector3(8.55, 2.0, -0.1)],
    ];
    for (const [trail, local] of pairs) {
      const tipWorld = local.clone().applyQuaternion(flightState.quaternion).add(flightState.position);
      if (!trail.filled) {
        for (let i = 0; i < TRAIL_POINTS; i++) {
          trail.positions[i * 3] = tipWorld.x;
          trail.positions[i * 3 + 1] = tipWorld.y;
          trail.positions[i * 3 + 2] = tipWorld.z;
        }
        trail.filled = true;
      } else {
        for (let i = TRAIL_POINTS - 1; i > 0; i--) {
          trail.positions[i * 3] = trail.positions[(i - 1) * 3];
          trail.positions[i * 3 + 1] = trail.positions[(i - 1) * 3 + 1];
          trail.positions[i * 3 + 2] = trail.positions[(i - 1) * 3 + 2];
        }
        trail.positions[0] = tipWorld.x;
        trail.positions[1] = tipWorld.y;
        trail.positions[2] = tipWorld.z;
      }
      trail.line.geometry.attributes.position.needsUpdate = true;
    }
  }

  // 4. Storm Rain Streaks (Mission 4)
  const RAIN_COUNT = 260;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_COUNT * 6);
  const rainOffsets = [];
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainOffsets.push({
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 36,
      z: (Math.random() - 0.5) * 60,
    });
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainLines = new THREE.LineSegments(
    rainGeo,
    new THREE.LineBasicMaterial({ color: '#c4dce8', transparent: true, opacity: 0.42 }),
  );
  rainLines.visible = false;
  rainLines.frustumCulled = false;
  scene.add(rainLines);

  let fireEmitClock = 0;
  let splashBubbleClock = 0;

  function updateEffects(dt, timeSec, flightState, cameraPos, rainIntensity, isCockpitView) {
    // Continuous roaring fire ONLY on dry high-energy crashes — low-speed hard crashes only emit dark engine smoke & light embers, NEVER water fire!
    const inWaterCrash = flightState.crashMode === 'water';
    const isCatastrophicFire = flightState.status === 'crashed' && flightState.crashSeverity !== 'hard';
    const hasEngineSmoke =
      flightState.status === 'crashed' ||
      flightState.hullPct < 68 ||
      flightState.engineHealth < 68 ||
      flightState.malfunctions?.leftEngineOut;
    const onFire = !inWaterCrash && hasEngineSmoke;

    if (inWaterCrash) {
      // Rising white foam bubbles & surface steam while sinking beneath ocean waves (ZERO flames!)
      fireEmitClock += dt;
      if (fireEmitClock >= 0.065) {
        fireEmitClock = 0;
        splashBubbleClock += 1;
        emitSprite({
          pos: new THREE.Vector3(
            flightState.position.x + (Math.random() - 0.5) * 7,
            0.35,
            flightState.position.z + (Math.random() - 0.5) * 7,
          ),
          vel: new THREE.Vector3((Math.random() - 0.5) * 2.0, 1.6 + Math.random() * 1.8, (Math.random() - 0.5) * 2.0),
          color: splashBubbleClock % 2 === 0 ? '#eef9ff' : '#c2dce6',
          life: 1.6,
          startScale: 2.6,
          endScale: 9.2,
          opacity: 0.52,
        });
      }
    } else if (onFire) {
      fireEmitClock += dt;
      const rate = flightState.status === 'crashed' ? 0.032 : 0.055;
      if (fireEmitClock >= rate) {
        fireEmitClock = 0;
        const anchor =
          flightState.status === 'crashed' && Math.random() < 0.45
            ? new THREE.Vector3(-2.4 + Math.random() * 5.2, 0.8, -1.2 + Math.random() * 2.0)
            : new THREE.Vector3(3.15, 0.9, -0.35);
        const worldPt = anchor.applyQuaternion(flightState.quaternion).add(flightState.position);

        if (isCatastrophicFire || (flightState.status !== 'crashed' && flightState.hullPct < 45)) {
          emitSprite({
            pos: worldPt.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.2, (Math.random() - 0.5) * 1.2)),
            vel: new THREE.Vector3((Math.random() - 0.5) * 2.4, 4.4 + Math.random() * 3.0, (Math.random() - 0.5) * 2.4),
            color: Math.random() < 0.35 ? '#fff0a6' : Math.random() < 0.7 ? '#ff6a00' : '#d9260a',
            life: 0.48 + Math.random() * 0.3,
            startScale: 2.6 + Math.random() * 1.6,
            endScale: 6.4,
            opacity: 0.94,
            additive: true,
          });
        }

        emitSprite({
          pos: worldPt.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 1.2, (Math.random() - 0.5) * 1.4)),
          vel: new THREE.Vector3((Math.random() - 0.5) * 2.5, 4.2 + Math.random() * 2.4, (Math.random() - 0.5) * 2.5),
          color: '#22282e',
          life: 2.1,
          startScale: 3.0,
          endScale: 12.5,
          opacity: 0.68,
        });
      }
    }

    // Continuous Ground Plowing Gouge Marks + Flying Dirt Clods + Metallic Scraping Sparks while skidding on land!
    if (flightState.status === 'crashed' && flightState.crashMode === 'ground') {
      const horizSpeed = Math.hypot(flightState.velocity.x, flightState.velocity.z);
      const groundY = sampleTerrainHeight(flightState.position.x, flightState.position.z);
      if (groundY > 0.25 && flightState.position.y <= groundY + 3.2 && horizSpeed > 1.2) {
        const distSinceLast = lastGougePos
          ? Math.hypot(flightState.position.x - lastGougePos.x, flightState.position.z - lastGougePos.z)
          : 99;
        if (distSinceLast >= 2.1) {
          const slideYaw = Math.atan2(-flightState.velocity.x, -flightState.velocity.z);
          stampGroundGouge(flightState.position.x, flightState.position.z, slideYaw, 1.05, 1.15);
          // Secondary wingtip gouge track on right/left side
          const wingPt = new THREE.Vector3(4.8, 0, 0).applyQuaternion(flightState.quaternion).add(flightState.position);
          stampGroundGouge(wingPt.x, wingPt.z, slideYaw, 0.55, 0.9);
          lastGougePos = flightState.position.clone();

          // Speed-dependent progressive part shedding while plowing fast across terrain!
          if (horizSpeed > 9.5) {
            emitShedParts(flightState.position, flightState.velocity, groundY, horizSpeed > 18 ? 3 : 1);
          }

          // Kick up dark earth/dust plumes & bright orange-yellow metallic grinding sparks!
          for (let k = 0; k < 3; k++) {
            emitSprite({
              pos: new THREE.Vector3(
                flightState.position.x + (Math.random() - 0.5) * 4.5,
                groundY + 0.6,
                flightState.position.z + (Math.random() - 0.5) * 4.5,
              ),
              vel: new THREE.Vector3(
                -flightState.velocity.x * 0.25 + (Math.random() - 0.5) * 5.5,
                2.5 + Math.random() * 4.2,
                -flightState.velocity.z * 0.25 + (Math.random() - 0.5) * 5.5,
              ),
              gravity: -9.5,
              color: k === 0 ? '#ffc44d' : '#524030',
              life: k === 0 ? 0.38 : 1.35,
              startScale: k === 0 ? 1.5 : 2.8,
              endScale: k === 0 ? 2.6 : 9.2,
              opacity: k === 0 ? 0.95 : 0.72,
              additive: k === 0,
            });
          }
        }
      }
    }

    // Step soft sprite particles
    for (const p of pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      const ratio = 1 - p.life / p.maxLife;
      if (p.gravity !== 0) p.vel.y += p.gravity * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      const sc = p.startScale + (p.endScale - p.startScale) * ratio;
      p.sprite.scale.setScalar(sc);
      p.mat.opacity = p.baseOpacity * (1 - ratio * ratio);
    }

    // Step physical 3D wreckage debris shards
    for (const d of debrisList) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) {
        d.mesh.visible = false;
        continue;
      }
      d.vel.y -= 18 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      if (d.mesh.position.y < d.floorY) {
        d.mesh.position.y = d.floorY;
        d.vel.y = Math.abs(d.vel.y) > 1.5 ? -d.vel.y * 0.35 : 0;
        d.vel.x *= Math.max(0, 1 - dt * 4.5);
        d.vel.z *= Math.max(0, 1 - dt * 4.5);
        d.rotVel.multiplyScalar(Math.max(0, 1 - dt * 5.0));
      }
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      d.mesh.rotation.z += d.rotVel.z * dt;
    }

    updateWingtipTrails(flightState, !isCockpitView);

    const hasRain = rainIntensity > 0.05;
    rainLines.visible = hasRain;
    if (hasRain) {
      rainLines.material.opacity = 0.26 + rainIntensity * 0.3;
      const fall = (timeSec * (30 + rainIntensity * 16)) % 36;
      const slant = 0.3 + rainIntensity * 0.55;
      for (let i = 0; i < RAIN_COUNT; i++) {
        const o = rainOffsets[i];
        const rx = cameraPos.x + o.x;
        const ry = cameraPos.y + ((o.y - fall + 54) % 36) - 18;
        const rz = cameraPos.z + o.z;
        const idx = i * 6;
        rainPos[idx] = rx;
        rainPos[idx + 1] = ry;
        rainPos[idx + 2] = rz;
        rainPos[idx + 3] = rx - slant;
        rainPos[idx + 4] = ry - 2.4;
        rainPos[idx + 5] = rz - slant * 0.6;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
  }

  return {
    clearDebris,
    emitSprite,
    emitTouchdownSmoke,
    emitWaterSplash,
    emitRoaringFireBurst,
    stampCrashGougeTrail,
    seedWingtipTrails,
    updateEffects,
  };
}
