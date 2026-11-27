// Multi-layer soft sprite particle, 3D crash debris, ground gouge trench, wingtip contrail, and storm rain engine.
import * as T from 'three';
import { createSoftParticleTexture } from './procedural-textures.js';
import { sampleTerrainHeight as sH, sampleTerrainNormal as sN } from './terrain-world.js';

const {random:R,cos:C,sin:S,abs:A,max:MX,min:MN,hypot:HY,PI}=Math;
const v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),rn=(s)=>(R()-.5)*s,UP=v3(0,1,0),jit=(o,a,b,c)=>o.clone().add(v3(rn(a),b,rn(c)));

function createGougeMarkTexture() {
  const cv=Object.assign(document.createElement('canvas'),{width:128,height:128}),x=cv.getContext('2d'),g=x.createRadialGradient(64,64,8,64,64,58);
  [[0,'rgba(18,13,9,.92)'],[.45,'rgba(38,26,16,.78)'],[.75,'rgba(72,52,34,.42)'],[1,'rgba(72,52,34,0)']].forEach(([t,s])=>g.addColorStop(t,s));
  x.fillStyle=g;x.beginPath();x.ellipse(64,64,34,56,0,0,PI*2);x.fill();
  [['rgba(10,8,6,.92)',46,12,12,104],['rgba(10,8,6,.92)',72,16,10,96],['rgba(195,168,132,.56)',35,18,6,90],['rgba(195,168,132,.56)',86,20,6,86],['rgba(235,120,42,.28)',50,22,4,80]].forEach(([f,a,b,w,h])=>{x.fillStyle=f;x.fillRect(a,b,w,h);});
  const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t;
}

export function createEffectsSystem(scene) {
  const smT=createSoftParticleTexture('smoke'),glT=createSoftParticleTexture('glow');
  const pool=Array.from({length:180},()=>{
    const m=new T.SpriteMaterial({map:smT,color:'#fff',transparent:true,opacity:0,depthWrite:false}),sp=new T.Sprite(m);
    sp.visible=false;scene.add(sp);return {sp,m,l:0,mx:1,v:v3(),g:0,s0:2,s1:8,o:.7};
  });
  let cur=0,dC=0,gC=0,lastG=null,fC=0,bI=0;

  const emit=(p,v,cl='#eef2f6',l=1.4,s0=2,s1=7.5,o=.65,g=0,ad=false)=>{
    const e=pool[cur++%180];e.sp.position.copy(p);e.sp.scale.setScalar(s0);e.sp.visible=true;
    e.m.map=ad?glT:smT;e.m.blending=ad?T.AdditiveBlending:T.NormalBlending;
    e.m.color.set(cl);e.m.opacity=e.o=o;e.l=e.mx=l;e.v.copy(v);e.g=g;e.s0=s0;e.s1=s1;
  };

  const dCl=['#e55320','#13495e','#f3ede0','#242c34','#f5ab29'];
  const deb=Array.from({length:16},(_,i)=>{
    const m=new T.Mesh(new T.BoxGeometry(.45+(i%3)*.45,.14+(i%2)*.12,.75+(i%4)*.35),new T.MeshStandardMaterial({color:dCl[i%5],roughness:.55,metalness:.35}));
    m.visible=false;m.castShadow=true;scene.add(m);return {m,v:v3(),rv:v3(),l:0,fy:0};
  });
  const gM=new T.MeshBasicMaterial({map:createGougeMarkTexture(),transparent:true,opacity:.9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}),gG=new T.PlaneGeometry(5.6,8.2).rotateX(-PI/2);
  const ggs=Array.from({length:96},()=>{const m=new T.Mesh(gG,gM);m.visible=false;scene.add(m);return m;});

  const stamp=(wx,wz,yw,sx=1,sz=1)=>{
    const ty=sH(wx,wz);if(ty<.25)return;
    const m=ggs[gC++%96];m.position.set(wx,ty+.22,wz);
    m.quaternion.setFromUnitVectors(UP,sN(wx,wz)).multiply(new T.Quaternion().setFromAxisAngle(UP,yw));m.scale.set(sx,1,sz);m.visible=true;
  };

  function stampCrashGougeTrail(wp, hdg, len = 34) {
    const hr=(-hdg*PI)/180;
    for(let i=0,n=MX(4,Math.round(len/3.2));i<n;i++){const d=1.5+i*3.2,j=S(i*1.7)*.45;stamp(wp.x+S(hr)*d+j,wp.z+C(hr)*d-j,hr,.95+(i%3)*.16,1.1);}
  }

  function clearDebris() {deb.forEach((d)=>{d.l=0;d.m.visible=false;});pool.forEach((p)=>{p.l=0;p.sp.visible=false;});ggs.forEach((g)=>{g.visible=false;});lastG=null;}

  function emitTouchdownSmoke(wp, q, hd = false) {
    const bk=v3(0,0,1).applyQuaternion(q);
    for(const wx of [-1.75,1.75]){
      const wh=v3(wx,-1.85,.5).applyQuaternion(q).add(wp);
      for(let i=0;i<(hd?7:4);i++){const k=hd&&i%2===0;emit(wh.clone().addScaledVector(bk,i*.9),v3(rn(2.4),.7+R()*1.6,rn(2.4)).addScaledVector(bk,2.5+i*1.6),k?'#ff9933':'#f1f5f9',1+R()*.5,1.9,hd?7.5:5.4,hd?.72:.54,0,k);}
    }
  }

  function emitWaterSplash(wp, int = 1) {
    for(let i=0;i<34;i++){
      const a=(i/34)*PI*2+rn(.45),t=i%4===0,s=(t?4+R()*7:8+R()*14)*int;
      emit(v3(wp.x+C(a)*(1.5+R()*5.5),.4+R()*1.4,wp.z+S(a)*(1.5+R()*5.5)),v3(C(a)*s,(t?13+R()*12:4.5+R()*7.5)*int,S(a)*s),['#d2f2ff','#fff','#9ad8eb'][i%3],(t?1.55:1.15)+R()*.7,t?2.4:3.6,t?9.5:14.5,t?.88:.68,t?-18:-11);
    }
  }

  const shed=(wp,vel,fy,n=3,b=false)=>{
    for(let i=0;i<n;i++){
      const d=b?deb[i]:deb[dC++%16],a=b?(i/n)*PI*2+R()*.4:R()*PI*2,s=b?6+R()*15:3.5+R()*8.5;
      d.m.position.copy(jit(wp,4.2,.6+R()*1.2,4.2));d.v.set((b?0:vel.x*.45)+C(a)*s,(b?4.5:3.2)+R()*(b?9.5:5.2),(b?0:vel.z*.45)+S(a)*s);
      d.rv.set(rn(10),rn(10),rn(10));d.l=b?9:8;d.fy=fy+.15;d.m.visible=true;
    }
  };

  function emitRoaringFireBurst(wp, q, fy, isW = false, sev = 'catastrophic', cause = 'terrain', postFire = false) {
    if(isW){emitWaterSplash(wp,1.45);for(let i=0;i<14;i++)emit(v3(wp.x+rn(8),1+R()*2.5,wp.z+rn(8)),v3(rn(3.5),2.2+R()*2.6,rn(3.5)),'#e8f5fa',2+R()*.8,4,13,.55);return;}
    const cat=sev==='catastrophic';
    shed(wp,v3(),fy,cat?14:6,cat);
    const dustCl=cause==='runway'||cause==='obstacle'?'#8a949e':'#6b5742';
    for(let i=0;i<(cat?16:10);i++)emit(jit(wp,4.4,.5+R()*1.8,4.4),v3(rn(7.5),2.2+R()*4.2,rn(7.5)),i%3?dustCl:'#2c333a',1.4+R()*.9,2.8,cat?11.5:8.5,.7,-3.5);
    for(let i=0;i<(cat?12:8);i++)emit(jit(wp,2.8,.4+R()*1.2,2.8),v3(rn(9),3.5+R()*5.5,rn(9)),i%2?'#ffe680':'#ffaa2b',.38+R()*.25,1.1,2.2,.95,-14,true);
    if(!postFire)return;
    for(const anc of [v3(3.15,1,-.5),v3(1.6,.6,.3),v3(-2.6,1.1,-.8),v3(.4,.9,-1.6)]){
      const o=anc.applyQuaternion(q).add(wp);
      for(let i=0;i<4;i++)emit(jit(o,1.4,i*.65,1.4),v3(rn(1.6),2.8+R()*2,rn(1.6)),i<2?'#fff0a6':'#ff991a',.7+R()*.4,2.8+R()*1.4,5.5,.95,0,true);
      for(let i=0;i<6;i++)emit(jit(o,2.2,.8+i*.95,2.2),v3(rn(2.2),4.2+R()*2.8,rn(2.2)),i%2?'#e02401':'#ff5900',.9+R()*.5,3.4+R()*1.6,7.4,.9,0,true);
      for(let i=0;i<7;i++){const t=i/7;emit(o.clone().add(v3(-t*2.8+rn(2.4),2.8+t*14.5,-t*2.8+rn(2.4))),v3(-1.2,3.2+R()*1.6,-1.2),i<2?'#3d2a22':'#1f252b',2.2+R(),4+t*4.5,12+t*5,.72*(1-t*.25));}
    }
  }

  const TP=28,trails=[v3(-8.55,2,-.1),v3(8.55,2,-.1)].map((loc)=>{
    const pos=new Float32Array(TP*3),mat=new T.LineBasicMaterial({color:'#f4f9fc',transparent:true,opacity:.48}),line=new T.Line(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(pos,3)),mat);
    line.frustumCulled=false;scene.add(line);return {line,pos,mat,loc,ok:false};
  });

  function seedWingtipTrails(s) {
    const fwd=v3(0,0,-1).applyQuaternion(s.quaternion);
    for(const tr of trails){const tip=tr.loc.clone().applyQuaternion(s.quaternion).add(s.position);for(let i=0;i<TP;i++){const p=tip.clone().addScaledVector(fwd,-i*2.1);tr.pos.set([p.x,p.y,p.z],i*3);}tr.line.geometry.attributes.position.needsUpdate=true;tr.ok=true;}
  }

  const RN=260,rP=new Float32Array(RN*6),rO=Array.from({length:RN},()=>[rn(60),rn(36),rn(60)]);
  const rG=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(rP,3)),rL=new T.LineSegments(rG,new T.LineBasicMaterial({color:'#c4dce8',transparent:true,opacity:.42}));
  rL.visible=rL.frustumCulled=false;scene.add(rL);

  function emitWingClipSparks(wp, vel, severe = false) {
    shed(wp,vel,MX(0,sH(wp.x,wp.z)),severe?5:2);
    for(let i=0;i<(severe?12:7);i++)emit(jit(wp,1.6,.4,1.6),v3(vel.x*.35+rn(8),2+R()*4.5,vel.z*.35+rn(8)),i%3?'#ffe066':'#cbd5e1',i%3?.38:.9,i%3?1:2,i%3?2.1:6,.92,i%3?-13:-4,i%3!==0);
  }

  function updateEffects(dt, tS, s, cP, rain, isC) {
    const inW=s.crashMode==='water',fi=s.fuelFireIntensity??0,bp=s.brokenParts||{},mf=s.malfunctions||{};
    if(inW){if((fC+=dt)>=.065){fC=0;emit(v3(s.position.x+rn(7),.35,s.position.z+rn(7)),v3(rn(2),1.6+R()*1.8,rn(2)),++bI%2?'#c2dce6':'#eef9ff',1.6,2.6,9.2,.52);}}
    else if(s.status==='crashed'||s.hullPct<68||s.engineHealth<68||mf.leftEngineOut||mf.rightEngineOut||bp.leftWing||bp.rightWing){
      if((fC+=dt)>=(fi>.1?.036:.06)){
        fC=0;const side=bp.rightWing||mf.rightEngineOut||s.impactZone==='rightWing'?1:bp.leftWing||mf.leftEngineOut||s.impactZone==='leftWing'?-1:0;
        const anc=s.impactZone==='nose'&&!bp.leftWing&&!bp.rightWing?v3(rn(1.2),.2,-3.2):v3(side?side*3.15:3.15,.9,-.35);
        const wp=(s.status==='crashed'&&R()<.35&&!side?v3(-2.4+R()*5.2,.8,-1.2+R()*2):anc).applyQuaternion(s.quaternion).add(s.position);
        if(fi>.05||(s.status!=='crashed'&&s.hullPct<35))emit(jit(wp,1.2,.2,1.2),v3(rn(2.4),(2.6+fi*2.4)+R()*2.6,rn(2.4)),R()<.35?'#fff0a6':R()<.7?'#ff6a00':'#d9260a',.45+R()*.3,(1.6+fi*1.8)+R()*1.2,3.5+fi*3.2,.55+fi*.4,0,true);
        emit(jit(wp,1.4,1.1,1.4),v3(rn(2.4),3.6+R()*2.2,rn(2.4)),'#22282e',2,2.6,11.5,.62);
      }
    }
    if(s.status==='crashed'&&s.crashMode==='ground'){
      const hs=HY(s.velocity.x,s.velocity.z),gy=sH(s.position.x,s.position.z);
      if(gy>.25&&s.position.y<=gy+3.2&&hs>1.4&&(!lastG||HY(s.position.x-lastG.x,s.position.z-lastG.z)>=1.9)){
        const yw=Math.atan2(-s.velocity.x,-s.velocity.z),wg=v3(4.8,0,0).applyQuaternion(s.quaternion).add(s.position),rw=s.crashCause==='runway';
        stamp(s.position.x,s.position.z,yw,1.05,1.15);stamp(wg.x,wg.z,yw,.55,.9);lastG=s.position.clone();
        if(hs>9.5)shed(s.position,s.velocity,gy,hs>18?3:1);
        for(let k=0;k<4;k++){const spk=k<(rw?2:1);emit(v3(s.position.x+rn(4.2),gy+.55,s.position.z+rn(4.2)),v3(-s.velocity.x*.28+rn(6),2.4+R()*4.6,-s.velocity.z*.28+rn(6)),spk?'#ffd666':rw?'#cbd5e1':'#5c4835',spk?.36:1.3,spk?1.2:2.6,spk?2.2:9,spk?.95:.72,spk?-13:-7,spk);}
      }
    }
    for(const p of pool){if(p.l<=0)continue;if((p.l-=dt)<=0){p.sp.visible=false;continue;}const r=1-p.l/p.mx;if(p.g)p.v.y+=p.g*dt;p.sp.position.addScaledVector(p.v,dt);p.sp.scale.setScalar(p.s0+(p.s1-p.s0)*r);p.m.opacity=p.o*(1-r*r);}
    for(const d of deb){
      if(d.l<=0)continue;if((d.l-=dt)<=0){d.m.visible=false;continue;}
      d.v.y-=18*dt;d.m.position.addScaledVector(d.v,dt);
      if(d.m.position.y<d.fy){d.m.position.y=d.fy;d.v.y=A(d.v.y)>1.5?-d.v.y*.35:0;const f=MX(0,1-dt*4.5);d.v.x*=f;d.v.z*=f;d.rv.multiplyScalar(MX(0,1-dt*5));}
      d.m.rotation.x+=d.rv.x*dt;d.m.rotation.y+=d.rv.y*dt;d.m.rotation.z+=d.rv.z*dt;
    }
    const sh=!isC&&!s.onGround&&s.status==='flying'&&s.airspeedKts>78,al=MN(.55,.14+A(s.rollDeg)*.015+MX(0,s.gLoad-1)*.25);
    for(const tr of trails){
      tr.line.visible=sh;if(!sh)continue;tr.mat.opacity=al;
      const tip=tr.loc.clone().applyQuaternion(s.quaternion).add(s.position);
      if(!tr.ok){for(let i=0;i<TP;i++)tr.pos.set([tip.x,tip.y,tip.z],i*3);tr.ok=true;}else{tr.pos.copyWithin(3,0,(TP-1)*3);tr.pos.set([tip.x,tip.y,tip.z],0);}
      tr.line.geometry.attributes.position.needsUpdate=true;
    }
    rL.visible=rain>.05;
    if(rL.visible){
      rL.material.opacity=.26+rain*.3;const fl=(tS*(30+rain*16))%36,sl=.3+rain*.55;
      for(let i=0;i<RN;i++){const [ox,oy,oz]=rO[i],rx=cP.x+ox,ry=cP.y+((oy-fl+54)%36)-18,rz=cP.z+oz;rP.set([rx,ry,rz,rx-sl,ry-2.4,rz-sl*.6],i*6);}
      rG.attributes.position.needsUpdate=true;
    }
  }
  return {clearDebris,emitTouchdownSmoke,emitWaterSplash,emitRoaringFireBurst,emitWingClipSparks,stampCrashGougeTrail,seedWingtipTrails,updateEffects};
}
