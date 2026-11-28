// Sculpted King Air 3D cockpit controls (sub-panel yoke, console PT6 pedestal, flaps, gear) & seamless articulated 3D pilot hands.
import * as T from 'three';
const P=Math.PI/2,{cos:C,sin:S,max:MX,abs:A}=Math,G=()=>new T.Group(),v3=(x,y,z)=>new T.Vector3(x,y,z),cy=(a,b,h,s=14,...r)=>new T.CylinderGeometry(a,b,h,s,...r),cp=(r,l,c=6,s=12)=>new T.CapsuleGeometry(r,l,c,s),to=(r,t,rs=8,ts=16)=>new T.TorusGeometry(r,t,rs,ts),sp=(r,s=12)=>new T.SphereGeometry(r,s,s);
function createQuadrantTexture(){
  const cv=Object.assign(document.createElement('canvas'),{width:512,height:256}),x=cv.getContext('2d');
  x.fillStyle='#182028';x.fillRect(0,0,512,256);
  [56,104,168,212,272,314,386,458].forEach((sx)=>{x.fillStyle='#070a0d';x.fillRect(sx-6,26,12,198);x.strokeStyle='#3f4f5e';x.lineWidth=2;x.strokeRect(sx-6,26,12,198);});
  x.save();x.beginPath();x.rect(36,156,88,68);x.clip();
  for(let s=-40;s<160;s+=16){x.fillStyle=(s/16)%2?'#f1f5f9':'#d9342b';x.beginPath();x.moveTo(36+s,156);x.lineTo(44+s,156);x.lineTo(14+s,224);x.lineTo(6+s,224);x.fill();}
  x.restore();x.font='bold 16px monospace';x.textAlign='center';
  [['POWER',80,'#e6f0f5'],['PROP',190,'#60b8f0'],['COND',293,'#ff6b6b'],['FLAP',386,'#e6f0f5'],['GEAR',458,'#e6f0f5']].forEach(([t,px,cl])=>{x.fillStyle=cl;x.fillText(t,px,18);});
  x.font='bold 12px monospace';x.fillStyle='#d4e2ea';[['MAX',20,44],['IDLE',20,146],['REV',20,210],['UP',356,52],['15',356,128],['30',356,204]].forEach(([t,px,py])=>x.fillText(t,px,py));
  const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;return t;
}
export function createCockpitControlsRig(group,{frameMat,leatherMat,blueLeverMat,ivoryNoseMat}){
  const std=(c,r=.5,m=.2)=>new T.MeshStandardMaterial({color:c,roughness:r,metalness:m});
  const rub=std('#171c22',.72,.14),alu=std('#8e9ba6',.32,.78),red=std('#d92b2b',.35,.2),gd=std('#eab63e',.3,.68);
  const sk=std('#d8a480',.64,.02),sk2=std('#c48e6a',.68,.02),nl=std('#e8c7b2',.36,.04),jkt=std('#1a2737',.78,.06),shrt=std('#e4eaf0',.74,.04);
  const add=(p,g,m,pos=[0,0,0],rot=[0,0,0],sc=[1,1,1])=>{const o=new T.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rot);o.scale.set(...sc);p.add(o);return o;},addL=(p,l)=>l.forEach((a)=>add(p,...a));

  const yokeP=G();yokeP.position.set(-.46,.23,-2.72);
  const yC=new T.CatmullRomCurve3([[-.215,.175,.022],[-.232,.095,.015],[-.212,.015,.006],[-.135,-.024,0],[0,-.016,0],[.135,-.024,0],[.212,.015,.006],[.232,.095,.015],[.215,.175,.022]].map((a)=>v3(...a)));
  addL(yokeP,[[cy(.031,.034,.66,14),alu,[0,0,-.33],[P,0,0]],[new T.TubeGeometry(yC,44,.025,12,false),rub],[cy(.011,.011,.016,10),red,[-.206,.155,.04],[P,0,0]],[cp(.006,.018),alu,[-.222,.128,.038]],[cy(.058,.066,.052,16),rub,[0,-.012,.006],[P,0,0]],[cy(.032,.032,.012,16),gd,[0,-.012,.032],[P,0,0]]]);
  for(let b=0;b<4;b++)add(yokeP,to(.042,.011),rub,[0,0,-.38-b*.032]);
  [-1,1].forEach((s)=>{add(yokeP,sp(.025,10),rub,[s*.215,.175,.022]);for(let g=0;g<4;g++)add(yokeP,to(.026,.004,6,12),leatherMat,[s*.228,.052+g*.028,.012+g*.002],[P,0,0]);});
  const ped=G(),thrP=G(),flapP=G(),gearP=G();ped.position.set(.30,.21,-2.82);thrP.position.set(.06,.21,-2.82);flapP.position.set(.475,.21,-2.82);gearP.position.set(.585,.21,-2.82);
  addL(ped,[[cy(.155,.165,.70,20,1,false,-Math.PI*.42,Math.PI*.84),new T.MeshStandardMaterial({map:createQuadrantTexture(),roughness:.55,metalness:.32}),[0,-.05,0],[0,0,P]],[cy(.16,.16,.022,18),frameMat,[-.355,-.05,0],[0,0,P]],[cy(.16,.16,.022,18),frameMat,[.355,-.05,0],[0,0,P]],[cy(.05,.05,.024,16),alu,[-.38,-.02,.02],[0,0,P]]]);
  [-.048,.022].forEach((lx)=>addL(thrP,[[cy(.008,.014,.225,10),alu,[lx,.112,0]],[cp(.021,.036,8,12),rub,[lx,.226,.008],[0,0,P]],[cy(.006,.006,.042,8),alu,[lx,.192,.018],[0,0,P]]]));
  [.11,.175].forEach((lx)=>{addL(thrP,[[cy(.007,.012,.21,10),alu,[lx,.105,.012]],[cy(.021,.021,.032),blueLeverMat,[lx,.212,.012],[0,0,P]]]);for(let k=0;k<6;k++){const a=(k/6)*Math.PI*2;add(thrP,sp(.0085,6),blueLeverMat,[lx,.212+C(a)*.019,.012+S(a)*.019]);}});
  [.255,.312].forEach((lx)=>addL(thrP,[[cy(.006,.011,.185,10),alu,[lx,.092,.025]],[cy(.015,.021,.034,8),red,[lx,.186,.025],[0,0,P]]]));
  const fS=new T.Shape().moveTo(-.028,0).quadraticCurveTo(-.005,.016,.034,.002).quadraticCurveTo(.005,-.006,-.028,0);
  addL(flapP,[[cy(.008,.011,.195,10),alu,[0,.098,0]],[new T.ExtrudeGeometry(fS,{depth:.054,bevelEnabled:true,bevelSize:.003,bevelThickness:.003}).rotateY(P).translate(-.028,.198,.004),ivoryNoseMat]]);
  addL(gearP,[[cy(.009,.011,.19,10),alu,[0,.095,0]],[to(.026,.010,10,18),rub,[0,.20,0],[0,P,0]],[cy(.021,.021,.02,14),ivoryNoseMat,[0,.20,0],[0,0,P]]]);
  group.add(yokeP,ped,thrP,flapP,gearP);
  const gLamp=new T.MeshBasicMaterial({color:'#22c55e'});[[.585,.25],[.555,.21],[.615,.21]].forEach(([gx,gy])=>addL(group,[[cy(.014,.015,.012,10),frameMat,[gx,gy,-2.76],[P,0,0]],[sp(.011),gLamp,[gx,gy,-2.755]]]));
  const mkArm=(isR)=>{
    const arm=G(),s=isR?1:-1,hand=G(),fore=G(),up=G(),fingers=[];
    addL(hand,[[sp(.051,14),sk,[0,0,-.005],[0,0,0],[.92,.36,.98]],[sp(.034,12),sk2,[-.026*s,-.007,.012],[0,0,0],[.82,.62,1.08]],[sp(.024,12),sk2,[.030*s,-.005,.008],[0,0,0],[.70,.58,1.12]],[cy(.032,.038,.062,16),sk,[0,-.001,.050],[P,0,0],[1.06,.76,1]],[cy(.040,.043,.030,16),shrt,[0,-.001,.086],[P,0,0],[1.06,.82,1]],[cy(.045,.051,.10,16),jkt,[0,-.001,.146],[P,0,0],[1.06,.86,1]],[cy(.049,.049,.005,16),gd,[0,-.001,.118],[P,0,0],[1.07,.87,1]],[cy(.050,.050,.005,16),gd,[0,-.001,.132],[P,0,0],[1.07,.87,1]],[cy(.051,.051,.005,16),gd,[0,-.001,.146],[P,0,0],[1.07,.87,1]],[sp(.050,14),jkt,[0,-.001,.192],[0,0,0],[1.05,.86,1]]]);
    [[-.030,.032,.0098],[-.010,.036,.0102],[.010,.034,.0096],[.029,.027,.0086]].forEach(([fx,ln,rd],i)=>{
      const kn=G(),mid=G(),tip=G();kn.position.set(fx*s,.002,-.044+(i===3?.006:i===0?.002:0));
      add(kn,cp(rd,ln*.92,6,12),sk,[0,0,-ln*.48],[P,0,0]);
      mid.position.set(0,0,-ln*.94);add(mid,cp(rd*.92,ln*.68,6,12),sk,[0,0,-ln*.36],[P,0,0]);
      tip.position.set(0,0,-ln*.72);addL(tip,[[cp(rd*.84,ln*.46,6,10),sk,[0,0,-ln*.24],[P,0,0]],[sp(rd*.64,8),nl,[0,rd*.42,-ln*.38],[0,0,0],[1,.36,1.2]]]);
      mid.add(tip);kn.add(mid);hand.add(kn);fingers.push({kn,mid,tip});
    });
    const thB=G(),thT=G();thB.position.set(-.039*s,-.005,-.002);add(thB,cp(.0118,.030,6,12),sk,[0,0,-.018],[P,0,0]);
    thT.position.set(0,0,-.038);addL(thT,[[cp(.0105,.024,6,10),sk,[0,0,-.014],[P,0,0]],[sp(.0078,8),nl,[0,.0048,-.025],[0,0,0],[1,.36,1.22]]]);
    thB.add(thT);hand.add(thB);
    if(!isR)addL(hand,[[to(.034,.005,8,16),rub,[0,-.001,.060],[0,0,0],[1.06,.78,1]],[cy(.016,.016,.007,14),alu,[0,.025,.060]],[cy(.0125,.0125,.008,14),rub,[0,.026,.060]]]);
    addL(fore,[[cy(.050,.062,.36,16),jkt,[0,0,.18],[P,0,0],[1.05,.88,1]],[sp(.061,12),jkt,[0,0,.36],[0,0,0],[1.04,.88,1]]]);
    add(up,cy(.062,.072,.40,16),jkt,[0,0,.20],[P,0,0],[1.05,.90,1]);arm.add(hand,fore,up);group.add(arm);return {hand,fore,up,fingers,thB,thT};
  };

  const setGrip=(arm,c1,c2,c3,tX,tY,tT)=>{arm.fingers.forEach((f,i)=>{const b=i*.06;f.kn.rotation.x=-(c1+b);f.mid.rotation.x=-(c2+b*.5);f.tip.rotation.x=-(c3+b*.4);});arm.thB.rotation.set(tX,tY,0);arm.thT.rotation.x=tT;};
  const lA=mkArm(false),rA=mkArm(true),LS=v3(-.62,-.04,-1.96),RS=v3(.36,-.04,-1.96),ZA=v3(0,0,1),smR=v3(.04,.43,-2.80);
  let smYR=0,smYP=0,smT=0,smF=0,smG=0,lF=0,lG=true,rAc='throttle',rTm=0;

  const pose=(arm,sh,ox)=>{
    arm.hand.updateMatrix();
    const a0=v3(0,-.001,.192).applyQuaternion(arm.hand.quaternion).add(arm.hand.position),el=a0.clone().lerp(sh,.56);el.y-=.10;el.x+=ox;
    [[arm.fore,a0,el,.36],[arm.up,el,sh,.40]].forEach(([sg,a,b,ln])=>{const d=b.clone().sub(a);sg.position.copy(a);sg.quaternion.setFromUnitVectors(ZA,d.clone().normalize());sg.scale.set(1,1,MX(.05,d.length())/ln);});
  };

  function updateControlsRig(s,force,t){
    const vib=S(t*46)*.0035*(s.status==='crashed'?0:.3+s.throttle),k=force?1:.24;
    smYR+=(-s.controlSurface.aileron*.78-smYR)*k;smYP+=(s.controlSurface.elevator*.10-smYP)*k;smT+=(-0.4+s.throttle*.8-smT)*k;smF+=(-0.35+s.flapStage*.38-smF)*k;smG+=((s.gearDown?.36:-.36)-smG)*k;
    yokeP.rotation.z=smYR+vib*2;yokeP.position.set(-.46,.23+vib,-2.72+smYP);thrP.rotation.x=smT;flapP.rotation.x=smF;gearP.rotation.x=smG;gLamp.color.set(!s.gearIntact?'#ff3b30':s.gearDown?'#22c55e':'#ffaa1d');
    const br=S(t*1.9)*.005,ten=A(s.controlSurface.aileron)*.16+A(s.controlSurface.elevator)*.10;
    const lGr=v3(-.238,.095,.028).applyAxisAngle(ZA,yokeP.rotation.z).add(yokeP.position);
    lA.hand.position.copy(lGr);lA.hand.rotation.set(.26+br,-.16,yokeP.rotation.z+1.14);
    setGrip(lA,.96+ten,1.22+ten,.84,-.32,-.76,-.58-ten*.4);pose(lA,LS,-.12);
    if(s.flapStage!==lF){lF=s.flapStage;rAc='flaps';rTm=.9;}if(s.gearDown!==lG){lG=s.gearDown;rAc='gear';rTm=.9;}if(rTm>0&&(rTm=MX(0,rTm-.016))<=0)rAc='throttle';
    const rt=rAc==='flaps'&&!force?v3(.475,.21+C(smF)*.215,-2.82+S(smF)*.215+.025):rAc==='gear'&&!force?v3(.585,.21+C(smG)*.215,-2.82+S(smG)*.215+.025):v3(.042,.21+C(smT)*.232,-2.82+S(smT)*.232+.022);
    if(force)smR.copy(rt);else smR.lerp(rt,.18);
    rA.hand.position.copy(smR);rA.hand.rotation.set((rAc==='throttle'||force?smT:.1)*.45+.34+br,-.14,.08);
    const pin=rAc!=='throttle'&&!force;setGrip(rA,pin?.65:.92+s.throttle*.10,pin?1.05:1.12,pin?.75:.80,-.28,.66,-.52);pose(rA,RS,.12);
  }
  return {updateControlsRig};
}
