// Archipelago world coordinator composing terrain, ocean/sky atmosphere, landmarks, foliage, and live PAPI/lighting updates.
import * as T from 'three';
import { RUNWAYS } from './config.js';
import { applyWeatherAtmosphere, buildShorelineDepthTexture, createOceanMesh, createSkyDome } from './ocean-sky.js';
import { createSoftParticleTexture } from './procedural-textures.js';
import { buildTerrainMesh, getRunwayAt, runwayLocalCoords, sampleTerrainHeight, sampleTerrainNormal, sampleThermalLift } from './terrain-height.js';
import { buildArchipelagoFoliageAndClouds } from './world-foliage.js';
import { buildArchipelagoLandmarks, buildRunwayGroup, checkObstacleCollision } from './world-landmarks.js';
export { getRunwayAt, sampleTerrainHeight, sampleTerrainNormal, sampleThermalLift };
export function createArchipelagoWorld(scene){
  const smT=createSoftParticleTexture('smoke'),glT=createSoftParticleTexture('glow'),col={boxes:[],cylinders:[],trees:[]};
  const sky=createSkyDome(),oc=createOceanMesh(buildShorelineDepthTexture()),ter=buildTerrainMesh();scene.add(sky.mesh,oc.mesh,ter);
  const rws=RUNWAYS.map((rw)=>{const b=buildRunwayGroup(rw,glT,col);scene.add(b.group);return b;});
  const lm=buildArchipelagoLandmarks(scene,smT,glT,col),atm=buildArchipelagoFoliageAndClouds(scene,col);
  const sun=new T.DirectionalLight('#ffe1b2',2.45),hm=new T.HemisphereLight('#9cd0f2','#5b6b4c',1.08),fl=new T.DirectionalLight('#a6d4f7',.92);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0005;
  Object.assign(sun.shadow.camera,{near:20,far:950,left:-160,bottom:-160,right:160,top:160});
  fl.position.set(-1200,600,1400);scene.add(sun,sun.target,hm,fl);
  const sOff=new T.Vector3(240,190,-290),sDir=sOff.clone().normalize(),tF=new T.Vector3(),tR=new T.Vector3();
  const su=sky.material.uniforms,ou=oc.material.uniforms;su.sunDir.value.copy(sDir);ou.uSunDir.value.copy(sDir);
  let curP='golden',bSun=2.55;
  const setAtmospherePreset=(p)=>{curP=p;bSun=applyWeatherAtmosphere(p,{scene,sky,ocean:oc,sunLight:sun,hemiLight:hm,cloudSpriteMats:atm.cloudSpriteMats});};
  function updateWorld(dt,tS,pos,wind,q=null){
    su.uTime.value=ou.uTime.value=tS;sky.mesh.position.copy(pos);oc.mesh.position.set(pos.x,0,pos.z);
    const cy=(tS*.28)%1,lg=curP==='storm'&&(cy>.96||(cy>.91&&cy<.93))?.85:0;
    su.uLightning.value=lg;sun.intensity=bSun+lg*1.9;ou.uPlanePos.value.copy(pos);
    if(q){ou.uPlaneFwd.value.copy(tF.set(0,0,-1).applyQuaternion(q));ou.uPlaneRight.value.copy(tR.set(1,0,0).applyQuaternion(q));}
    sun.position.copy(pos).add(sOff);sun.target.position.copy(pos);sun.target.updateMatrixWorld();
    if(lm.lighthouseBeam)lm.lighthouseBeam.rotation.y=tS*.75;
    if(lm.rescueBeacon)lm.rescueBeacon.scale.setScalar(10+4*Math.sin(tS*6.5));
    for(const pf of lm.flareSmoke){const u=pf.userData,p=(u.phase+tS*.14)%1;pf.position.set(u.origin.x+wind.x*p*5.8,u.origin.y+p*68,u.origin.z+wind.z*p*5.8);pf.scale.setScalar(8+p*26);u.mat.opacity=.72*(1-p*.85);}
    const wH=Math.atan2(wind.x,wind.z),th=[3.6,4.4,5.5,6.4];
    for(const s of rws){
      s.sockArm.rotation.y=wH+Math.sin(tS*3.8)*.12;
      const {along,lateral}=runwayLocalCoords(s.rwy,pos.x,pos.z),aim=-s.rwy.papiOffset.along;
      const gd=(Math.atan2(pos.y-s.rwy.elevation,Math.max(15,aim-along))*180)/Math.PI,app=along<aim+60&&Math.abs(lateral)<650;
      for(let i=0;i<4;i++){const c=(app?gd>=th[i]:i<2)?'#fffdf0':'#ff3329';s.papiLamps[i].lampMat.color.set(c);s.papiLamps[i].haloMat.color.set(c);}
    }
  }
  return {setAtmospherePreset,getAtmospherePreset:()=>curP,checkObstacleCollision:(pt,r)=>checkObstacleCollision(col,pt,r),updateWorld,runwaySystems:rws};
}
