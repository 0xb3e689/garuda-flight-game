// Archipelago runways (PAPI lights, windsocks, hangar, tower), volumetric lighthouse, suspension bridge, rescue ship, and solid colliders.
import * as T from 'three';
import { LANDMARKS as LM } from './config.js';
import { createHighResRunwayTexture } from './procedural-textures.js';
import { sampleTerrainHeight as sH } from './terrain-height.js';

const P=Math.PI/2,G=()=>new T.Group(),std=(c,r=.72,m=.1,o={})=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o}),bm=(c)=>new T.MeshBasicMaterial({color:c}),bx=(w,h,d)=>new T.BoxGeometry(w,h,d),cy=(a,b,h,s=12,...r)=>new T.CylinderGeometry(a,b,h,s,...r);
const add=(p,g,m,pos=[0,0,0],rot=[0,0,0])=>{const o=new T.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rot);p.add(o);return o;};
const halo=(p,tex,c,pos,sc,op=.85)=>{const mat=new T.SpriteMaterial({map:tex,color:c,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false}),sp=new T.Sprite(mat);sp.position.set(...pos);sp.scale.setScalar(sc);p.add(sp);return {sp,mat};};

function makeVolumetricBeamMaterial() {
  return new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{uColor:{value:new T.Color('#ffe599')},uIntensity:{value:.34}},
    vertexShader:`varying vec3 vN,vV;varying float vA;void main(){vA=clamp(.5-position.y/115.,0.,1.);vN=normalize(normalMatrix*normal);vec4 m=modelViewMatrix*vec4(position,1.);vV=-m.xyz;gl_Position=projectionMatrix*m;}`,
    fragmentShader:`uniform vec3 uColor;uniform float uIntensity;varying vec3 vN,vV;varying float vA;void main(){gl_FragColor=vec4(uColor,pow(abs(dot(normalize(vN),normalize(vV))),2.2)*pow(1.-vA,1.85)*smoothstep(0.,.08,vA)*uIntensity);}`,
  });
}

export function buildRunwayGroup(rw, glT, col) {
  const g=G();g.position.set(rw.x,rw.elevation,rw.z);g.rotation.y=(-rw.headingDeg*Math.PI)/180;
  add(g,new T.PlaneGeometry(rw.width,rw.length),new T.MeshStandardMaterial({map:createHighResRunwayTexture(rw.code,rw.reciprocal),roughness:.82,metalness:.06,polygonOffset:true,polygonOffsetFactor:-2}),[0,.28,0],[-P,0,0]).receiveShadow=true;
  add(g,bx(rw.width+14,.5,rw.length+22),std('#6b665a',.95,0),[0,-.02,0]).receiveShadow=true;
  const eg=new T.SphereGeometry(.62,8,8),wM=bm('#fff7d6'),gM=bm('#38ef7d'),rM=bm('#ff4b3e'),hL=rw.length*.5,hW=rw.width*.5+2.2;
  for(let z=-hL+15;z<=hL-15;z+=45)for(const s of [-1,1])add(g,eg,wM,[s*hW,.85,z]);
  for(let x=-hW+4;x<=hW-4;x+=6){add(g,eg,gM,[x,.88,hL+1.5]);add(g,eg,rM,[x,.88,-hL-1.5]);}
  for(let k=1;k<=4;k++)halo(g,glT,'#ffdf9e',[0,1.4,hL+k*28],3.8,.72);
  const papiLamps=[],bM=std('#222831',.7,.2),lG=new T.SphereGeometry(1.15,10,10),pB=bx(2.4,1.4,1.7);
  for(let i=0;i<4;i++){
    const lx=rw.papiOffset.lateral-i*4.2,lz=rw.papiOffset.along,lampMat=bm(i<2?'#fff':'#ff3b30');
    add(g,pB,bM,[lx,.8,lz]).castShadow=true;add(g,lG,lampMat,[lx,1.4,lz+.8]);
    papiLamps.push({lampMat,haloMat:halo(g,glT,i<2?'#fffdf0':'#ff3329',[lx,1.45,lz+1.1],6.4,.92).mat});
  }
  const sp=G(),sockArm=G();sp.position.set(rw.windsockOffset.lateral,0,rw.windsockOffset.along);sockArm.position.y=9.2;
  add(sp,cy(.18,.24,9.5,8),std('#d8dee9',.5,.4),[0,4.75,0]);
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

export function buildArchipelagoLandmarks(scene, smT, glT, col) {
  const {lighthouse:LH,bridge:BR,calderaCenter:CC,rescueVessel:RV,harbor:HB}=LM;
  const anim={lighthouseBeam:null,flareSmoke:[],rescueBeacon:null},lh=G(),lhY=sH(LH.x,LH.z);
  lh.position.set(LH.x,lhY-1,LH.z);
  for(let i=0;i<6;i++)add(lh,cy(4.2-i*.38,4.6-i*.38,5.5,16),std(i%2?'#d94526':'#f8f5ee'),[0,2.75+i*5.5,0]).castShadow=true;
  add(lh,cy(2.4,2.4,4,14),bm('#fff3b0'),[0,35,0]);halo(lh,glT,'#ffea9c',[0,35.2,0],20,.78);add(lh,new T.ConeGeometry(3.1,3.2,14),std('#243645',.45),[0,38.6,0]);
  const bmG=G(),bmM=makeVolumetricBeamMaterial(),bmGeo=new T.ConeGeometry(16,115,24,1,true);bmG.position.y=35;
  [-1,1].forEach((d)=>add(bmG,bmGeo,bmM,[d*58,0,0],[0,0,d*P]));lh.add(bmG);anim.lighthouseBeam=bmG;scene.add(lh);
  col.cylinders.push({label:'LIGHTHOUSE TOWER IMPACT',x:LH.x,z:LH.z,radius:5.2,minY:lhY-2,maxY:lhY+40});

  const br=G(),{xStart:x0,xEnd:x1,z:bz,deckY:dY}=BR,sp=x1-x0,red=std('#cb4129',.5,.35);
  add(br,bx(sp,3.2,14),std('#394049',.85),[(x0+x1)*.5,dY,bz]);
  col.boxes.push({label:'BRIDGE DECK IMPACT',minX:x0,maxX:x1,minY:dY-2,maxY:dY+2.4,minZ:bz-7.5,maxZ:bz+7.5});
  for(const tx of [x0+sp*.28,x0+sp*.72]){
    [bz-6.5,bz+6.5].forEach((tz)=>add(br,bx(4.2,dY+62,4.2),red,[tx,(dY+62)*.5-6,tz]));
    add(br,bx(3.8,3.6,15.5),red,[tx,dY+50,bz]);add(br,bx(3.4,3,15.5),red,[tx,dY+24,bz]);
    col.boxes.push({label:'BRIDGE TOWER IMPACT',minX:tx-3.2,maxX:tx+3.2,minY:0,maxY:dY+56,minZ:bz-9,maxZ:bz+9});
  }
  const cM=new T.LineBasicMaterial({color:'#e86f54'});
  [bz-6.2,bz+6.2].forEach((tz)=>br.add(new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length:25},(_,i)=>{const t=i/24;return new T.Vector3(x0+t*sp,t>=.28&&t<=.72?dY+10+((t-.5)/.22)**2*44:dY+4+(t<.28?t/.28:(1-t)/.28)*50,tz);})),cM)));

  const drY=sH(CC.dropX,CC.dropZ),pad=G(),ship=G(),pier=G(),wB=bm('#fff');
  pad.position.set(CC.dropX,drY+.5,CC.dropZ);add(pad,cy(19,21,.9,18),std('#e5a935'));add(pad,bx(24,.45,4.6),wB,[0,.55,0]);add(pad,bx(4.6,.45,24),wB,[0,.55,0]);
  ship.position.set(RV.x,1.2,RV.z);ship.rotation.y=.55;add(ship,bx(11,5.2,34),std('#b5382a',.7));add(ship,bx(8.5,7.5,10),std('#edf2f4',.6),[0,6,-5]);
  anim.rescueBeacon=halo(ship,glT,'#ff6a1f',[0,12.2,-5],12,.9).sp;
  [new T.Vector3(CC.dropX+12,drY+2,CC.dropZ),new T.Vector3(RV.x,6,RV.z)].forEach((o)=>{for(let i=0;i<8;i++){const mat=new T.SpriteMaterial({map:smT,color:'#ff7d38',transparent:true,opacity:.62,depthWrite:false}),p=new T.Sprite(mat);p.userData={origin:o,phase:i/8,mat};scene.add(p);anim.flareSmoke.push(p);}});

  pier.position.set(HB.x,1.6,HB.z);add(pier,bx(10,1.4,54),std('#7a5c43',.9));
  const bH=std('#f4f1ea',.58),bT=std('#1b6b84',.58);
  for(let b=0;b<3;b++){const bt=G();bt.position.set(12+b*11,-.4,-14+b*15);bt.rotation.y=.3+b*.4;add(bt,bx(3.4,1.6,9.5),bH);add(bt,bx(2.4,1.8,3.2),bT,[0,1.4,-.8]);pier.add(bt);}
  scene.add(br,pad,ship,pier);

  const wM2=std('#efe6d5',.78),rA=std('#c85230',.7),rB=std('#216375',.68),wG=bx(10.5,6.4,8.8),rG=new T.ConeGeometry(8,4.4,4);
  [[135,195],[156,212],[172,185],[144,240],[186,232],[122,265],[204,260],[-128,175],[-152,205],[-112,230],[118,145],[168,150],[-142,145]].forEach(([vx,vz],i)=>{
    const vy=sH(vx,vz);if(vy<4)return;
    const h=G();h.position.set(vx,vy,vz);h.rotation.y=i*.6;add(h,wG,wM2,[0,3.2,0]);add(h,rG,i%3?rA:rB,[0,8.4,0],[0,Math.PI/4,0]);scene.add(h);
  });
  return anim;
}

export function checkObstacleCollision(col, p, r = 1.6) {
  for(const b of col.boxes)if(p.x>=b.minX-r&&p.x<=b.maxX+r&&p.y>=b.minY-r&&p.y<=b.maxY+r&&p.z>=b.minZ-r&&p.z<=b.maxZ+r)return {kind:'structure',label:b.label};
  for(const c of col.cylinders)if(p.y>=c.minY-r&&p.y<=c.maxY+r&&Math.hypot(p.x-c.x,p.z-c.z)<=c.radius+r)return {kind:'structure',label:c.label};
  for(const t of col.trees)if(p.y>=t.minY&&p.y<=t.maxY+r&&(p.x-t.x)**2+(p.z-t.z)**2<=(t.radius+r)**2)return {kind:'tree',label:'TREE COLLISION'};
  return null;
}
