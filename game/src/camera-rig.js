// Gimbal-safe chase camera, dynamic G-load cockpit camera, and crash/landing orbit camera.
import * as T from 'three';
const v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),UP=v3(0,1,0),{min:MN,max:MX,random:R,cos:C,sin:S}=Math;
export function createCameraRig(camera){
  let mode='chase',init=false,orbitAng=.65,latBias=0;const smP=v3(),smL=v3();
  function updateCamera(s,dt,snap=false){
    const fwd=v3(0,0,-1).applyQuaternion(s.quaternion),up=v3(0,1,0).applyQuaternion(s.quaternion),rt=v3(1,0,0).applyQuaternion(s.quaternion);
    if(mode==='cockpit'){
      const dip=MX(-.06,MN(.06,(1-s.gLoad)*.025)),sw=MX(-.07,MN(.07,s.controlSurface.aileron*.055)),sk=s.cameraShake>.01?(R()-.5)*s.cameraShake*.14:0;
      camera.fov=68;camera.updateProjectionMatrix();
      camera.position.copy(v3(-.08+sw+sk,1.18+dip+sk,-1.78).applyQuaternion(s.quaternion).add(s.position));
      camera.up.copy(up);camera.lookAt(s.position.clone().addScaledVector(fwd,120).addScaledVector(up,-26.5).addScaledVector(rt,sw*16));return;
    }
    if(mode==='orbit'||s.status==='crashed'){
      orbitAng+=dt*.25;const w=s.crashMode==='water';
      const dp=v3(s.position.x+C(orbitAng)*22,w?MX(4.5,s.position.y+8.5):s.position.y+6.2,s.position.z+S(orbitAng)*22);
      const lk=v3(s.position.x+6.8,w?MX(-2,s.position.y+1.2):s.position.y+1.5,s.position.z-2.6);
      camera.fov=56;camera.updateProjectionMatrix();
      if(snap||!init){smP.copy(dp);smL.copy(lk);init=true;}else{const k=MN(1,dt*4.5);smP.lerp(dp,k);smL.lerp(lk,k);}
      camera.position.copy(smP);
      if(s.cameraShake>.01){const k=s.cameraShake*.9;camera.position.add(v3((R()-.5)*k,(R()-.5)*k,(R()-.5)*k));}
      camera.up.copy(UP);camera.lookAt(smL);return;
    }
    const sf=fwd.clone();sf.y=MX(-.62,MN(.62,sf.y));
    if(Math.hypot(sf.x,sf.z)<.2){const r=(-s.headingDeg*Math.PI)/180;sf.x=-S(r);sf.z=-C(r);}
    sf.normalize();const sr=v3().crossVectors(sf,UP).normalize();
    const dZ=s.aircraftType==='airliner'?-28.5:s.aircraftType==='jet'?-20.5:s.aircraftType==='prop1'?-15.2:-18.5,dY=s.aircraftType==='airliner'?7.6:s.aircraftType==='prop1'?4.1:4.9;
    const dp=s.position.clone().addScaledVector(sf,dZ).addScaledVector(UP,dY).addScaledVector(sr,latBias-s.controlSurface.aileron*2.4);
    const lk=s.position.clone().addScaledVector(sf,58).addScaledVector(UP,1.2).addScaledVector(sr,-latBias*.35);
    camera.fov+=(54+MN(14,MX(0,(s.airspeedKts-80)*.11))-camera.fov)*(snap?1:MN(1,dt*4));
    camera.updateProjectionMatrix();
    if(snap||!init){smP.copy(dp);smL.copy(lk);init=true;}else{smP.lerp(dp,MN(1,dt*7.5));smL.lerp(lk,MN(1,dt*11));}
    camera.position.copy(smP);camera.up.copy(UP);camera.lookAt(smL);
  }
  return {getMode:()=>mode,setMode:(m)=>{mode=m;init=false;},toggleMode:()=>{mode=mode==='chase'?'cockpit':'chase';init=false;return mode;},setChaseLateralBias:(b)=>{latBias=b;},setCustomOrbitAngle:(r)=>{orbitAng=r;},updateCamera};
}
