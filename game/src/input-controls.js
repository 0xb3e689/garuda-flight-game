// Responsive keyboard + optional mouse-yoke flight input handler for Garuda.
// A/D or Left/Right banks & turns smoothly; W/S or Up/Down pitches; Q/E fine rudder;
// Shift/Ctrl throttle; F flaps; G gear; B brakes; Space drop; C camera; Esc pause.

const PREVENT_DEFAULT_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export function createInputControls(canvas, callbacks) {
  const keys = new Set();
  let mouseYokeActive = false;
  let mouseX = 0;
  let mouseY = 0;

  function onKeyDown(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const code = e.code;
    if (PREVENT_DEFAULT_KEYS.has(code)) e.preventDefault();

    // Handle Escape to pause/resume cleanly without double-firing on key repeat
    if (code === 'Escape') {
      if (!e.repeat) {
        e.preventDefault();
        callbacks.onTogglePause?.();
      }
      return;
    }

    keys.add(code);
    if (e.repeat) return;

    if (code === 'KeyC') callbacks.onToggleCamera?.();
    else if (code === 'KeyG') callbacks.onToggleGear?.();
    else if (code === 'KeyF') callbacks.onCycleFlaps?.();
    else if (code === 'KeyV') callbacks.onCycleWeather?.();
    else if (code === 'Space') callbacks.onSupplyDrop?.();
    else if (code === 'KeyR') callbacks.onRestart?.();
    else if (code === 'KeyM') callbacks.onToggleMute?.();
    else if (code === 'Enter') callbacks.onNextMission?.();
    else if (code === 'Digit1') callbacks.onSelectMission?.(0);
    else if (code === 'Digit2') callbacks.onSelectMission?.(1);
    else if (code === 'Digit3') callbacks.onSelectMission?.(2);
    else if (code === 'Digit4') callbacks.onSelectMission?.(3);
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onBlur() {
    keys.clear();
    mouseYokeActive = false;
    mouseX = 0;
    mouseY = 0;
  }

  function onMouseMove(e) {
    if (!mouseYokeActive) return;
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseX = Math.abs(nx) < 0.06 ? 0 : Math.max(-1, Math.min(1, nx));
    mouseY = Math.abs(ny) < 0.06 ? 0 : Math.max(-1, Math.min(1, ny));
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      mouseYokeActive = true;
      onMouseMove(e);
      callbacks.onUserInteract?.();
    }
  }

  function onMouseUp() {
    mouseYokeActive = false;
    mouseX = 0;
    mouseY = 0;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  function sampleControls() {
    let pitch = 0;
    let roll = 0;
    let yaw = 0;
    let throttleDelta = 0;

    // Pitch: S/Down pulls nose up, W/Up pitches nose down
    if (keys.has('KeyS') || keys.has('ArrowDown')) pitch += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) pitch -= 1;

    // Roll & coordinated turn: A/Left banks & turns left (-1), D/Right banks & turns right (+1)
    if (keys.has('KeyA') || keys.has('ArrowLeft')) roll -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) roll += 1;

    // Fine rudder yaw: Q left (-1), E right (+1)
    if (keys.has('KeyQ')) yaw -= 1;
    if (keys.has('KeyE')) yaw += 1;

    // Throttle: Shift / + / I increases, Ctrl / - / K decreases
    if (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Equal') || keys.has('KeyI')) throttleDelta += 1;
    if (keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('Minus') || keys.has('KeyK')) throttleDelta -= 1;

    if (mouseYokeActive) {
      roll = Math.max(-1, Math.min(1, roll + mouseX));
      pitch = Math.max(-1, Math.min(1, pitch + mouseY));
    }

    return {
      pitch,
      roll,
      yaw,
      throttleDelta,
      brakes: keys.has('KeyB'),
      mouseYokeActive,
    };
  }

  return { sampleControls, clearKeys: onBlur };
}
