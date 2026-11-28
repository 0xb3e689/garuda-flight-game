// Main bootstrap, shadowed render loop, MSFS Career Hub (Certification/Training/Exam/Badges/Specializations), ESC menu & live flight sim.
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
import { createCareerHub, SPECS } from './career-hub.js';
import { applyShotPreset } from './shots.js';
const WS=['golden','dusk','rain','imc','storm'],WL={golden:'CLEAR',dusk:'DUSK',rain:'RAIN',imc:'IMC FOG',storm:'STORM'},rFor=(w)=>w==='storm'?1:w==='rain'?.6:0;
function bootGaruda(){
  const $=(id)=>document.getElementById(id),on=(el,ev,fn)=>el?.addEventListener(ev,fn);
  const glC=$('flight-canvas'),hudC=$('hud-canvas'),brD=$('briefing-dialog'),psD=$('pause-dialog'),mLst=$('mission-list'),hubEl=$('hub-view'),bcEl=$('hub-badge-count');
  const ren=new T.WebGLRenderer({canvas:glC,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
  ren.setPixelRatio(Math.min(window.devicePixelRatio||1,2));ren.setSize(window.innerWidth,window.innerHeight);
  ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=1.1;
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(56,window.innerWidth/window.innerHeight,.25,24000);
  const world=createArchipelagoWorld(scene),ac=createAircraftModel(scene),ckp=createCockpitInterior(ac.root);
  const fx=createEffectsSystem(scene),rig=createCameraRig(cam),mm=createMissionManager(scene),st=createFlightState(),hud=createHudInstruments(hudC),aud=createAudioEngine();
  let wth='golden',curI=0,paused=false,simT=0,lastCfg=null;
  const rad=(t,u=false)=>{hud.showRadioMessage(t,u?5.6:4.8);aud.playRadioCall(t,u);},act=(fn)=>()=>{aud.unlock();aud.playClick();fn();};
  const focusFly=()=>{document.activeElement?.blur?.();glC.focus?.();};
  function applyWeather(p,n=false){wth=p;world.setAtmospherePreset(p);if($('weather-btn'))$('weather-btn').textContent=`SKY: ${WL[p]} [V]`;if(n)hud.showBanner(`WEATHER: ${WL[p]}${rFor(p)>0?' · WIPERS AUTO':''}`,'info',2);}
  const cycW=()=>applyWeather(WS[(WS.indexOf(wth)+1)%WS.length],true);
  const FREE_AC=[['prop1','C-172 Skyhawk','High-Wing Single Prop · Vne 155 kt'],['twin','G-4 Twin','Low-Wing Twin Turboprop · Vne 215 kt'],['jet','CJ-4 Citation','Swept-Wing Business Jet · Vne 330 kt'],['airliner','A320 Airliner','Wide-Body Commercial Jet · Vne 295 kt']];
  const FREE_LOC=[['AIR','Merpati Harbor (Airborne)',0,185,1120,356,false],['RWY36','Merpati Metro · RWY 36',0,16.45,245,0,true],['RWY09','Karang Bay · RWY 09',1125,68.45,-1250,90,true],['RWY04','Shoal Harbor · RWY 04',-760,10.45,860,35,true]];
  function renderMissionButtons(){
    const ss=hub.getSession(),sum=mm.getMissionSummary(st),pt=$('pause-title');
    mLst.innerHTML='';
    if(ss.mode==='training'&&ss.cert){
      const c=ss.cert;if(pt)pt.textContent=`Training · ${c.code} (${c.name})`;
      mLst.innerHTML=`<div class="pause-card"><div class="pause-sec">Live Syllabus (${ss.step}/${c.steps.length}) · ${c.sub}</div><ol class="syl-list">${c.steps.map(([t,k],i)=>`<li class="${ss.done[i]?'done':i===ss.step?'cur':''}"><span>${ss.done[i]?'✓':i===ss.step?'▸':`${i+1}.`} ${t}</span><kbd>${k}</kbd></li>`).join('')}</ol><div class="pause-foot"><span>${ss.finished?'Syllabus complete — ready for Checkride Exam.':'Follow highlighted step to progress.'}</span><button type="button" class="act-btn exm" data-go="exam">Start ${c.code} Exam</button></div></div>`;
      on(mLst.querySelector('[data-go="exam"]'),'click',act(()=>hub.startSession('exam',c.mIdx,c)));return;
    }
    if(ss.mode==='exam'&&ss.cert){
      const c=ss.cert;if(pt)pt.textContent=`Checkride · ${c.code} (${c.name})`;
      const kpis=[['Target',c.cfg.targetRunwayId||'RWY36'],['Waypoints',`${sum.ringsCleared}/${sum.ringsTotal}`],c.comfort?['Pax Comfort',`${Math.round(st.comfortPct)}%`]:['Hull',`${Math.round(st.hullPct)}%`],['Fuel',`${Math.round(st.fuelPct)}%`]];
      mLst.innerHTML=`<div class="pause-card"><div class="pause-sec">Checkride Requirements · ${c.sub}</div><div class="mission-desc">${c.exam}</div><div class="pause-kpis">${kpis.map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div><div class="pause-foot"><span>Pass criteria: full stop on ${c.cfg.targetRunwayId}, sink &lt; 4.6 m/s${c.comfort?', comfort >= 70%':''}.</span><button type="button" class="act-btn" data-go="trn">Practice Training</button></div></div>`;
      on(mLst.querySelector('[data-go="trn"]'),'click',act(()=>hub.startSession('training',c.mIdx,c)));return;
    }
    if(ss.mode==='free'){
      if(pt)pt.textContent='Free Flight · Archipelago';
      mLst.innerHTML=`<div><div class="pause-sec">Select Aircraft</div><div class="pause-grid">${FREE_AC.map(([k,n,d])=>`<button type="button" class="mission-card${st.aircraftType===k?' active':''}" data-ac="${k}"><strong>${n}</strong><span class="mission-desc">${d}</span></button>`).join('')}</div></div><div><div class="pause-sec">Departure Location</div><div class="pause-grid">${FREE_LOC.map(([id,n],i)=>`<button type="button" class="mission-card" data-loc="${i}"><span class="mission-badge">${id}</span><strong>${n}</strong></button>`).join('')}</div></div>`;
      mLst.querySelectorAll('[data-ac]').forEach((b)=>on(b,'click',act(()=>hub.startFreeFlight(b.dataset.ac))));
      mLst.querySelectorAll('[data-loc]').forEach((b)=>on(b,'click',act(()=>{const [,n,x,y,z,hdg,og]=FREE_LOC[Number(b.dataset.loc)],a=st.aircraftType||'twin',j=a==='jet'||a==='airliner';hub.startSession('free',0,null,null,{name:'Free Flight',shortTag:'FREE FLIGHT',goal:n,shortGoal:n,atmosphere:wth,wind:[2.4,0,1],windDesc:'05 kt VFR',dropZone:null,targetRunwayId:null,rings:[],spawn:{x,y,z,headingDeg:hdg,pitchDeg:og?0:-1,rollDeg:0,speedKts:og?0:j?185:a==='prop1'?92:120,throttle:og?.12:.7,flapStage:og?1:0,gearDown:og,fuelPct:100,onGround:og,jetMode:j,aircraftType:a}});})));return;
    }
    if(ss.mode==='spec'&&ss.spec){
      if(pt)pt.textContent=`Specialization · ${ss.spec.name}`;
      const g=Object.assign(document.createElement('div'),{className:'pause-grid'});
      SPECS.forEach((sp)=>{
        const b=Object.assign(document.createElement('button'),{type:'button',className:`mission-card${sp.id===ss.spec.id?' active':''}`,innerHTML:`<span class="mission-badge">${sp.code}</span><strong>${sp.name}</strong><span class="mission-desc">${sp.sub}</span>`});
        on(b,'click',act(()=>hub.startSession('spec',sp.mIdx,null,sp)));g.appendChild(b);
      });
      mLst.appendChild(g);return;
    }
    if(pt)pt.textContent=`Mission · M${sum.mission.number} ${sum.mission.name}`;
    const g=Object.assign(document.createElement('div'),{className:'pause-grid'});
    MISSIONS.forEach((m,i)=>{
      const b=Object.assign(document.createElement('button'),{type:'button',className:`mission-card${i===curI?' active':''}`,innerHTML:`<span class="mission-badge">${m.shortTag} · ${m.windDesc} · TARGET ${m.targetRunwayId}</span><strong>${m.name}</strong><span class="mission-desc">${m.goal}</span>`});
      on(b,'click',act(()=>hub.startSession('mission',i)));g.appendChild(b);
    });
    mLst.appendChild(g);
  }
  function setPaused(next){paused=next;if(paused){ctrls.clearKeys();renderMissionButtons();if(!psD.open)psD.showModal();}else{if(psD.open)psD.close('resume');focusFly();}}
  function startMission(idx,cls=true,say=true,cfg=null){
    curI=idx%MISSIONS.length;lastCfg=cfg;const ov=cfg?.cert?.cfg||cfg?.spec?.cfg||cfg?.freeAc||null,m=mm.loadMission(curI,ov),sp=ov?.spawn||m.spawn;
    applyWeather(ov?.atmosphere||m.atmosphere);fx.clearDebris();resetFlightState(st,sp);
    rig.setChaseLateralBias(0);rig.setMode(cfg?.cert?.autoCockpit?'cockpit':'chase');rig.updateCamera(st,.016,true);
    const lbl=cfg?.mode==='training'?`TRAINING · ${cfg.cert.name.toUpperCase()}`:cfg?.mode==='exam'?`CHECKRIDE · ${cfg.cert.code}`:cfg?.mode==='spec'?`${cfg.spec.name.toUpperCase()}`:cfg?.mode==='free'?'FREE FLIGHT · VFR':`M${m.number} · ${m.name.toUpperCase()}`;
    hud.showBanner(lbl,cfg?.mode==='exam'?'warn':'info',3.2);
    if(say)rad(cfg?.mode==='training'?`Instructor: ${cfg.cert.code} training. ${cfg.cert.steps[0][0]}.`:cfg?.mode==='exam'?`Examiner: ${cfg.cert.code} checkride. ${cfg.cert.exam}`:cfg?.mode==='free'?'Merpati Tower, cleared VFR free flight across archipelago.':m.radioIntro);
    if(cls&&psD.open)psD.close('launch');if(cls&&brD?.open)brD.close('launch');paused=false;if(cls)focusFly();
  }
  const hub=createCareerHub({onLaunch:(cfg)=>act(()=>startMission(cfg.mIdx,true,true,cfg))()});
  function openCareerHub(tab=null){
    if(!brD)return;if(tab)hub.setTab(tab);if(psD.open)psD.close('hub');
    hub.renderHub(hubEl,MISSIONS,curI,bcEl);paused=true;ctrls.clearKeys();if(!brD.open)brD.showModal();
  }
  if(brD){
    const qFly=act(()=>hub.startFreeFlight(st.aircraftType||'twin'));
    on($('launch-btn'),'click',qFly);on(brD,'close',()=>{paused=false;focusFly();});
    on(brD,'keydown',(e)=>{if(e.code==='Enter'&&e.target===brD){e.preventDefault();qFly();}});
  }
  on(psD,'close',()=>{psD.returnValue='';paused=false;focusFly();});
  if(!('closedBy' in HTMLDialogElement.prototype)){let out=false;const isO=(e)=>{const r=psD.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};on(psD,'pointerdown',(e)=>{out=isO(e);});on(psD,'pointerup',(e)=>{if(out&&isO(e))psD.close();});}
  const restartCur=()=>lastCfg?.mode==='free'?hub.startFreeFlight(st.aircraftType||'twin'):lastCfg?.cert||lastCfg?.spec?hub.startSession(lastCfg.mode,lastCfg.mIdx,lastCfg.cert,lastCfg.spec):startMission(curI,true,true,lastCfg);
  on($('resume-btn'),'click',()=>{aud.unlock();setPaused(false);});on($('career-btn'),'click',act(()=>openCareerHub('cert')));
  on($('weather-btn'),'click',act(cycW));on($('restart-btn'),'click',act(restartCur));
  on($('mute-btn'),'click',(e)=>{aud.unlock();e.currentTarget.textContent=aud.toggleMute()?'Audio: Off':'Audio: On';});
  const ctrls=createInputControls(glC,{
    onUserInteract:()=>aud.unlock(),onTogglePause:()=>{if(brD?.open){brD.close('esc');paused=false;focusFly();return;}setPaused(!paused);},onCycleWeather:act(cycW),onRestart:act(restartCur),
    onToggleMute:()=>hud.showBanner(aud.toggleMute()?'MUTED':'AUDIO ON','info',1.4),onSelectMission:(i)=>act(()=>hub.startSession('mission',i))(),
    onToggleCamera:()=>{if(!paused)act(()=>hud.showBanner(rig.toggleMode()==='cockpit'?'COCKPIT':'CHASE','info',1.4))();},
    onNextMission:()=>{const ss=hub.getSession();if(ss.mode==='training'&&ss.finished&&ss.cert)act(()=>hub.startSession('exam',ss.cert.mIdx,ss.cert))();else if(ss.mode==='exam'&&st.incidentReport?.missionComplete)act(()=>openCareerHub('badges'))();else if(st.incidentReport?.missionComplete)act(()=>hub.startSession('mission',(curI+1)%MISSIONS.length))();},
    onToggleGear:()=>{if(paused)return;aud.unlock();if(!st.gearIntact){hud.showBanner('GEAR DAMAGED','danger',2);return;}st.gearDown=!st.gearDown;aud.playClick();hud.showBanner(st.gearDown?'GEAR DOWN':'GEAR UP','info',1.6);},
    onToggleAutopilot:()=>{if(paused||st.status!=='flying'||st.onGround)return;aud.unlock();st.apEngaged=!st.apEngaged;if(st.apEngaged){st.apTargetHdg=Math.round(st.headingDeg)%360;st.apTargetAltFt=Math.max(150,Math.round(st.altitudeFt/50)*50);}aud.playClick();hud.showBanner(st.apEngaged?`AUTOPILOT ON · HDG ${String(st.apTargetHdg).padStart(3,'0')}° ALT ${st.apTargetAltFt}FT`:'AUTOPILOT DISENGAGED',st.apEngaged?'good':'info',2.2);},
    onToggleSpeedbrake:()=>{if(paused)return;aud.unlock();st.speedbrake=!st.speedbrake;aud.playClick();hud.showBanner(st.speedbrake?'SPEEDBRAKE DEPLOYED':'SPEEDBRAKE RETRACTED','info',1.6);},
    onCycleFlaps:()=>{if(paused)return;aud.unlock();if(st.malfunctions?.flapJammed){hud.showBanner('FLAPS JAMMED — HYDRAULIC DAMAGE','danger',2.2);return;}st.flapStage=(st.flapStage+1)%3;aud.playClick();hud.showBanner(`FLAPS ${[0,15,30][st.flapStage]}°`,'info',1.6);},
    onSupplyDrop:()=>{if(paused||!mm.getActiveMission().dropZone)return;aud.unlock();const r=mm.triggerSupplyDrop(st);if(r.dropped){(r.hit?aud.playRingChime:aud.playClick)();hud.showBanner(r.message,r.hit?'good':'warn',3);}},
  });
  on(window,'resize',()=>{cam.aspect=window.innerWidth/window.innerHeight;cam.updateProjectionMatrix();ren.setSize(window.innerWidth,window.innerHeight);});
  window.__GARUDA_STATE__=st;window.__GARUDA_AIRCRAFT__=ac;window.__GARUDA_HUB__=hub;
  const shot=new URLSearchParams(window.location.search).get('shot');
  if(shot&&applyShotPreset(shot,{flightState:st,missionManager:mm,world,aircraft:ac,cockpit:ckp,cameraRig:rig,effects:fx,hud,camera:cam})){
    cam.updateMatrixWorld();ren.render(scene,cam);hud.renderHud(st,mm.getMissionSummary(st),mm.getActiveMission().wind,rig.getMode(),0,cam);window.__GARUDA_READY__=true;return;
  }
  renderMissionButtons();startMission(0,false,false);openCareerHub('cert');
  const ev={
    onTouchdown:(i)=>{fx.emitTouchdownSmoke(st.position,st.quaternion,i.hard);aud.playTouchdown(i.hard);hud.showBanner(i.gearUp?'GEAR-UP SCRAPE — HULL DAMAGED':i.hard?`HARD TOUCHDOWN (-${i.sinkMps.toFixed(1)} m/s) · HOLD [B]`:`TOUCHDOWN (-${i.sinkMps.toFixed(1)} m/s) · HOLD [B] TO STOP`,i.gearUp?'danger':i.hard?'warn':'good',2.8);},
    onWingClip:(wp,vel,sev)=>{fx.emitWingClipSparks(wp,vel,sev);aud.playTouchdown(true);},
    onMalfunction:(f)=>{aud.playTouchdown(true);hud.showBanner(`MALFUNCTION: ${f.code}`,'danger',3.4);rad(`Caution Garuda 4! ${f.code}. ${f.detail}`,true);},
    onFullStop:(r)=>{
      const out=hub.recordOutcome(st,mm.getMissionSummary(st));aud.playRingChime();hud.showBanner(r.title,'good',4.5);
      rad(out.earned?`Examiner: Congratulations! ${out.cert.code} badge earned with Grade ${out.grade}!`:r.missionComplete?'Merpati Tower: Full stop confirmed. Mission complete!':'Merpati Tower: Full stop confirmed.');
    },
    onCrash:(r)=>{
      const fy=Math.max(0,sampleTerrainHeight(st.position.x,st.position.z));fx.emitRoaringFireBurst(st.position,st.quaternion,fy,r.crashMode==='water',r.severity||'catastrophic',r.crashCause||'terrain',false);
      if(r.crashMode!=='water')fx.emitTouchdownSmoke(st.position,st.quaternion,true);
      aud.playCrash();hud.showBanner(r.title,'danger',4.5);
      rad(r.crashMode==='water'?'SAR Dispatch: Garuda 4 in the water! Coast Guard deploying.':r.hasFuelFire?'Mayday! Severe impact — fire trucks rolling!':'Tower: Hard impact on deck — crash crew rolling!',true);
    },
  };
  let lastTs=performance.now();
  function frame(now){
    const dt=Math.min(.05,Math.max(.001,(now-lastTs)/1000));lastTs=now;const m=mm.getActiveMission();
    if(!paused){
      simT+=dt;stepFlightPhysics(st,ctrls.sampleControls(),dt,m.wind,ev,world.checkObstacleCollision);
      mm.updateMission(dt,simT,st,(k,msg)=>{if(k==='wpt'||k==='drop')aud.playRingChime();hud.showBanner(msg,'good',2.8);if(k==='drop')rad('Ground: Cargo on target, cleared approach.');});
      const rain=rFor(wth),isC=rig.getMode()==='cockpit',sum=mm.getMissionSummary(st);
      hub.stepSession(st,sum,rig.getMode(),dt,(fin,msg)=>{aud.playRingChime();hud.showBanner(msg,'good',3.2);if(fin)rad('Instructor: Training complete! Open Career Hub for your Exam.');},(evMsg)=>{aud.playTouchdown(true);hud.showBanner(evMsg,'danger',4.2);rad(`Examiner: ${evMsg}`,true);});
      world.updateWorld(dt,simT,st.position,m.wind,st.quaternion);ac.updateAircraftModel(st,dt,simT,!isC);rig.updateCamera(st,dt,false);fx.updateEffects(dt,simT,st,cam.position,rain,isC);
      const wp=sum.waypoint,wpB=wp?((Math.atan2(wp.x-st.position.x,-(wp.z-st.position.z))*180)/Math.PI+360)%360:NaN;
      ckp.updateCockpit(st,wpB,isC,false,simT,rain);aud.updateAudio(st,simT);hud.renderHud(st,sum,m.wind,rig.getMode(),dt,cam,hub.getHudState(st));
    }
    ren.render(scene,cam);requestAnimationFrame(frame);
  }
  window.__GARUDA_READY__=true;requestAnimationFrame(frame);
}
bootGaruda();
