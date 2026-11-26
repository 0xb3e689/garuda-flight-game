// Flown-bezel aviation HUD overlay renderer: heading tape, airspeed/altitude tapes,
// pitch ladder, PAPI glideslope indicator, tactical archipelago minimap, fuel/hull/throttle
// strip, and readable landing/crash sortie diagnostic panel.

import { FLAP_ANGLES, LANDMARKS, RUNWAYS } from './config.js';
import { MISSIONS } from './missions.js';

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
  let bannerText = '';
  let bannerTone = 'info'; // 'info' | 'good' | 'warn' | 'danger'
  let bannerTimer = 0;

  function showBanner(text, tone = 'info', duration = 3.0) {
    bannerText = text;
    bannerTone = tone;
    bannerTimer = duration;
  }

  function drawHeadingTape(w, headingDeg, waypointBearing, missionSummary) {
    const tapeW = Math.min(460, w * 0.42);
    const x0 = (w - tapeW) * 0.5;
    const y0 = 14;

    // Dark bezel strip
    ctx.fillStyle = 'rgba(10, 17, 24, 0.78)';
    drawRoundedRect(ctx, x0, y0, tapeW, 44, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(102, 224, 210, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 + 6, y0 + 2, tapeW - 12, 40);
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
      if (Math.abs(diff) > 41) continue;
      const tx = centerX + diff * pxPerDeg;
      const major = norm % 15 === 0;
      ctx.strokeStyle = major ? '#d8f3ee' : 'rgba(180, 215, 212, 0.45)';
      ctx.lineWidth = major ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(tx, y0 + 30);
      ctx.lineTo(tx, y0 + (major ? 41 : 37));
      ctx.stroke();

      if (major) {
        const label = cardinals[norm] ?? String(norm).padStart(3, '0');
        ctx.fillStyle = cardinals[norm] ? '#ffbe4f' : '#d8f3ee';
        ctx.font = cardinals[norm] ? 'bold 13px monospace' : 'bold 11px monospace';
        ctx.fillText(label, tx, y0 + 11);
      }
    }

    // Waypoint diamond bug
    if (Number.isFinite(waypointBearing)) {
      const wDiff = Math.max(-48, Math.min(48, normalizeAngleDiff(waypointBearing, headingDeg)));
      const wx = centerX + wDiff * pxPerDeg;
      ctx.fillStyle = '#ff9f2e';
      ctx.beginPath();
      ctx.moveTo(wx, y0 + 4);
      ctx.lineTo(wx + 6, y0 + 10);
      ctx.lineTo(wx, y0 + 16);
      ctx.lineTo(wx - 6, y0 + 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Center HDG readout badge
    ctx.fillStyle = '#0c1620';
    drawRoundedRect(ctx, centerX - 36, y0 + 38, 72, 24, 4);
    ctx.fill();
    ctx.strokeStyle = '#38f2d4';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hdgText = `${String(Math.round(headingDeg) % 360).padStart(3, '0')}°`;
    ctx.fillText(hdgText, centerX, y0 + 50);

    // Waypoint label pill under HDG
    const wp = missionSummary.waypoint;
    if (wp) {
      ctx.fillStyle = 'rgba(10, 17, 24, 0.72)';
      drawRoundedRect(ctx, centerX - 110, y0 + 66, 220, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#ffbe4f';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(wp.label, centerX, y0 + 77);
    }
  }

  function drawVerticalTape(x, y, w, h, value, step, unit, label, alignRight, accentColor, subText) {
    ctx.fillStyle = 'rgba(10, 17, 24, 0.76)';
    drawRoundedRect(ctx, x, y, w, h, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110, 210, 200, 0.42)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header tag
    ctx.fillStyle = '#9ac0ca';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w * 0.5, y + 14);

    // Tape ticks
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

    // Highlighted center numeric drum
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

    // Subtle artificial horizon / pitch ladder
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, isCockpit ? 110 : 128, 0, Math.PI * 2);
    ctx.clip();

    ctx.rotate((-state.rollDeg * Math.PI) / 180);
    const pxPerDeg = 5.4;
    const pitchOffset = state.pitchDeg * pxPerDeg;

    ctx.strokeStyle = state.stalling ? 'rgba(255, 84, 73, 0.88)' : 'rgba(72, 245, 210, 0.72)';
    ctx.fillStyle = state.stalling ? '#ff5449' : '#66f7dc';
    ctx.font = 'bold 10px monospace';
    ctx.textBaseline = 'middle';

    // Horizon line
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

    // Fixed boresight gull-wing reticle
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

  function drawMinimap(x, y, size, state, missionSummary, windVec) {
    ctx.fillStyle = 'rgba(9, 18, 26, 0.84)';
    drawRoundedRect(ctx, x, y, size, size, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(72, 224, 210, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const cx = x + size * 0.5;
    const cy = y + size * 0.5;
    const scale = size / 3800;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, size - 8, size - 8, 8);
    ctx.clip();

    // Subtle radar rings
    ctx.strokeStyle = 'rgba(72, 224, 210, 0.14)';
    ctx.lineWidth = 1;
    for (const r of [size * 0.2, size * 0.38]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Island silhouettes (relative to aircraft or world-centered)
    const toMap = (wx, wz) => [cx + (wx - state.position.x) * scale, cy + (wz - state.position.z) * scale];

    const blobs = [
      [20, 10, 480, '#275946'],
      [-1040, -1460, 620, '#4f4e48'],
      [1200, -1250, 390, '#3a5e44'],
      [-760, 860, 260, '#2e5d4b'],
    ];
    for (const [bx, bz, br, col] of blobs) {
      const [mx, my] = toMap(bx, bz);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(mx, my, br * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Runways
    for (const rwy of RUNWAYS) {
      const [rx, ry] = toMap(rwy.x, rwy.z);
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate((rwy.headingDeg * Math.PI) / 180);
      ctx.fillStyle = rwy.id === missionSummary.mission.targetRunwayId ? '#38f2d4' : '#cbd5e1';
      ctx.fillRect(-2.5, -(rwy.length * scale) * 0.5, 5, Math.max(10, rwy.length * scale));
      ctx.restore();
    }

    // Active Waypoint Marker
    const wp = missionSummary.waypoint;
    if (wp) {
      const [wx, wy] = toMap(wp.x, wp.z);
      ctx.strokeStyle = '#ffaa2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wx, wy, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 170, 43, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(wx, wy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Aircraft icon in center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((state.headingDeg * Math.PI) / 180);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Label + Wind indicator
    ctx.fillStyle = '#9ec7d2';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ARCHIPELAGO RADAR', x + 10, y + 15);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffbe4f';
    ctx.fillText(missionSummary.mission.windDesc, x + size - 10, y + size - 8);
  }

  function drawSystemsPanel(x, y, w, h, state, missionSummary) {
    ctx.fillStyle = 'rgba(10, 17, 24, 0.84)';
    drawRoundedRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(102, 224, 210, 0.42)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Mission Header + Score (non-overlapping layout)
    ctx.fillStyle = '#ffbe4f';
    ctx.font = 'bold 11.5px monospace';
    ctx.textAlign = 'left';
    const shortName = missionSummary.mission.shortTag.replace('COASTAL RINGS', 'MAIL RUN').replace('CALDERA DROP', 'CALDERA');
    ctx.fillText(shortName, x + 12, y + 19);
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
      `${Math.round(state.fuelPct)}%`,
      state.fuelPct < 24 ? '#ff4d4f' : '#f5a623',
      y + 72,
    );
    drawGaugeBar(
      'HULL / ENG',
      state.hullPct,
      `${Math.round(state.hullPct)}%`,
      state.hullPct < 60 ? '#ff5722' : '#22c55e',
      y + 102,
    );

    // Bottom status pills: GEAR, FLAPS, PAPI, GATES
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

    // PAPI Glideslope 4-lamp mirror bar
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
    const cardW = Math.min(520, w - 250);
    const cardH = 264;
    const x = w - cardW - 122;
    const y = Math.max(96, (h - cardH) * 0.44);

    ctx.fillStyle = 'rgba(11, 17, 24, 0.92)';
    drawRoundedRect(ctx, x, y, cardW, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = isCrash ? '#ff4d4f' : '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Top status strip
    ctx.fillStyle = isCrash ? 'rgba(255, 77, 79, 0.22)' : 'rgba(34, 197, 94, 0.2)';
    drawRoundedRect(ctx, x + 2, y + 2, cardW - 4, 42, 10);
    ctx.fill();

    ctx.fillStyle = isCrash ? '#ff6b6b' : '#4ade80';
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(report.title, x + 18, y + 23);

    // Human-readable incident explanation
    ctx.fillStyle = '#e5eef5';
    ctx.font = '13px monospace';
    ctx.fillText(report.detail.slice(0, 62), x + 18, y + 66);
    if (report.detail.length > 62) {
      ctx.fillText(report.detail.slice(62), x + 18, y + 84);
    }

    // Telemetry diagnostics grid
    const stats = [
      ['SINK RATE', report.sinkMps != null ? `-${report.sinkMps.toFixed(1)} m/s` : '-1.4 m/s', report.sinkMps > 4.6 ? '#ff6b6b' : '#4ade80'],
      ['SPEED', `${Math.round(report.speedKts ?? state.airspeedKts)} KTS`, '#38f2d4'],
      ['BANK ANGLE', `${Math.round(report.bankDeg ?? Math.abs(state.rollDeg))}°`, (report.bankDeg ?? 0) > 14 ? '#ffbe4f' : '#4ade80'],
      ['FUEL LEFT', `${Math.round(state.fuelPct)}%`, state.fuelPct < 24 ? '#ffbe4f' : '#e5eef5'],
      ['HULL STATE', `${Math.round(state.hullPct)}%`, state.hullPct < 50 ? '#ff6b6b' : '#4ade80'],
      ['SORTIE SCORE', String(missionSummary.score), '#ffbe4f'],
    ];

    const colW = (cardW - 48) / 3;
    for (let i = 0; i < stats.length; i++) {
      const [k, v, col] = stats[i];
      const gx = x + 18 + (i % 3) * (colW + 6);
      const gy = y + 104 + Math.floor(i / 3) * 46;
      ctx.fillStyle = 'rgba(22, 33, 44, 0.9)';
      drawRoundedRect(ctx, gx, gy, colW, 38, 6);
      ctx.fill();
      ctx.fillStyle = '#8faec0';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(k, gx + 8, gy + 12);
      ctx.fillStyle = col;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(v, gx + 8, gy + 28);
    }

    // Four missions selector hint strip
    ctx.fillStyle = '#9ec0cf';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('PRESS [R] RETRY  ·  SELECT SORTIE [1] MAIL  [2] CALDERA  [3] CLIFF  [4] RESCUE', x + 18, y + cardH - 36);

    // Highlight active & available sorties as mini pills
    const mW = (cardW - 54) / 4;
    for (let i = 0; i < MISSIONS.length; i++) {
      const m = MISSIONS[i];
      const mx = x + 18 + i * (mW + 6);
      const my = y + cardH - 24;
      const active = m.id === missionSummary.mission.id;
      ctx.fillStyle = active ? '#ff9d2e' : 'rgba(26, 38, 50, 0.95)';
      drawRoundedRect(ctx, mx, my, mW, 18, 4);
      ctx.fill();
      ctx.fillStyle = active ? '#0b1118' : '#b7d0dc';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`[${m.number}] ${m.name.split(' ')[0].toUpperCase()}`, mx + mW * 0.5, my + 9);
    }
  }

  function renderHud(state, missionSummary, windVec, cameraMode, dt) {
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

    // Waypoint bearing
    let wpBearing = NaN;
    if (missionSummary.waypoint) {
      const dx = missionSummary.waypoint.x - state.position.x;
      const dz = missionSummary.waypoint.z - state.position.z;
      wpBearing = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
    }

    // 1. Heading Tape
    drawHeadingTape(w, state.headingDeg, wpBearing, missionSummary);

    // 2. Pitch Ladder & Reticle
    if (state.status === 'flying') {
      drawPitchLadder(w, h, state, cameraMode === 'cockpit');
    }

    // 3. Left IAS Speed Tape & Right ALT Altitude Tape
    const tapeH = Math.min(230, h * 0.36);
    const tapeY = Math.max(100, h * 0.25);
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

    // 4. Bottom-Left Archipelago Radar Minimap & Bottom-Right Systems Strip
    if (cameraMode !== 'cockpit') {
      drawMinimap(20, h - 186, 166, state, missionSummary, windVec);
      drawSystemsPanel(w - 286, h - 196, 266, 176, state, missionSummary);
    } else {
      // Compact top-left & top-right strips in cockpit view so 3D gauges stay completely unobstructed!
      drawSystemsPanel(w - 274, 16, 256, 174, state, missionSummary);
      drawMinimap(20, 16, 146, state, missionSummary, windVec);
    }

    // 5. Dynamic Alerts & Event Banner
    const urgentAlert = state.stalling
      ? { text: 'STALL WARNING — LOWER NOSE / ADD THROTTLE', tone: 'danger' }
      : state.overspeed
        ? { text: 'OVERSPEED — REDUCE THROTTLE', tone: 'danger' }
        : state.lowFuel && state.status === 'flying'
          ? { text: `LOW FUEL CAUTION (${Math.round(state.fuelPct)}%) — CONSERVE THROTTLE`, tone: 'warn' }
          : bannerTimer > 0
            ? { text: bannerText, tone: bannerTone }
            : null;

    if (urgentAlert) {
      const bw = Math.min(480, w - 40);
      const bx = (w - bw) * 0.5;
      const by = cameraMode === 'cockpit' ? 96 : 102;
      const bg =
        urgentAlert.tone === 'danger'
          ? 'rgba(185, 28, 28, 0.9)'
          : urgentAlert.tone === 'warn'
            ? 'rgba(180, 83, 9, 0.9)'
            : urgentAlert.tone === 'good'
              ? 'rgba(15, 118, 110, 0.9)'
              : 'rgba(15, 23, 42, 0.85)';
      ctx.fillStyle = bg;
      drawRoundedRect(ctx, bx, by, bw, 30, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(urgentAlert.text, w * 0.5, by + 15);
    }

    // 6. Readable Landing / Crash Diagnostic Card
    if (state.incidentReport) {
      drawIncidentReportCard(w, h, state, missionSummary);
    }

    // 7. Subtle Top-Left Brand + Key Legend (chase mode)
    if (cameraMode !== 'cockpit') {
      ctx.fillStyle = 'rgba(10, 17, 24, 0.72)';
      drawRoundedRect(ctx, 20, 14, 244, 52, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 190, 79, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#ffbe4f';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('GARUDA  G-4', 32, 33);
      ctx.fillStyle = '#b9d6df';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('[C] CAM  [F] FLAP  [G] GEAR  [H] SORTIES', 32, 52);
    }
  }

  return {
    renderHud,
    showBanner,
  };
}
