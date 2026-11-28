// Pre-baked 9.2 km topographic TAWS elevation map and heading-up circular avionics radar renderer.
import { RUNWAYS, WORLD_SIZE } from './config.js';
import { sampleTerrainHeight as sH } from './terrain-world.js';
const {max:MX,min:MN,abs:A,round:R,cos:C,sin:S,PI}=Math,P2=PI*2,clp=(v,lo,hi)=>MX(lo,MN(hi,v));
function bakeRadarTerrainCanvas(){
  const n=280,hf=WORLD_SIZE*.5,st=WORLD_SIZE/n,cv=Object.assign(document.createElement('canvas'),{width:n,height:n}),rx=cv.getContext('2d'),im=rx.createImageData(n,n),d=im.data;
  for(let py=0;py<n;py++)for(let px=0;px<n;px++){
    const wx=-hf+(px+.5)*st,wz=-hf+(py+.5)*st,h=sH(wx,wz),i=(py*n+px)*4;let r=6,g=24,b=36;
    if(h<-5.5){const k=A(h%6)<.7?5:0;r=6+k;g=24+k;b=38+k;}
    else if(h<.15){const t=clp((h+5.5)/5.65,0,1);r=R(8+t*14);g=R(42+t*50);b=R(62+t*44);}
    else{
      const sh=(1+clp(((h-sH(wx+24,wz))+(h-sH(wx,wz+24)))*.024,-.28,.28))*(h>10&&A((h%38)-19)>16.4?.82:1);
      if(h<3.5)[r,g,b]=[44,122,98];else if(h<48){const t=(h-3.5)/44.5;[r,g,b]=[24+t*34,86+t*24,58-t*14];}else if(h<135){const t=(h-48)/87;[r,g,b]=[62+t*78,110-t*12,44-t*10];}else{const t=MN(1,(h-135)/170);[r,g,b]=[148+t*68,94-t*28,38+t*12];}
      r=clp(R(r*sh),0,255);g=clp(R(g*sh),0,255);b=clp(R(b*sh),0,255);
    }
    d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;
  }
  rx.putImageData(im,0,0);return {canvas:cv,span:WORLD_SIZE,half:hf};
}
export function createTopographicRadar(){
  const tr=bakeRadarTerrainCanvas();let sw=0;
  function drawRadar(x,rx,ry,sz,s,ms,wind,dt){
    sw=(sw+MX(.016,dt)*1.65)%P2;const cx=rx+sz*.5,cy=ry+sz*.5,rd=sz*.485,pm=rd/2050,hR=(s.headingDeg*PI)/180;
    const cr=(a,b,r,f,st,l=1.5)=>{x.beginPath();x.arc(a,b,r,0,P2);if(f){x.fillStyle=f;x.fill();}if(st){x.strokeStyle=st;x.lineWidth=l;x.stroke();}},ln=(a,b,c,d,st,l=1)=>{x.strokeStyle=st;x.lineWidth=l;x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();},tx=(t,a,b,sz2,f,al='center',bs='middle')=>{x.font=`bold ${sz2}px monospace`;x.fillStyle=f;x.textAlign=al;x.textBaseline=bs;x.fillText(t,a,b);};
    x.fillStyle='rgba(7,15,22,.9)';x.beginPath();x.roundRect(rx,ry,sz,sz,12);x.fill();x.strokeStyle='rgba(72,224,210,.5)';x.lineWidth=1.6;x.stroke();
    x.save();x.beginPath();x.arc(cx,cy,rd-3,0,P2);x.clip();x.save();x.translate(cx,cy);x.rotate(-hR);
    x.fillStyle='#061824';x.fillRect(-rd,-rd,rd*2,rd*2);x.drawImage(tr.canvas,(-tr.half-s.position.x)*pm,(-tr.half-s.position.z)*pm,tr.span*pm,tr.span*pm);
    x.fillStyle='rgba(4,22,28,.24)';x.fillRect(-rd,-rd,rd*2,rd*2);
    const loc=(a,b)=>[(a-s.position.x)*pm,(b-s.position.z)*pm],pts=(ms.mission.rings||[]).slice(ms.ringsCleared).map((r)=>loc(r.x,r.z));
    if(ms.mission.dropZone&&!ms.dropCompleted)pts.push(loc(ms.mission.dropZone.x,ms.mission.dropZone.z));
    const rwT=RUNWAYS.find((r)=>r.id===ms.mission.targetRunwayId);if(rwT)pts.push(loc(rwT.x,rwT.z));
    if(pts.length){x.strokeStyle='rgba(232,121,249,.75)';x.lineWidth=1.6;x.setLineDash([4,3]);x.beginPath();x.moveTo(0,0);pts.forEach(([a,b])=>x.lineTo(a,b));x.stroke();x.setLineDash([]);pts.forEach(([a,b],i)=>cr(a,b,i?2.3:3.5,i?'rgba(232,121,249,.85)':'#ffaa2b'));}
    for(const r of RUNWAYS){const [ax,ay]=loc(r.x,r.z),t=r.id===ms.mission.targetRunwayId,l=MX(12,r.length*pm);x.save();x.translate(ax,ay);x.rotate((r.headingDeg*PI)/180);x.fillStyle=t?'#38f2d4':'#e2e8f0';x.fillRect(-2.4,-l*.5,4.8,l);x.fillStyle='#0a141c';x.fillRect(-.6,-l*.42,1.2,l*.84);x.restore();x.save();x.translate(ax+6,ay-5);x.rotate(hR);tx(r.id.replace('RWY',''),0,0,8.5,t?'#38f2d4':'#cbd5e1','left');x.restore();}
    if(ms.waypoint){const [wx,wy]=loc(ms.waypoint.x,ms.waypoint.z);cr(wx,wy,6.2,null,'#ffbe4f',1.8);}
    x.restore();x.save();x.translate(cx,cy);x.rotate(sw);
    for(let i=0;i<10;i++){x.fillStyle=`rgba(56,242,180,${(1-i/10)*.14})`;x.beginPath();x.moveTo(0,0);x.arc(0,0,rd-3,-((i+1)/10)*.72,-(i/10)*.72);x.fill();}
    ln(0,0,rd-3,0,'rgba(110,255,200,.58)',1.2);x.restore();
    [.5,.96].forEach((f)=>cr(cx,cy,rd*f,null,'rgba(92,232,205,.24)',.9));ln(cx-rd,cy,cx+rd,cy,'rgba(92,232,205,.24)',.9);ln(cx,cy-rd,cx,cy+rd,'rgba(92,232,205,.24)',.9);tx('1KM',cx,cy-rd*.5+8,8,'rgba(155,235,220,.72)');
    for(let d=0;d<360;d+=30){const a=((d-s.headingDeg-90)*PI)/180,rI=d%90?rd-6:rd-9;ln(cx+C(a)*rI,cy+S(a)*rI,cx+C(a)*(rd-3),cy+S(a)*(rd-3),d?'rgba(145,220,212,.45)':'#ffbe4f',d%90?1:1.5);}
    [[0,'N','#ffbe4f'],[90,'E','#9ad8d0'],[180,'S','#9ad8d0'],[270,'W','#9ad8d0']].forEach(([d,l,c])=>{const a=((d-s.headingDeg-90)*PI)/180;tx(l,cx+C(a)*(rd-14),cy+S(a)*(rd-14),9.5,c);});
    x.save();x.translate(cx,cy);x.fillStyle='#fff';x.strokeStyle='#061824';x.lineWidth=1.2;x.beginPath();
    [[0,-8],[1.8,-2],[8.5,.5],[8.5,2.5],[1.8,1.5],[1.4,5.8],[4.2,7.2],[4.2,8.5],[0,7.4],[-4.2,8.5],[-4.2,7.2],[-1.4,5.8],[-1.8,1.5],[-8.5,2.5],[-8.5,.5],[-1.8,-2]].forEach(([a,b],i)=>(i?x.lineTo(a,b):x.moveTo(a,b)));
    x.closePath();x.fill();x.stroke();x.restore();x.restore();
    cr(cx,cy,rd-3,null,'rgba(72,224,210,.6)',1.4);x.fillStyle='#ffbe4f';x.beginPath();x.moveTo(cx,ry+3);x.lineTo(cx-4,ry+9);x.lineTo(cx+4,ry+9);x.fill();
    tx('TAWS',rx+7,ry+6,8.5,'#9ec7d2','left','top');tx(ms.mission.windDesc,rx+sz-7,ry+sz-5,8.5,'#ffbe4f','right','bottom');
    if(wind&&wind.length()>.3){x.save();x.translate(rx+16,ry+sz-15);x.rotate(Math.atan2(wind.x,-wind.z)-hR-PI*.5);x.strokeStyle='#38f2d4';x.lineWidth=1.5;x.beginPath();x.moveTo(-6,0);x.lineTo(6,0);x.lineTo(2.5,-3);x.moveTo(6,0);x.lineTo(2.5,3);x.stroke();x.restore();}
  }
  return {drawRadar};
}
