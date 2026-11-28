// Four genuinely distinct 3D aircraft: C-172 high-wing strutted trainer, G-4 low-wing T-tail twin turboprop, CJ-4 swept-wing rear-jet, A320 wide-body swept-wing airliner.
import * as T from 'three';
import { createBreakupController } from './aircraft-breakup.js';
import { createAircraftSkinTexture, createSoftParticleTexture, createWingTexture } from './procedural-textures.js';
const P=Math.PI/2,bx=(w,h,d)=>new T.BoxGeometry(w,h,d),cy=(a,b,h,s=12,...r)=>new T.CylinderGeometry(a,b,h,s,...r),sp=(r,w=12,h=10)=>new T.SphereGeometry(r,w,h),v3=(x,y,z)=>new T.Vector3(x,y,z),G=()=>new T.Group(),bm=(c,o={})=>new T.MeshBasicMaterial({color:c,...o});
function createAirfoilGeometry(c,t,span){
  const s=new T.Shape().moveTo(0,0).bezierCurveTo(c*.14,t*.95,c*.45,t*.85,c,0).bezierCurveTo(c*.55,-t*.22,c*.16,-t*.38,0,0);
  const g=new T.ExtrudeGeometry(s,{depth:span,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.02,bevelThickness:.03}).translate(-c*.42,0,-span*.5).rotateY(-P),p=g.attributes.position,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){uv[i*2]=Math.max(0,Math.min(1,(p.getX(i)+span*.5)/span));uv[i*2+1]=Math.max(0,Math.min(1,(p.getZ(i)+c*.45)/c));}
  g.setAttribute('uv',new T.BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
function createSweptWingGeometry(side,span,rootC,tipC,sweepZ,thick=.22){
  const z0=-rootC*.45,sh=new T.Shape();
  if(side>0)sh.moveTo(0,z0).lineTo(0,z0+rootC).lineTo(span,z0+sweepZ+tipC).lineTo(span,z0+sweepZ).closePath();
  else sh.moveTo(0,z0).lineTo(-span,z0+sweepZ).lineTo(-span,z0+sweepZ+tipC).lineTo(0,z0+rootC).closePath();
  const g=new T.ExtrudeGeometry(sh,{depth:thick,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.04,bevelThickness:thick*.4}).rotateX(P);
  g.computeVertexNormals();return g;
}
function createSweptFinGeometry(wBot=3.15,wTop=1.05,h=3.65,sweep=2.4,th=.24){
  const g=new T.ExtrudeGeometry(new T.Shape().moveTo(0,0).lineTo(sweep,h).lineTo(sweep+wTop,h-.08).lineTo(wBot,0).closePath(),{depth:th,bevelEnabled:true,bevelSize:.03,bevelThickness:.03}).translate(0,0,-th*.5).rotateY(-P);
  g.computeVertexNormals();return g;
}
export function createAircraftModel(scene){
  const root=G(),body=G(),twinG=G(),p1G=G(),jetG=G(),airG=G();
  body.add(twinG,p1G,jetG,airG);root.add(body);
  const glT=createSoftParticleTexture('glow'),prT=createSoftParticleTexture('prop'),sm=(c,r=.42,m=.22,o={})=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o});
  const fM=new T.MeshStandardMaterial({map:createAircraftSkinTexture(),roughness:.28,metalness:.34}),wM=new T.MeshStandardMaterial({map:createWingTexture(),roughness:.32,metalness:.28});
  const iv=sm('#f3ede0',.36,.16),wh=sm('#f8fafc',.28,.2),tl=sm('#13495e',.38,.28),bl=sm('#1d4ed8',.32,.35),rd=sm('#dc2626',.34,.2),vm=sm('#e55320',.36,.22),gd=sm('#f5ab29',.35,.32),dm=sm('#1f262e',.48,.58),dc=sm('#14191e',.92,.45),ch=sm('#d5dde5',.22,.85),tr=sm('#15171a',.92,.05);
  const gl=sm('#173b4f',.1,.6,{transparent:true,opacity:.84}),wg=sm('#254a5c',.18,0,{emissive:'#ffcf7d',emissiveIntensity:.65});
  const add=(p,g,m,pos=[0,0,0],rot=[0,0,0],sc=[1,1,1])=>{const o=new T.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rot);o.scale.set(...sc);p.add(o);return o;},addL=(p,l)=>l.forEach((a)=>add(p,...a));
  const mkC=(p,pos,sz,m)=>{const g=G();g.position.set(...pos);add(g,bx(...sz),m,[0,0,sz[2]*.5]);p.add(g);return g;};
  const spr=(c,pos,sc,op,p)=>{const h=new T.Sprite(new T.SpriteMaterial({map:glT,color:c,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false}));h.position.set(...pos);h.scale.setScalar(sc);p.add(h);return h;},mkH=(c,pos,sc,p)=>{add(p,sp(.16,8,8),bm(c),pos);return spr(c,pos,sc,.85,p);};
  const mkGear=(p,pts,y0=-.98)=>{const gr=G();pts.forEach(([gx,gz,wr,spats])=>{const g=G();g.position.set(gx,y0,gz);addL(g,[[cy(.1,.09,.72,10),dm,[0,-.36,0]],[cy(.06,.06,.52,10),ch,[0,-.88,0]],[cy(wr,wr,.34,14),tr,[0,-1.18,0],[0,0,P]],[cy(wr*.45,wr*.45,.36,12),ch,[0,-1.18,0],[0,0,P]]]);if(spats)add(g,sp(wr*1.15,12,8),wh,[0,-1.12,.05],[0,0,0],[.58,.65,1.65]);gr.add(g);});p.add(gr);return gr;};

  // === 1. G-4 TWIN (King Air 350 style): LOW straight wing (NO struts), twin wing PT6 nacelles, HIGH T-tail, full 5-part breakup ===
  const noseG=G();noseG.position.set(0,-.18,-4);twinG.add(noseG);
  addL(twinG,[[cy(1.18,1.18,5.7,18),fM,[0,.15,-.1],[P,P,0],[1,.94,1.02]],[cy(.9,.74,6.1),tl,[0,-.84,-.35],[P,0,0],[1.06,1,.42]],[cy(.95,1.14,2.05,14,1,false,-Math.PI*.55,Math.PI*1.1),gl,[0,.74,-3.28],[P+.28,0,Math.PI]],[bx(.06,.68,.4),dm,[0,1.72,1.35],[-.36,0,0]]]);
  addL(noseG,[[cy(.72,1.12,2.3,16),iv,[0,0,0],[P,0,0],[1.02,1,.72]],[sp(.76,16,12),dm,[0,-.05,-1.25],[0,0,0],[.95,.72,1.48]]]);
  [-.68,0,.68].forEach((x)=>add(twinG,bx(.055,1.12,.07),dm,[x,.86,-3.7],[.46,0,0]));
  for(let i=0;i<5;i++)for(const s of [-1,1])add(twinG,bx(.12,.38,.52),wg,[s*1.16,.44,-1.7+i*.95]);
  const fBk=G();fBk.position.set(0,.14,2.72);fBk.visible=false;add(fBk,cy(1.12,1.14,.18,14),dc,[0,0,0],[P,0,0]);
  for(let s=0;s<6;s++){const a=(s/6)*Math.PI*2+.3;add(fBk,bx(.12,.14,.65+(s%2)*.3),dm,[Math.cos(a)*.82,Math.sin(a)*.7,.34],[(s%3-1)*.25,(s%2?1:-1)*.3,a]);}
  twinG.add(fBk);
  const wA=G(),LW=v3(-4.2,-.34,-.45),RW=v3(4.2,-.34,-.45),lWSt=G(),rWSt=G(),lW=G(),rW=G(),outG=createAirfoilGeometry(2.35,.32,4.2);
  add(wA,createAirfoilGeometry(2.5,.34,8.4),wM,[0,-.34,-.45]);
  [[lWSt,lW,LW,-1],[rWSt,rW,RW,1]].forEach(([st,wg2,pos,s])=>{st.position.copy(pos);st.visible=false;[-.45,.35].forEach((z)=>add(st,bx(.65,.16,.14),dc,[s*.24,0,z],[0,0,-s*.12]));wg2.position.copy(pos);addL(wg2,[[outG,wM,[s*2.1,.16,0],[0,0,s*.05]],[bx(.18,1.18,1.35),gd,[s*4.3,.68,.3],[0,s*.08,-s*.24]]]);wA.add(st,wg2);});
  twinG.add(wA);
  const lAl=mkC(lW,[-1.9,.22,1.18],[3.1,.12,.52],vm),rAl=mkC(rW,[1.9,.22,1.18],[3.1,.12,.52],vm),lFl=mkC(twinG,[-2.6,-.36,.72],[2.5,.13,.64],gd),rFl=mkC(twinG,[2.6,-.36,.72],[2.5,.13,.64],gd),lSp=mkC(twinG,[-2.5,-.16,-.32],[2.05,.08,.52],vm),rSp=mkC(twinG,[2.5,-.16,-.32],[2.05,.08,.52],vm);
  const bG=bx(.16,2.3,.045),tG=bx(.17,.25,.055);
  const prp=[-1,1].map((s)=>{
    const nac=G(),det=G(),hub=G();nac.position.set(s*3.05,-.12,-1.55);det.position.set(0,0,-1.64);
    addL(nac,[[cy(.52,.62,2.7,16),tl,[0,0,0],[P,0,0]],[cy(.6,.24,1.55,14),iv,[0,0,2],[P,0,0]],[new T.TorusGeometry(.5,.065,8,16),vm,[0,0,-1.32]],[bx(.52,.36,1.1),dm,[0,-.45,-.75]],[cy(.1,.12,.68,10),ch,[s*.46,-.16,-.42],[.45,0,s*.45]]]);
    add(det,new T.ConeGeometry(.32,.95,14),vm,[0,0,-.24],[-P,0,0]);
    for(let b=0;b<3;b++)add(add(hub,bG,dm,[0,0,0],[0,.24,(b*Math.PI*2)/3]),tG,gd,[0,1.04,0]);
    const disc=new T.Mesh(new T.CircleGeometry(1.24,24),new T.MeshBasicMaterial({map:prT,transparent:true,opacity:.72,side:T.DoubleSide,depthWrite:false}));
    hub.add(disc);det.add(hub);nac.add(det);twinG.add(nac);return {hub,disc,det,nac};
  });
  const TP=v3(0,.25,2.75),tA=G();tA.position.copy(TP);
  addL(tA,[[cy(.4,1.16,5.6,16),iv,[0,.03,2.7],[P,0,0],[.88,1,.98]],[cy(.3,.92,5.3),tl,[0,-.45,2.55],[P,0,0],[.92,1,.5]],[cy(1.08,1.08,.14,14),dc,[0,-.05,.02],[P,0,0]],[bx(.2,.95,2.45),tl,[0,.98,1.58],[.46,0,0]],[createSweptFinGeometry(3.1,1.05,3.7,2.45),tl,[0,.4,2.27]],[bx(.3,.78,1.35),vm,[0,2.85,4.6],[-.1,0,0]],[createAirfoilGeometry(1.36,.16,6.1),iv,[0,3.88,5.1]]]);
  const rud=mkC(tA,[0,2.05,5.48],[.19,3.1,.72],gd),elv=mkC(tA,[0,3.88,5.82],[5.7,.13,.5],vm);twinG.add(tA);
  const exH=[-1,1].map((s)=>spr('#ff9f43',[s*3.05,-.18,1.3],1.15,.32,twinG));mkH('#ff3b30',[-4.35,.22,-.4],1.25,lW);mkH('#34d399',[4.35,.22,-.4],1.25,rW);
  const strTw=mkH('#fff7d6',[0,4.2,5.15],1.6,tA),grTw=mkGear(twinG,[[0,-3.75,.36],[-1.75,.45,.46],[1.75,.45,.46]]);

  // === 2. C-172 (Cessna 172 Skyhawk): HIGH straight wing WITH struts, boxy cabin, single nose prop, LOW conventional tail, fixed wheel-spat gear ===
  addL(p1G,[[bx(1.52,1.42,3.1),wh,[0,.22,-.55]],[bx(1.54,.24,3.15),rd,[0,-.14,-.55]],[cy(.74,.86,1.8,14),wh,[0,.05,-2.95],[P,0,0],[1,.9,.82]],[cy(.68,.72,.22,14),dm,[0,.05,-3.85],[P,0,0],[1,.9,.82]],[bx(1.42,.72,1.15),gl,[0,.74,-1.88],[.48,0,0]],[bx(1.56,.58,1.65),gl,[0,.52,-.42]],[cy(.28,.82,4.35,14),wh,[0,.25,3.12],[P,0,0],[.76,1,1.02]],[cy(.22,.62,4.2,12),rd,[0,.08,3.12],[P,0,0],[.78,1,.32]],[createAirfoilGeometry(1.72,.22,11.2),wh,[0,1.24,-.42]],[bx(11.1,.05,.32),rd,[0,1.37,-.42]],[createSweptFinGeometry(1.9,.72,2.15,1.15,.16),wh,[0,.38,3.45]],[bx(.2,.38,.92),rd,[0,2.32,4.95]],[createAirfoilGeometry(1.05,.12,4.35),wh,[0,.38,4.68]]]);
  [-1,1].forEach((s)=>{const a=v3(s*.78,-.42,-.42),b=v3(s*3.45,1.18,-.42),d=b.clone().sub(a),m=new T.Mesh(cy(.05,.055,d.length(),8),wh);m.scale.set(1,1,1.8);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(v3(0,1,0),d.normalize());p1G.add(m);});
  const p1Hub=G();p1Hub.position.set(0,.05,-4.08);add(p1G,new T.ConeGeometry(.24,.62,12),rd,[0,.05,-4.28],[-P,0,0]);
  for(let b=0;b<2;b++)add(add(p1Hub,bx(.14,1.95,.035),dm,[0,0,0],[0,.18,b*Math.PI]),bx(.15,.22,.04),gd,[0,.88,0]);
  const p1Disc=new T.Mesh(new T.CircleGeometry(1.02,22),new T.MeshBasicMaterial({map:prT,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}));p1Hub.add(p1Disc);p1G.add(p1Hub);
  const p1AlL=mkC(p1G,[-3.8,1.2,.44],[2.4,.08,.36],rd),p1AlR=mkC(p1G,[3.8,1.2,.44],[2.4,.08,.36],rd),p1FlL=mkC(p1G,[-1.7,1.18,.44],[1.8,.08,.4],wh),p1FlR=mkC(p1G,[1.7,1.18,.44],[1.8,.08,.4],wh),p1Elv=mkC(p1G,[0,.38,5.2],[4.1,.09,.36],rd),p1Rud=mkC(p1G,[0,1.42,5.32],[.14,1.85,.48],wh);
  mkH('#ff3b30',[-5.62,1.24,-.42],1.1,p1G);mkH('#34d399',[5.62,1.24,-.42],1.1,p1G);mkH('#fff7d6',[0,2.6,5.05],1.3,p1G);
  mkGear(p1G,[[0,-3.1,.3,true],[-1.45,-.15,.34,true],[1.45,-.15,.34,true]],-.52);

  // === 3. CJ-4 JET (Citation Business Jet): needle nose, sleek narrow body, SWEPT low wings + winglets, SWEPT T-tail, 2 rear turbofans ===
  addL(jetG,[[cy(.86,.86,7.6,18),wh,[0,.18,-.4],[P,0,0]],[cy(.64,.82,7.2,14),tl,[0,-.32,-.3],[P,0,0],[1.03,1,.42]],[cy(.08,.86,3.3,16),wh,[0,.05,-5.85],[P,0,0],[1,1,.88]],[cy(.42,.86,3.6,16),wh,[0,.24,5.15],[P,0,0]],[cy(.74,.86,1.75,14,1,false,-Math.PI*.55,Math.PI*1.1),gl,[0,.58,-3.75],[P+.38,0,Math.PI]],[createSweptFinGeometry(2.9,.95,3.45,2.55,.18),bl,[0,.6,3.9]],[bx(.2,.26,1.35),gd,[0,3.15,6.45]],[createSweptWingGeometry(1,2.8,1.25,.58,1.1,.13),wh,[0,4.05,6.4]],[createSweptWingGeometry(-1,2.8,1.25,.58,1.1,.13),wh,[0,4.05,6.4]]]);
  for(let i=0;i<6;i++)for(const s of [-1,1])add(jetG,bx(.08,.26,.44),wg,[s*.86,.32,-2.2+i*.86]);
  [-1,1].forEach((s)=>{
    add(jetG,createSweptWingGeometry(s,7.6,2.55,.92,2.55,.22),wh,[0,-.32,-.35],[0,0,s*.06]);
    add(jetG,createSweptFinGeometry(.95,.32,1.25,.58,.1),bl,[s*7.55,.12,1.15],[0,0,-s*.22]);
    addL(jetG,[[cy(.44,.48,2.95,16),ch,[s*1.46,.56,3.35],[P,0,0]],[new T.TorusGeometry(.44,.06,8,16),bl,[s*1.46,.56,1.88]],[cy(.34,.42,.62,14),dm,[s*1.46,.56,4.92],[P,0,0]],[bx(.68,.12,.92),bl,[s*1.08,.52,3.1]]]);
  });
  const jetEx=[-1,1].map((s)=>spr('#60c5ff',[s*1.46,.56,5.55],1.85,.7,jetG));
  const jSpL=mkC(jetG,[-3.4,-.04,.55],[2.3,.07,.45],bl),jSpR=mkC(jetG,[3.4,-.04,.55],[2.3,.07,.45],bl),jElv=mkC(jetG,[0,4.05,7.38],[4.8,.1,.4],bl),jRud=mkC(jetG,[0,2.35,6.95],[.14,2.8,.55],wh);
  mkH('#ff3b30',[-7.65,.2,1.3],1.2,jetG);mkH('#34d399',[7.65,.2,1.3],1.2,jetG);mkH('#fff7d6',[0,4.25,6.8],1.5,jetG);
  const grJt=mkGear(jetG,[[0,-4.4,.3],[-1.6,.25,.38],[1.6,.25,.38]],-.75);

  // === 4. A320 (Airbus A320 Airliner): WIDE cylindrical tube + 14 cabin windows, HUGE swept wings + Sharklets, 2 big underwing turbofans, LOW swept tail + tall Garuda tailfin ===
  addL(airG,[[cy(1.62,1.62,12.2,22),wh,[0,.38,-.4],[P,0,0]],[cy(1.42,1.52,11.6,18),tl,[0,-.56,-.3],[P,0,0],[1.02,1,.46]],[sp(1.62,20,14),wh,[0,.22,-6.5],[0,0,0],[.98,.94,1.9]],[cy(.45,1.62,5.6,20),wh,[0,.58,8.4],[P,0,0]],[cy(1.36,1.56,1.8,16,1,false,-Math.PI*.55,Math.PI*1.1),dm,[0,.92,-6.72],[P+.42,0,Math.PI]],[createSweptFinGeometry(4.4,1.35,5.4,3.45,.28),tl,[0,1.2,6.4]],[bx(.3,.65,2.2),vm,[0,4.7,9.6]],[bx(.31,.35,2.3),gd,[0,4.1,9.5]],[createSweptWingGeometry(1,4.6,2.15,.85,2.2,.2),wh,[0,.55,8.4]],[createSweptWingGeometry(-1,4.6,2.15,.85,2.2,.2),wh,[0,.55,8.4]]]);
  for(let i=0;i<14;i++)for(const s of [-1,1])add(airG,bx(.08,.3,.24),wg,[s*1.61,.78,-5.2+i*.78]);
  [-1,1].forEach((s)=>{
    add(airG,createSweptWingGeometry(s,11.4,3.8,1.22,4.45,.32),wh,[0,-.48,-1.55],[0,0,s*.09]);
    add(airG,createSweptFinGeometry(1.25,.38,1.75,.72,.12),tl,[s*11.35,.55,1.45],[0,0,-s*.18]);
    addL(airG,[[cy(.96,1.02,3.55,18),wh,[s*4.15,-1.18,-2.15],[P,0,0]],[new T.TorusGeometry(.96,.1,10,18),ch,[s*4.15,-1.18,-3.92]],[cy(.72,.82,.9,16),dm,[s*4.15,-1.18,-.22],[P,0,0]],[bx(.32,1.12,2.15),ch,[s*4.15,-.32,-1.95]]]);
  });
  const airEx=[-1,1].map((s)=>spr('#ff9f43',[s*4.15,-1.18,.75],2.35,.55,airG));
  const aSpL=mkC(airG,[-5.2,.08,.4],[3.6,.1,.62],vm),aSpR=mkC(airG,[5.2,.08,.4],[3.6,.1,.62],vm),aElv=mkC(airG,[0,.55,10.2],[8.2,.14,.55],tl),aRud=mkC(airG,[0,3.8,10.8],[.22,4.6,.82],gd);
  mkH('#ff3b30',[-11.5,.6,1.6],1.5,airG);mkH('#34d399',[11.5,.6,1.6],1.5,airG);mkH('#fff7d6',[0,6.65,10.1],1.8,airG);
  const grAl=mkGear(airG,[[0,-6.6,.42],[-2.6,.4,.56],[2.6,.4,.56]],-1.22);

  const lL=G();[-1.55,1.55].forEach((x)=>{spr('#fff4c8',[x,-.32,-2.1],1.15,.65,lL);add(lL,cy(.08,2.1,15,12,1,true),bm('#fff3c4',{transparent:true,opacity:.045,blending:T.AdditiveBlending,depthWrite:false}),[x,-.45,-9.4],[P+.08,0,0]);});
  body.add(lL);body.traverse((o)=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});scene.add(root);
  const brk=createBreakupController(scene,root,{tail:{mesh:tA,parent:twinG,restPos:TP,fractureStub:fBk,floorOffset:1.05},leftWing:{mesh:lW,parent:wA,restPos:LW,fractureStub:lWSt,floorOffset:.45},rightWing:{mesh:rW,parent:wA,restPos:RW,fractureStub:rWSt,floorOffset:.45},leftProp:{mesh:prp[0].det,parent:prp[0].nac,restPos:v3(0,0,-1.64),floorOffset:.55},rightProp:{mesh:prp[1].det,parent:prp[1].nac,restPos:v3(0,0,-1.64),floorOffset:.55}});

  function updateAircraftModel(s,dt,tS,vis){
    root.position.copy(s.position);root.quaternion.copy(s.quaternion);body.visible=vis;
    const at=s.aircraftType||'twin',isP1=at==='prop1',isTw=at==='twin',isJt=at==='jet',isAl=at==='airliner';
    twinG.visible=isTw;p1G.visible=isP1;jetG.visible=isJt;airG.visible=isAl;
    const bp=s.brokenParts||{},rR=s.propRpm??0,rL=s.propRpmLeft??0,oL=rL>.24?Math.min(.84,(rL-.24)*1.15):0,oR=rR>.24?Math.min(.84,(rR-.24)*1.15):0;
    prp[0].hub.rotation.z=s.propAngleLeft??s.propAngle;prp[1].hub.rotation.z=-s.propAngle;p1Hub.rotation.z=-s.propAngle;
    prp[0].disc.visible=oL>.02&&!brk.parts.leftProp.detached;prp[0].disc.material.opacity=oL;prp[1].disc.visible=oR>.02&&!brk.parts.rightProp.detached;prp[1].disc.material.opacity=oR;
    p1Disc.visible=oR>.02;p1Disc.material.opacity=oR;
    const ai=s.controlSurface.aileron*.45,fl=-(s.controlSurface.flaps*Math.PI)/180,spA=(s.controlSurface.spoiler??0)*.82,el=-s.controlSurface.elevator*.42,ru=s.controlSurface.rudder*.45;
    lAl.rotation.x=p1AlL.rotation.x=ai;rAl.rotation.x=p1AlR.rotation.x=-ai;lFl.rotation.x=rFl.rotation.x=p1FlL.rotation.x=p1FlR.rotation.x=fl;
    lSp.rotation.x=rSp.rotation.x=jSpL.rotation.x=jSpR.rotation.x=aSpL.rotation.x=aSpR.rotation.x=spA;
    elv.rotation.x=p1Elv.rotation.x=jElv.rotation.x=aElv.rotation.x=el;rud.rotation.y=p1Rud.rotation.y=jRud.rotation.y=aRud.rotation.y=ru;
    exH.forEach((h,i)=>{const r=i?rR:rL;h.visible=isTw&&r>.25&&s.status!=='crashed';h.material.opacity=Math.min(.42,r*.38);h.scale.setScalar(.85+r*.7);});
    jetEx.forEach((h)=>{h.visible=isJt&&s.throttle>.15&&s.status!=='crashed';h.material.opacity=Math.min(.78,s.throttle*.72);h.scale.setScalar(1.2+s.throttle*1.4);});
    airEx.forEach((h)=>{h.visible=isAl&&s.throttle>.15&&s.status!=='crashed';h.material.opacity=Math.min(.62,s.throttle*.55);h.scale.setScalar(1.6+s.throttle*1.5);});
    if(isTw&&(bp.tail||bp.leftWing||bp.rightWing||bp.leftProp||bp.rightProp||s.status==='crashed')){
      if(bp.leftProp)brk.detachPart('leftProp',s,v3(-4,4.8,-7.2),v3(6.5,4.2,9.5));
      if(bp.rightProp)brk.detachPart('rightProp',s,v3(4,4.8,-7.2),v3(6.5,-4.2,-9.5));
      if(bp.leftWing)brk.detachPart('leftWing',s,v3(-7.8,5.2,1.8),v3(1.4,-2.2,3.1));
      if(bp.rightWing)brk.detachPart('rightWing',s,v3(7.8,5.2,1.8),v3(1.4,2.2,-3.1));
      if(bp.tail)brk.detachPart('tail',s,v3(s.impactZone==='rightWing'?4.2:-4.8,6.2,8.2),v3(-1.35,-1.9,2.4));
      brk.stepDetachedParts(dt,s.crashMode||'ground',vis);
      if(s.status==='crashed'){const sg=s.impactZone==='rightWing'?1:-1,cat=s.crashSeverity!=='hard';wA.rotation.set(cat?.04:.02,sg*(cat?.07:.03),sg*(cat?.12:.05));}
    }else{brk.reattachAllParts();tA.rotation.set(0,0,0);wA.rotation.set(0,0,0);wA.position.set(0,0,0);}
    if(bp.noseCrushed){noseG.scale.set(1.12,.84,.62);noseG.position.set(0,-.26,-3.62);}else{noseG.scale.set(1,1,1);noseG.position.set(0,-.18,-4);}
    grTw.visible=grJt.visible=grAl.visible=s.gearDown&&s.gearIntact;lL.visible=s.gearDown&&s.status!=='crashed';strTw.scale.setScalar(Math.sin(tS*10)>.65?2.2:.9);
  }
  return {root,updateAircraftModel,getDetachedTailWorldPos:()=>(brk.parts.tail.detached?tA.position.clone():null),getDetachedPartsSummary:()=>({tail:brk.parts.tail.detached,leftWing:brk.parts.leftWing.detached,rightWing:brk.parts.rightWing.detached,leftProp:brk.parts.leftProp.detached,rightProp:brk.parts.rightProp.detached,noseCrushed:Boolean(noseG.scale.z<.9)})};
}
