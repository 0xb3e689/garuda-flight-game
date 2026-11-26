// Keyboard + optional mouse-yoke flight input handler (A/D roll, W/S pitch, Q/E rudder, Shift/Ctrl throttle, F/G/B/V/Space/C/Esc).
const PREV = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export function createInputControls(canvas, cb) {
  const keys = new Set(); let mOn = false, mX = 0, mY = 0;
  const act = { KeyC: () => cb.onToggleCamera?.(), KeyG: () => cb.onToggleGear?.(), KeyF: () => cb.onCycleFlaps?.(), KeyV: () => cb.onCycleWeather?.(), Space: () => cb.onSupplyDrop?.(), KeyR: () => cb.onRestart?.(), KeyM: () => cb.onToggleMute?.(), Enter: () => cb.onNextMission?.(), Digit1: () => cb.onSelectMission?.(0), Digit2: () => cb.onSelectMission?.(1), Digit3: () => cb.onSelectMission?.(2), Digit4: () => cb.onSelectMission?.(3) };
  const clearKeys = () => { keys.clear(); mOn = false; mX = mY = 0; };
  const onMove = (e) => { if (!mOn) return; const r = canvas.getBoundingClientRect(), nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1; mX = Math.abs(nx) < 0.06 ? 0 : Math.max(-1, Math.min(1, nx)); mY = Math.abs(ny) < 0.06 ? 0 : Math.max(-1, Math.min(1, ny)); };

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (PREV.has(e.code)) e.preventDefault();
    if (e.code === 'Escape') { if (!e.repeat) { e.preventDefault(); cb.onTogglePause?.(); } return; }
    keys.add(e.code); if (!e.repeat) act[e.code]?.();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', clearKeys);
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mOn = true; onMove(e); cb.onUserInteract?.(); } });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', () => { mOn = false; mX = mY = 0; });

  function sampleControls() {
    let pitch = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let roll = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const yaw = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
    const throttleDelta = (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Equal') || keys.has('KeyI') ? 1 : 0) - (keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('Minus') || keys.has('KeyK') ? 1 : 0);
    if (mOn) { roll = Math.max(-1, Math.min(1, roll + mX)); pitch = Math.max(-1, Math.min(1, pitch + mY)); }
    return { pitch, roll, yaw, throttleDelta, brakes: keys.has('KeyB'), mouseYokeActive: mOn };
  }
  return { sampleControls, clearKeys };
}
