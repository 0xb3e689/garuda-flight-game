// Aviation HUD overlay: mission tracker, heading/IAS/ALT tapes, pitch ladder, waypoint guidance, VHF radio & outcome banner.
import { FLAP_ANGLES } from './config.js';
import { createTopographicRadar } from './hud-radar.js';

const {round:R,min:MN,max:MX,abs:A,floor:FL,atan2:AT,hypot:HY,PI}=Math;
const angD=(a,b)=>{const d=((a-b+540)%360)-180;return d<-180?d+360:d;};
const BG='rgba(10,17,24,.85)',CY='#38f2d4',AM='#ffbe4f',RD='#ff4d4f',GN='#4ade80',BD='rgba(102,224,210,.46)';
const FAULTS=[['leftEngineOut','PORT ENG OUT'],['fuelLeak','FUEL LEAK'],['flapJammed','FLAPS JAMMED'],['controlDamage','CTRL DAMAGE'],['gearDamaged','GEAR DAMAGE']];
const CARDS={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};
const TONES={danger:'rgba(185,28,28,.92)',warn:'rgba(180,83,9,.92)',good:'rgba(15,118,110,.92)',info:BG};

export function createHudInstruments(canvas) {
  const c=canvas.getContext('2d'),radar=createTopographicRadar();
  let bTxt='',bTn='info',bT=0,rTxt='',rT=0;
  const bx=(x,y,w,h,r,f,s=null,l=1.5)=>{c.beginPath();c.roundRect(x,y,w,h,r);if(f){c.fillStyle=f;c.fill();}if(s){c.strokeStyle=s;c.lineWidth=l;c.stroke();}};
  const tx=(s,x,y,sz,f,al='left',b=1,bs='middle')=>{c.font=`${b?'bold ':''}${sz}px monospace`;c.fillStyle=f;c.textAlign=al;c.textBaseline=bs;c.fillText(s,x,y);};
  const sg=(a,b,d,e,s,l=1.4)=>{c.strokeStyle=s;c.lineWidth=l;c.beginPath();c.moveTo(a,b);c.lineTo(d,e);c.stroke();};

  function drawMissionTracker(x, y, ms, s, cmp) {
    const ob=ms.objectives||[],m=s.malfunctions||{},fl=FAULTS.filter(([k])=>m[k]).map(([,l])=>l);
    const w=cmp?232:278,h=62+ob.length*20+(fl.length?22:0);
    bx(x,y,w,h,8,BG,fl.length?'rgba(255,92,92,.75)':'rgba(255,190,79,.52)');
    tx(`M${ms.mission.number} · ${ms.mission.name.toUpperCase()}`,x+11,y+16,12,AM);tx('[ESC]',x+w-10,y+16,10,'#8cb3c2','right');
    tx(cmp?(ms.mission.shortGoal||ms.mission.goal):ms.mission.goal,x+11,y+32,10,'#b4d8e4');sg(x+10,y+43,x+w-10,y+43,'rgba(120,180,195,.22)',1);
    ob.forEach((o,i)=>tx(`${o.done?'✓':o.active?'▸':`${i+1}.`} ${o.label}`,x+11,y+57+i*20,o.active?11.5:11,o.done?GN:o.active?'#fff':'#7b99a8','left',o.active?1:0));
    if(fl.length){const fy=y+h-14;bx(x+9,fy-8,w-18,17,4,'rgba(185,28,28,.88)');tx(`⚠ ${fl.slice(0,2).join(' · ')}`,x+w*.5,fy+.5,9.5,'#fff1f2','center');}
  }

  function drawHeadingTape(w, hdg, wpB, ms) {
    const tW=MN(440,w*.4),x0=(w-tW)*.5,y0=14,cx=w*.5;
    bx(x0,y0,tW,42,6,BG,BD);c.save();c.beginPath();c.rect(x0+6,y0+2,tW-12,38);c.clip();
    for(let d=FL((hdg-55)/5)*5;d<=hdg+55;d+=5){
      const n=((d%360)+360)%360,df=angD(n,hdg);if(A(df)>40)continue;
      const x=cx+df*4.6,mj=n%15===0;
      sg(x,y0+28,x,y0+(mj?39:35),mj?'#d8f3ee':'rgba(180,215,212,.45)',mj?1.8:1);
      if(mj)tx(CARDS[n]??String(n).padStart(3,'0'),x,y0+9,CARDS[n]?13:11,CARDS[n]?AM:'#d8f3ee','center',1,'top');
    }
    if(Number.isFinite(wpB)){const wx=cx+MX(-44,MN(44,angD(wpB,hdg)))*4.6;c.fillStyle='#ff9f2e';c.beginPath();c.moveTo(wx,y0+3);c.lineTo(wx+6,y0+9);c.lineTo(wx,y0+15);c.lineTo(wx-6,y0+9);c.fill();}
    c.restore();bx(cx-38,y0+36,76,25,4,'#0c1620',CY,1.8);tx(`${String(R(hdg)%360).padStart(3,'0')}°`,cx,y0+48.5,15,'#fff','center');
    if(ms.waypoint){bx(cx-96,y0+65,192,20,4,'rgba(10,17,24,.75)');tx(ms.waypoint.label,cx,y0+75,11,AM,'center');}
  }

  function drawVerticalTape(x, y, w, h, val, st, u, lb, alR, acc, sub) {
    bx(x,y,w,h,7,BG,BD);tx(lb,x+w*.5,y+14,11,'#9ac0ca','center');
    const mY=y+h*.5,pU=26/st;c.save();c.beginPath();c.rect(x+3,y+22,w-6,h-46);c.clip();
    for(let v=FL((val-st*4)/st)*st;v<=val+st*4;v+=st){if(v<0)continue;const ty=mY-(v-val)*pU;sg(alR?x+w-12:x+4,ty,alR?x+w-4:x+12,ty,'rgba(190,225,225,.5)',1.2);tx(String(v),alR?x+w-16:x+16,ty,11,'#cde6ea',alR?'right':'left');}
    c.restore();bx(x-4,mY-17,w+8,34,5,'#071018',acc,2);tx(String(R(val)),x+w*.5,mY-1,19,'#fff','center');tx(u,x+w*.5,y+h-12,10,acc,'center');
    if(sub){bx(x,y+h+6,w,24,5,BG,'rgba(110,210,200,.35)',1);tx(sub,x+w*.5,y+h+18,11,'#e2f1f5','center');}
  }

  function drawPitchLadder(w, h, s, isC) {
    c.save();c.translate(w*.5,isC?h*.36:h*.45);
    c.save();c.beginPath();c.arc(0,0,isC?108:124,0,PI*2);c.clip();c.rotate((-s.rollDeg*PI)/180);
    const po=s.pitchDeg*5.4,cl=s.stalling?'#ff5449':'#66f7dc',lc=s.stalling?'rgba(255,84,73,.88)':'rgba(72,245,210,.72)';
    sg(-98,po,-26,po,lc,1.8);sg(26,po,98,po,lc,1.8);
    [-20,-10,10,20].forEach((d)=>{const py=po-d*5.4;c.setLineDash(d<0?[5,4]:[]);sg(-48,py,-20,py,lc);sg(20,py,48,py,lc);c.setLineDash([]);tx(String(d),-53,py,10,cl,'right');tx(String(d),53,py,10,cl);});
    c.restore();c.strokeStyle=c.fillStyle=AM;c.lineWidth=2.4;
    c.beginPath();c.moveTo(-26,0);c.lineTo(-8,0);c.lineTo(-4,6);c.moveTo(26,0);c.lineTo(8,0);c.lineTo(4,6);c.stroke();
    c.beginPath();c.arc(0,0,2.5,0,PI*2);c.fill();c.restore();
  }

  function drawWaypointGuidance(w, h, s, ms, cam) {
    if(!cam||!ms.waypoint||s.status!=='flying')return;
    const wp=ms.waypoint,dm=R(HY(wp.x-s.position.x,wp.y-s.position.y,wp.z-s.position.z)),dl=dm>=1000?`${(dm/1000).toFixed(1)} KM`:`${dm} M`;
    const v=cam.position.clone().set(wp.x,wp.y+18,wp.z).project(cam),sx=(v.x*.5+.5)*w,sy=(-v.y*.5+.5)*h;
    if(v.z>-1&&v.z<1&&sx>120&&sx<w-120&&sy>95&&sy<h-180){
      c.strokeStyle=AM;c.lineWidth=1.8;c.beginPath();c.moveTo(sx,sy-7);c.lineTo(sx+7,sy);c.lineTo(sx,sy+7);c.lineTo(sx-7,sy);c.closePath();c.stroke();
      bx(sx-42,sy-27,84,17,4,BG);tx(dl,sx,sy-18.5,10.5,'#ffdf8e','center');
    }else{
      const wb=((AT(wp.x-s.position.x,-(wp.z-s.position.z))*180)/PI+360)%360,L=angD(wb,s.headingDeg)<0,ax=L?132:w-132,ay=h*.44;
      bx(ax-(L?12:158),ay-14,170,28,6,'rgba(18,26,36,.88)','#ffaa2b',1.6);tx(L?`◄ ${wp.label} · ${dl}`:`${wp.label} · ${dl} ►`,ax+(L?73:-73),ay,11,'#ffcf66','center');
    }
  }

  function drawSystemsPanel(x, y, w, h, s, ms) {
    bx(x,y,w,h,10,BG,BD);tx(ms.mission.shortTag,x+12,y+19,12,AM);tx(`SCORE ${ms.score}`,x+w-12,y+19,12,CY,'right');
    const tp=R(s.throttle*100);
    [['THROTTLE',(s.throttle/1.1)*100,s.throttle>1?`${tp}% TOGA`:`${tp}%`,s.throttle>1?'#ff5722':CY,y+42],['FUEL',s.fuelPct,`${R(s.fuelPct)}% · ${s.fuelRangeKm.toFixed(1)}km`,s.fuelPct<24?RD:'#f5a623',y+72],['HULL',s.hullPct,`${R(s.hullPct)}%`,s.hullPct<60?'#ff5722':'#22c55e',y+102]].forEach(([l,p,v,cl,ry])=>{
      tx(l,x+12,ry,11,'#b4cfd6');tx(v,x+w-12,ry,11,'#fff','right');c.fillStyle='#1b2833';c.fillRect(x+12,ry+5,w-24,9);c.fillStyle=cl;c.fillRect(x+12,ry+5,MX(0,MN(1,p/100))*(w-24),9);
    });
    const pw=(w-36)/3;
    [[s.gearDown?'GEAR DN':'GEAR UP',s.gearDown?'#22c55e':'#64748b'],[`FLAP ${FLAP_ANGLES[s.flapStage]}°`,s.flapStage?'#38bdf8':'#64748b'],[`GATES ${ms.ringsCleared}/${ms.ringsTotal}`,'#ffaa2b']].forEach(([l,cl],i)=>{const px=x+12+i*(pw+6);bx(px,y+125,pw,23,4,'rgba(20,32,42,.96)',cl);tx(l,px+pw*.5,y+136.5,10.5,cl,'center');});
    const py=y+162;tx(`PAPI ${s.activeRunwayId}`,x+12,py,10.5,'#b4d6e0');
    for(let i=0;i<4;i++){c.fillStyle=i<s.papiWhiteCount?'#fffdf0':'#ff3b30';c.beginPath();c.arc(x+w-74+i*19,py-1,6.2,0,PI*2);c.fill();}
  }

  function drawIncidentReportCard(w, h, s, ms) {
    const r=s.incidentReport;if(!r)return;
    const isC=r.outcome==='CRASHED',cw=MN(516,w-236),ch=264,x=w-cw-116,y=MX(94,(h-ch)*.43);
    c.save();c.shadowColor=isC?'rgba(255,59,48,.5)':'rgba(34,197,94,.5)';c.shadowBlur=24;bx(x,y,cw,ch,12,'rgba(9,15,22,.96)');c.restore();
    bx(x,y,cw,ch,12,null,isC?RD:'#22c55e',2.8);bx(x+2,y+2,cw-4,36,10,isC?'rgba(220,38,38,.95)':'rgba(22,163,74,.95)');
    tx(isC?'✕  MISSION FAILED — AIRCRAFT CRASHED':r.missionComplete?'✓  MISSION COMPLETE — SORTIE ACCOMPLISHED':'✓  SAFE LANDING — OBJECTIVES REMAINING',x+16,y+20,15,'#fff');
    tx(r.title,x+16,y+56,16.5,isC?'#ff9b9b':'#86efac');tx((r.missionComplete?`All objectives cleared! ${r.detail}`:r.detail).slice(0,62),x+16,y+78,12.5,'#edf5fa','left',0);
    const colW=(cw-44)/3;
    [['SINK RATE',r.sinkMps!=null?`-${r.sinkMps.toFixed(1)} m/s`:'-1.4 m/s',r.sinkMps>4.6?'#ff6b6b':GN],['SPEED',`${R(r.speedKts??s.airspeedKts)} KTS`,CY],['BANK',`${R(r.bankDeg??A(s.rollDeg))}°`,(r.bankDeg??0)>14?AM:GN],['FUEL',`${R(s.fuelPct)}%`,s.fuelPct<24?AM:'#e5eef5'],['HULL',`${R(s.hullPct)}%`,s.hullPct<50?'#ff6b6b':GN],['SCORE',String(ms.score),AM]].forEach(([l,v,cl],i)=>{
      const gx=x+16+(i%3)*(colW+6),gy=y+98+FL(i/3)*45;bx(gx,gy,colW,38,6,'rgba(22,33,44,.95)');tx(l,gx+8,gy+11,10,'#8faec0');tx(v,gx+8,gy+27,15,cl);
    });
    bx(x+14,y+ch-42,cw-28,28,6,'rgba(255,255,255,.09)');
    tx(r.missionComplete?'[ENTER] NEXT MISSION   ·   [R] REPLAY   ·   [ESC] MISSIONS':'[R] RETRY MISSION   ·   [ESC] CHOOSE MISSION',x+cw*.5,y+ch-28,12,'#fff','center');
  }

  function renderHud(s, ms, wind, cm, dt, cam = null) {
    const dpr=MN(window.devicePixelRatio||1,2),w=window.innerWidth,h=window.innerHeight;
    if(canvas.width!==FL(w*dpr)||canvas.height!==FL(h*dpr)){canvas.width=FL(w*dpr);canvas.height=FL(h*dpr);}
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    if(bT>0)bT=MX(0,bT-dt);if(rT>0)rT=MX(0,rT-dt);
    const wpB=ms.waypoint?((AT(ms.waypoint.x-s.position.x,-(ms.waypoint.z-s.position.z))*180)/PI+360)%360:NaN;
    drawMissionTracker(cm==='cockpit'?176:20,14,ms,s,cm==='cockpit');drawHeadingTape(w,s.headingDeg,wpB,ms);
    drawWaypointGuidance(w,h,s,ms,cam);if(s.status==='flying')drawPitchLadder(w,h,s,cm==='cockpit');
    const tH=MN(226,h*.35),tY=MX(122,h*.27);
    drawVerticalTape(22,tY,82,tH,s.airspeedKts,20,'IAS KTS','SPEED',true,s.stalling?RD:CY,`AOA ${s.aoaDeg.toFixed(1)}°`);
    drawVerticalTape(w-104,tY,82,tH,s.altitudeFt,100,'ALT FT','ALTITUDE',false,s.aglM<30&&!s.onGround?AM:CY,`VS ${s.vsiMps>=0?'+':''}${s.vsiMps.toFixed(1)}m/s`);
    if(cm!=='cockpit'){radar.drawRadar(c,20,h-190,172,s,ms,wind,dt);drawSystemsPanel(w-286,h-196,266,176,s,ms);}
    else{drawSystemsPanel(w-274,16,256,174,s,ms);radar.drawRadar(c,20,16,150,s,ms,wind,dt);}
    const al=s.stalling?['STALL — LOWER NOSE / ADD THROTTLE','danger']:s.overspeed?['OVERSPEED — REDUCE THROTTLE','danger']:s.lowFuel&&s.status==='flying'?[`LOW FUEL (${R(s.fuelPct)}%)`,'warn']:bT>0?[bTxt,bTn]:null;
    if(al){const bw=MN(380,w-40);bx((w-bw)*.5,102,bw,28,6,TONES[al[1]]||BG,'rgba(255,255,255,.75)',1.2);tx(al[0],w*.5,116,12,'#fff','center');}
    if(rT>0&&rTxt&&!s.incidentReport){const rw=MN(620,w-490);if(rw>220){const rx=(w-rw)*.5,ry=h-54;bx(rx,ry,rw,34,8,'rgba(8,18,26,.88)','rgba(56,242,212,.58)',1.4);tx('VHF',rx+12,ry+17,11,CY);tx(rTxt.slice(0,FL((rw-56)/7)),rx+44,ry+17,11.5,'#edf7fb','left',0);}}
    if(s.incidentReport)drawIncidentReportCard(w,h,s,ms);
  }
  return {renderHud,showBanner:(t,tn='info',d=2.8)=>{bTxt=t;bTn=tn;bT=d;},showRadioMessage:(t,d=5.2)=>{rTxt=t;rT=d;}};
}
