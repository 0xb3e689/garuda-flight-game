// Newtonian 6-DOF aerodynamics (ISA air density, induced drag, lift/stall, anti-flip envelope, prop inertia & telemetry).
import * as T from 'three';
import { AIRCRAFT_SPEC as SP, FLAP_ANGLES, GRAVITY as G, MPS_TO_KTS, M_TO_FT, RUNWAYS } from './config.js';
import { resolveAirframeContacts, stepCrashAnimation } from './flight-collision.js';
import { sampleTerrainHeight as sH, sampleThermalLift } from './terrain-world.js';

const {max:MX,min:MN,abs:A,asin:AS,atan2:AT,hypot:HY,sin:S,exp:EX,PI}=Math;
const v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),FWD=v3(0,0,-1),RT=v3(1,0,0),UP=v3(0,1,0),clp=(v,lo,hi)=>MX(lo,MN(hi,v)),qD=(v,q)=>v.clone().applyQuaternion(q);

export function createFlightState() {
  return {
    position:v3(0,165,920),velocity:v3(0,-2,-62),quaternion:new T.Quaternion(),angularVel:v3(),
    throttle:.72,flapStage:0,gearDown:true,brakes:false,fuelKg:SP.fuelCapacityKg,fuelPct:100,fuelRangeKm:42,inThermal:false,
    hullPct:100,engineHealth:100,gearIntact:true,engineTempC:540,propAngle:0,propAngleLeft:0,propRpm:.72,propRpmLeft:.72,
    airspeedMps:62,airspeedKts:120,altitudeM:165,altitudeFt:541,aglM:150,headingDeg:0,pitchDeg:0,rollDeg:0,vsiMps:0,aoaDeg:3,gLoad:1,
    stalling:false,overspeed:false,lowFuel:false,onGround:false,status:'flying',crashMode:null,crashSeverity:null,crashImpactKts:0,crashTime:0,cameraShake:0,touchdownTimer:0,
    malfunctions:{leftEngineOut:false,fuelLeak:false,flapJammed:false,controlDamage:false,gearDamaged:false},
    controlSurface:{aileron:0,elevator:0,rudder:0,flaps:0},activeRunwayId:'RWY36',papiGlideDeg:4.5,papiWhiteCount:2,incidentReport:null,
  };
}

export function updateDerivedTelemetry(s, wind) {
  const f=qD(FWD,s.quaternion),r=qD(RT,s.quaternion),u=qD(UP,s.quaternion),av=s.velocity.clone().sub(wind);
  s.airspeedMps=MX(0,av.length());s.airspeedKts=s.airspeedMps*MPS_TO_KTS;
  s.aoaDeg=s.airspeedMps>4?(AT(-av.dot(u),MX(2,av.dot(f)))*180)/PI:0;
  s.pitchDeg=(AS(clp(f.y,-1,1))*180)/PI;s.rollDeg=(AT(r.y,u.y)*180)/PI;
  if(HY(f.x,f.z)>.02)s.headingDeg=(((AT(f.x,-f.z)*180)/PI)%360+360)%360;
  s.altitudeM=MX(0,s.position.y);s.altitudeFt=s.altitudeM*M_TO_FT;
  s.aglM=MX(0,s.position.y-MX(0,sH(s.position.x,s.position.z)));
  s.vsiMps=s.velocity.y;s.fuelPct=MX(0,(s.fuelKg/SP.fuelCapacityKg)*100);
  s.fuelRangeKm=((s.fuelKg/MX(.08,SP.baseFuelBurnKgS*(.18+s.throttle*s.throttle)))*MX(30,s.airspeedMps))/1000;
  s.lowFuel=s.fuelPct<22;s.overspeed=s.airspeedKts>SP.vneKts;
  let b=RUNWAYS[0],bd=Infinity;
  for(const rw of RUNWAYS){const d=HY(s.position.x-rw.x,s.position.z-rw.z);if(d<bd){bd=d;b=rw;}}
  s.activeRunwayId=b.id;const rad=(b.headingDeg*PI)/180,al=(s.position.x-b.x)*S(rad)-(s.position.z-b.z)*Math.cos(rad);
  s.papiGlideDeg=(AT(s.position.y-b.elevation,MX(15,-b.papiOffset.along-al))*180)/PI;
  s.papiWhiteCount=[3.6,4.4,5.5,6.4].filter((t)=>s.papiGlideDeg>=t).length;
}

export function resetFlightState(s, p) {
  s.position.set(p.x,p.y,p.z);s.quaternion.setFromEuler(new T.Euler(((p.pitchDeg??0)*PI)/180,(-p.headingDeg*PI)/180,((p.rollDeg??0)*PI)/180,'YXZ'));
  s.velocity.copy(qD(FWD,s.quaternion)).multiplyScalar((p.speedKts??115)/MPS_TO_KTS);s.angularVel.set(0,0,0);
  const thr=p.throttle??.68,fp=p.fuelPct??100;
  Object.assign(s,{throttle:thr,flapStage:p.flapStage??0,gearDown:p.gearDown??false,brakes:false,fuelPct:fp,fuelKg:(fp/100)*SP.fuelCapacityKg,hullPct:p.hullPct??100,engineHealth:p.engineHealth??100,gearIntact:true,engineTempC:540,propRpm:MX(.25,thr),propRpmLeft:MX(.25,thr),onGround:Boolean(p.onGround),status:'flying',crashMode:null,crashSeverity:null,incidentReport:null,crashImpactKts:0,crashTime:0,cameraShake:0,touchdownTimer:0,malfunctions:{leftEngineOut:false,fuelLeak:false,flapJammed:false,controlDamage:false,gearDamaged:false}});
  updateDerivedTelemetry(s,v3());
}

export function stepFlightPhysics(s, c, dt, wind, ev, checkObs = null) {
  const h=MN(dt,.05);if(s.status==='crashed'){stepCrashAnimation(s,h,wind,updateDerivedTelemetry);return;}
  s.cameraShake=MX(0,s.cameraShake-h*2.5);s.throttle=clp(s.throttle+c.throttleDelta*h*.75,0,1.1);
  const hasF=s.fuelKg>.05,thr=hasF?s.throttle:0,mf=s.malfunctions,hS=(.45+.55*(s.engineHealth/100))*(mf.leftEngineOut?.56:1);
  if(hasF)s.fuelKg=MX(0,s.fuelKg-(SP.baseFuelBurnKgS*(.18+thr*thr*(thr>1?1.85:1))+(mf.fuelLeak?.95:0))*h);
  s.engineTempC+=(340+thr*360+(thr>1?115:0)+(100-s.engineHealth)*1.4-s.engineTempC)*MN(1,h*1.8);
  if(s.engineTempC>790)s.engineHealth=MX(25,s.engineHealth-h*2.8);

  s.brakes=c.brakes;const tR=hasF?.24+thr*.76:0,tRL=hasF&&!mf.leftEngineOut?tR:0;
  s.propRpm+=(tR-s.propRpm)*MN(1,h*2.2);s.propRpmLeft+=(tRL-s.propRpmLeft)*MN(1,h*(tRL?2.2:.85));
  s.propAngle+=h*s.propRpm*62;s.propAngleLeft+=h*s.propRpmLeft*62;

  const cs=s.controlSurface,ck=MN(1,h*12);
  cs.aileron+=(c.roll-cs.aileron)*ck;cs.elevator+=(c.pitch-cs.elevator)*ck;
  cs.rudder+=((c.yaw||c.roll*.4)-cs.rudder)*ck;cs.flaps+=(FLAP_ANGLES[s.flapStage]-cs.flaps)*MN(1,h*4.5);

  const f=qD(FWD,s.quaternion),r=qD(RT,s.quaternion),u=qD(UP,s.quaternion),av=s.velocity.clone().sub(wind),spd=av.length();
  const rho=SP.airDensity*EX(-MX(0,s.position.y)/8500),aoaR=AT(-av.dot(u),MX(4,av.dot(f))),aoaD=(aoaR*180)/PI,q=.5*rho*spd*spd,stD=SP.stallAlphaDeg-s.flapStage*1.2;
  let cl=.28+SP.flapLiftCl[s.flapStage]+aoaD*.088;
  const stl=!s.onGround&&(aoaD>stD||(spd*MPS_TO_KTS<48-s.flapStage*6&&s.aglM>6));s.stalling=stl;
  if(aoaD>stD)cl-=MN(20,aoaD-stD)*.095;cl=clp(cl,-.8,2.1);

  const agl=s.position.y-MX(0,sH(s.position.x,s.position.z));
  const cd=SP.baseDragCd0+SP.flapDragCd[s.flapStage]+(s.gearDown?SP.gearDragCd:0)+(cl*cl)/(PI*8.3*.82)+(s.onGround&&c.brakes?.2:0);
  const m=SP.massKg-(SP.fuelCapacityKg-s.fuelKg),lift=q*SP.wingAreaM2*cl*(agl<14?1+(1-MX(0,agl)/14)*.24:1),drag=q*SP.wingAreaM2*cd;
  const F=v3(0,-m*G,0).addScaledVector(f,thr*SP.maxThrustN*hS*(thr>1?SP.togaMultiplier:1)*(rho/SP.airDensity)).addScaledVector(u,lift);
  if(spd>.2)F.addScaledVector(av,-drag/spd);F.addScaledVector(r,-av.dot(r)*MX(12,spd)*44);
  const th=sampleThermalLift(s.position.x,s.position.z,s.position.y);s.inThermal=th>.35;if(th>0&&!s.onGround)F.y+=th*m*.85;

  s.gLoad=clp(lift/(m*G),-2.5,6.5);
  if(s.gLoad>4.2&&!s.onGround)s.hullPct=MX(15,s.hullPct-(s.gLoad-4.2)*h*3.5);
  if(s.overspeed)s.hullPct=MX(20,s.hullPct-h*2.4);

  const pN=AS(clp(f.y,-1,1)),rN=AT(r.y,u.y),au=clp(spd/44,.42,1.18),cS=mf.controlDamage?.68:1;
  const pA=c.pitch>0&&pN>.58?MX(0,1-(pN-.58)/.42):c.pitch<0&&pN<-.68?MX(0,1-(-.68-pN)/.36):1;
  const stR=!s.onGround?(pN>.72?-(pN-.72)*3.8:pN<-.82?(-.82-pN)*3.2:0):0;
  const bkR=!s.onGround&&A(rN)>1.08?-Math.sign(rN)*(A(rN)-1.08)*3.6:!s.onGround&&c.roll===0&&A(rN)<.7?-rN*1.25:0;

  s.angularVel.x+=(c.pitch*1.45*au*pA*cS+(s.onGround?0:-aoaR*.65)+(stl?-.68:0)+stR-s.angularVel.x*4)*h*4.8;
  s.angularVel.z+=(-c.roll*2.25*au*cS+(!s.onGround&&mf.controlDamage?.14:0)+bkR-s.angularVel.z*4.5)*h*5.2+(stl?S(performance.now()*.025)*.25*h:0);
  s.angularVel.y+=((s.onGround?-(c.yaw+c.roll*.85)*1.4:-c.yaw*1.05*au+(mf.leftEngineOut?.16*thr:0))-s.angularVel.y*4)*h*4.6;

  s.velocity.addScaledVector(F.divideScalar(m),h);s.position.addScaledVector(s.velocity,h);
  s.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(s.angularVel.x*h,s.angularVel.y*h,s.angularVel.z*h,'YXZ'))).normalize();

  if(!s.onGround){
    const fP=qD(FWD,s.quaternion),rP=qD(RT,s.quaternion),uP=qD(UP,s.quaternion),pP=AS(clp(fP.y,-1,1)),rPt=AT(rP.y,uP.y);
    if(A(pP)>1.04||A(rPt)>1.32||uP.y<.12){s.quaternion.setFromEuler(new T.Euler(clp(pP,-1.04,1.04),AT(-fP.x,-fP.z),clp(rPt,-1.32,1.32),'YXZ'));if(A(pP)>1.04)s.angularVel.x=MN(0,s.angularVel.x);if(A(rPt)>1.32)s.angularVel.z*=.4;}
    const tr=S(clp(rPt,-1.32,1.32))*.95*au-c.roll*.28*au;
    if(A(tr)>.0005){const qT=new T.Quaternion().setFromAxisAngle(UP,tr*h);s.quaternion.premultiply(qT).normalize();s.velocity.applyQuaternion(qT);}
  }
  if(resolveAirframeContacts(s,c,h,ev,checkObs)){updateDerivedTelemetry(s,wind);return;}
  if(HY(s.position.x,s.position.z)>7600)s.velocity.addScaledVector(v3(-s.position.x,0,-s.position.z).normalize(),h*22);
  updateDerivedTelemetry(s,wind);
}
