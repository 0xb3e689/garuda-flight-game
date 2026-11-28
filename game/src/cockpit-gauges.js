// Dual Garmin G1000 1280x480 glass cockpit: PFD Synthetic Vision + ILS + HSI, VHF/AP FCU, MFD EIS + Moving Map + CAS.
import { FLAP_ANGLES, RUNWAYS } from './config.js';
const {cos:C,sin:S,PI,max:MX,min:MN,round:R,floor:FL}=Math,P2=PI*2;
const sg=(x,a,b,c,d,s,l=2)=>{x.strokeStyle=s;x.lineWidth=l;x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();};
const tx=(x,t,a,b,sz,f,al='center')=>{x.font=`bold ${sz}px monospace`;x.fillStyle=f;x.textAlign=al;x.textBaseline='middle';x.fillText(t,a,b);};
const bx=(x,a,b,w,h,f,s=null,l=2)=>{if(f){x.fillStyle=f;x.fillRect(a,b,w,h);}if(s){x.strokeStyle=s;x.lineWidth=l;x.strokeRect(a,b,w,h);}};
const lG=(x,a,b,c,d,st)=>{const g=x.createLinearGradient(a,b,c,d);st.forEach(([t,k])=>g.addColorStop(t,k));return g;};
const CY='#38f2d4',AM='#ffbe4f',MG='#e879f9',GN='#22c55e',RD='#ff4d4f';
const bezel=(x,a,b,w,h,t)=>{bx(x,a-8,b-8,w+16,h+16,'#182028','#495b6c',2.5);bx(x,a,b,w,h,'#081018','#283846',1.5);bx(x,a,b,w,26,'#0d1822','#243644',1);tx(x,t,a+10,b+13,12,'#8fb7c8','left');};

function drawG1000PFD(x,s,wpB){
  const X=22,Y=26,W=560,H=428,cx=X+W*.5,cy=Y+166;
  bezel(x,X,Y,W,H,'G1000 PFD · SYNTH VISION');
  tx(x,s.apEngaged?'AP ON':'FD',X+234,Y+13,12,s.apEngaged?GN:'#64748b');
  tx(x,`HDG ${String(R(s.apTargetHdg)%360).padStart(3,'0')}°`,X+326,Y+13,12,CY);
  tx(x,`ALT ${R(s.apTargetAltFt)}FT`,X+434,Y+13,12,AM);
  tx(x,s.ilsActive?'ILS':'GPS',X+W-14,Y+13,12,s.ilsActive?MG:GN,'right');
  x.save();x.beginPath();x.rect(X+2,Y+27,W-4,264);x.clip();x.translate(cx,cy);x.rotate((-s.rollDeg*PI)/180);
  const py=MX(-120,MN(120,s.pitchDeg*4.2));
  x.fillStyle=lG(x,0,-220,0,py,[[0,'#0e447d'],[.65,'#2574b5'],[1,'#67b3e0']]);x.fillRect(-360,-280+py,720,280);
  x.fillStyle=lG(x,0,py,0,220,[[0,'#6d4c2c'],[.35,'#4a3a24'],[1,'#1e231c']]);x.fillRect(-360,py,720,280);
  x.fillStyle='rgba(36,68,54,.65)';x.beginPath();x.moveTo(-360,py);
  [[-260,-34],[-170,-12],[-95,-44],[-20,-18],[55,-48],[140,-20],[230,-38],[360,0]].forEach(([mx,my])=>x.lineTo(mx,py+my));
  x.lineTo(360,py);x.closePath();x.fill();
  for(let i=1;i<=5;i++)sg(x,-360,py+i*i*6.5,360,py+i*i*6.5,'rgba(120,220,180,.24)',1);
  for(let k=-6;k<=6;k++)sg(x,k*18,py,k*110,py+220,'rgba(120,220,180,.2)',1);
  sg(x,-360,py,360,py,'#fff',2.2);
  [-20,-10,10,20].forEach((d)=>{const dy=py-d*4.2,w=Math.abs(d)===10?26:42;sg(x,-w,dy,w,dy,'#fff',1.8);tx(x,String(d),w+14,dy,11,'#fff');tx(x,String(d),-w-14,dy,11,'#fff');});
  x.restore();
  x.strokeStyle='#e2f1f8';x.lineWidth=1.8;x.beginPath();x.arc(cx,cy,104,-PI*.82,-PI*.18);x.stroke();
  x.strokeStyle=AM;x.lineWidth=4;x.beginPath();x.moveTo(cx-44,cy);x.lineTo(cx-12,cy);x.lineTo(cx-12,cy+9);x.moveTo(cx+44,cy);x.lineTo(cx+12,cy);x.lineTo(cx+12,cy+9);x.stroke();
  x.fillStyle=AM;x.beginPath();x.arc(cx,cy,3.5,0,P2);x.fill();
  bx(x,X+8,Y+44,74,224,'rgba(6,13,20,.82)','#385366',1.5);tx(x,'IAS',X+45,Y+56,11,'#8eb7c8');
  for(let v=FL((s.airspeedKts-50)/20)*20;v<=s.airspeedKts+50;v+=20){if(v<0)continue;const ty=cy-(v-s.airspeedKts)*2.2;if(ty>Y+66&&ty<Y+258){sg(x,X+68,ty,X+80,ty,'#cde5ef',1.5);tx(x,String(v),X+60,ty,12,'#cde5ef','right');}}
  bx(x,X+4,cy-16,80,32,'#060d14',s.stalling?RD:CY,2);tx(x,String(R(s.airspeedKts)),X+44,cy,18,'#fff');
  bx(x,X+W-92,Y+44,84,224,'rgba(6,13,20,.82)','#385366',1.5);tx(x,'ALT',X+W-50,Y+56,11,'#8eb7c8');
  for(let v=FL((s.altitudeFt-250)/100)*100;v<=s.altitudeFt+250;v+=100){if(v<0)continue;const ty=cy-(v-s.altitudeFt)*.44;if(ty>Y+66&&ty<Y+258){sg(x,X+W-90,ty,X+W-78,ty,'#cde5ef',1.5);tx(x,String(v),X+W-72,ty,12,'#cde5ef','left');}}
  bx(x,X+W-96,cy-16,88,32,'#060d14',AM,2);tx(x,String(R(s.altitudeFt)),X+W-52,cy,17,'#fff');
  tx(x,`VS ${s.vsiMps>=0?'+':''}${s.vsiMps.toFixed(1)}`,X+W-50,Y+256,10.5,CY);
  if(s.ilsActive){
    const lx=cx+s.ilsLocDev*64,ly=Y+276,gx=X+W-108,gy=cy+s.ilsGsDev*64;
    bx(x,cx-74,ly-8,148,16,'rgba(7,15,24,.88)',MG,1.2);bx(x,gx-8,cy-74,16,148,'rgba(7,15,24,.88)',MG,1.2);
    x.fillStyle=MG;[[lx,ly],[gx,gy]].forEach(([a,b])=>{x.beginPath();x.moveTo(a,b-6);x.lineTo(a+6,b);x.lineTo(a,b+6);x.lineTo(a-6,b);x.fill();});
  }
  const hy=Y+360,hr=58;x.fillStyle='#08131d';x.beginPath();x.arc(cx,hy,hr,0,P2);x.fill();x.strokeStyle='#436073';x.lineWidth=1.8;x.stroke();
  x.save();x.translate(cx,hy);x.rotate((-s.headingDeg*PI)/180);
  ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((l,i)=>{const a=-PI/2+(i/12)*P2;tx(x,l,C(a)*(hr-12),S(a)*(hr-12),11,i%3?'#c8dce6':AM);});
  if(Number.isFinite(wpB)){const wa=((wpB-90)*PI)/180;sg(x,C(wa)*-34,S(wa)*-34,C(wa)*42,S(wa)*42,MG,2.8);}
  x.restore();bx(x,cx-28,hy-hr-12,56,20,'#060d14',CY,1.5);tx(x,`${String(R(s.headingDeg)%360).padStart(3,'0')}°`,cx,hy-hr-2,13,'#fff');
  tx(x,`OAT 24°C · ${s.gLoad.toFixed(1)}G`,X+16,Y+408,11,'#90b8c8','left');tx(x,`TRIM ${(s.trimPitch*100).toFixed(0)}%`,X+W-16,Y+408,11,AM,'right');
}

function drawRadioAndFCU(x,s){
  const X=602,Y=26,W=112,H=428;bezel(x,X,Y,W,H,'VHF / FCU');
  [['COM1','118.70',GN,Y+44],['STBY','121.50','#94a3b8',Y+78],['NAV1','110.50',CY,Y+112],['XPDR','1200',AM,Y+146]].forEach(([l,v,c,ry])=>{
    bx(x,X+8,ry,W-16,28,'#060d13','#293c4c',1.2);tx(x,l,X+14,ry+14,10,'#7fa4b6','left');tx(x,v,X+W-14,ry+14,12,c,'right');
  });
  tx(x,'AUTOPILOT',X+W*.5,Y+192,11,AM);
  [['AP',s.apEngaged,GN],['HDG',s.apEngaged,CY],['ALT',s.apEngaged,CY],['APR',s.ilsActive,MG],['BRK',s.speedbrake,AM],['FLAP',s.flapStage>0,'#38bdf8']].forEach(([l,on,c],i)=>{
    const bx0=X+8+(i%2)*50,by0=Y+206+FL(i/2)*44;
    bx(x,bx0,by0,44,34,on?'#122733':'#0d151d',on?c:'#314454',1.8);tx(x,l,bx0+22,by0+20,11.5,on?c:'#6b8294');bx(x,bx0+10,by0+5,24,4,on?c:'#1e2d3b');
  });
  bx(x,X+8,Y+350,W-16,66,'#081018','#2a3d4d',1.4);tx(x,'PAPI',X+W*.5,Y+366,11,'#9ec0cf');
  for(let i=0;i<4;i++){x.fillStyle=i<s.papiWhiteCount?'#fffdf0':'#ff3b30';x.beginPath();x.arc(X+24+i*21,Y+392,6.5,0,P2);x.fill();}
}

function drawG1000MFD(x,s){
  const X=734,Y=26,W=524,H=428;bezel(x,X,Y,W,H,'G1000 MFD · EIS & MOVING MAP');
  tx(x,`PK-GRD · ${s.activeRunwayId}`,X+W-12,Y+13,12,AM,'right');
  const EX=X+10,EW=182;bx(x,EX,Y+34,EW,252,'#071018','#273a4a',1.4);
  [['TRQ PWR',(s.throttle/1.1)*100,`${R(s.throttle*100)}%`,s.throttle>1?'#ff5722':CY,Y+54],['ITT EGT',MN(100,(s.engineTempC-300)/5.5),`${R(s.engineTempC)}°C`,s.engineTempC>750?'#ff5722':AM,Y+104],['FUEL QTY',s.fuelPct,`${R(s.fuelPct)}%`,s.fuelPct<25?RD:'#f5a623',Y+154],['AIRFRAME',s.hullPct,`${R(s.hullPct)}%`,s.hullPct<60?'#ff6b2b':GN,Y+204]].forEach(([l,p,v,c,ry])=>{
    tx(x,l,EX+10,ry,11.5,'#9db8c8','left');tx(x,v,EX+EW-10,ry,13,'#fff','right');
    bx(x,EX+10,ry+10,EW-20,13,'#162430');bx(x,EX+10,ry+10,MX(0,MN(1,p/100))*(EW-20),13,c);
  });
  tx(x,`FLAP ${FLAP_ANGLES[s.flapStage]}° · ${s.gearDown?'GEAR DN':'GEAR UP'}`,EX+EW*.5,Y+268,11,CY);
  const MX0=X+202,MY0=Y+34,MW=312,MH=252,mcx=MX0+MW*.5,mcy=MY0+MH*.5,sc=MW/4400,hR=(s.headingDeg*PI)/180;
  bx(x,MX0,MY0,MW,MH,'#061822','#2b4858',1.5);
  x.save();x.beginPath();x.rect(MX0+2,MY0+2,MW-4,MH-4);x.clip();
  [48,96].forEach((r)=>{x.strokeStyle='rgba(72,224,210,.22)';x.lineWidth=1;x.beginPath();x.arc(mcx,mcy,r,0,P2);x.stroke();});
  x.save();x.translate(mcx,mcy);x.rotate(-hR);
  [[-1040,-1460,340,'rgba(170,92,48,.38)'],[20,10,460,'rgba(44,126,76,.35)'],[1200,-1250,310,'rgba(82,132,68,.35)'],[-760,860,260,'rgba(44,126,76,.32)']].forEach(([ix,iz,ir,cl])=>{
    x.fillStyle=cl;x.beginPath();x.arc((ix-s.position.x)*sc,(iz-s.position.z)*sc,ir*sc,0,P2);x.fill();
  });
  for(const r of RUNWAYS){
    const rx=(r.x-s.position.x)*sc,rz=(r.z-s.position.z)*sc,ln=MX(14,r.length*sc),ac=r.id===s.activeRunwayId;
    x.save();x.translate(rx,rz);x.rotate((r.headingDeg*PI)/180);bx(x,-3,-ln*.5,6,ln,ac?CY:'#e2e8f0');x.restore();
    x.save();x.translate(rx+8,rz-6);x.rotate(hR);tx(x,r.id,0,0,10.5,ac?CY:'#cbd5e1','left');x.restore();
  }
  x.restore();
  x.fillStyle='#fff';x.beginPath();x.moveTo(mcx,mcy-10);x.lineTo(mcx+8,mcy+7);x.lineTo(mcx,mcy+3);x.lineTo(mcx-8,mcy+7);x.closePath();x.fill();
  x.restore();tx(x,'RNG 2NM · HDG UP',MX0+8,MY0+14,10,'#8bd6cc','left');
  [['STALL',s.stalling,RD],['LOW FUEL',s.lowFuel,AM],['AP ON',s.apEngaged,GN],['ILS LOCK',s.ilsActive,MG],['GEAR DN',s.gearDown&&s.gearIntact,GN],['FLAPS',s.flapStage>0,'#38bdf8'],['SPD BRK',s.speedbrake,AM],['ENG DMG',s.engineHealth<80||s.malfunctions?.leftEngineOut||s.malfunctions?.rightEngineOut,'#ff5722']].forEach(([l,lit,c],i)=>{
    const bw=120,ax=X+10+(i%4)*128,ay=Y+302+FL(i/4)*56;
    if(lit){x.shadowColor=c;x.shadowBlur=10;}bx(x,ax,ay,bw,44,lit?c:'#111b24',lit?'#fff':'#2e4050',1.8);x.shadowBlur=0;
    tx(x,l,ax+bw*.5,ay+22,13.5,lit?'#080c10':'#546778');
  });
}

export function renderCockpitPanelCanvas(x,s,wpB){
  x.fillStyle=lG(x,0,0,0,480,[[0,'#1f2832'],[.15,'#121920'],[1,'#0b1117']]);x.fillRect(0,0,1280,480);
  x.fillStyle=lG(x,0,0,0,45,[[0,'rgba(255,196,104,.16)'],[1,'rgba(255,196,104,0)']]);x.fillRect(0,0,1280,45);
  drawG1000PFD(x,s,wpB);drawRadioAndFCU(x,s);drawG1000MFD(x,s);
}
