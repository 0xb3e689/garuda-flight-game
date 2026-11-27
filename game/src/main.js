// Main bootstrap, shadowed render loop, onboarding briefing, ESC pause/mission menu, and live flight simulation.
import * as T from 'three';
import { createFlightState, resetFlightState, stepFlightPhysics } from './flight-physics.js';
import { createMissionManager, MISSIONS } from './missions.js';
import { createHudInstruments } from './hud-instruments.js';
import { createAircraftModel } from './aircraft-model.js';
import { createCockpitInterior } from './cockpit-interior.js';
import { createArchipelagoWorld, sampleTerrainHeight } from './terrain-world.js';
import { createCameraRig } from './camera-rig.js';
import { createEffectsSystem } from './effects-particles.js';
import { createInputControls } from './input-controls.js';
import { createAudioEngine } from './audio-engine.js';
import { applyShotPreset } from './shots.js';

const WS=['golden','dusk','rain','storm'],WL={golden:'CLEAR',dusk:'DUSK',rain:'RAIN',storm:'STORM'},rFor=(w)=>w==='storm'?1:w==='rain'?.6:0;

function bootGaruda() {
  const $=(id)=>document.getElementById(id),on=(el,ev,fn)=>el?.addEventListener(ev,fn);
  const glC=$('flight-canvas'),hudC=$('hud-canvas'),brD=$('briefing-dialog'),psD=$('pause-dialog'),mLst=$('mission-list');
  const ren=new T.WebGLRenderer({canvas:glC,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
  ren.setPixelRatio(Math.min(window.devicePixelRatio||1,2));ren.setSize(window.innerWidth,window.innerHeight);
  ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=1.1;

  const scene=new T.Scene(),cam=new T.PerspectiveCamera(56,window.innerWidth/window.innerHeight,.25,24000);
  const world=createArchipelagoWorld(scene),ac=createAircraftModel(scene),ckp=createCockpitInterior(ac.root);
  const fx=createEffectsSystem(scene),rig=createCameraRig(cam),mm=createMissionManager(scene),st=createFlightState(),hud=createHudInstruments(hudC),aud=createAudioEngine();

  let wth='golden',curI=0,paused=false,simT=0;
  const rad=(t,u=false)=>{hud.showRadioMessage(t,u?5.6:4.8);aud.playRadioCall(t,u);};
  const act=(fn)=>()=>{aud.unlock();aud.playClick();fn();};

  function applyWeather(p, n = false) {
    wth=p;world.setAtmospherePreset(p);if($('weather-btn'))$('weather-btn').textContent=`SKY: ${WL[p]} [V]`;
    if(n)hud.showBanner(`WEATHER: ${WL[p]}${rFor(p)>0?' · WIPERS AUTO':''}`,'info',2);
  }
  const cycW=()=>applyWeather(WS[(WS.indexOf(wth)+1)%4],true);

  function renderMissionButtons() {
    mLst.innerHTML='';
    MISSIONS.forEach((m,i)=>{
      const b=Object.assign(document.createElement('button'),{type:'button',className:`mission-card${i===curI?' active':''}`,innerHTML:`<span class="mission-badge">${m.shortTag} · ${m.windDesc} · TARGET ${m.targetRunwayId}</span><strong>${m.name}</strong><span class="mission-desc"><b>Goal:</b> ${m.goal}</span><span class="mission-desc">${m.summary}</span>`});
      on(b,'click',act(()=>startMission(i,true)));mLst.appendChild(b);
    });
  }

  function setPaused(next) {paused=next;if(paused){ctrls.clearKeys();renderMissionButtons();if(!psD.open)psD.showModal();}else if(psD.open)psD.close('resume');}

  function startMission(idx, cls = true, say = true) {
    curI=idx%MISSIONS.length;const m=mm.loadMission(curI);
    applyWeather(m.atmosphere);fx.clearDebris();resetFlightState(st,m.spawn);
    rig.setChaseLateralBias(0);rig.setMode('chase');rig.updateCamera(st,.016,true);
    hud.showBanner(`M${m.number}: ${m.name.toUpperCase()}`,'info',2.8);if(say&&m.radioIntro)rad(m.radioIntro);
    if(cls&&psD.open)psD.close('launch');if(cls&&brD?.open)brD.close('launch');paused=false;
  }

  function openOnboardingBriefing() {
    if(!brD)return;const m=MISSIONS[curI];
    if($('briefing-title'))$('briefing-title').textContent=`M${m.number} · ${m.name.toUpperCase()} (${m.windDesc})`;
    if($('briefing-goal'))$('briefing-goal').textContent=`GOAL: ${m.summary}`;
    paused=true;ctrls.clearKeys();if(!brD.open)brD.showModal();
  }

  if(brD){
    const cls=act(()=>{if(brD.open)brD.close('launch');paused=false;if(MISSIONS[curI]?.radioIntro)rad(MISSIONS[curI].radioIntro);});
    on($('launch-btn'),'click',cls);on(brD,'close',()=>{paused=false;});
    on(brD,'keydown',(e)=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();cls();}});
  }
  on(psD,'close',()=>{psD.returnValue='';paused=false;});
  if(!('closedBy' in HTMLDialogElement.prototype)){
    let out=false;const isO=(e)=>{const r=psD.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
    on(psD,'pointerdown',(e)=>{out=isO(e);});on(psD,'pointerup',(e)=>{if(out&&isO(e))psD.close();});
  }
  on($('resume-btn'),'click',()=>{aud.unlock();setPaused(false);});on($('weather-btn'),'click',act(cycW));
  on($('restart-btn'),'click',act(()=>startMission(curI,true)));on($('mute-btn'),'click',(e)=>{aud.unlock();e.currentTarget.textContent=aud.toggleMute()?'AUDIO: OFF':'AUDIO: ON';});

  const ctrls=createInputControls(glC,{
    onUserInteract:()=>aud.unlock(),onTogglePause:()=>setPaused(!paused),onCycleWeather:act(cycW),onRestart:act(()=>startMission(curI,true)),
    onToggleMute:()=>hud.showBanner(aud.toggleMute()?'MUTED':'AUDIO ON','info',1.4),onSelectMission:(i)=>act(()=>startMission(i,true))(),
    onToggleCamera:()=>{if(!paused)act(()=>hud.showBanner(rig.toggleMode()==='cockpit'?'COCKPIT':'CHASE','info',1.4))();},
    onNextMission:()=>{if(st.incidentReport?.missionComplete)act(()=>startMission((curI+1)%MISSIONS.length,true))();},
    onToggleGear:()=>{if(paused)return;aud.unlock();if(!st.gearIntact){hud.showBanner('GEAR DAMAGED','danger',2);return;}st.gearDown=!st.gearDown;aud.playClick();hud.showBanner(st.gearDown?'GEAR DOWN':'GEAR UP','info',1.6);},
    onCycleFlaps:()=>{if(paused)return;aud.unlock();if(st.malfunctions?.flapJammed){hud.showBanner('FLAPS JAMMED — HYDRAULIC DAMAGE','danger',2.2);return;}st.flapStage=(st.flapStage+1)%3;aud.playClick();hud.showBanner(`FLAPS ${[0,15,30][st.flapStage]}°`,'info',1.6);},
    onSupplyDrop:()=>{if(paused)return;aud.unlock();const r=mm.triggerSupplyDrop(st);if(r.dropped){(r.hit?aud.playRingChime:aud.playClick)();hud.showBanner(r.message,r.hit?'good':'warn',3);}},
  });

  on(window,'resize',()=>{cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();ren.setSize(window.innerWidth,window.innerHeight);});
  window.__GARUDA_STATE__=st;window.__GARUDA_AIRCRAFT__=ac;

  const shot=new URLSearchParams(window.location.search).get('shot');
  if(shot&&applyShotPreset(shot,{flightState:st,missionManager:mm,world,aircraft:ac,cockpit:ckp,cameraRig:rig,effects:fx,hud,camera:cam})){
    cam.updateMatrixWorld();ren.render(scene,cam);hud.renderHud(st,mm.getMissionSummary(st),mm.getActiveMission().wind,rig.getMode(),0,cam);window.__GARUDA_READY__=true;return;
  }

  renderMissionButtons();startMission(0,false,false);openOnboardingBriefing();

  const ev={
    onTouchdown:(i)=>{fx.emitTouchdownSmoke(st.position,st.quaternion,i.hard);aud.playTouchdown(i.hard);hud.showBanner(i.gearUp?'GEAR-UP SCRAPE — HULL DAMAGED':i.hard?`HARD TOUCHDOWN (-${i.sinkMps.toFixed(1)} m/s) · HOLD [B]`:`TOUCHDOWN (-${i.sinkMps.toFixed(1)} m/s) · HOLD [B] TO STOP`,i.gearUp?'danger':i.hard?'warn':'good',2.8);},
    onWingClip:(wp,vel,sev)=>{fx.emitWingClipSparks(wp,vel,sev);aud.playTouchdown(true);},
    onMalfunction:(f)=>{aud.playTouchdown(true);hud.showBanner(`MALFUNCTION: ${f.code}`,'danger',3.4);rad(`Caution Garuda 4! ${f.code}. ${f.detail}`,true);},
    onFullStop:(r)=>{aud.playRingChime();hud.showBanner(r.title,'good',4);rad(r.missionComplete?'Merpati Tower: Full stop confirmed. Mission complete!':'Merpati Tower: Full stop confirmed. Mission gates remain open.');},
    onCrash:(r)=>{
      const fy=Math.max(0,sampleTerrainHeight(st.position.x,st.position.z));fx.emitRoaringFireBurst(st.position,st.quaternion,fy,r.crashMode==='water',r.severity||'catastrophic',r.crashCause||'terrain',false);
      if(r.crashMode!=='water')fx.emitTouchdownSmoke(st.position,st.quaternion,true);
      aud.playCrash();hud.showBanner(r.title,'danger',4.5);
      rad(r.crashMode==='water'?'SAR Dispatch: Garuda 4 in the water! Coast Guard deploying.':r.hasFuelFire?'Mayday! Severe impact — fire trucks rolling!':'Tower: Hard impact on deck — crash crew rolling!',true);
    },
  };

  let lastTs=performance.now();
  function frame(now) {
    const dt=Math.min(.05,Math.max(.001,(now-lastTs)/1000));lastTs=now;const m=mm.getActiveMission();
    if(!paused){
      simT+=dt;stepFlightPhysics(st,ctrls.sampleControls(),dt,m.wind,ev,world.checkObstacleCollision);
      mm.updateMission(dt,simT,st,(k,msg)=>{if(k==='ring'||k==='drop')aud.playRingChime();hud.showBanner(msg,'good',2.8);if(k==='drop')rad('Ground Crew: Cargo on target! Proceed to runway.');});
      const rain=rFor(wth),isC=rig.getMode()==='cockpit';
      world.updateWorld(dt,simT,st.position,m.wind,st.quaternion);ac.updateAircraftModel(st,dt,simT,!isC);rig.updateCamera(st,dt,false);
      fx.updateEffects(dt,simT,st,cam.position,rain,isC);
      const sum=mm.getMissionSummary(st),wp=sum.waypoint,wpB=wp?((Math.atan2(wp.x-st.position.x,-(wp.z-st.position.z))*180)/Math.PI+360)%360:NaN;
      ckp.updateCockpit(st,wpB,isC,false,simT,rain);aud.updateAudio(st,simT);hud.renderHud(st,sum,m.wind,rig.getMode(),dt,cam);
    }
    ren.render(scene,cam);requestAnimationFrame(frame);
  }
  window.__GARUDA_READY__=true;requestAnimationFrame(frame);
}
bootGaruda();
