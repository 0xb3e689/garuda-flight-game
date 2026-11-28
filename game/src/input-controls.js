// Keyboard + optional mouse-yoke flight input (roll/pitch/rudder/throttle, Autopilot P, Speedbrake X, Trim [/], F/G/B/V/Space/C/Esc).
const PREV=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
export function createInputControls(cv,cb){
  const K=new Set();let mOn=false,mX=0,mY=0;
  const act={KeyC:()=>cb.onToggleCamera?.(),KeyG:()=>cb.onToggleGear?.(),KeyF:()=>cb.onCycleFlaps?.(),KeyP:()=>cb.onToggleAutopilot?.(),KeyX:()=>cb.onToggleSpeedbrake?.(),KeyV:()=>cb.onCycleWeather?.(),Space:()=>cb.onSupplyDrop?.(),KeyR:()=>cb.onRestart?.(),KeyM:()=>cb.onToggleMute?.(),Enter:()=>cb.onNextMission?.(),Digit1:()=>cb.onSelectMission?.(0),Digit2:()=>cb.onSelectMission?.(1),Digit3:()=>cb.onSelectMission?.(2),Digit4:()=>cb.onSelectMission?.(3)};
  const clearKeys=()=>{K.clear();mOn=false;mX=mY=0;};
  const mv=(e)=>{if(!mOn)return;const r=cv.getBoundingClientRect(),nx=((e.clientX-r.left)/r.width)*2-1,ny=((e.clientY-r.top)/r.height)*2-1;mX=Math.abs(nx)<.06?0:Math.max(-1,Math.min(1,nx));mY=Math.abs(ny)<.06?0:Math.max(-1,Math.min(1,ny));};
  window.addEventListener('keydown',(e)=>{if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return;if(PREV.has(e.code))e.preventDefault();if(e.code==='Escape'){if(!e.repeat){e.preventDefault();cb.onTogglePause?.();}return;}K.add(e.code);if(!e.repeat)act[e.code]?.();});
  window.addEventListener('keyup',(e)=>K.delete(e.code));window.addEventListener('blur',clearKeys);
  cv.addEventListener('mousedown',(e)=>{if(e.button===0){mOn=true;mv(e);cb.onUserInteract?.();}});
  window.addEventListener('mousemove',mv);window.addEventListener('mouseup',()=>{mOn=false;mX=mY=0;});
  const h=(k)=>K.has(k);
  function sampleControls(){
    let pitch=(h('KeyS')||h('ArrowDown')?1:0)-(h('KeyW')||h('ArrowUp')?1:0),roll=(h('KeyD')||h('ArrowRight')?1:0)-(h('KeyA')||h('ArrowLeft')?1:0);
    const yaw=(h('KeyE')?1:0)-(h('KeyQ')?1:0),throttleDelta=(h('ShiftLeft')||h('ShiftRight')||h('Equal')||h('KeyI')?1:0)-(h('ControlLeft')||h('ControlRight')||h('Minus')||h('KeyK')?1:0),trimDelta=(h('BracketRight')?1:0)-(h('BracketLeft')?1:0);
    if(mOn){roll=Math.max(-1,Math.min(1,roll+mX));pitch=Math.max(-1,Math.min(1,pitch+mY));}
    return {pitch,roll,yaw,throttleDelta,trimDelta,brakes:h('KeyB'),mouseYokeActive:mOn};
  }
  return {sampleControls,clearKeys};
}
