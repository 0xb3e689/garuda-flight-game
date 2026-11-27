// Four focused flight sorties with live step-by-step objective tracking, 3D target rings, beacon pillars, and supply drops.
import * as T from 'three';
import { LANDMARKS as LM, RUNWAYS } from './config.js';
import { sampleTerrainHeight as sH } from './terrain-world.js';

const v3=(x,y,z)=>new T.Vector3(x,y,z),HY=Math.hypot;
const mkM=(id,number,name,shortTag,atmosphere,w,windDesc,goal,shortGoal,summary,radioIntro,sp,targetRunwayId,dropZone,rgs)=>({
  id,number,name,shortTag,atmosphere,wind:v3(...w),windDesc,goal,shortGoal,summary,radioIntro,targetRunwayId,dropZone,
  spawn:{x:sp[0],y:sp[1],z:sp[2],headingDeg:sp[3],pitchDeg:sp[4],rollDeg:0,speedKts:sp[5],throttle:sp[6],flapStage:sp[7],gearDown:sp[8],fuelPct:sp[9],hullPct:sp[10]??100,engineHealth:sp[11]??100},
  rings:rgs.map(([x,y,z,headingDeg,radius,label])=>({x,y,z,headingDeg,radius,label})),
});

export const MISSIONS = [
  mkM('lighthouse-mail',1,'Lighthouse Mail','M1 · MAIL','golden',[2.8,0,1.2],'06 kt WSW','Fly 5 rings, then land on RWY 36.','5 rings -> Land RWY 36','Fly 5 orange gates past the bridge and lighthouse, then land and stop on RWY 36.','Merpati Tower: Cleared coastal mail run. Fly 5 gates, then land RWY 36.',[24,118,920,358,-2,118,.68,1,true,84],'RWY36',null,[[0,82,540,0,24,'GATE 1'],[0,48,240,0,22,'GATE 2'],[220,95,-260,55,26,'GATE 3'],[650,82,-340,90,26,'BRIDGE GATE 4'],[420,115,240,215,26,'LIGHTHOUSE GATE 5']]),
  mkM('caldera-drop',2,'Caldera Drop','M2 · CALDERA','golden',[5.4,0,-2.5],'12 kt RIDGE','3 canyon rings -> Drop [SPACE] -> RWY 36','3 rings -> Drop -> RWY 36','Thread 3 canyon gates on 44% fuel, press SPACE over Caldera flare, then land RWY 36.','Garuda Ops: Fuel 44%. Clear 3 caldera gates, drop cargo over flare, return RWY 36.',[-480,300,-840,316,-1,124,.72,0,false,44,92,95],'RWY36',{x:LM.calderaCenter.dropX,z:LM.calderaCenter.dropZ,radius:105,maxAgl:125,label:'CALDERA FLARE'},[[-720,288,-1120,316,25,'CANYON GATE 1'],[-890,296,-1300,315,24,'CLEFT GATE 2'],[-1020,298,-1440,300,28,'CALDERA GATE 3']]),
  mkM('cliff-crosswind',3,'Cliff Crosswind','M3 · CLIFF','dusk',[1.8,0,9.2],'18 kt X-WIND','2 crosswind rings -> Land on RWY 09','2 rings -> Land RWY 09','Hold centerline through 2 dusk gates in 18 kt crosswind and land safely on RWY 09.','Karang Tower: 18 kt crosswind across RWY 09. Fly both gates and crab in.',[540,122,-1260,90,-2,94,.48,2,true,58],'RWY09',null,[[760,102,-1250,90,24,'APPROACH GATE 1'],[940,84,-1250,90,22,'FINAL GATE 2']]),
  mkM('storm-rescue',4,'Storm Rescue','M4 · RESCUE','storm',[10.5,0,6.2],'24 kt STORM','2 rings -> Drop rafts -> Divert RWY 04','2 rings -> Drop -> RWY 04','Fly 2 storm gates with a damaged engine, drop rafts [SPACE] over ship, land RWY 04.','Coast Guard SAR: Burning ship ahead! Clear 2 gates, drop rafts, divert RWY 04.',[-1480,135,340,138,-2,112,.78,1,false,34,62,66],'RWY04',{x:LM.rescueVessel.x,z:LM.rescueVessel.z,radius:120,maxAgl:115,label:'RESCUE VESSEL'},[[-1310,92,525,138,26,'SHOAL GATE 1'],[-1180,58,680,135,28,'SHIP PASS GATE 2']]),
];

function buildParachuteCrate(pos, sz, r, cords = false) {
  const g=new T.Group();g.position.copy(pos);
  g.add(new T.Mesh(new T.BoxGeometry(sz,sz,sz),new T.MeshStandardMaterial({color:'#ff6b2b',roughness:.52})));
  const ch=new T.Mesh(new T.SphereGeometry(r,14,9,0,Math.PI*2,0,Math.PI*.55),new T.MeshStandardMaterial({color:'#fff8ec',side:T.DoubleSide,roughness:.65}));
  ch.position.y=r*1.2;g.add(ch);
  if(cords){const cm=new T.LineBasicMaterial({color:'#dbe4ec'});[[-4.2,-2.5],[4.2,-2.5],[-4.2,2.5],[4.2,2.5]].forEach(([x,z])=>g.add(new T.Line(new T.BufferGeometry().setFromPoints([v3(0,1.4,0),v3(x,7.2,z)]),cm)));}
  return g;
}

export function createMissionManager(scene) {
  const rG=new T.Group(),dG=new T.Group(),bM=new T.MeshBasicMaterial({color:'#ffaa2b',transparent:true,opacity:.18,side:T.DoubleSide,depthWrite:false});
  const bc=new T.Mesh(new T.CylinderGeometry(4.5,9,260,12,1,true),bM);scene.add(rG,dG,bc);
  let act=MISSIONS[0],ms=[],nI=0,clr=0,dOk=false,sc=0,lOk=false,crs=[];

  const mkR=(r,i)=>{
    const g=new T.Group();g.position.set(r.x,r.y,r.z);g.rotation.y=(-r.headingDeg*Math.PI)/180;
    const tM=new T.MeshStandardMaterial({color:'#ff9d2e',emissive:'#ff7b00',emissiveIntensity:.65,roughness:.35,metalness:.4}),iM=new T.MeshBasicMaterial({color:'#fff2b2',transparent:true,opacity:.78});
    g.add(new T.Mesh(new T.TorusGeometry(r.radius,1.15,12,36),tM),new T.Mesh(new T.TorusGeometry(r.radius-1.6,.35,8,36),iM));
    const fg=new T.ConeGeometry(2.1,5.2,4),fm=new T.MeshBasicMaterial({color:'#38f2d4'});
    for(let k=0;k<4;k++){const a=(k*Math.PI)/2,f=new T.Mesh(fg,fm);f.position.set(Math.cos(a)*(r.radius+2.8),Math.sin(a)*(r.radius+2.8),0);f.rotation.z=a+Math.PI/2;g.add(f);}
    g.userData={i,tM,iM,r};return g;
  };
  const ref=()=>ms.forEach((m,i)=>{const {tM,iM}=m.userData;m.visible=i>=nI;if(!m.visible)return;const c=i===nI;tM.color.set(c?'#ffaa2b':'#22b8cf');tM.emissive.set(c?'#ff6f00':'#0c8599');tM.emissiveIntensity=c?.85:.35;iM.color.set(c?'#fff6c7':'#a5f3fc');iM.opacity=c?.9:.4;});

  function getActiveWaypoint() {
    if(nI<act.rings.length){const r=act.rings[nI];return {x:r.x,y:r.y,z:r.z,label:r.label,kind:'ring'};}
    if(act.dropZone&&!dOk){const d=act.dropZone;return {x:d.x,y:Math.max(40,sH(d.x,d.z)+45),z:d.z,label:`DROP · ${d.label}`,kind:'drop'};}
    const rw=RUNWAYS.find((r)=>r.id===act.targetRunwayId)??RUNWAYS[0];return {x:rw.x,y:rw.elevation+10,z:rw.z,label:`LAND ${rw.id}`,kind:'runway'};
  }
  const syncB=()=>{const wp=getActiveWaypoint();bc.visible=Boolean(wp&&!lOk);if(!bc.visible)return;bc.position.set(wp.x,wp.y+95,wp.z);bM.color.set(wp.kind==='runway'?'#38f2d4':wp.kind==='drop'?'#ff6b2b':'#ffaa2b');};
  function loadMission(i) {act=MISSIONS[i]??MISSIONS[0];nI=clr=sc=0;dOk=!act.dropZone;lOk=false;rG.clear();dG.clear();crs=[];ms=act.rings.map((r,k)=>{const m=mkR(r,k);rG.add(m);return m;});ref();syncB();return act;}

  function triggerSupplyDrop(s) {
    if(!act.dropZone||dOk)return {dropped:false,hit:false};
    const dz=act.dropZone,d=HY(s.position.x-dz.x,s.position.z-dz.z),c=buildParachuteCrate(s.position.clone().add(v3(0,-3,0)),2.4,5.2);
    dG.add(c);crs.push({m:c,vy:-9});
    if(d<=dz.radius*1.4&&s.aglM<=dz.maxAgl+40){dOk=true;sc+=400;syncB();return {dropped:true,hit:true,message:`CARGO DELIVERED (+400) — LAND ${act.targetRunwayId}`};}
    return {dropped:true,hit:false,message:`DROP MISSED (${Math.round(d)}m) — ALIGN OVER FLARE`};
  }

  function updateMission(dt, tS, s, onE) {
    for(let i=nI;i<ms.length;i++)if(ms[i].visible)ms[i].scale.setScalar(i===nI?1+Math.sin(tS*4.5)*.035:1);
    if(bc.visible)bM.opacity=.14+Math.sin(tS*3.2)*.05;
    if(nI<act.rings.length){const t=act.rings[nI];if(HY(s.position.x-t.x,s.position.y-t.y,s.position.z-t.z)<=t.radius+9){clr++;sc+=200;nI++;ref();syncB();onE?.('ring',`GATE ${clr}/${act.rings.length} (+200) → ${getActiveWaypoint().label}`);}}
    if(act.dropZone&&!dOk&&HY(s.position.x-act.dropZone.x,s.position.z-act.dropZone.z)<=act.dropZone.radius*.68&&s.aglM<=act.dropZone.maxAgl){const r=triggerSupplyDrop(s);if(r.hit)onE?.('drop',r.message);}
    for(const c of crs){const gy=Math.max(0,sH(c.m.position.x,c.m.position.z));if(c.m.position.y>gy+1.2)c.m.position.y=Math.max(gy+1.2,c.m.position.y+c.vy*dt);}
    if(s.status==='landed'&&!lOk){const ok=clr>=act.rings.length&&dOk&&s.incidentReport?.runwayId===act.targetRunwayId;lOk=true;syncB();sc+=(ok?600:250)+Math.round(s.fuelPct*2+s.hullPct*2);if(ok&&s.incidentReport){s.incidentReport.title=`MISSION ${act.number} COMPLETE`;s.incidentReport.missionComplete=true;}}
  }

  const getObj=(s)=>{
    const gD=clr>=act.rings.length,l=[{label:`Gates (${clr}/${act.rings.length})`,done:gD,active:!gD}];
    if(act.dropZone){const dz=act.dropZone,inR=HY(s.position.x-dz.x,s.position.z-dz.z)<=dz.radius*1.4&&s.aglM<=dz.maxAgl+40;l.push({label:inR&&!dOk?'DROP NOW [SPACE]':`Drop cargo · ${dz.label}`,done:dOk,active:gD&&!dOk});}
    l.push({label:`Land & stop on ${act.targetRunwayId}`,done:lOk,active:gD&&dOk&&!lOk});return l;
  };
  return {loadMission,updateMission,triggerSupplyDrop,getActiveMission:()=>act,getMissionSummary:(s=null)=>({mission:act,ringsCleared:clr,ringsTotal:act.rings.length,dropCompleted:dOk,hasDrop:Boolean(act.dropZone),missionComplete:lOk&&clr>=act.rings.length&&dOk,score:sc,waypoint:getActiveWaypoint(),objectives:s?getObj(s):[]}),setShowcaseProgress:(n,p)=>{clr=nI=Math.min(act.rings.length,n);sc=p;ref();syncB();},spawnShowcaseParachute:(x,y,z)=>dG.add(buildParachuteCrate(v3(x,y,z),2.8,6.2,true))};
}
