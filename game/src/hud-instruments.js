// Mission-focused aviation HUD overlay: live step-by-step objective checklist, off-screen
// waypoint direction arrows, heading/IAS/ALT tapes, pitch ladder, PAPI bar, topographic TAWS radar, and crash/landing report.

import { FLAP_ANGLES, RUNWAYS, WORLD_SIZE } from './config.js';
import { sampleTerrainHeight } from './terrain-world.js';

function bakeRadarTerrainCanvas() {
  // Pre-bake full 9.2 km x 9.2 km archipelago elevation + hillshade + bathymetry + contour lines once at startup
  const res = 280;
  const worldSpan = WORLD_SIZE;
  const halfSpan = worldSpan * 0.5;
  const c = document.createElement('canvas');
  c.width = res;
  c.height = res;
  const rctx = c.getContext('2d');
  const img = rctx.createImageData(res, res);
  const d = img.data;
  const step = worldSpan / res;

  for (let py = 0; py < res; py++) {
    const wz = -halfSpan + (py + 0.5) * step;
    for (let px = 0; px < res; px++) {
      const wx = -halfSpan + (px + 0.5) * step;
      const h = sampleTerrainHeight(wx, wz);
      const idx = (py * res + px) * 4;
      let r = 6;
      let g = 24;
      let b = 36;

      if (h < -5.5) {
        // Deep bathymetry ocean with subtle depth bands
        const band = Math.abs(h % 6) < 0.7 ? 5 : 0;
        r = 6 + band;
        g = 24 + band;
        b = 38 + band;
      } else if (h < 0.15) {
        // Turquoise coastal coral shelf / shallows
        const t = Math.max(0, Math.min(1, (h + 5.5) / 5.65));
        r = Math.round(8 + t * 14);
        g = Math.round(42 + t * 50);
        b = Math.round(62 + t * 44);
      } else {
        // Topographic land elevation + directional NW hillshade + 35m contour lines
        const hx = sampleTerrainHeight(wx + 24, wz);
        const hz = sampleTerrainHeight(wx, wz + 24);
        const slopeShade = Math.max(-0.28, Math.min(0.28, ((h - hx) + (h - hz)) * 0.024));
        const contour = h > 10 && Math.abs((h % 38) - 19) > 16.4 ? 0.82 : 1.0;

        if (h < 3.5) {
          // Crisp sandy / coastal shoreline highlight
          r = 44;
          g = 122;
          b = 98;
        } else if (h < 48) {
          const t = (h - 3.5) / 44.5;
          r = 24 + t * 34;
          g = 86 + t * 24;
          b = 58 - t * 14;
        } else if (h < 135) {
          const t = (h - 48) / 87;
          r = 62 + t * 78;
          g = 110 - t * 12;
          b = 44 - t * 10;
        } else {
          // High volcanic peaks (TAWS amber-red elevation warning palette)
          const t = Math.min(1, (h - 135) / 170);
          r = 148 + t * 68;
          g = 94 - t * 28;
          b = 38 + t * 12;
        }
        const shade = (1 + slopeShade) * contour;
        r = Math.max(0, Math.min(255, Math.round(r * shade)));
        g = Math.max(0, Math.min(255, Math.round(g * shade)));
        b = Math.max(0, Math.min(255, Math.round(b * shade)));
      }
      d[idx] = r;
      d[idx + 1] = g;
      d[idx + 2] = b;
      d[idx + 3] = 255;
    }
  }
  rctx.putImageData(img, 0, 0);
  return { canvas: c, worldSpan, halfSpan };
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function normalizeAngleDiff(a, b) {
  let d = ((a - b + 540) % 360) - 180;
  if (d < -180) d += 360;
  return d;
}

export function createHudInstruments(canvas) {
  const ctx = canvas.getContext('2d');
  const radarTerrain = bakeRadarTerrainCanvas();
  let radarSweepRad = 0;
  let bannerText = '';
  let bannerTone = 'info';
  let bannerTimer = 0;
  let radioText = '';
  let radioTimer = 0;

  function showBanner(text, tone = 'info', duration = 2.8) {
    bannerText = text;
    bannerTone = tone;
    bannerTimer = duration;
  }

  function showRadioMessage(text, duration = 5.2) {
    radioText = text;
    radioTimer = duration;
  }

  function drawMissionTracker(x, y, missionSummary, state, compact = false) {
    const objs = missionSummary.objectives || [];
    const activeFaults = [];
    if (state.malfunctions?.leftEngineOut) activeFaults.push('PORT ENG OUT');
    if (state.malfunctions?.fuelLeak) activeFaults.push('FUEL LEAK');
    if (state.malfunctions?.flapJammed) activeFaults.push('FLAPS JAMMED');
    if (state.malfunctions?.controlDamage) activeFaults.push('CTRL DAMAGE');
    if (state.malfunctions?.gearDamaged) activeFaults.push('GEAR DAMAGE');

    const w = compact ? 232 : 276;
    const faultH = activeFaults.length > 0 ? 22 : 0;
    const h = 62 + objs.length * 20 + faultH;

    ctx.fillStyle = 'rgba(10, 17, 24, 0.85)';
    drawRoundedRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = activeFaults.length > 0 ? 'rgba(255, 92, 92, 0.72)' : 'rgba(255, 190, 79, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header: Mission title + [ESC] menu hint
    ctx.fillStyle = '#ffbe4f';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`M${missionSummary.mission.number} · ${missionSummary.mission.name.toUpperCase()}`, x + 11, y + 16);

    ctx.fillStyle = '#8cb3c2';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[ESC]', x + w - 10, y + 16);

    // Clear 1-line mission goal subtitle so the player always knows the end goal!
    ctx.fillStyle = '#b4d8e4';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const maxGoalChars = compact ? 34 : 42;
    const rawGoal = missionSummary.mission.goal || '';
    const goalText = rawGoal.length > maxGoalChars ? `${rawGoal.slice(0, maxGoalChars - 1)}…` : rawGoal;
    ctx.fillText(goalText, x + 11, y + 32);

    ctx.strokeStyle = 'rgba(120, 180, 195, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 43);
    ctx.lineTo(x + w - 10, y + 43);
    ctx.stroke();

    // Numbered live mission checklist steps
    ctx.textAlign = 'left';
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      const ry = y + 57 + i * 20;
      const mark = o.done ? '✓' : o.active ? '▸' : `${i + 1}.`;
      ctx.fillStyle = o.done ? '#4ade80' : o.active ? '#ffffff' : '#7b99a8';
      ctx.font = o.active ? 'bold 11.5px monospace' : '11px monospace';
      ctx.fillText(`${mark} ${o.label}`, x + 11, ry);
    }

    // Active partial malfunction warning strip inside tracker
    if (activeFaults.length > 0) {
      const fy = y + h - 14;
      ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
      drawRoundedRect(ctx, x + 9, fy - 8, w - 18, 17, 4);
      ctx.fill();
      ctx.fillStyle = '#fff1f2';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠ ${activeFaults.slice(0, 2).join(' · ')}`, x + w * 0.5, fy + 0.5);
    }
  }

  function drawHeadingTape(w, headingDeg, waypointBearing, missionSummary) {
    const tapeW = Math.min(440, w * 0.4);
    const x0 = (w - tapeW) * 0.5;
    const y0 = 14;

    ctx.fillStyle = 'rgba(10, 17, 24, 0.78)';
    drawRoundedRect(ctx, x0, y0, tapeW, 42, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(102, 224, 210, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 + 6, y0 + 2, tapeW - 12, 38);
    ctx.clip();

    const pxPerDeg = 4.6;
    const centerX = w * 0.5;
    const startDeg = Math.floor((headingDeg - 55) / 5) * 5;
    const endDeg = headingDeg + 55;
    const cardinals = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let deg = startDeg; deg <= endDeg; deg += 5) {
      const norm = ((deg % 360) + 360) % 360;
      const diff = normalizeAngleDiff(norm, headingDeg);
      if (Math.abs(diff) > 40) continue;
      const tx = centerX + diff * pxPerDeg;
      const major = norm % 15 === 0;
      ctx.strokeStyle = major ? '#d8f3ee' : 'rgba(180, 215, 212, 0.45)';
      ctx.lineWidth = major ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(tx, y0 + 28);
      ctx.lineTo(tx, y0 + (major ? 39 : 35));
      ctx.stroke();

      if (major) {
        const label = cardinals[norm] ?? String(norm).padStart(3, '0');
        ctx.fillStyle = cardinals[norm] ? '#ffbe4f' : '#d8f3ee';
        ctx.font = cardinals[norm] ? 'bold 13px monospace' : 'bold 11px monospace';
        ctx.fillText(label, tx, y0 + 9);
      }
    }

    if (Number.isFinite(waypointBearing)) {
      const wDiff = Math.max(-44, Math.min(44, normalizeAngleDiff(waypointBearing, headingDeg)));
      const wx = centerX + wDiff * pxPerDeg;
      ctx.fillStyle = '#ff9f2e';
      ctx.beginPath();
      ctx.moveTo(wx, y0 + 3);
      ctx.lineTo(wx + 6, y0 + 9);
      ctx.lineTo(wx, y0 + 15);
      ctx.lineTo(wx - 6, y0 + 9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = '#0c1620';
    drawRoundedRect(ctx, centerX - 36, y0 + 36, 72, 24, 4);
    ctx.fill();
    ctx.strokeStyle = '#38f2d4';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${String(Math.round(headingDeg) % 360).padStart(3, '0')}°`, centerX, y0 + 48);

    const wp = missionSummary.waypoint;
    if (wp) {
      ctx.fillStyle = 'rgba(10, 17, 24, 0.72)';
      drawRoundedRect(ctx, centerX - 96, y0 + 64, 192, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#ffbe4f';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(wp.label, centerX, y0 + 74);
    }
  }

  function drawVerticalTape(x, y, w, h, value, step, unit, label, alignRight, accentColor, subText) {
    ctx.fillStyle = 'rgba(10, 17, 24, 0.76)';
    drawRoundedRect(ctx, x, y, w, h, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110, 210, 200, 0.42)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#9ac0ca';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w * 0.5, y + 14);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 3, y + 22, w - 6, h - 46);
    ctx.clip();

    const midY = y + h * 0.5;
    const pxPerUnit = 26 / step;
    const minVal = Math.floor((value - step * 4) / step) * step;
    const maxVal = value + step * 4;
    ctx.font = 'bold 11px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = alignRight ? 'right' : 'left';

    for (let v = minVal; v <= maxVal; v += step) {
      if (v < 0) continue;
      const ty = midY - (v - value) * pxPerUnit;
      ctx.strokeStyle = 'rgba(190, 225, 225, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (alignRight) {
        ctx.moveTo(x + w - 12, ty);
        ctx.lineTo(x + w - 4, ty);
        ctx.fillStyle = '#cde6ea';
        ctx.fillText(String(v), x + w - 16, ty);
      } else {
        ctx.moveTo(x + 4, ty);
        ctx.lineTo(x + 12, ty);
        ctx.fillStyle = '#cde6ea';
        ctx.fillText(String(v), x + 16, ty);
      }
      ctx.stroke();
    }
    ctx.restore();

    const boxY = midY - 17;
    ctx.fillStyle = '#071018';
    drawRoundedRect(ctx, x - 4, boxY, w + 8, 34, 5);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.round(value)), x + w * 0.5, midY - 1);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(unit, x + w * 0.5, y + h - 12);

    if (subText) {
      ctx.fillStyle = 'rgba(10, 17, 24, 0.78)';
      drawRoundedRect(ctx, x, y + h + 6, w, 24, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(110, 210, 200, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#e2f1f5';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(subText, x + w * 0.5, y + h + 18);
    }
  }

  function drawPitchLadder(w, h, state, isCockpit) {
    const cx = w * 0.5;
    const cy = isCockpit ? h * 0.36 : h * 0.45;
    ctx.save();
    ctx.translate(cx, cy);

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, isCockpit ? 108 : 124, 0, Math.PI * 2);
    ctx.clip();

    ctx.rotate((-state.rollDeg * Math.PI) / 180);
    const pxPerDeg = 5.4;
    const pitchOffset = state.pitchDeg * pxPerDeg;

    ctx.strokeStyle = state.stalling ? 'rgba(255, 84, 73, 0.88)' : 'rgba(72, 245, 210, 0.72)';
    ctx.fillStyle = state.stalling ? '#ff5449' : '#66f7dc';
    ctx.font = 'bold 10px monospace';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-98, pitchOffset);
    ctx.lineTo(-26, pitchOffset);
    ctx.moveTo(26, pitchOffset);
    ctx.lineTo(98, pitchOffset);
    ctx.stroke();

    for (const deg of [-20, -10, 10, 20]) {
      const py = pitchOffset - deg * pxPerDeg;
      ctx.lineWidth = 1.4;
      ctx.setLineDash(deg < 0 ? [5, 4] : []);
      ctx.beginPath();
      ctx.moveTo(-48, py);
      ctx.lineTo(-20, py);
      ctx.moveTo(20, py);
      ctx.lineTo(48, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'right';
      ctx.fillText(String(deg), -53, py);
      ctx.textAlign = 'left';
      ctx.fillText(String(deg), 53, py);
    }
    ctx.restore();

    ctx.strokeStyle = '#ffbe4f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-4, 6);
    ctx.moveTo(26, 0);
    ctx.lineTo(8, 0);
    ctx.lineTo(4, 6);
    ctx.stroke();
    ctx.fillStyle = '#ffbe4f';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawWaypointGuidance(w, h, state, missionSummary, camera) {
    if (!camera || !missionSummary.waypoint || state.status !== 'flying') return;
    const wp = missionSummary.waypoint;
    const distM = Math.round(
      Math.hypot(wp.x - state.position.x, wp.y - state.position.y, wp.z - state.position.z),
    );
    const distLabel = distM >= 1000 ? `${(distM / 1000).toFixed(1)} KM` : `${distM} M`;

    const vec = camera.position.clone().set(wp.x, wp.y + 18, wp.z).project(camera);
    const inFront = vec.z > -1 && vec.z < 1;
    const sx = (vec.x * 0.5 + 0.5) * w;
    const sy = (-vec.y * 0.5 + 0.5) * h;

    if (inFront && sx > 120 && sx < w - 120 && sy > 95 && sy < h - 180) {
      ctx.strokeStyle = '#ffbe4f';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 7);
      ctx.lineTo(sx + 7, sy);
      ctx.lineTo(sx, sy + 7);
      ctx.lineTo(sx - 7, sy);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(10, 17, 24, 0.76)';
      drawRoundedRect(ctx, sx - 42, sy - 27, 84, 17, 4);
      ctx.fill();
      ctx.fillStyle = '#ffdf8e';
      ctx.font = 'bold 10.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(distLabel, sx, sy - 18.5);
    } else {
      // Off-screen directional guidance arrow pointing directly toward the mission objective!
      const dx = wp.x - state.position.x;
      const dz = wp.z - state.position.z;
      const wpBearing = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
      const diff = normalizeAngleDiff(wpBearing, state.headingDeg);
      const onLeft = diff < 0;
      const ax = onLeft ? 132 : w - 132;
      const ay = h * 0.44;
      const arrowText = onLeft ? `◄ ${wp.label} · ${distLabel}` : `${wp.label} · ${distLabel} ►`;

      ctx.fillStyle = 'rgba(18, 26, 36, 0.88)';
      drawRoundedRect(ctx, ax - (onLeft ? 12 : 158), ay - 14, 170, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffaa2b';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#ffcf66';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(arrowText, ax + (onLeft ? 73 : -73), ay);
    }
  }

  function drawMinimap(x, y, size, state, missionSummary, windVec) {
    const cx = x + size * 0.5;
    const cy = y + size * 0.5;
    const radius = size * 0.485;
    const rangeM = 2050; // 2.05 km radar radius
    const pxPerM = radius / rangeM;
    const hdgRad = (state.headingDeg * Math.PI) / 180;

    // Avionics bezel frame
    ctx.fillStyle = 'rgba(7, 15, 22, 0.9)';
    drawRoundedRect(ctx, x, y, size, size, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(72, 224, 210, 0.5)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Circular heading-up terrain & radar scope clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
    ctx.clip();

    // 1. Heading-up real topographic archipelago map (rotates smoothly with aircraft heading!)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-hdgRad);

    const drawSpanPx = radarTerrain.worldSpan * pxPerM;
    const mapX = (-radarTerrain.halfSpan - state.position.x) * pxPerM;
    const mapY = (-radarTerrain.halfSpan - state.position.z) * pxPerM;
    ctx.fillStyle = '#061824';
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.drawImage(radarTerrain.canvas, mapX, mapY, drawSpanPx, drawSpanPx);

    // Subtle dark-green avionics CRT tint over terrain so waypoints & runways pop clearly
    ctx.fillStyle = 'rgba(4, 22, 28, 0.24)';
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

    const toLocal = (wx, wz) => [(wx - state.position.x) * pxPerM, (wz - state.position.z) * pxPerM];

    // 2. Active mission magenta flight-plan route (remaining gates -> drop zone -> target runway)
    const planPts = [];
    const rings = missionSummary.mission.rings || [];
    for (let i = missionSummary.ringsCleared; i < rings.length; i++) {
      planPts.push(toLocal(rings[i].x, rings[i].z));
    }
    if (missionSummary.mission.dropZone && !missionSummary.dropCompleted) {
      planPts.push(toLocal(missionSummary.mission.dropZone.x, missionSummary.mission.dropZone.z));
    }
    const targetRwy = RUNWAYS.find((r) => r.id === missionSummary.mission.targetRunwayId);
    if (targetRwy) {
      planPts.push(toLocal(targetRwy.x, targetRwy.z));
    }

    if (planPts.length > 0) {
      ctx.strokeStyle = 'rgba(232, 121, 249, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (const [px, py] of planPts) ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw remaining gate markers
      for (let i = 0; i < planPts.length; i++) {
        const [px, py] = planPts[i];
        ctx.fillStyle = i === 0 ? '#ffaa2b' : 'rgba(232, 121, 249, 0.85)';
        ctx.beginPath();
        ctx.arc(px, py, i === 0 ? 3.5 : 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Scaled runway strips with threshold & runway number labels
    for (const rwy of RUNWAYS) {
      const [rx, ry] = toLocal(rwy.x, rwy.z);
      const isTarget = rwy.id === missionSummary.mission.targetRunwayId;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate((rwy.headingDeg * Math.PI) / 180);
      const lenPx = Math.max(12, rwy.length * pxPerM);
      ctx.fillStyle = isTarget ? '#38f2d4' : '#e2e8f0';
      ctx.fillRect(-2.4, -lenPx * 0.5, 4.8, lenPx);
      ctx.fillStyle = '#0a141c';
      ctx.fillRect(-0.6, -lenPx * 0.42, 1.2, lenPx * 0.84);
      ctx.restore();

      ctx.save();
      ctx.translate(rx + 6, ry - 5);
      ctx.rotate(hdgRad); // keep runway label upright
      ctx.fillStyle = isTarget ? '#38f2d4' : '#cbd5e1';
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(rwy.id.replace('RWY', ''), 0, 0);
      ctx.restore();
    }

    // 4. Active waypoint pulsing beacon ring
    const wp = missionSummary.waypoint;
    if (wp) {
      const [wx, wy] = toLocal(wp.x, wp.z);
      ctx.strokeStyle = '#ffbe4f';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(wx, wy, 6.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore(); // end heading-up map rotation

    // 5. Rotating green phosphor radar sweep cone
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(radarSweepRad);
    const sweepSteps = 10;
    for (let s = 0; s < sweepSteps; s++) {
      const a0 = -(s / sweepSteps) * 0.72;
      const a1 = -((s + 1) / sweepSteps) * 0.72;
      ctx.fillStyle = `rgba(56, 242, 180, ${(1 - s / sweepSteps) * 0.14})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 3, a1, a0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(110, 255, 200, 0.58)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius - 3, 0);
    ctx.stroke();
    ctx.restore();

    // 6. Range rings (1 km, 2 km) + crosshair grid + range label
    ctx.strokeStyle = 'rgba(92, 232, 205, 0.24)';
    ctx.lineWidth = 0.9;
    for (const frac of [0.5, 0.96]) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * frac, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    ctx.fillStyle = 'rgba(155, 235, 220, 0.72)';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('1KM', cx, cy - radius * 0.5 + 8);

    // 7. Rotating compass rose ticks & N/E/S/W labels around radar rim
    const cards = [
      [0, 'N', '#ffbe4f'],
      [90, 'E', '#9ad8d0'],
      [180, 'S', '#9ad8d0'],
      [270, 'W', '#9ad8d0'],
    ];
    for (let deg = 0; deg < 360; deg += 30) {
      const a = ((deg - state.headingDeg - 90) * Math.PI) / 180;
      const rOut = radius - 3;
      const rIn = deg % 90 === 0 ? radius - 9 : radius - 6;
      ctx.strokeStyle = deg === 0 ? '#ffbe4f' : 'rgba(145, 220, 212, 0.45)';
      ctx.lineWidth = deg % 90 === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
      ctx.lineTo(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut);
      ctx.stroke();
    }
    ctx.font = 'bold 9.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [deg, lbl, col] of cards) {
      const a = ((deg - state.headingDeg - 90) * Math.PI) / 180;
      ctx.fillStyle = col;
      ctx.fillText(lbl, cx + Math.cos(a) * (radius - 14), cy + Math.sin(a) * (radius - 14));
    }

    // 8. Center aircraft aviation symbol (pointing straight UP in heading-up radar!)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#061824';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(1.8, -2);
    ctx.lineTo(8.5, 0.5);
    ctx.lineTo(8.5, 2.5);
    ctx.lineTo(1.8, 1.5);
    ctx.lineTo(1.4, 5.8);
    ctx.lineTo(4.2, 7.2);
    ctx.lineTo(4.2, 8.5);
    ctx.lineTo(0, 7.4);
    ctx.lineTo(-4.2, 8.5);
    ctx.lineTo(-4.2, 7.2);
    ctx.lineTo(-1.4, 5.8);
    ctx.lineTo(-1.8, 1.5);
    ctx.lineTo(-8.5, 2.5);
    ctx.lineTo(-8.5, 0.5);
    ctx.lineTo(-1.8, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // end radar circle clip

    // Outer circular radar rim & top lubber triangle
    ctx.strokeStyle = 'rgba(72, 224, 210, 0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffbe4f';
    ctx.beginPath();
    ctx.moveTo(cx, y + 3);
    ctx.lineTo(cx - 4, y + 9);
    ctx.lineTo(cx + 4, y + 9);
    ctx.closePath();
    ctx.fill();

    // Corner telemetry labels: TAWS HDG-UP + wind vector indicator
    ctx.fillStyle = '#9ec7d2';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('TAWS', x + 7, y + 6);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffbe4f';
    ctx.textBaseline = 'bottom';
    ctx.fillText(missionSummary.mission.windDesc, x + size - 7, y + size - 5);

    if (windVec && windVec.length() > 0.3) {
      const wAng = Math.atan2(windVec.x, -windVec.z) - hdgRad - Math.PI * 0.5;
      const wx = x + 16;
      const wy = y + size - 15;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(wAng);
      ctx.strokeStyle = '#38f2d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.lineTo(2.5, -3);
      ctx.moveTo(6, 0);
      ctx.lineTo(2.5, 3);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSystemsPanel(x, y, w, h, state, missionSummary) {
    ctx.fillStyle = 'rgba(10, 17, 24, 0.84)';
    drawRoundedRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(102, 224, 210, 0.42)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffbe4f';
    ctx.font = 'bold 11.5px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(missionSummary.mission.shortTag, x + 12, y + 19);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#38f2d4';
    ctx.fillText(`SCORE ${missionSummary.score}`, x + w - 12, y + 19);

    const drawGaugeBar = (label, pct, valText, col, rowY) => {
      ctx.fillStyle = '#b4cfd6';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 12, rowY);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(valText, x + w - 12, rowY);

      ctx.fillStyle = '#1b2833';
      ctx.fillRect(x + 12, rowY + 5, w - 24, 9);
      ctx.fillStyle = col;
      ctx.fillRect(x + 12, rowY + 5, Math.max(0, Math.min(1, pct / 100)) * (w - 24), 9);
    };

    const thrPct = Math.round(state.throttle * 100);
    drawGaugeBar(
      'THROTTLE',
      (state.throttle / 1.1) * 100,
      state.throttle > 1.0 ? `${thrPct}% TOGA` : `${thrPct}%`,
      state.throttle > 1.0 ? '#ff5722' : '#38f2d4',
      y + 42,
    );
    drawGaugeBar(
      'FUEL',
      state.fuelPct,
      `${Math.round(state.fuelPct)}% · ${state.fuelRangeKm.toFixed(1)}km`,
      state.fuelPct < 24 ? '#ff4d4f' : '#f5a623',
      y + 72,
    );
    drawGaugeBar(
      'HULL',
      state.hullPct,
      `${Math.round(state.hullPct)}%`,
      state.hullPct < 60 ? '#ff5722' : '#22c55e',
      y + 102,
    );

    const pills = [
      { label: state.gearDown ? 'GEAR DN' : 'GEAR UP', col: state.gearDown ? '#22c55e' : '#64748b' },
      { label: `FLAP ${FLAP_ANGLES[state.flapStage]}°`, col: state.flapStage > 0 ? '#38bdf8' : '#64748b' },
      { label: `GATES ${missionSummary.ringsCleared}/${missionSummary.ringsTotal}`, col: '#ffaa2b' },
    ];
    let px = x + 12;
    const py = y + 126;
    const pw = (w - 36) / 3;
    for (const pill of pills) {
      ctx.fillStyle = 'rgba(20, 32, 42, 0.95)';
      drawRoundedRect(ctx, px, py, pw, 22, 4);
      ctx.fill();
      ctx.strokeStyle = pill.col;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = pill.col;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pill.label, px + pw * 0.5, py + 11);
      px += pw + 6;
    }

    const papiY = y + 162;
    ctx.fillStyle = '#9ac0ca';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PAPI ${state.activeRunwayId}`, x + 12, papiY);
    for (let i = 0; i < 4; i++) {
      const isWhite = i < state.papiWhiteCount;
      ctx.fillStyle = isWhite ? '#fffdf0' : '#ff3b30';
      ctx.beginPath();
      ctx.arc(x + w - 72 + i * 18, papiY - 1, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawIncidentReportCard(w, h, state, missionSummary) {
    const report = state.incidentReport;
    if (!report) return;
    const isCrash = report.outcome === 'CRASHED';
    const isSuccess = Boolean(report.missionComplete) || (!isCrash && report.outcome === 'LANDED');
    const accent = isCrash ? '#ff4d4f' : '#22c55e';
    const statusLabel = isCrash
      ? '✕  MISSION FAILED — AIRCRAFT CRASHED'
      : report.missionComplete
        ? '✓  MISSION COMPLETE — SORTIE ACCOMPLISHED'
        : '✓  SAFE LANDING — OBJECTIVES REMAINING';

    const cardW = Math.min(510, w - 240);
    const cardH = 260;
    const x = w - cardW - 118;
    const y = Math.max(96, (h - cardH) * 0.43);

    // Subtle glow shadow behind outcome card so FAILED / SUCCESS is immediately unmistakable!
    ctx.save();
    ctx.shadowColor = isCrash ? 'rgba(255, 59, 48, 0.45)' : 'rgba(34, 197, 94, 0.45)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = 'rgba(9, 15, 22, 0.95)';
    drawRoundedRect(ctx, x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.6;
    drawRoundedRect(ctx, x, y, cardW, cardH, 12);
    ctx.stroke();

    // Bold high-contrast FAILED / SUCCESS status header bar
    ctx.fillStyle = isCrash ? 'rgba(220, 38, 38, 0.92)' : 'rgba(22, 163, 74, 0.92)';
    drawRoundedRect(ctx, x + 2, y + 2, cardW - 4, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14.5px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusLabel, x + 16, y + 19);

    // Cause / Achievement headline
    ctx.fillStyle = isCrash ? '#ff9b9b' : '#86efac';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(report.title, x + 16, y + 54);

    // Full readable explanation message
    ctx.fillStyle = '#edf5fa';
    ctx.font = '12.5px monospace';
    const messageLine = isSuccess && report.missionComplete
      ? `All objectives cleared! ${report.detail}`
      : report.detail;
    ctx.fillText(messageLine.slice(0, 62), x + 16, y + 76);

    const stats = [
      ['SINK RATE', report.sinkMps != null ? `-${report.sinkMps.toFixed(1)} m/s` : '-1.4 m/s', report.sinkMps > 4.6 ? '#ff6b6b' : '#4ade80'],
      ['SPEED', `${Math.round(report.speedKts ?? state.airspeedKts)} KTS`, '#38f2d4'],
      ['BANK', `${Math.round(report.bankDeg ?? Math.abs(state.rollDeg))}°`, (report.bankDeg ?? 0) > 14 ? '#ffbe4f' : '#4ade80'],
      ['FUEL', `${Math.round(state.fuelPct)}%`, state.fuelPct < 24 ? '#ffbe4f' : '#e5eef5'],
      ['HULL', `${Math.round(state.hullPct)}%`, state.hullPct < 50 ? '#ff6b6b' : '#4ade80'],
      ['SCORE', String(missionSummary.score), '#ffbe4f'],
    ];

    const colW = (cardW - 44) / 3;
    for (let i = 0; i < stats.length; i++) {
      const [k, v, col] = stats[i];
      const gx = x + 16 + (i % 3) * (colW + 6);
      const gy = y + 98 + Math.floor(i / 3) * 44;
      ctx.fillStyle = 'rgba(22, 33, 44, 0.94)';
      drawRoundedRect(ctx, gx, gy, colW, 36, 6);
      ctx.fill();
      ctx.fillStyle = '#8faec0';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(k, gx + 8, gy + 11);
      ctx.fillStyle = col;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(v, gx + 8, gy + 26);
    }

    // Highlighted bottom action bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, x + 14, y + cardH - 42, cardW - 28, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11.5px monospace';
    ctx.textAlign = 'center';
    const actionLine = report.missionComplete
      ? '[ENTER] NEXT MISSION   ·   [R] REPLAY   ·   [ESC] MISSIONS'
      : '[R] RETRY MISSION   ·   [ESC] CHOOSE MISSION';
    ctx.fillText(actionLine, x + cardW * 0.5, y + cardH - 28);
  }

  function renderHud(state, missionSummary, windVec, cameraMode, dt, camera = null) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (bannerTimer > 0) bannerTimer = Math.max(0, bannerTimer - dt);
    if (radioTimer > 0) radioTimer = Math.max(0, radioTimer - dt);
    radarSweepRad = (radarSweepRad + Math.max(0.016, dt) * 1.65) % (Math.PI * 2);

    let wpBearing = NaN;
    if (missionSummary.waypoint) {
      const dx = missionSummary.waypoint.x - state.position.x;
      const dz = missionSummary.waypoint.z - state.position.z;
      wpBearing = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
    }

    // 1. Live Mission Objective Tracker (top-left in chase, compact beside radar in cockpit)
    if (cameraMode !== 'cockpit') {
      drawMissionTracker(20, 14, missionSummary, state, false);
    } else {
      drawMissionTracker(176, 14, missionSummary, state, true);
    }

    // 2. Heading Tape & 3D / Off-screen Waypoint Guidance
    drawHeadingTape(w, state.headingDeg, wpBearing, missionSummary);
    drawWaypointGuidance(w, h, state, missionSummary, camera);

    // 3. Pitch Ladder
    if (state.status === 'flying') {
      drawPitchLadder(w, h, state, cameraMode === 'cockpit');
    }

    // 4. IAS & ALT Tapes
    const tapeH = Math.min(226, h * 0.35);
    const tapeY = Math.max(122, h * 0.27);
    drawVerticalTape(
      22,
      tapeY,
      82,
      tapeH,
      state.airspeedKts,
      20,
      'IAS KTS',
      'SPEED',
      true,
      state.stalling ? '#ff4d4f' : '#38f2d4',
      `AOA ${state.aoaDeg.toFixed(1)}°`,
    );

    const vsiSign = state.vsiMps >= 0 ? '+' : '';
    drawVerticalTape(
      w - 104,
      tapeY,
      82,
      tapeH,
      state.altitudeFt,
      100,
      'ALT FT',
      'ALTITUDE',
      false,
      state.aglM < 30 && !state.onGround ? '#ffbe4f' : '#38f2d4',
      `VS ${vsiSign}${state.vsiMps.toFixed(1)}m/s`,
    );

    // 5. Topographic TAWS Radar & Systems Strip
    if (cameraMode !== 'cockpit') {
      drawMinimap(20, h - 190, 172, state, missionSummary, windVec);
      drawSystemsPanel(w - 286, h - 196, 266, 176, state, missionSummary);
    } else {
      drawSystemsPanel(w - 274, 16, 256, 174, state, missionSummary);
      drawMinimap(20, 16, 150, state, missionSummary, windVec);
    }

    // 6. Concise Cockpit Callouts (zero fluff!)
    const urgentAlert = state.stalling
      ? { text: 'STALL — LOWER NOSE / ADD THROTTLE', tone: 'danger' }
      : state.overspeed
        ? { text: 'OVERSPEED — REDUCE THROTTLE', tone: 'danger' }
        : state.lowFuel && state.status === 'flying'
          ? { text: `LOW FUEL (${Math.round(state.fuelPct)}%)`, tone: 'warn' }
          : bannerTimer > 0
            ? { text: bannerText, tone: bannerTone }
            : null;

    if (urgentAlert) {
      const bw = Math.min(380, w - 40);
      const bx = (w - bw) * 0.5;
      const by = 102;
      const bg =
        urgentAlert.tone === 'danger'
          ? 'rgba(185, 28, 28, 0.9)'
          : urgentAlert.tone === 'warn'
            ? 'rgba(180, 83, 9, 0.9)'
            : urgentAlert.tone === 'good'
              ? 'rgba(15, 118, 110, 0.9)'
              : 'rgba(15, 23, 42, 0.84)';
      ctx.fillStyle = bg;
      drawRoundedRect(ctx, bx, by, bw, 28, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(urgentAlert.text, w * 0.5, by + 14);
    }

    // 7. Live VHF Cockpit Radio Subtitle Strip (bottom-center during active radio transmissions)
    if (radioTimer > 0 && radioText && !state.incidentReport) {
      const rw = Math.min(620, w - 490);
      if (rw > 220) {
        const rx = (w - rw) * 0.5;
        const ry = h - 54;
        ctx.fillStyle = 'rgba(8, 18, 26, 0.88)';
        drawRoundedRect(ctx, rx, ry, rw, 34, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 242, 212, 0.58)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#38f2d4';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('VHF', rx + 12, ry + 17);
        ctx.fillStyle = '#edf7fb';
        ctx.font = '11.5px monospace';
        const maxChars = Math.floor((rw - 56) / 7);
        ctx.fillText(radioText.slice(0, maxChars), rx + 44, ry + 17);
      }
    }

    // 8. Landing / Crash Diagnostic Card
    if (state.incidentReport) {
      drawIncidentReportCard(w, h, state, missionSummary);
    }
  }

  return {
    renderHud,
    showBanner,
    showRadioMessage,
  };
}
