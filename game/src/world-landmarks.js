// Archipelago runways (ALS/PAPI lights, windsocks, hangar, tower), volumetric lighthouse, bridge, rescue ship, and colliders.
import * as T from 'three';
import { LANDMARKS as LM } from './config.js';
import { createCityWindowTexture, createHighResRunwayTexture } from './procedural-textures.js';
import { getRunwayAt, sampleTerrainHeight as sH } from './terrain-height.js';
const P=Math.PI/2,G=()=>new T.Group(),std=(c,r=.72,m=.1,o={})=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o}),bm=(c)=>new T.MeshBasicMaterial({color:c}),bx=(w,h,d)=>new T.BoxGeometry(w,h,d),cy=(a,b,h,s=12,...r)=>new T.CylinderGeometry(a,b,h,s,...r);
const add=(p,g,m,pos=[0,0,0],rot=[0,0,0])=>{const o=new T.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rot);p.add(o);return o;},halo=(p,tex,c,pos,sc,op=.85)=>{const mat=new T.SpriteMaterial({map:tex,color:c,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false}),sp=new T.Sprite(mat);sp.position.set(...pos);sp.scale.setScalar(sc);p.add(sp);return {sp,mat};};
const makeVolumetricBeamMaterial=()=>new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{uColor:{value:new T.Color('#ffe599')},uIntensity:{value:.34}},vertexShader:`varying vec3 vN,vV;varying float vA;void main(){vA=clamp(.5-position.y/115.,0.,1.);vN=normalize(normalMatrix*normal);vec4 m=modelViewMatrix*vec4(position,1.);vV=-m.xyz;gl_Position=projectionMatrix*m;}`,fragmentShader:`uniform vec3 uColor;uniform float uIntensity;varying vec3 vN,vV;varying float vA;void main(){gl_FragColor=vec4(uColor,pow(abs(dot(normalize(vN),normalize(vV))),2.2)*pow(1.-vA,1.85)*smoothstep(0.,.08,vA)*uIntensity);}`});
export function buildRunwayGroup(rw,glT,col){
  const g=G();g.position.set(rw.x,rw.elevation,rw.z);g.rotation.y=(-rw.headingDeg*Math.PI)/180;
  add(g,new T.PlaneGeometry(rw.width,rw.length),new T.MeshStandardMaterial({map:createHighResRunwayTexture(rw.code,rw.reciprocal),roughness:.82,metalness:.06,polygonOffset:true,polygonOffsetFactor:-2}),[0,.28,0],[-P,0,0]).receiveShadow=true;
  add(g,bx(rw.width+14,.5,rw.length+22),std('#6b665a',.95,0),[0,-.02,0]).receiveShadow=true;
  const eg=new T.SphereGeometry(.62,8,8),wM=bm('#fff7d6'),gM=bm('#38ef7d'),rM=bm('#ff4b3e'),hL=rw.length*.5,hW=rw.width*.5+2.2;
  for(let z=-hL+15;z<=hL-15;z+=45)for(const s of [-1,1])add(g,eg,wM,[s*hW,.85,z]);
  for(let x=-hW+4;x<=hW-4;x+=6){add(g,eg,gM,[x,.88,hL+1.5]);add(g,eg,rM,[x,.88,-hL-1.5]);}
  for(let k=1;k<=6;k++){const az=hL+k*24;add(g,eg,wM,[0,1.2,az]);halo(g,glT,'#ffe8b0',[0,1.55,az],4.2,.82);if(k===2||k===4)for(const x2 of [-12,-6,6,12]){add(g,eg,wM,[x2,1.2,az]);halo(g,glT,'#ffe2a0',[x2,1.5,az],3.2,.68);}}
  const papiLamps=[],bM=std('#222831',.7,.2),lG=new T.SphereGeometry(1.15,10,10),pB=bx(2.4,1.4,1.7);
  for(let i=0;i<4;i++){const lx=rw.papiOffset.lateral-i*4.2,lz=rw.papiOffset.along,lampMat=bm(i<2?'#fff':'#ff3b30');add(g,pB,bM,[lx,.8,lz]).castShadow=true;add(g,lG,lampMat,[lx,1.4,lz+.8]);papiLamps.push({lampMat,haloMat:halo(g,glT,i<2?'#fffdf0':'#ff3329',[lx,1.45,lz+1.1],6.4,.92).mat});}
  const sp=G(),sockArm=G();sp.position.set(rw.windsockOffset.lateral,0,rw.windsockOffset.along);sockArm.position.y=9.2;add(sp,cy(.18,.24,9.5,8),std('#d8dee9',.5,.4),[0,4.75,0]);
  for(let i=0;i<5;i++)add(sockArm,cy(.68-i*.08,.76-i*.08,1.15,10,1,true),std(i%2?'#f8fafc':'#ff5722',.65,0,{side:T.DoubleSide}),[.8+i*1.1,0,0],[0,0,P]);
  sp.add(sockArm);g.add(sp);
  if(rw.id==='RWY36'){
    const hg=G(),tw=G();hg.position.set(48,0,-45);tw.position.set(44,0,52);
    const hb=add(hg,bx(28,11,36),std('#dcd5c7',.78),[0,5.5,0]);hb.castShadow=hb.receiveShadow=true;
    add(hg,cy(14.6,14.6,36.6,16,1,false,0,Math.PI),std('#21586b',.55,.25),[0,11,0],[P,0,P]);add(hg,bx(.8,8.5,24),std('#1a2530',.7),[-14.1,4.25,0]);
    col.boxes.push({label:'HANGAR IMPACT',minX:rw.x+34,maxX:rw.x+62,minY:rw.elevation,maxY:rw.elevation+25,minZ:rw.z-64,maxZ:rw.z-26});
    add(tw,bx(7.5,19,7.5),std('#eae2d6',.74),[0,9.5,0]);add(tw,cy(6.4,5.2,4.4,8),std('#204a5c',.2,.4,{emissive:'#ffbe55',emissiveIntensity:.52}),[0,21.2,0]);
    add(tw,cy(7,6.8,1.1,8),std('#d44b28',.6),[0,23.8,0]);add(tw,new T.SphereGeometry(.75,8,8),rM,[0,25.4,0]);g.add(hg,tw);
    col.cylinders.push({label:'CONTROL TOWER IMPACT',x:rw.x+44,z:rw.z+52,radius:7.2,minY:rw.elevation,maxY:rw.elevation+26.5});
  }
  return {group:g,papiLamps,sockArm,rwy:rw};
}
export function buildArchipelagoLandmarks(scene,smT,glT,col){
  const {lighthouse:LH,bridge:BR,calderaCenter:CC,rescueVessel:RV,harbor:HB}=LM,anim={lighthouseBeam:null,flareSmoke:[],rescueBeacon:null},lh=G(),lhY=sH(LH.x,LH.z);
  lh.position.set(LH.x,lhY-1,LH.z);for(let i=0;i<6;i++)add(lh,cy(4.2-i*.38,4.6-i*.38,5.5,16),std(i%2?'#d94526':'#f8f5ee'),[0,2.75+i*5.5,0]).castShadow=true;
  add(lh,cy(2.4,2.4,4,14),bm('#fff3b0'),[0,35,0]);halo(lh,glT,'#ffea9c',[0,35.2,0],20,.78);add(lh,new T.ConeGeometry(3.1,3.2,14),std('#243645',.45),[0,38.6,0]);
  const bmG=G(),bmM=makeVolumetricBeamMaterial(),bmGeo=new T.ConeGeometry(16,115,24,1,true);bmG.position.y=35;[-1,1].forEach((d)=>add(bmG,bmGeo,bmM,[d*58,0,0],[0,0,d*P]));lh.add(bmG);anim.lighthouseBeam=bmG;scene.add(lh);
  col.cylinders.push({label:'LIGHTHOUSE TOWER IMPACT',x:LH.x,z:LH.z,radius:5.2,minY:lhY-2,maxY:lhY+40});
  const br=G(),{xStart:x0,xEnd:x1,z:bz,deckY:dY}=BR,sp=x1-x0,red=std('#cb4129',.5,.35);
  add(br,bx(sp,3.2,14),std('#394049',.85),[(x0+x1)*.5,dY,bz]);col.boxes.push({label:'BRIDGE DECK IMPACT',minX:x0,maxX:x1,minY:dY-2,maxY:dY+2.4,minZ:bz-7.5,maxZ:bz+7.5});
  for(const tx of [x0+sp*.28,x0+sp*.72]){[bz-6.5,bz+6.5].forEach((tz)=>add(br,bx(4.2,dY+62,4.2),red,[tx,(dY+62)*.5-6,tz]));add(br,bx(3.8,3.6,15.5),red,[tx,dY+50,bz]);add(br,bx(3.4,3,15.5),red,[tx,dY+24,bz]);col.boxes.push({label:'BRIDGE TOWER IMPACT',minX:tx-3.2,maxX:tx+3.2,minY:0,maxY:dY+56,minZ:bz-9,maxZ:bz+9});}
  const cM=new T.LineBasicMaterial({color:'#e86f54'});[bz-6.2,bz+6.2].forEach((tz)=>br.add(new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length:25},(_,i)=>{const t=i/24;return new T.Vector3(x0+t*sp,t>=.28&&t<=.72?dY+10+((t-.5)/.22)**2*44:dY+4+(t<.28?t/.28:(1-t)/.28)*50,tz);})),cM)));
  const drY=sH(CC.dropX,CC.dropZ),pad=G(),ship=G(),pier=G(),wB=bm('#fff');
  pad.position.set(CC.dropX,drY+.5,CC.dropZ);add(pad,cy(19,21,.9,18),std('#e5a935'));add(pad,bx(24,.45,4.6),wB,[0,.55,0]);add(pad,bx(4.6,.45,24),wB,[0,.55,0]);
  ship.position.set(RV.x,1.2,RV.z);ship.rotation.y=.55;add(ship,bx(11,5.2,34),std('#b5382a',.7));add(ship,bx(8.5,7.5,10),std('#edf2f4',.6),[0,6,-5]);anim.rescueBeacon=halo(ship,glT,'#ff6a1f',[0,12.2,-5],12,.9).sp;
  [new T.Vector3(CC.dropX+12,drY+2,CC.dropZ),new T.Vector3(RV.x,6,RV.z)].forEach((o)=>{for(let i=0;i<8;i++){const mat=new T.SpriteMaterial({map:smT,color:'#ff7d38',transparent:true,opacity:.62,depthWrite:false}),p=new T.Sprite(mat);p.userData={origin:o,phase:i/8,mat};scene.add(p);anim.flareSmoke.push(p);}});
  pier.position.set(HB.x,1.6,HB.z);add(pier,bx(10,1.4,54),std('#7a5c43',.9));
  const bH=std('#f4f1ea',.58),bT=std('#1b6b84',.58);for(let b=0;b<3;b++){const bt=G();bt.position.set(12+b*11,-.4,-14+b*15);bt.rotation.y=.3+b*.4;add(bt,bx(3.4,1.6,9.5),bH);add(bt,bx(2.4,1.8,3.2),bT,[0,1.4,-.8]);pier.add(bt);}
  scene.add(br,pad,ship,pier);
  buildCityAndHarbor(scene,glT,col);
  return anim;
}
function buildCityAndHarbor(scene,glT,col){
  const winT=createCityWindowTexture(),bMat=new T.MeshStandardMaterial({map:winT,roughness:.28,metalness:.36}),d=new T.Object3D();
  // Real-scale International Airport Terminal (150m x 42m), 4 jetways, apron & 2 parked airliners west of RWY 36
  const term=G(),tY=14;term.position.set(-88,tY,-15);
  add(term,bx(110,.45,260),std('#525b66',.9,.04),[22,.16,0]).receiveShadow=true;
  add(term,bx(42,18,150),std('#e8edf2',.48,.18),[-12,9,0]);
  add(term,bx(2,12,138),std('#5fa4cc',.18,.65,{emissive:'#ffe6a8',emissiveIntensity:.28}),[9.2,9.5,0]);
  add(term,cy(24,24,154,18,1,false,0,Math.PI),std('#cbd5e1',.42,.38),[-12,17.5,0],[P,0,P]);
  [-52,-18,18,52].forEach((jz)=>{add(term,bx(22,3.6,3.8),std('#dbe4ec',.48,.28),[19,6.2,jz]);add(term,cy(.7,.7,6,8),std('#64748b',.6),[29,3,jz]);});
  [-36,36].forEach((pz)=>{
    const pl=G();pl.position.set(42,3.8,pz);pl.rotation.y=-P;
    add(pl,cy(2.1,2.1,34,12),std('#f8fafc',.35,.2),[0,0,0],[P,0,0]);add(pl,bx(32,.6,5.5),std('#e2e8f0',.4),[0,-.4,2]);add(pl,bx(.6,8.5,5.5),std('#1d4ed8',.38),[0,4.5,14]);
    term.add(pl);
  });
  scene.add(term);col.boxes.push({label:'TERMINAL IMPACT',minX:-124,maxX:-76,minY:tY,maxY:tY+24,minZ:-94,maxZ:64});

  // Real-scale Stepped Skyscrapers & Urban Districts across 4 Islands (tapak 26-54m, height 45-265m)
  const bSpecs=[],hR=(a,b)=>((Math.sin(a*127.1+b*311.7)*43758.5453)%1+1)%1;
  // [cx, cz, cols, rows, sx, sz, coreR, maxH, minH]
  const districts=[
    [340,-40,9,11,64,72,260,265,55],     // Merpati Downtown CBD (Main Island East)
    [60,-640,7,6,66,68,210,195,45],      // Merpati North Waterfront City (Main Island North)
    [-310,-480,5,6,64,68,180,145,40],    // Merpati West Financial Quarter
    [1180,-1020,7,5,64,66,220,175,42],   // Karang Bay City (Northeast Island near RWY 09)
    [-860,640,6,5,64,66,200,145,38],     // Shoal Harbor City (Southwest Island near RWY 04)
    [-220,-2750,8,4,82,82,300,220,55],   // North Horizon Metropolis
  ];
  districts.forEach(([cx,cz,nc,nr,sx,sz,cR,mxH,mnH],di)=>{
    for(let gx=0;gx<nc;gx++)for(let gz=0;gz<nr;gz++){
      const x=cx+(gx-(nc-1)*.5)*sx+(hR(gx+di*9,gz)-.5)*16,z=cz+(gz-(nr-1)*.5)*sz+(hR(gz,gx+di*7)-.5)*16,gy=sH(x,z);
      if(gy<3.5||gy>92||getRunwayAt(x,z,110))continue;
      const dist=Math.hypot(x-cx,z-cz),fac=Math.max(0,1-dist/(cR*1.45));
      const w=26+hR(gx+di,gz+3)*24,dp=26+hR(gx+5,gz+di)*24,h=mnH+fac*(mxH-mnH)*(.55+.45*hR(gx*7+di,gz*3));
      bSpecs.push([x,gy,z,w,h,dp,h>125]);
    }
  });
  const baseIM=new T.InstancedMesh(bx(1,1,1),bMat,bSpecs.length),upIM=new T.InstancedMesh(bx(1,1,1),bMat,bSpecs.length),crIM=new T.InstancedMesh(bx(1,1,1),std('#e2e8f0',.5,.3),bSpecs.length),cl=new T.Color();
  const tints=['#f1f5f9','#dbeafe','#e2e8f0','#e7e2d7','#cbd5e1','#bfdbfe'];
  bSpecs.forEach(([x,y,z,w,h,dp,tall],i)=>{
    const h1=tall?h*.64:h,h2=tall?h*.36:0;
    d.position.set(x,y+h1*.5-3,z);d.scale.set(w,h1,dp);d.rotation.set(0,0,0);d.updateMatrix();baseIM.setMatrixAt(i,d.matrix);
    baseIM.setColorAt(i,cl.set(tints[i%tints.length]));
    if(tall){
      d.position.set(x,y+h1+h2*.5-3,z);d.scale.set(w*.72,h2,dp*.72);d.updateMatrix();upIM.setMatrixAt(i,d.matrix);
      upIM.setColorAt(i,cl.set(tints[(i+2)%tints.length]));
      d.position.set(x,y+h-2,z);d.scale.set(w*.45,4,dp*.45);d.updateMatrix();crIM.setMatrixAt(i,d.matrix);
      if(h>165){add(scene,cy(.6,1.1,26,6),std('#e2e8f0',.35,.65),[x,y+h+11,z]);halo(scene,glT,'#ff3b30',[x,y+h+24.5,z],6.5,.9);}
      col.boxes.push({label:'SKYSCRAPER IMPACT',minX:x-w*.5,maxX:x+w*.5,minY:y,maxY:y+h,minZ:z-dp*.5,maxZ:z+dp*.5});
    }else{
      d.scale.set(0,0,0);d.updateMatrix();upIM.setMatrixAt(i,d.matrix);
      d.position.set(x,y+h-2.5,z);d.scale.set(w*.55,2.4,dp*.55);d.updateMatrix();crIM.setMatrixAt(i,d.matrix);
    }
  });
  [baseIM,upIM,crIM].forEach((m,k)=>{m.castShadow=k===0;m.receiveShadow=true;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;scene.add(m);});
  // Multi-lane coastal expressways linking Airport -> Downtown CBD -> Suspension Bridge
  const hw=add(scene,bx(18,.7,1150),std('#333942',.9),[128,15.2,-120]);hw.receiveShadow=true;add(scene,bx(.9,.76,1140),bm('#facc15'),[128,15.25,-120]);

  // Real-scale Deep-Water Panamax Container Port (320m x 145m quay beside dredged bay basin)
  const port=G();port.position.set(-255,2.6,920);
  add(port,bx(155,5.2,320),std('#7c8591',.9,.05),[0,0,0]).receiveShadow=true;
  add(port,bx(162,1,328),std('#475569',.88),[0,2.4,0]);
  const crM=std('#e04428',.45,.32),crW=std('#f8fafc',.48,.2);
  [-110,-36,38,112].forEach((cz)=>{
    const cr=G();cr.position.set(66,2.8,cz);
    [[-8,-9],[-8,9],[8,-9],[8,9]].forEach(([lx,lz])=>add(cr,bx(1.8,50,1.8),crM,[lx,25,lz]));
    add(cr,bx(18,3,20),crM,[0,49,0]);add(cr,bx(72,3.2,5.5),crM,[16,52,0]);add(cr,bx(8,4.8,6.5),crW,[22,47,0]);
    halo(cr,glT,'#ff4d4f',[0,56,0],4.8,.88);port.add(cr);
    col.boxes.push({label:'PORT CRANE IMPACT',minX:-203,maxX:-173,minY:2,maxY:58,minZ:920+cz-12,maxZ:920+cz+12});
  });
  [[-26,-132],[6,-132],[38,-132]].forEach(([tx,tz])=>add(port,cy(13,13,18,16),std('#e5e7eb',.5,.22),[tx,11.5,tz]));
  [-74,78].forEach((sz)=>{
    const sh=G();sh.position.set(106,-.8,sz);
    add(sh,bx(26,10.5,142),std('#1f2937',.72,.2),[0,3.5,0]);add(sh,bx(26.8,3,144),std('#b91c1c',.68),[0,-1.5,0]);
    add(sh,bx(22,22,16),std('#f8fafc',.52),[0,18,-48]);add(sh,bx(25,3.5,8),std('#1e3a5f',.35),[0,24,-46]);
    port.add(sh);
  });
  const cCols=['#dc2626','#2563eb','#eab308','#16a34a','#ea580c','#e2e8f0'],cPts=[];
  for(let r=0;r<4;r++)for(let k=0;k<8;k++)for(let st=0;st<2+(r+k)%3;st++)cPts.push([-48+r*26,4.6+st*3.2,-96+k*28]);
  [-74,78].forEach((sz)=>{for(let r=0;r<4;r++)for(let k=0;k<6;k++)for(let st=0;st<3;st++)cPts.push([97+r*6,10+st*3.2,sz-24+k*14]);});
  const cIM=new T.InstancedMesh(bx(3.2,3,12),std('#fff',.62,.2),cPts.length);
  cPts.forEach(([x,y,z],i)=>{d.position.set(x,y,z);d.scale.set(1,1,1);d.rotation.set(0,0,0);d.updateMatrix();cIM.setMatrixAt(i,d.matrix);cIM.setColorAt(i,cl.set(cCols[i%cCols.length]));});
  cIM.instanceMatrix.needsUpdate=true;if(cIM.instanceColor)cIM.instanceColor.needsUpdate=true;port.add(cIM);
  scene.add(port);
}
export function checkObstacleCollision(col,p,r=1.6){
  for(const b of col.boxes)if(p.x>=b.minX-r&&p.x<=b.maxX+r&&p.y>=b.minY-r&&p.y<=b.maxY+r&&p.z>=b.minZ-r&&p.z<=b.maxZ+r)return {kind:'structure',label:b.label,cx:(b.minX+b.maxX)*.5,cz:(b.minZ+b.maxZ)*.5};
  for(const c of col.cylinders)if(p.y>=c.minY-r&&p.y<=c.maxY+r&&Math.hypot(p.x-c.x,p.z-c.z)<=c.radius+r)return {kind:'structure',label:c.label,cx:c.x,cz:c.z};
  for(const t of col.trees)if(p.y>=t.minY&&p.y<=t.maxY+r&&(p.x-t.x)**2+(p.z-t.z)**2<=(t.radius+r)**2)return {kind:'tree',label:'TREE COLLISION',cx:t.x,cz:t.z};
  return null;
}
