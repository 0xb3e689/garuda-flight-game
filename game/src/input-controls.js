// Responsive keyboard + optional mouse-yoke flight input handler for Garuda.
// Supports smooth pitch/roll/yaw, throttle, flaps, gear, wheel brakes, drop, camera & mission shortcuts.

export function createInputControls(canvas, callbacks) {
  const keys = new Set();
  let mouseYokeActive = false;
  let mouseX = 0;
  let mouseY = 0;

  function onKeyDown(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const code = e.code;
    keys.add(code);

    if (code === 'KeyC') callbacks.onToggleCamera?.();
    else if (code === 'KeyG') callbacks.onToggleGear?.();
    else if (code === 'KeyF') callbacks.onCycleFlaps?.();
    else if (code === 'Space') {
      e.preventDefault();
      callbacks.onSupplyDrop?.();
    } else if (code === 'KeyR') callbacks.onRestart?.();
    else if (code === 'KeyM') callbacks.onToggleMute?.();
    else if (code === 'KeyH') callbacks.onToggleBriefing?.();
    else if (code === 'Digit1') callbacks.onSelectMission?.(0);
    else if (code === 'Digit2') callbacks.onSelectMission?.(1);
    else if (code === 'Digit3') callbacks.onSelectMission?.(2);
    else if (code === 'Digit4') callbacks.onSelectMission?.(3);
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseMove(e) {
    if (!mouseYokeActive) return;
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    // Small center deadzone so straight-and-level flight feels calm
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
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  function sampleControls() {
    let pitch = 0;
    let roll = 0;
    let yaw = 0;
    let throttleDelta = 0;

    // Pitch: S/ArrowDown pulls nose up (classic flight stick), W/ArrowUp noses down
    if (keys.has('KeyS') || keys.has('ArrowDown')) pitch += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) pitch -= 1;

    // Roll: A/ArrowLeft banks left, D/ArrowRight banks right
    if (keys.has('KeyA') || keys.has('ArrowLeft')) roll -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) roll += 1;

    // Rudder yaw: Q left, E right
    if (keys.has('KeyQ')) yaw -= 1;
    if (keys.has('KeyE')) yaw += 1;

    // Throttle: Shift / Equal(+) increases, Control / Minus(-) decreases
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

  return { sampleControls };
}
