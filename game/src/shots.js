// Deterministic ?shot= showcase scene setups for Garuda's 4 real browser screenshots.
import { resetFlightState } from './flight-physics.js';
export function applyShotPreset(name,{flightState:s,missionManager:mm,world,aircraft:ac,cockpit:ck,cameraRig:rig,effects:fx,hud,camera}){
  rig.setChaseLateralBias(0);fx.clearDebris();
  const rst=(x,y,z,headingDeg,pitchDeg,rollDeg,speedKts,throttle,flapStage,gearDown,fuelPct,hullPct,engineHealth,onGround=false)=>resetFlightState(s,{x,y,z,headingDeg,pitchDeg,rollDeg,speedKts,throttle,flapStage,gearDown,fuelPct,hullPct,engineHealth,onGround});
  const sync=(m,dt,t,wpB,isC,rain=0)=>{world.updateWorld(dt,t,s.position,m.wind,s.quaternion);rig.updateCamera(s,dt,true);fx.updateEffects(dt,t,s,camera.position,rain,isC);ck.updateCockpit(s,wpB,isC,isC,t,rain);};
  if(name==='chase'){
    const m=mm.loadMission(0);world.setAtmospherePreset(m.atmosphere);rst(-20,115,1235,356,-2.8,-14,122,.72,1,true,82,100,100);
    Object.assign(s,{vsiMps:-2.8,apEngaged:true,apTargetHdg:356,apTargetAltFt:375,ilsActive:true,ilsLocDev:-.06,ilsGsDev:.04});
    s.controlSurface.aileron=-.35;s.controlSurface.flaps=15;rig.setMode('chase');rig.setChaseLateralBias(-5.6);
    ac.updateAircraftModel(s,.016,4.2,true);fx.seedWingtipTrails(s);sync(m,.016,4.2,358,false);return true;
  }
  if(name==='cockpit'){
    const m=mm.loadMission(1);mm.setShowcaseProgress(1,200);mm.spawnShowcaseParachute(-945,298,-1355);world.setAtmospherePreset(m.atmosphere);
    rst(-745,302,-1155,316,-1.5,9,126,.76,1,false,21,92,95);
    Object.assign(s,{lowFuel:true,apEngaged:true,apTargetHdg:316,apTargetAltFt:1000,ilsActive:true,ilsLocDev:.14,ilsGsDev:-.08});
    s.controlSurface.aileron=.36;s.controlSurface.flaps=15;rig.setMode('cockpit');ac.updateAircraftModel(s,.016,6.4,false);sync(m,.016,6.4,316,true);return true;
  }
  if(name==='landing'){
    const m=mm.loadMission(2);mm.setShowcaseProgress(2,400);world.setAtmospherePreset(m.atmosphere);rst(965,74.2,-1250,86,4.5,-3.2,72,.24,2,true,54,96,100);
    Object.assign(s,{vsiMps:-1.6,ilsActive:true,ilsLocDev:.03,ilsGsDev:-.02,speedbrake:true});
    s.controlSurface.flaps=30;s.controlSurface.rudder=.35;s.controlSurface.spoiler=1;rig.setMode('chase');rig.setChaseLateralBias(-5.6);
    ac.updateAircraftModel(s,.05,8.1,true);fx.emitTouchdownSmoke(s.position,s.quaternion,false);sync(m,.05,8.1,90,false);hud.showBanner('FLARE RWY 09 · ILS · SPDBRK · FLAPS 30°','info',5);return true;
  }
  if(name==='debrief'){
    const m=mm.loadMission(3);mm.setShowcaseProgress(2,400);world.setAtmospherePreset(m.atmosphere);rst(-760,10.35,860,48,0,11,0,0,2,true,19,12,8,true);
    Object.assign(s,{status:'crashed',crashMode:'ground',crashCause:'runway',impactZone:'leftWing',crashSeverity:'catastrophic',hasFuelFire:true,crashTime:2.6,fuelFireDelay:.9,fuelFireIntensity:1,propRpm:0,propRpmLeft:0,gearIntact:false,brokenParts:{leftWing:true,rightWing:false,leftProp:true,rightProp:false,tail:true,noseCrushed:false},incidentReport:{outcome:'CRASHED',title:'HARD LANDING — GEAR COLLAPSE',detail:'Sink -9.8 m/s (max 4.6) at 79 kt, bank 19°.',sinkMps:9.8,speedKts:79,bankDeg:19,onRunway:true,fuelPct:19,hullPct:12}});
    rig.setMode('orbit');rig.setCustomOrbitAngle(1.62);for(let k=0;k<28;k++)ac.updateAircraftModel(s,.04,10.3+k*.04,true);
    world.updateWorld(.05,11.4,s.position,m.wind,s.quaternion);rig.updateCamera(s,.05,true);
    fx.stampCrashGougeTrail(s.position,s.headingDeg,36);fx.emitRoaringFireBurst(s.position,s.quaternion,8.5,false,'catastrophic','runway',true);
    fx.emitTouchdownSmoke(s.position,s.quaternion,true);fx.updateEffects(.18,11.58,s,camera.position,1,false);ck.updateCockpit(s,35,false,false,11.58,1);return true;
  }
  return false;
}
