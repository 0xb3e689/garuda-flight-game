// 5-point airframe terrain/obstacle collision, progressive malfunction cascade, Coulomb static stop, and buoyant water ditching.
import * as T from 'three';
import { AIRCRAFT_SPEC as SP, GRAVITY as G, MPS_TO_KTS } from './config.js';
import { getRunwayAt, sampleTerrainHeight as sH, sampleTerrainNormal as sN } from './terrain-world.js';

const {max:MX,min:MN,abs:A,round:R,hypot:HY,atan2:AT}=Math,v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),toE=(q)=>new T.Euler().setFromQuaternion(q,'YXZ');

export const AIRFRAME_PROBES = [
  {name:'nose',local:v3(0,-.35,-5.3),radius:1},{name:'tail',local:v3(0,.25,8.1),radius:1},
  {name:'leftWing',local:v3(-8.3,1.5,-.4),radius:1.1},{name:'rightWing',local:v3(8.3,1.5,-.4),radius:1.1},{name:'belly',local:v3(0,-1.25,-.2),radius:1.2},
];

export function enforceAirframeAboveTerrain(s, margin = 0.45) {
  let pen=0;const wp=v3();
  for(const p of AIRFRAME_PROBES){wp.copy(p.local).applyQuaternion(s.quaternion).add(s.position);pen=MX(pen,MX(0,sH(wp.x,wp.z))+margin-wp.y);}
  if(pen>0)s.position.y+=pen;
}

export function triggerCrash(s, mode, title, detail, sinkMps, speedKts, bankDeg, onRunway, sev = 'catastrophic') {
  const cat=sev==='catastrophic',hull=MN(s.hullPct,cat?12:34);
  Object.assign(s,{status:'crashed',crashMode:mode,crashSeverity:sev,crashImpactKts:speedKts,crashTime:0,cameraShake:cat?.98:.62,hullPct:hull,engineHealth:MN(s.engineHealth,cat?8:28),gearIntact:false,throttle:0,incidentReport:{outcome:'CRASHED',crashMode:mode,severity:sev,title,detail,sinkMps,speedKts,bankDeg,onRunway,fuelPct:s.fuelPct,hullPct:hull}});
  if(mode==='ground'){s.velocity.multiplyScalar(cat?.54:.44);s.velocity.y=MN(0,s.velocity.y*.12);s.angularVel.set(0,(Math.random()>.5?1:-1)*(cat?.85:.4),0);enforceAirframeAboveTerrain(s,.35);}
  else{s.velocity.multiplyScalar(.11);s.velocity.y=MN(-4.5,s.velocity.y*.45);s.position.y=MN(s.position.y,.45);}
}

export function stepCrashAnimation(s, dt, wind, updTel) {
  const v=s.velocity,pos=s.position;
  s.crashTime+=dt;s.cameraShake=MX(0,s.cameraShake-dt*1.6);
  s.propRpm=MX(0,s.propRpm-dt*.42);s.propRpmLeft=MX(0,s.propRpmLeft-dt*.65);
  s.propAngle+=dt*s.propRpm*46;s.propAngleLeft+=dt*s.propRpmLeft*46;

  if(s.crashMode==='water'){
    const hs=HY(v.x,v.z);
    if(hs>.12){const sc=MX(0,1-(MN(hs/dt,6.4+.42*hs*hs)*dt)/hs);v.x*=sc;v.z*=sc;}else v.x=v.z=0;
    const e=toE(s.quaternion);
    if(s.crashSeverity==='hard'&&s.crashTime<7.5){v.y=(-.35+Math.sin(s.crashTime*2.1)*.16-pos.y)*2.6;pos.addScaledVector(v,dt);e.x+=(.06-e.x)*MN(1,dt*2.4);e.z+=(.14-e.z)*MN(1,dt*1.8);}
    else{if(pos.y>-13.5){const tv=pos.y>-.8?-4.8:-(1.55+MN(1,s.crashTime/2.2)*1.15);v.y=MN(-.6,v.y+(tv-v.y)*MN(1,dt*7.5));pos.addScaledVector(v,dt);}else v.set(0,0,0);e.x+=(-.68-e.x)*MN(1,dt*3.4);e.z+=(.52-e.z)*MN(1,dt*1.6);e.y+=dt*.05;}
    s.quaternion.setFromEuler(e);
  }else{
    const tY=sH(pos.x,pos.z),gY=MX(0,tY),n=sN(pos.x,pos.z);
    if(pos.y<=gY+1.55&&s.crashTime>.35&&v.length()<1.35){v.set(0,0,0);s.angularVel.set(0,0,0);enforceAirframeAboveTerrain(s,.35);updTel(s,wind);return;}
    v.y-=G*dt;pos.addScaledVector(v,dt);
    if(tY<-.4&&pos.y<=.8){s.crashMode='water';v.y=MN(-1.2,v.y*.25);updTel(s,wind);return;}
    if(pos.y<=gY+1.35){
      pos.y=gY+1.35;const vn=v.dot(n);if(vn<0)v.addScaledVector(n,-vn);if(v.y>0)v.y=0;
      const spd=v.length();if(spd>1.35)v.multiplyScalar(MX(0,1-((1.22*G+spd*.55)*dt)/spd));else{v.set(0,0,0);s.angularVel.set(0,0,0);}
      const e=toE(s.quaternion),k=MN(1,dt*4.5);
      e.x+=(AT(-n.z,n.y)*.65-.03-e.x)*k;e.z+=(AT(n.x,n.y)*.65+(e.z>=0?.22:-.22)-e.z)*k;e.y+=s.angularVel.y*dt;
      s.quaternion.setFromEuler(e);s.angularVel.multiplyScalar(MX(0,1-dt*4.2));
    }else s.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(s.angularVel.x*dt,s.angularVel.y*dt,s.angularVel.z*dt,'YXZ'))).normalize();
    enforceAirframeAboveTerrain(s,.35);
  }
  updTel(s,wind);
}

export function resolveAirframeContacts(s, ctrl, dt, ev, checkObs) {
  const v=s.velocity,p=s.position,mf=s.malfunctions,kts=v.length()*MPS_TO_KTS,wp=v3();
  const crash=(...a)=>{triggerCrash(s,...a);ev?.onCrash?.(s.incidentReport);return true;};

  if(checkObs)for(const pr of AIRFRAME_PROBES){
    wp.copy(pr.local).applyQuaternion(s.quaternion).add(p);const hit=checkObs(wp,pr.radius);if(!hit)continue;
    if(hit.kind==='tree'&&(pr.name==='leftWing'||pr.name==='rightWing')&&kts<68&&s.hullPct>35){
      s.hullPct=MX(24,s.hullPct-24);s.engineHealth=MX(40,s.engineHealth-18);s.cameraShake=.65;v.multiplyScalar(.84);mf.controlDamage=true;p.y+=2.6;
      const L=pr.name==='leftWing';mf[L?'leftEngineOut':'fuelLeak']=true;
      ev?.onMalfunction?.(L?{code:'PORT ENGINE OUT',detail:'Tree struck left wing.'}:{code:'WING FUEL LEAK',detail:'Tree punctured wing tank.'});break;
    }
    return crash('ground',hit.label,`Struck ${hit.kind==='tree'?'tree':'structure'} at ${R(kts)} kt (${pr.name}).`,A(v.y),kts,A(s.rollDeg),false,kts>=78||hit.kind!=='tree'?'catastrophic':'hard');
  }

  if(!s.onGround)for(const pr of AIRFRAME_PROBES){
    if(pr.name==='belly'||pr.name==='tail')continue;
    wp.copy(pr.local).applyQuaternion(s.quaternion).add(p);const pY=sH(wp.x,wp.z);
    if(pY>1.5&&wp.y<=pY+.4){const n=sN(wp.x,wp.z);if(!getRunwayAt(p.x,p.z,6)&&(n.y<.86||kts>55))return crash('ground',n.y<.82?'MOUNTAIN IMPACT':'TERRAIN IMPACT',`Airframe (${pr.name}) struck slope at ${R(kts)} kt.`,MX(0,-v.y),kts,A(s.rollDeg),false,'catastrophic');}
  }

  const tY=sH(p.x,p.z),sY=MX(0,tY),gC=s.gearDown&&s.gearIntact?2.45:1.35;
  if(p.y<=sY+gC){
    const sk=-v.y,isW=tY<.25,rw=getRunwayAt(p.x,p.z,6),bk=A(s.rollDeg);
    if(!s.onGround&&(sk>.5||isW)){
      if(isW){const d=kts<75&&sk<6.5;crash('water',d?'EMERGENCY WATER DITCHING':'WATER IMPACT — SINKING',d?`Ditched at ${R(kts)} kt (-${sk.toFixed(1)} m/s). Floating briefly.`:`Hit ocean at ${R(kts)} kt (-${sk.toFixed(1)} m/s). Flooding rapidly.`,sk,kts,bk,false,d?'hard':'catastrophic');}
      else if(sk>SP.crashSinkMps||bk>28){
        if(s.hullPct>55&&kts<82&&sk<10.5&&bk<=34&&rw){
          s.hullPct=MX(28,s.hullPct-36);s.engineHealth=MX(35,s.engineHealth-32);s.gearIntact=false;s.cameraShake=.72;mf.leftEngineOut=mf.gearDamaged=mf.controlDamage=true;
          ev?.onTouchdown?.({sinkMps:sk,hard:true,onRunway:true,gearUp:false});ev?.onMalfunction?.({code:'PORT ENGINE & GEAR FAILURE',detail:'Severe touchdown damaged left engine & gear!'});
        }else crash('ground',bk>28?`WINGTIP STRIKE (${R(bk)}° BANK)`:'HARD LANDING — GEAR COLLAPSE',`Sink -${sk.toFixed(1)} m/s (max 4.6) at ${R(kts)} kt, bank ${R(bk)}°.`,sk,kts,bk,Boolean(rw),kts>=88||sk>=13||bk>45?'catastrophic':'hard');
      }else if(!s.gearDown){
        s.hullPct=MX(12,s.hullPct-36);s.engineHealth=MX(40,s.engineHealth-28);mf.flapJammed=true;
        if(kts>82)crash('ground','GEAR-UP IMPACT',`Belly impact at ${R(kts)} kt with gear retracted.`,sk,kts,bk,Boolean(rw),kts>=98?'catastrophic':'hard');
        else{s.cameraShake=.55;ev?.onTouchdown?.({sinkMps:sk,hard:true,onRunway:Boolean(rw),gearUp:true});ev?.onMalfunction?.({code:'BELLY SCRAPE · FLAPS JAMMED',detail:'Belly touchdown jammed flaps.'});}
      }else if(!rw&&kts>58){const n=sN(p.x,p.z);crash('ground',n.y<.85?'MOUNTAIN IMPACT':'TERRAIN IMPACT',`Impacted terrain at ${R(kts)} kt (-${sk.toFixed(1)} m/s).`,sk,kts,bk,false,kts>=82||n.y<.78?'catastrophic':'hard');}
      else{
        const hd=sk>SP.maxSafeSinkMps;
        if(hd){s.hullPct=MX(25,s.hullPct-R((sk-3.5)*9));s.gearIntact=sk<7.2;s.cameraShake=.45;if(sk>6){mf.gearDamaged=!s.gearIntact;mf.leftEngineOut=sk>6.8;ev?.onMalfunction?.(sk>6.8?{code:'PROP STRIKE · ENGINE #1 OUT',detail:'Damaged left engine.'}:{code:'GEAR STRUT DAMAGED',detail:'Bent main gear.'});}}
        ev?.onTouchdown?.({sinkMps:sk,hard:hd,onRunway:Boolean(rw),runwayId:rw?.runway.id??null,speedKts:kts,bankDeg:bk});
      }
    }
    if(s.status!=='crashed'){
      p.y=sY+gC;if(v.y<0)v.y=0;s.onGround=true;
      const e=toE(s.quaternion);e.z*=MX(0,1-dt*7);if(e.x<-.02)e.x*=MX(0,1-dt*6);e.x=MN(.14,e.x);s.quaternion.setFromEuler(e);enforceAirframeAboveTerrain(s,.35);
      const f=MX(0,1-((rw?.25:1.15)+(ctrl.brakes?1.85:0))*dt);v.x*=f;v.z*=f;
      if(s.status==='flying'&&rw&&v.length()<4.5&&s.throttle<.2){if((s.touchdownTimer+=dt)>1.2){s.status='landed';s.incidentReport={outcome:'LANDED',title:`LANDED — ${rw.runway.id}`,detail:`Stopped on ${rw.runway.name}. Fuel ${R(s.fuelPct)}%, Hull ${R(s.hullPct)}%.`,runwayId:rw.runway.id,fuelPct:s.fuelPct,hullPct:s.hullPct};ev?.onFullStop?.(s.incidentReport);}}else s.touchdownTimer=0;
    }
  }else{s.onGround=false;s.touchdownTimer=0;}
  return false;
}
