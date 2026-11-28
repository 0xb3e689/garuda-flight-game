// Four aviation sorties with clean flight-plan waypoint navigation (no arcade rings), cargo drops & runway approaches.
import * as T from 'three';
import { LANDMARKS as LM, RUNWAYS } from './config.js';
import { sampleTerrainHeight as sH } from './terrain-world.js';
const v3=(x,y,z)=>new T.Vector3(x,y,z),HY=Math.hypot,G=()=>new T.Group();
const mkM=(id,number,name,shortTag,atmosphere,w,windDesc,goal,shortGoal,summary,radioIntro,sp,targetRunwayId,dropZone,rgs)=>({id,number,name,shortTag,atmosphere,wind:v3(...w),windDesc,goal,shortGoal,summary,radioIntro,targetRunwayId,dropZone,spawn:{x:sp[0],y:sp[1],z:sp[2],headingDeg:sp[3],pitchDeg:sp[4],rollDeg:0,speedKts:sp[5],throttle:sp[6],flapStage:sp[7],gearDown:sp[8],fuelPct:sp[9],hullPct:sp[10]??100,engineHealth:sp[11]??100},rings:rgs.map(([x,y,z,headingDeg,radius,label])=>({x,y,z,headingDeg,radius,label}))});
export const MISSIONS=[
  mkM('lighthouse-mail',1,'Merpati Metro Approach','M1 · METRO','golden',[2.8,0,1.2],'06 kt WSW','VFR route via Harbor & Bridge · Land RWY 36','VFR Route · RWY 36','Fly the coastal flight plan over Merpati Port, CBD skyline and bridge, then land on RWY 36.','Merpati Tower, PK-GRD cleared VFR arrival RWY 36 via Harbor VOR.',[24,118,920,358,-2,118,.68,1,true,84],'RWY36',null,[[0,82,540,0,58,'HARBOR VOR'],[0,48,240,0,55,'RWY36 FINAL'],[240,145,-260,55,65,'CBD SKYLINE'],[650,95,-340,90,65,'BRIDGE SPAN'],[420,120,240,215,65,'LIGHTHOUSE']]),
  mkM('caldera-drop',2,'Caldera Supply Drop','M2 · CALDERA','golden',[5.4,0,-2.5],'12 kt RIDGE','Drop cargo at Caldera · Land RWY 36','Cargo Drop · RWY 36','Navigate Caldera valley on 44% fuel, release cargo [SPACE] over flare, return to RWY 36.','Merpati Ops, PK-GRD fuel 44%. Cleared direct Caldera drop zone.',[-480,300,-840,316,-1,124,.72,0,false,44,92,95],'RWY36',{x:LM.calderaCenter.dropX,z:LM.calderaCenter.dropZ,radius:110,maxAgl:130,label:'CALDERA DZ'},[[-720,288,-1120,316,62,'VALLEY ENTRY'],[-890,296,-1300,315,62,'CLEFT PASS'],[-1020,298,-1440,300,68,'CALDERA RIM']]),
  mkM('cliff-crosswind',3,'Karang Crosswind ILS','M3 · KARANG','dusk',[1.8,0,9.2],'18 kt X-WIND','ILS approach · 18 kt crosswind · RWY 09','ILS · RWY 09','Track ILS glideslope into Karang Bay City in 18 kt crosswind and stop on RWY 09.','Karang Tower, wind 18 kt crosswind. Cleared ILS approach RWY 09.',[540,122,-1260,90,-2,94,.48,2,true,58],'RWY09',null,[[760,102,-1250,90,58,'ILS OUTER'],[940,84,-1250,90,55,'ILS MIDDLE']]),
  mkM('storm-rescue',4,'Shoal Maritime SAR','M4 · SAR','storm',[10.5,0,6.2],'24 kt STORM','Drop rafts at vessel · Divert RWY 04','SAR Drop · RWY 04','Locate rescue vessel in storm squall, drop rafts [SPACE], divert to Shoal Harbor RWY 04.','Coast Guard SAR, PK-GRD cleared low pass over vessel, divert RWY 04.',[-1480,135,340,138,-2,112,.78,1,false,34,62,66],'RWY04',{x:LM.rescueVessel.x,z:LM.rescueVessel.z,radius:125,maxAgl:120,label:'SAR VESSEL'},[[-1310,92,525,138,65,'SHOAL POINT'],[-1180,58,680,135,68,'VESSEL OVERHEAD']]),
];
function buildParachuteCrate(pos,sz,r,cords=false){
  const g=G();g.position.copy(pos);g.add(new T.Mesh(new T.BoxGeometry(sz,sz,sz),new T.MeshStandardMaterial({color:'#ff6b2b',roughness:.52})));
  const ch=new T.Mesh(new T.SphereGeometry(r,14,9,0,Math.PI*2,0,Math.PI*.55),new T.MeshStandardMaterial({color:'#fff8ec',side:T.DoubleSide,roughness:.65}));ch.position.y=r*1.2;g.add(ch);
  if(cords){const cm=new T.LineBasicMaterial({color:'#dbe4ec'});[[-4.2,-2.5],[4.2,-2.5],[-4.2,2.5],[4.2,2.5]].forEach(([x,z])=>g.add(new T.Line(new T.BufferGeometry().setFromPoints([v3(0,1.4,0),v3(x,7.2,z)]),cm)));}
  return g;
}
export function createMissionManager(scene){
  const dG=G();scene.add(dG);
  let act=MISSIONS[0],nI=0,clr=0,dOk=false,sc=0,lOk=false,crs=[];
  function getActiveWaypoint(){
    if(nI<act.rings.length){const r=act.rings[nI];return {x:r.x,y:r.y,z:r.z,label:r.label,kind:'wpt'};}
    if(act.dropZone&&!dOk){const d=act.dropZone;return {x:d.x,y:Math.max(40,sH(d.x,d.z)+45),z:d.z,label:`DROP · ${d.label}`,kind:'drop'};}
    if(!act.targetRunwayId)return null;
    const rw=RUNWAYS.find((r)=>r.id===act.targetRunwayId)??RUNWAYS[0];return {x:rw.x,y:rw.elevation+10,z:rw.z,label:`LAND ${rw.id}`,kind:'runway'};
  }
  function loadMission(i,ov=null){
    const base=MISSIONS[i]??MISSIONS[0];
    if(ov){
      const rawR='rings' in ov?ov.rings:base.rings;
      act={...base,...ov,wind:Array.isArray(ov.wind)?v3(...ov.wind):(ov.wind||base.wind),dropZone:'dropZone' in ov?ov.dropZone:base.dropZone,rings:rawR.map((r)=>Array.isArray(r)?{x:r[0],y:r[1],z:r[2],headingDeg:r[3],radius:r[4],label:r[5]}:r)};
    }else act=base;
    nI=clr=sc=0;dOk=!act.dropZone;lOk=false;dG.clear();crs=[];return act;
  }
  function triggerSupplyDrop(s){
    if(!act.dropZone||dOk)return {dropped:false,hit:false};
    const dz=act.dropZone,d=HY(s.position.x-dz.x,s.position.z-dz.z),c=buildParachuteCrate(s.position.clone().add(v3(0,-3,0)),2.4,5.2);dG.add(c);crs.push({m:c,vy:-9});
    if(d<=dz.radius*1.4&&s.aglM<=dz.maxAgl+40){dOk=true;sc+=400;return {dropped:true,hit:true,message:`CARGO ON TARGET (+400) · PROCEED ${act.targetRunwayId}`};}
    return {dropped:true,hit:false,message:`OFF TARGET (${Math.round(d)}m) · ALIGN OVER FLARE`};
  }
  function updateMission(dt,tS,s,onE){
    if(nI<act.rings.length){const t=act.rings[nI];if(HY(s.position.x-t.x,s.position.z-t.z)<=Math.max(55,t.radius+18)&&Math.abs(s.position.y-t.y)<=120){clr++;sc+=200;nI++;onE?.('wpt',`WPT ${clr}/${act.rings.length} · DIRECT ${getActiveWaypoint().label}`);}}
    if(act.dropZone&&!dOk&&HY(s.position.x-act.dropZone.x,s.position.z-act.dropZone.z)<=act.dropZone.radius*.68&&s.aglM<=act.dropZone.maxAgl){const r=triggerSupplyDrop(s);if(r.hit)onE?.('drop',r.message);}
    for(const c of crs){const gy=Math.max(0,sH(c.m.position.x,c.m.position.z));if(c.m.position.y>gy+1.2)c.m.position.y=Math.max(gy+1.2,c.m.position.y+c.vy*dt);}
    if(s.status==='landed'&&!lOk){const ok=clr>=act.rings.length&&dOk&&s.incidentReport?.runwayId===act.targetRunwayId;lOk=true;sc+=(ok?600:250)+Math.round(s.fuelPct*2+s.hullPct*2);if(ok&&s.incidentReport){s.incidentReport.title=`SORTIE ${act.number} COMPLETE`;s.incidentReport.missionComplete=true;}}
  }
  const getObj=(s)=>{
    if(!act.rings.length&&!act.dropZone&&!act.targetRunwayId)return [];
    const gD=clr>=act.rings.length,l=[];
    if(act.rings.length)l.push({label:`Waypoints (${clr}/${act.rings.length})`,done:gD,active:!gD});
    if(act.dropZone){const dz=act.dropZone,inR=HY(s.position.x-dz.x,s.position.z-dz.z)<=dz.radius*1.4&&s.aglM<=dz.maxAgl+40;l.push({label:inR&&!dOk?'DROP NOW [SPACE]':`Drop · ${dz.label}`,done:dOk,active:gD&&!dOk});}
    if(act.targetRunwayId)l.push({label:`Land ${act.targetRunwayId}`,done:lOk,active:gD&&dOk&&!lOk});return l;
  };
  return {loadMission,updateMission,triggerSupplyDrop,getActiveMission:()=>act,getMissionSummary:(s=null)=>({mission:act,ringsCleared:clr,ringsTotal:act.rings.length,dropCompleted:dOk,hasDrop:Boolean(act.dropZone),missionComplete:lOk&&clr>=act.rings.length&&dOk,score:sc,waypoint:getActiveWaypoint(),objectives:s?getObj(s):[]}),setShowcaseProgress:(n,p)=>{clr=nI=Math.min(act.rings.length,n);sc=p;},spawnShowcaseParachute:(x,y,z)=>dG.add(buildParachuteCrate(v3(x,y,z),2.8,6.2,true))};
}
