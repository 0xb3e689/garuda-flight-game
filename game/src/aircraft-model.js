// Sculpted 3D Garuda G-4 twin-turboprop with symmetric detachable left/right wings & props, tailboom, and nose crush.
import * as T from 'three';
import { createBreakupController } from './aircraft-breakup.js';
import { createAircraftSkinTexture, createSoftParticleTexture, createWingTexture } from './procedural-textures.js';

const P=Math.PI/2,bx=(w,h,d)=>new T.BoxGeometry(w,h,d),cy=(a,b,h,s=12,...r)=>new T.CylinderGeometry(a,b,h,s,...r),sp=(r,w=12,h=10)=>new T.SphereGeometry(r,w,h),v3=(x,y,z)=>new T.Vector3(x,y,z),G=()=>new T.Group(),bm=(c,o={})=>new T.MeshBasicMaterial({color:c,...o});

function createAirfoilGeometry(c, t, span) {
  const s=new T.Shape().moveTo(0,0).bezierCurveTo(c*.14,t*.95,c*.45,t*.85,c,0).bezierCurveTo(c*.55,-t*.22,c*.16,-t*.38,0,0);
  const g=new T.ExtrudeGeometry(s,{depth:span,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.02,bevelThickness:.03}).translate(-c*.42,0,-span*.5).rotateY(-P);
  const p=g.attributes.position,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){uv[i*2]=Math.max(0,Math.min(1,(p.getX(i)+span*.5)/span));uv[i*2+1]=Math.max(0,Math.min(1,(p.getZ(i)+c*.45)/c));}
  g.setAttribute('uv',new T.BufferAttribute(uv,2));g.computeVertexNormals();return g;
}

function createSweptFinGeometry() {
  const g=new T.ExtrudeGeometry(new T.Shape().moveTo(0,0).lineTo(2.4,3.65).lineTo(3.45,3.55).lineTo(3.15,0).closePath(),{depth:.24,bevelEnabled:true,bevelSize:.03,bevelThickness:.03}).translate(0,0,-.12).rotateY(-P);
  g.computeVertexNormals();return g;
}

export function createAircraftModel(scene) {
  const root=G(),body=G(),noseG=G();root.add(body);body.add(noseG);
  const glT=createSoftParticleTexture('glow'),prT=createSoftParticleTexture('prop');
  const sm=(c,r=.42,m=.22,o={})=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m,...o});
  const fM=new T.MeshStandardMaterial({map:createAircraftSkinTexture(),roughness:.4,metalness:.22}),wM=new T.MeshStandardMaterial({map:createWingTexture(),roughness:.42,metalness:.18});
  const iv=sm('#f3ede0',.38,.15),tl=sm('#13495e',.42,.25),vm=sm('#e55320',.38,.2),gd=sm('#f5ab29',.35,.32),dm=sm('#1f262e',.48,.58),dc=sm('#14191e',.92,.45),ch=sm('#d5dde5',.22,.85),tr=sm('#15171a',.92,.05);
  const gl=sm('#1b475c',.12,.55,{transparent:true,opacity:.78}),wg=sm('#254a5c',.18,0,{emissive:'#ffcf7d',emissiveIntensity:.62});
  const add=(p,g,m,pos=[0,0,0],rot=[0,0,0],sc=[1,1,1])=>{const o=new T.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rot);o.scale.set(...sc);p.add(o);return o;};
  const addL=(p,l)=>l.forEach((a)=>add(p,...a));

  addL(body,[
    [cy(1.24,1.24,5.7,18),fM,[0,.12,-.1],[P,P,0],[1,.96,1.06]],[new T.PlaneGeometry(5.6,1.9),fM,[-1.22,.12,-.1],[0,-P,0]],[new T.PlaneGeometry(5.6,1.9),fM,[1.22,.12,-.1],[0,P,0]],
    [cy(.95,.75,6.2),tl,[0,-.95,-.35],[P,0,0],[1.08,1,.44]],[cy(.92,1.15,3.6,14),iv,[0,1.26,-.45],[P,0,0],[1.15,1,.45]],
    [cy(.98,1.18,2.05,14,1,false,-Math.PI*.55,Math.PI*1.1),gl,[0,.76,-3.28],[P+.28,0,Math.PI]],
    [bx(1.58,.36,.48),bm('#45f5d2'),[0,.58,-3.42]],[bx(1.36,.14,.24),bm('#ffbd3d'),[0,.8,-3.32]],[bx(.06,.72,.42),dm,[0,1.88,1.35],[-.36,0,0]],
  ]);
  noseG.position.set(0,-.18,-4);addL(noseG,[[cy(.76,1.16,2.3,16),iv,[0,0,0],[P,0,0],[1.02,1,.72]],[sp(.8,16,12),dm,[0,-.06,-1.25],[0,0,0],[.96,.74,1.48]]]);
  [-.72,0,.72].forEach((x)=>add(body,bx(.06,1.18,.08),dm,[x,.88,-3.72],[.46,0,0]));
  [-.42,.42].forEach((x)=>add(body,sp(.22,10,10),dm,[x,.94,-2.55]));
  for(let i=0;i<4;i++)for(const s of [-1,1])addL(body,[[bx(.1,.52,.72),dm,[s*1.21,.44,-1.55+i*1.14]],[bx(.12,.4,.58),wg,[s*1.22,.44,-1.55+i*1.14]]]);

  const fBk=G();fBk.position.set(0,.14,2.72);fBk.visible=false;add(fBk,cy(1.16,1.18,.18,14),dc,[0,0,0],[P,0,0]);
  for(let s=0;s<6;s++){const a=(s/6)*Math.PI*2+.3;add(fBk,bx(.12,.14,.65+(s%2)*.3),dm,[Math.cos(a)*.85,Math.sin(a)*.72,.34],[(s%3-1)*.25,(s%2?1:-1)*.3,a]);}
  body.add(fBk);

  const wA=G(),LW=v3(-4.2,1.48,-.55),RW=v3(4.2,1.48,-.55),lWSt=G(),rWSt=G(),lW=G(),rW=G(),outG=createAirfoilGeometry(2.45,.34,4.2);
  add(wA,createAirfoilGeometry(2.45,.34,8.4),wM,[0,1.48,-.55]);
  [[lWSt,lW,LW,-1],[rWSt,rW,RW,1]].forEach(([st,wg2,pos,s])=>{
    st.position.copy(pos);st.visible=false;[-.45,.35].forEach((z)=>add(st,bx(.65,.16,.14),dc,[s*.24,0,z],[0,0,-s*.12]));
    wg2.position.copy(pos);addL(wg2,[[outG,wM,[s*2.1,0,0]],[bx(.18,1.25,1.48),gd,[s*4.35,.54,.35],[0,s*.08,-s*.24]]]);
    wA.add(st,wg2);
  });
  [-1,1].forEach((s)=>{const a=v3(s*1.08,-.58,-.55),b=v3(s*3.85,1.44,-.55),d=b.clone().sub(a),m=new T.Mesh(cy(.065,.08,d.length(),10),tl);m.scale.set(1,1,1.9);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(v3(0,1,0),d.normalize());wA.add(m);});
  body.add(wA);

  const mkC=(p,pos,sz,m)=>{const g=G();g.position.set(...pos);add(g,bx(...sz),m,[0,0,sz[2]*.5]);p.add(g);return g;};
  const lAl=mkC(lW,[-1.9,.06,1.23],[3.2,.13,.56],vm),rAl=mkC(rW,[1.9,.06,1.23],[3.2,.13,.56],vm),lFl=mkC(body,[-2.75,1.42,.66],[2.65,.14,.68],gd),rFl=mkC(body,[2.75,1.42,.66],[2.65,.14,.68],gd);

  const bG=bx(.17,2.38,.045),tG=bx(.18,.26,.055);
  const prp=[-1,1].map((s)=>{
    const nac=G(),det=G(),hub=G();nac.position.set(s*3.15,1.24,-1.65);det.position.set(0,0,-1.64);
    addL(nac,[[cy(.54,.64,2.7,16),tl,[0,0,0],[P,0,0]],[cy(.62,.24,1.6,14),iv,[0,0,2.05],[P,0,0]],[new T.TorusGeometry(.52,.065,8,16),vm,[0,0,-1.32]],[bx(.56,.38,1.15),dm,[0,-.48,-.78]],[cy(.11,.13,.72,10),ch,[s*.48,-.18,-.45],[.45,0,s*.45]],[cy(.08,.09,.45,10),ch,[0,0,-1.48],[P,0,0]]]);
    add(det,new T.ConeGeometry(.34,.98,14),vm,[0,0,-.24],[-P,0,0]);
    for(let b=0;b<3;b++)add(add(hub,bG,dm,[0,0,0],[0,.24,(b*Math.PI*2)/3]),tG,gd,[0,1.08,0]);
    const disc=new T.Mesh(new T.CircleGeometry(1.28,24),new T.MeshBasicMaterial({map:prT,transparent:true,opacity:.72,side:T.DoubleSide,depthWrite:false}));
    hub.add(disc);det.add(hub);nac.add(det);body.add(nac);return {hub,disc,det,nac};
  });

  const TP=v3(0,.25,2.75),tA=G();tA.position.copy(TP);
  addL(tA,[[cy(.42,1.22,5.6,16),iv,[0,.03,2.7],[P,0,0],[.88,1,.98]],[cy(.32,.96,5.3),tl,[0,-.47,2.55],[P,0,0],[.92,1,.5]],[cy(1.12,1.12,.14,14),dc,[0,-.05,.02],[P,0,0]],[createSweptFinGeometry(),tl,[0,.4,2.27]],[bx(.32,.82,1.38),vm,[0,2.87,4.61],[-.1,0,0]],[bx(.33,.24,1.48),gd,[0,2.35,4.53],[-.1,0,0]],[createAirfoilGeometry(1.42,.18,6.4),iv,[0,1.23,4.47]]]);
  const rud=mkC(tA,[0,2.03,5.47],[.19,3.05,.72],gd),elv=mkC(tA,[0,1.23,5.23],[6,.14,.56],vm);body.add(tA);

  const spr=(c,pos,sc,op,p)=>{const h=new T.Sprite(new T.SpriteMaterial({map:glT,color:c,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false}));h.position.set(...pos);h.scale.setScalar(sc);p.add(h);return h;};
  const mkH=(c,pos,sc,p=body)=>{add(p,sp(.18,8,8),bm(c),pos);return spr(c,pos,sc,.85,p);};
  mkH('#ff3b30',[-4.42,.17,-.4],1.35,lW);mkH('#34d399',[4.42,.17,-.4],1.35,rW);
  const str=mkH('#fff7d6',[0,3.83,4.87],1.7,tA),lL=G(),gr=G();
  [-1.55,1.55].forEach((x)=>spr('#fff4c8',[x,1.38,-1.78],1.8,.9,lL));
  [[0,-3.75,.36],[-1.7,.45,.48],[1.7,.45,.48]].forEach(([gx,gz,wr])=>{const g=G();g.position.set(gx,-.98,gz);addL(g,[[cy(.11,.1,.72,10),dm,[0,-.36,0]],[cy(.065,.065,.56,10),ch,[0,-.92,0]],[cy(wr,wr,.36,16),tr,[0,-1.24,0],[0,0,P]],[cy(wr*.46,wr*.46,.39),ch,[0,-1.24,0],[0,0,P]]]);gr.add(g);});
  body.add(lL,gr);body.traverse((o)=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});scene.add(root);

  const brk=createBreakupController(scene,root,{
    tail:{mesh:tA,parent:body,restPos:TP,fractureStub:fBk,floorOffset:1.05},
    leftWing:{mesh:lW,parent:wA,restPos:LW,fractureStub:lWSt,floorOffset:.45},
    rightWing:{mesh:rW,parent:wA,restPos:RW,fractureStub:rWSt,floorOffset:.45},
    leftProp:{mesh:prp[0].det,parent:prp[0].nac,restPos:v3(0,0,-1.64),floorOffset:.55},
    rightProp:{mesh:prp[1].det,parent:prp[1].nac,restPos:v3(0,0,-1.64),floorOffset:.55},
  });

  function updateAircraftModel(s, dt, tS, vis) {
    root.position.copy(s.position);root.quaternion.copy(s.quaternion);body.visible=vis;
    const bp=s.brokenParts||{},rR=s.propRpm??0,rL=s.propRpmLeft??0,oL=rL>.24?Math.min(.84,(rL-.24)*1.15):0,oR=rR>.24?Math.min(.84,(rR-.24)*1.15):0;
    prp[0].hub.rotation.z=s.propAngleLeft??s.propAngle;prp[1].hub.rotation.z=-s.propAngle;
    prp[0].disc.visible=oL>.02&&!brk.parts.leftProp.detached;prp[0].disc.material.opacity=oL;
    prp[1].disc.visible=oR>.02&&!brk.parts.rightProp.detached;prp[1].disc.material.opacity=oR;
    lAl.rotation.x=s.controlSurface.aileron*.45;rAl.rotation.x=-s.controlSurface.aileron*.45;lFl.rotation.x=rFl.rotation.x=-(s.controlSurface.flaps*Math.PI)/180;
    elv.rotation.x=-s.controlSurface.elevator*.42;rud.rotation.y=s.controlSurface.rudder*.45;

    const anyBrk=bp.tail||bp.leftWing||bp.rightWing||bp.leftProp||bp.rightProp;
    if(anyBrk||s.status==='crashed'){
      if(bp.leftProp)brk.detachPart('leftProp',s,v3(-4,4.8,-7.2),v3(6.5,4.2,9.5));
      if(bp.rightProp)brk.detachPart('rightProp',s,v3(4,4.8,-7.2),v3(6.5,-4.2,-9.5));
      if(bp.leftWing)brk.detachPart('leftWing',s,v3(-7.8,5.2,1.8),v3(1.4,-2.2,3.1));
      if(bp.rightWing)brk.detachPart('rightWing',s,v3(7.8,5.2,1.8),v3(1.4,2.2,-3.1));
      if(bp.tail)brk.detachPart('tail',s,v3(s.impactZone==='rightWing'?4.2:-4.8,6.2,8.2),v3(-1.35,-1.9,2.4));
      brk.stepDetachedParts(dt,s.crashMode||'ground',vis);
      if(s.status==='crashed'){const sg=s.impactZone==='rightWing'?1:-1,cat=s.crashSeverity!=='hard';wA.rotation.set(cat?.04:.02,sg*(cat?.07:.03),sg*(cat?.12:.05));}
    }else{brk.reattachAllParts();tA.rotation.set(0,0,0);wA.rotation.set(0,0,0);wA.position.set(0,0,0);}
    if(bp.noseCrushed){noseG.scale.set(1.12,.84,.62);noseG.position.set(0,-.26,-3.62);}else{noseG.scale.set(1,1,1);noseG.position.set(0,-.18,-4);}
    gr.visible=s.gearDown&&s.gearIntact;lL.visible=s.gearDown&&s.status!=='crashed';str.scale.setScalar(Math.sin(tS*10)>.65?2.2:.9);
  }
  return {root,updateAircraftModel,getDetachedTailWorldPos:()=>(brk.parts.tail.detached?tA.position.clone():null),getDetachedPartsSummary:()=>({tail:brk.parts.tail.detached,leftWing:brk.parts.leftWing.detached,rightWing:brk.parts.rightWing.detached,leftProp:brk.parts.leftProp.detached,rightProp:brk.parts.rightProp.detached,noseCrushed:Boolean(noseG.scale.z<.9)})};
}
