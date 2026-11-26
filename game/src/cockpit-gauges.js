// High-resolution 1280x480 live illuminated cockpit instrument panel renderer (IAS, Gyro, Altimeter, HSI & Annunciators).
const {cos:C,sin:S,PI,max:MX,min:MN,round:R}=Math,P2=PI*2;
const cr=(x,a,b,r,f,s=null,l=1.6)=>{x.beginPath();x.arc(a,b,r,0,P2);if(f){x.fillStyle=f;x.fill();}if(s){x.strokeStyle=s;x.lineWidth=l;x.stroke();}};
const sg=(x,a,b,c,d,s,l=2)=>{x.strokeStyle=s;x.lineWidth=l;x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();};
const tx=(x,t,a,b,sz,f,al='center')=>{x.font=`bold ${sz}px monospace`;x.fillStyle=f;x.textAlign=al;x.textBaseline='middle';x.fillText(t,a,b);};
const bx=(x,a,b,w,h,f,s,l=2)=>{x.fillStyle=f;x.fillRect(a,b,w,h);if(s){x.strokeStyle=s;x.lineWidth=l;x.strokeRect(a,b,w,h);}};
const lG=(x,a,b,c,d,st)=>{const g=x.createLinearGradient(a,b,c,d);st.forEach(([t,k])=>g.addColorStop(t,k));return g;};

function drawGlassReflection(x, cx, cy, r) {
  x.save();x.beginPath();x.arc(cx,cy,r-2,0,P2);x.clip();
  x.fillStyle=lG(x,cx-r,cy-r,cx+r*.6,cy+r*.4,[[0,'rgba(255,255,255,.16)'],[.38,'rgba(220,242,255,.05)'],[.55,'rgba(255,255,255,0)']]);
  x.fillRect(cx-r,cy-r,r*2,r*2);x.restore();
}

function drawDialBezel(x, cx, cy, r, lbl) {
  cr(x,cx+3,cy+4,r+10,'rgba(0,0,0,.55)');
  cr(x,cx,cy,r+9,lG(x,cx-r,cy-r,cx+r,cy+r,[[0,'#5a6977'],[.42,'#222b33'],[.85,'#11161c'],[1,'#394652']]));
  cr(x,cx,cy,r+3,null,'#6c7d8d',1.6);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{const px=cx+sx*r*.88,py=cy+sy*r*.88;cr(x,px,py,4.2,'#485664');sg(x,px-2.4,py-1.2,px+2.4,py+1.2,'#151c22',1.2);});
  const fg=x.createRadialGradient(cx,cy,r*.15,cx,cy,r);fg.addColorStop(0,'#101922');fg.addColorStop(.82,'#0c131a');fg.addColorStop(1,'#1b242d');
  cr(x,cx,cy,r,fg);if(lbl)tx(x,lbl,cx,cy+r*.64,12,'#a3bcc9');
}

function drawAttitudeIndicator(x, cx, cy, r, pD, rD) {
  drawDialBezel(x,cx,cy,r,'');x.save();x.beginPath();x.arc(cx,cy,r-2,0,P2);x.clip();x.translate(cx,cy);x.rotate((-rD*PI)/180);
  const py=MX(-r*.85,MN(r*.85,pD*2.4));
  x.fillStyle=lG(x,0,-r,0,py,[[0,'#125992'],[1,'#3696cc']]);x.fillRect(-r*1.5,-r*1.6+py,r*3,r*1.6);
  x.fillStyle=lG(x,0,py,0,r,[[0,'#8c5328'],[1,'#4d2b14']]);x.fillRect(-r*1.5,py,r*3,r*1.6);
  sg(x,-r,py,r,py,'#fff',2.6);
  [-20,-10,10,20].forEach((d)=>sg(x,Math.abs(d)===10?-20:-32,py-d*2.4,Math.abs(d)===10?20:32,py-d*2.4,'#fff',1.8));
  [-60,-45,-30,-20,-10,0,10,20,30,45,60].forEach((ag)=>{const a=((ag-90)*PI)/180,l=ag%30?8:13;sg(x,C(a)*(r-l),S(a)*(r-l),C(a)*(r-2),S(a)*(r-2),'#f8fafc');});
  x.restore();x.strokeStyle='#ffab24';x.lineWidth=4;x.beginPath();x.moveTo(cx-38,cy);x.lineTo(cx-11,cy);x.lineTo(cx-11,cy+8);x.moveTo(cx+38,cy);x.lineTo(cx+11,cy);x.lineTo(cx+11,cy+8);x.stroke();
  cr(x,cx,cy,4,'#ffab24');x.fillStyle='#ff6b2b';x.beginPath();x.moveTo(cx,cy-r+14);x.lineTo(cx-6,cy-r+24);x.lineTo(cx+6,cy-r+24);x.fill();
  drawGlassReflection(x,cx,cy,r);
}

function drawAirspeedDial(x, cx, cy, r, kts) {
  drawDialBezel(x,cx,cy,r,'IAS KTS');
  const toA=(v)=>PI*.75+(MX(0,MN(240,v))/240)*PI*1.5;
  [[35,95,'#e2e8f0',5],[52,165,'#22c55e',6],[165,215,'#f59e0b',6],[215,240,'#ef4444',7]].forEach(([a,b,c,l])=>{x.strokeStyle=c;x.lineWidth=l;x.beginPath();x.arc(cx,cy,r-10,toA(a),toA(b));x.stroke();});
  for(let v=0;v<=240;v+=40){const a=toA(v);sg(x,cx+C(a)*(r-18),cy+S(a)*(r-18),cx+C(a)*(r-5),cy+S(a)*(r-5),'#dbe6ef',2.2);tx(x,String(v),cx+C(a)*(r-31),cy+S(a)*(r-31),13,'#edf5fa');}
  const na=toA(kts);sg(x,cx-C(na)*14,cy-S(na)*14,cx+C(na)*(r-13),cy+S(na)*(r-13),'#fff9e6',3.2);
  cr(x,cx,cy,8,'#2d3740');tx(x,String(R(kts)).padStart(3,'0'),cx,cy+25,16,'#38f2d4');drawGlassReflection(x,cx,cy,r);
}

function drawAltimeterDial(x, cx, cy, r, ft) {
  drawDialBezel(x,cx,cy,r,'ALT FT');
  for(let i=0;i<10;i++){const a=-PI/2+(i/10)*P2;sg(x,cx+C(a)*(r-16),cy+S(a)*(r-16),cx+C(a)*(r-4),cy+S(a)*(r-4),'#dbe6ef',2.2);tx(x,String(i),cx+C(a)*(r-28),cy+S(a)*(r-28),14,'#edf5fa');}
  bx(x,cx+22,cy-10,40,18,'#070c10','#475968',1.2);tx(x,'29.92',cx+42,cy-1,10,'#ffcb6b');
  const a1=-PI/2+((ft%10000)/10000)*P2,a2=-PI/2+((ft%1000)/1000)*P2;
  sg(x,cx,cy,cx+C(a1)*r*.54,cy+S(a1)*r*.54,'#ffba3b',5);sg(x,cx,cy,cx+C(a2)*(r-13),cy+S(a2)*(r-13),'#fff',3);
  bx(x,cx-32,cy+16,64,21,'#070b0f','#38f2d4',1.4);tx(x,String(R(ft)),cx,cy+27,15,'#38f2d4');drawGlassReflection(x,cx,cy,r);
}

function drawCompassHSI(x, cx, cy, r, hdg, wpB) {
  drawDialBezel(x,cx,cy,r,'');x.save();x.translate(cx,cy);x.rotate((-hdg*PI)/180);
  ['N','3','6','E','12','15','S','21','24','W','30','33'].forEach((l,i)=>{const a=-PI/2+(i/12)*P2;tx(x,l,C(a)*(r-20),S(a)*(r-20),13,i%3?'#d6e3ec':'#ffbd3d');});
  if(Number.isFinite(wpB)){const wa=((wpB-90)*PI)/180;sg(x,C(wa)*-(r-26),S(wa)*-(r-26),C(wa)*(r-12),S(wa)*(r-12),'#38f2d4',3.2);}
  x.restore();x.fillStyle='#ff6b2b';x.beginPath();x.moveTo(cx,cy-r+2);x.lineTo(cx-7,cy-r-9);x.lineTo(cx+7,cy-r-9);x.fill();
  tx(x,`${String(R(hdg)%360).padStart(3,'0')}°`,cx,cy+4,16,'#fff');drawGlassReflection(x,cx,cy,r);
}

export function renderCockpitPanelCanvas(x, s, wpB) {
  x.fillStyle=lG(x,0,0,0,480,[[0,'#222b34'],[.14,'#141c24'],[1,'#0e141a']]);x.fillRect(0,0,1280,480);
  x.fillStyle=lG(x,0,0,0,75,[[0,'rgba(255,196,104,.22)'],[1,'rgba(255,196,104,0)']]);x.fillRect(0,0,1280,75);
  x.strokeStyle='#3c4e5e';x.lineWidth=4;x.strokeRect(8,8,1264,464);tx(x,'GARUDA G-4 · PK-GRD',28,30,16,'#e5bc69','left');
  drawAirspeedDial(x,162,184,106,s.airspeedKts);drawAttitudeIndicator(x,412,184,114,s.pitchDeg,s.rollDeg);drawAltimeterDial(x,662,184,106,s.altitudeFt);drawCompassHSI(x,412,382,76,s.headingDeg,wpB);
  bx(x,52,322,234,122,'#0b1218','#43586b',2.2);
  [['VSI (M/S)',`${s.vsiMps>=0?'+':''}${s.vsiMps.toFixed(1)}`,s.vsiMps<-5?'#ff5722':'#38f2d4',350],['G-LOAD',`${s.gLoad.toFixed(1)}G`,'#f8fafc',386],['ENG EGT',`${R(s.engineTempC)}°C`,s.engineTempC>750?'#ff5722':'#f5a623',422]].forEach(([l,v,c,ry])=>{tx(x,l,68,ry,14,'#9db6c6','left');tx(x,v,270,ry,18,c,'right');});
  const px=814,py=54,w=434;bx(x,px,py,w,392,'#0c131a','#475b6d',2.5);
  [['THROTTLE',(s.throttle/1.1)*100,s.throttle>1?'#ff5722':'#38f2d4',py+28,`${R(s.throttle*100)}%`],['FUEL QTY',s.fuelPct,s.fuelPct<25?'#ff4d4f':'#f5a623',py+80,`${R(s.fuelPct)}%`],['HULL / ENG',s.hullPct,s.hullPct<60?'#ff6b2b':'#22c55e',py+132,`${R(s.hullPct)}%`]].forEach(([l,pct,c,ry,val])=>{
    tx(x,l,px+16,ry,14,'#a9c1cf','left');tx(x,val,px+w-16,ry,14,'#f2f7fa','right');
    x.fillStyle='#18242e';x.fillRect(px+16,ry+8,w-32,15);x.fillStyle=c;x.fillRect(px+16,ry+8,MX(0,MN(1,pct/100))*(w-32),15);
  });
  [['STALL',s.stalling,'#ff3b30'],['LOW FUEL',s.lowFuel,'#ffaa1d'],['GEAR DN',s.gearDown&&s.gearIntact,'#22c55e'],['FLAPS',s.flapStage>0,'#38bdf8'],['ENG DMG',s.engineHealth<80||s.malfunctions?.leftEngineOut,'#ff5722'],['TOGA',s.throttle>1,'#f59e0b']].forEach(([l,lit,c],i)=>{
    const bw=(w-40)*.5,ax=px+16+(i%2)*(bw+8),ay=py+182+Math.floor(i/2)*44;
    if(lit){x.shadowColor=c;x.shadowBlur=12;}bx(x,ax,ay,bw,32,lit?c:'#15202a',lit?'#fff':'#354757',1.8);x.shadowBlur=0;tx(x,l,ax+bw*.5,ay+16,14,lit?'#080c10':'#586977');
  });
}
