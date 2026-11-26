// Sculpted Beechcraft King Air / Twin Otter 3D cockpit controls (curved yoke, PT6 pedestal, flaps, gear & 3D pilot hands).
import * as T from 'three';

const P=Math.PI/2,{cos:C,sin:S,max:MX}=Math,G=()=>new T.Group(),v3=(x,y,z)=>new T.Vector3(x,y,z),cy=(a,b,h,s=12,...r)=>new T.CylinderGeometry(a,b,h,s,...r),cp=(r,l,c=4,s=8)=>new T.CapsuleGeometry(r,l,c,s),to=(r,t,rs=8,ts=16)=>new T.TorusGeometry(r,t,rs,ts),sp=(r,s=8)=>new T.SphereGeometry(r,s,s);

function createQuadrantTexture() {
  const cv=Object.assign(document.createElement('canvas'),{width:512,height:256}),x=cv.getContext('2d');
  x.fillStyle='#182028';x.fillRect(0,0,512,256);
  [56,104,168,212,272,314,386,458].forEach((sx)=>{x.fillStyle='#070a0d';x.fillRect(sx-6,26,12,198);x.strokeStyle='#3f4f5e';x.lineWidth=2;x.strokeRect(sx-6,26,12,198);});
  x.save();x.beginPath();x.rect(36,156,88,68);x.clip();
  for(let s=-40;s<160;s+=16){x.fillStyle=(s/16)%2?'#f1f5f9':'#d9342b';x.beginPath();x.moveTo(36+s,156);x.lineTo(44+s,156);x.lineTo(14+s,224);x.lineTo(6+s,224);x.fill();}
  x.restore();x.font='bold 16px monospace';x.textAlign='center';
  [['POWER',80,'#e6f0f5'],['PROP',190,'#60b8f0'],['COND',293,'#ff6b6b'],['FLAP',386,'#e6f0f5'],['GEAR',458,'#e6f0f5']].forEach(([t,px,cl])=>{x.fillStyle=cl;x.fillText(t,px,18);});
  x.font='bold 12px monospace';x.fillStyle='#d4e2ea';
  [['MAX',20,44],['IDLE',20,146],['REV',20,210],['UP',356,52],['15',356,128],['30',356,204]].forEach(([t,px,py])=>x.fillText(t,px,py));
  const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t;
}

export function createCockpitControlsRig(group, { frameMat, leatherMat, blueLeverMat, ivoryNoseMat }) {
  const std=(c,r=.5,m=.2)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m});
  const rub=std('#171c22',.72,.14),alu=std('#8e9ba6',.32,.78),red=std('#d92b2b',.35,.2),gd=std('#e5b343',.3,.65);
  const glv=std('#9c6c46',.58,.08),stc=std('#6b452a',.68,.08),slv=std('#e6eef5',.62,.05),cuf=std('#1b3147',.7,.05);
  const add=(p,g,m,pos=[0,0,0],rot=[0,0,0])=>{const o=new T.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rot);p.add(o);return o;};
  const addL=(p,l)=>l.forEach((a)=>add(p,...a));

  const yokeP=G();yokeP.position.set(-.54,.34,-2.86);
  const yC=new T.CatmullRomCurve3([[-.235,.205,.025],[-.258,.115,.018],[-.238,.02,.008],[-.15,-.028,0],[0,-.018,0],[.15,-.028,0],[.238,.02,.008],[.258,.115,.018],[.235,.205,.025]].map((a)=>v3(...a)));
  addL(yokeP,[[cy(.032,.034,.44,14),alu,[0,0,-.22],[P,0,0]],[new T.TubeGeometry(yC,44,.026,12,false),rub],[cy(.012,.012,.018,10),red,[-.228,.185,.044],[P,0,0]],[cp(.007,.02),alu,[-.244,.155,.042]],[cy(.062,.072,.055,16),rub,[0,-.012,.006],[P,0,0]],[cy(.034,.034,.012,16),gd,[0,-.012,.034],[P,0,0]]]);
  for(let b=0;b<4;b++)add(yokeP,to(.044,.011),rub,[0,0,-.26-b*.028]);
  [-1,1].forEach((s)=>{add(yokeP,sp(.026,10),rub,[s*.235,.205,.025]);for(let g=0;g<4;g++)add(yokeP,to(.027,.004,6,12),leatherMat,[s*.252,.065+g*.032,.014+g*.002],[P,0,0]);});

  const ped=G(),thrP=G(),flapP=G(),gearP=G();ped.position.set(.32,.29,-2.92);thrP.position.set(.08,.29,-2.92);flapP.position.set(.495,.29,-2.92);gearP.position.set(.605,.29,-2.92);
  addL(ped,[[cy(.16,.17,.72,20,1,false,-Math.PI*.42,Math.PI*.84),new T.MeshStandardMaterial({map:createQuadrantTexture(),roughness:.55,metalness:.32}),[0,-.05,0],[0,0,P]],[cy(.165,.165,.022,18),frameMat,[-.365,-.05,0],[0,0,P]],[cy(.165,.165,.022,18),frameMat,[.365,-.05,0],[0,0,P]],[cy(.052,.052,.024,16),alu,[-.39,-.02,.02],[0,0,P]]]);
  [-.048,.022].forEach((lx)=>addL(thrP,[[cy(.008,.014,.24,10),alu,[lx,.12,0]],[cp(.022,.036,8,12),rub,[lx,.242,.008],[0,0,P]],[cy(.006,.006,.042,8),alu,[lx,.208,.018],[0,0,P]]]));
  [.11,.175].forEach((lx)=>{addL(thrP,[[cy(.007,.012,.225,10),alu,[lx,.112,.012]],[cy(.022,.022,.032),blueLeverMat,[lx,.228,.012],[0,0,P]]]);for(let k=0;k<6;k++){const a=(k/6)*Math.PI*2;add(thrP,sp(.009,6),blueLeverMat,[lx,.228+C(a)*.02,.012+S(a)*.02]);}});
  [.255,.312].forEach((lx)=>addL(thrP,[[cy(.006,.011,.195,10),alu,[lx,.098,.025]],[cy(.016,.022,.036,8),red,[lx,.198,.025],[0,0,P]]]));
  const fS=new T.Shape().moveTo(-.028,0).quadraticCurveTo(-.005,.016,.034,.002).quadraticCurveTo(.005,-.006,-.028,0);
  addL(flapP,[[cy(.008,.011,.21,10),alu,[0,.105,0]],[new T.ExtrudeGeometry(fS,{depth:.056,bevelEnabled:true,bevelSize:.003,bevelThickness:.003}).rotateY(P).translate(-.028,.212,.004),ivoryNoseMat]]);
  addL(gearP,[[cy(.009,.011,.205,10),alu,[0,.102,0]],[to(.028,.011,10,18),rub,[0,.215,0],[0,P,0]],[cy(.022,.022,.02,14),ivoryNoseMat,[0,.215,0],[0,0,P]]]);
  group.add(yokeP,ped,thrP,flapP,gearP);

  const gLamp=new T.MeshBasicMaterial({color:'#22c55e'});
  [[.605,.34],[.575,.3],[.635,.3]].forEach(([gx,gy])=>addL(group,[[cy(.014,.015,.012,10),frameMat,[gx,gy,-2.86],[P,0,0]],[sp(.011),gLamp,[gx,gy,-2.855]]]));

  const mkArm=(isR)=>{
    const arm=G(),s=isR?1:-1,hand=G(),fore=G(),up=G();
    addL(hand,[[new T.BoxGeometry(.068,.078,.028),glv,[0,0,.008]],[cp(.013,.048,6,8),stc,[0,.032,.002],[0,0,P]],[cp(.0085,.032),glv,[-.036*s,.018,-.012],[.65,0,.55*s]],[cy(.034,.038,.04),stc,[0,-.018,.044],[P,0,0]]]);
    for(let f=0;f<4;f++){const fx=(-.024+f*.016)*s;addL(hand,[[cp(.0072,.024),glv,[fx,.046,-.008],[.75,0,0]],[cp(.0064,.02),glv,[fx,.042,-.028],[1.95,0,0]]]);}
    addL(fore,[[cy(.04,.048,.42),slv,[0,0,.21],[P,0,0]],[cy(.039,.041,.018),cuf,[0,0,.016],[P,0,0]],[cy(.042,.042,.009),gd,[0,0,.055],[P,0,0]],[cy(.042,.042,.009),gd,[0,0,.075],[P,0,0]]]);
    add(up,cy(.05,.056,.42),slv,[0,0,.21],[P,0,0]);arm.add(hand,fore,up);group.add(arm);return {hand,fore,up};
  };
  const lA=mkArm(false),rA=mkArm(true),LS=v3(-.36,.46,-2.18),RS=v3(.24,.46,-2.18),ZA=v3(0,0,1),smR=v3(.08,.5,-2.92);
  let smYR=0,smYP=0,smT=0,smF=0,smG=0,lF=0,lG=true,rAc='throttle',rTm=0;

  const pose=(arm,w,sh,ox)=>{const el=w.clone().lerp(sh,.52);el.y-=.14;el.x+=ox;[[arm.fore,w,el],[arm.up,el,sh]].forEach(([sg,a,b])=>{const d=b.clone().sub(a);sg.position.copy(a);sg.quaternion.setFromUnitVectors(ZA,d.clone().normalize());sg.scale.set(1,1,MX(.05,d.length())/.42);});};

  function updateControlsRig(s, force, t) {
    const vib=S(t*46)*.004*(s.status==='crashed'?0:.3+s.throttle),k=force?1:.24;
    smYR+=(-s.controlSurface.aileron*.78-smYR)*k;smYP+=(s.controlSurface.elevator*.11-smYP)*k;
    smT+=(-0.4+s.throttle*.8-smT)*k;smF+=(-0.35+s.flapStage*.38-smF)*k;smG+=((s.gearDown?.36:-.36)-smG)*k;
    yokeP.rotation.z=smYR+vib*2;yokeP.position.set(-.54,.34+vib,-2.86+smYP);
    thrP.rotation.x=smT;flapP.rotation.x=smF;gearP.rotation.x=smG;
    gLamp.color.set(!s.gearIntact?'#ff3b30':s.gearDown?'#22c55e':'#ffaa1d');
    const br=S(t*1.9)*.005,lGr=v3(-.244,.145,.036).applyAxisAngle(ZA,yokeP.rotation.z).add(yokeP.position);
    lA.hand.position.copy(lGr);lA.hand.rotation.set(.22+br,.22,yokeP.rotation.z-.14);pose(lA,lGr,LS,-.11);
    if(s.flapStage!==lF){lF=s.flapStage;rAc='flaps';rTm=.9;}
    if(s.gearDown!==lG){lG=s.gearDown;rAc='gear';rTm=.9;}
    if(rTm>0&&(rTm=MX(0,rTm-.016))<=0)rAc='throttle';
    const rt=rAc==='flaps'&&!force?v3(.495,.29+C(smF)*.215,-2.92+S(smF)*.215+.035):rAc==='gear'&&!force?v3(.605,.29+C(smG)*.215,-2.92+S(smG)*.215+.035):v3(.068,.29+C(smT)*.242,-2.92+S(smT)*.242+.038);
    if(force)smR.copy(rt);else smR.lerp(rt,.18);
    rA.hand.position.copy(smR);rA.hand.rotation.set((rAc==='throttle'||force?smT:.1)-1.15+br,-.14,.08);pose(rA,smR,RS,.1);
  }
  return {updateControlsRig};
}
