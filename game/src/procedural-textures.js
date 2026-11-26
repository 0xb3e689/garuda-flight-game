// Offline procedural canvas textures for fuselage rivets, wings, terrain albedo/normals, clouds, foliage, cockpit metal, sprites, and runways.
import * as T from 'three';

const {PI,sin:S,cos:C,floor:F,round:R,hypot:H}=Math,P2=PI*2;
const rng=(s)=>()=>(((s=(s*1664525+1013904223)>>>0))/4294967296);
const fGr=(x,g,st,a,b,w,h)=>{st.forEach(([t,c])=>g.addColorStop(t,c));x.fillStyle=g;x.fillRect(a,b,w,h);};
const fR=(x,c,a,b,w,h)=>{x.fillStyle=c;x.fillRect(a,b,w,h);};
const dot=(x,a,b,r,f)=>{x.fillStyle=f;x.beginPath();x.arc(a,b,r,0,P2);x.fill();};
const ln=(x,a,b,c,d)=>{x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();};

function makeTex(w, h, draw, {srgb=true,rep=null,an=0} = {}) {
  const cv=Object.assign(document.createElement('canvas'),{width:w,height:h});draw(cv.getContext('2d'),w,h);
  const t=new T.CanvasTexture(cv);if(srgb)t.colorSpace=T.SRGBColorSpace;
  if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;if(rep!==true)t.repeat.set(rep[0],rep[1]);}
  if(an)t.anisotropy=an;return t;
}

export function createAircraftSkinTexture() {
  return makeTex(1024,512,(x)=>{
    const r=rng(4041);fGr(x,x.createLinearGradient(0,0,0,512),[[0,'#f7f2e6'],[.54,'#ebe3d2'],[.56,'#d9cfc0'],[1,'#0e3c4f']],0,0,1024,512);
    for(let i=0;i<16;i++)fR(x,i%2?'rgba(15,30,40,.035)':'rgba(255,255,255,.035)',i*64,0,64,512);
    [['#12495e',316,196],['#e55320',272,34],['#f5ab29',250,16],['#1b5f78',306,12]].forEach(([c,y,h])=>fR(x,c,0,y,1024,h));
    x.strokeStyle='rgba(28,38,46,.28)';x.lineWidth=2;
    for(let px=64;px<1024;px+=64){ln(x,px,0,px,512);x.fillStyle='rgba(30,42,52,.36)';for(let y=18;y<500;y+=22){x.fillRect(px-6,y,2,2);x.fillRect(px+4,y,2,2);}}
    [118,248,320,420].forEach((y)=>ln(x,0,y,1024,y));
    for(let i=0;i<120;i++)fR(x,`rgba(24,30,36,${.02+r()*.04})`,r()*1024,240+r()*160,24+r()*60,2+r()*4);
    x.fillStyle='#143344';x.font='bold 48px monospace';x.textAlign='center';x.fillText('GARUDA  PK-GRD',530,212);
  },{an:8});
}

export function createWingTexture() {
  return makeTex(512,512,(x)=>{
    [['#eee7d8',0,0,512,512],['#20272e',0,0,512,54],['#38434e',0,52,512,6],['#e55320',0,58,72,454],['#e55320',440,58,72,454],['#f5ab29',72,58,22,454],['#f5ab29',418,58,22,454]].forEach((a)=>fR(x,...a));
    x.strokeStyle='rgba(30,42,52,.25)';x.lineWidth=2;
    for(let px=32;px<512;px+=48)ln(x,px,58,px,512);
    [170,320,430].forEach((y)=>ln(x,0,y,512,y));
    x.fillStyle='#15384a';x.font='bold 42px monospace';x.textAlign='center';x.fillText('PK-GRD',256,250);
    x.strokeStyle=x.fillStyle='#c0392b';x.lineWidth=3;x.strokeRect(160,340,192,52);x.font='bold 18px monospace';x.fillText('NO STEP',256,372);
  },{an:8});
}

export function createTerrainDetailTexture() {
  return makeTex(1024,1024,(x)=>{
    const r=rng(90210);fR(x,'#dad9d3',0,0,1024,1024);
    for(let i=0;i<14000;i++){const v=r();dot(x,r()*1024,r()*1024,1.2+r()*11,v>.62?'rgba(255,253,242,.11)':v>.25?'rgba(28,42,30,.11)':'rgba(72,58,44,.09)');}
    x.lineWidth=2.2;
    for(let y=0;y<1024;y+=16){x.strokeStyle=y%32?'rgba(255,250,236,.08)':'rgba(32,38,34,.12)';x.beginPath();x.moveTo(0,y);for(let px=0;px<=1024;px+=48)x.lineTo(px,y+S(px*.025+y*.06)*7+C(px*.07-y*.03)*3);x.stroke();}
  },{rep:[42,42],an:8});
}

export function createTerrainNormalMap() {
  return makeTex(512,512,(x,sz)=>{
    const r=rng(51517),gd=Float32Array.from({length:4096},()=>r());
    const sm=(u,v,fq)=>{
      const a=((u*fq)%64+64)%64,b=((v*fq)%64+64)%64,ix=F(a),iy=F(b),fx=a-ix,fy=b-iy,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),i1=(ix+1)&63,j1=(iy+1)&63;
      const p0=gd[iy*64+ix],p1=gd[iy*64+i1],p2=gd[j1*64+ix],p3=gd[j1*64+i1];return p0+(p1-p0)*ux+(p2-p0)*uy+(p0-p1-p2+p3)*ux*uy;
    };
    const hm=new Float32Array(sz*sz);
    for(let y=0;y<sz;y++)for(let px=0;px<sz;px++){const u=px/sz,v=y/sz;hm[y*sz+px]=sm(u,v,8)*.5+sm(u,v,16)*.28+sm(u,v,32)*.14+sm(u,v,64)*.08+S(v*PI*16+sm(u,v,8)*4)*.09;}
    const im=x.createImageData(sz,sz);
    for(let y=0;y<sz;y++)for(let px=0;px<sz;px++){
      const dx=(hm[y*sz+((px+1)%sz)]-hm[y*sz+((px-1+sz)%sz)])*5.5,dy=(hm[((y+1)%sz)*sz+px]-hm[((y-1+sz)%sz)*sz+px])*5.5,l=H(dx,dy,1),i=(y*sz+px)*4;
      im.data[i]=R(((-dx/l)*.5+.5)*255);im.data[i+1]=R(((-dy/l)*.5+.5)*255);im.data[i+2]=R(((1/l)*.5+.5)*255);im.data[i+3]=255;
    }
    x.putImageData(im,0,0);
  },{srgb:false,rep:[42,42],an:8});
}

export function createCloudPuffTexture() {
  return makeTex(256,256,(x)=>{
    const r=rng(88123),lb=[[128,134,86,'#9cb0c4',.42],[92,146,62,'#9aaec2',.38],[164,146,64,'#9aaec2',.38],[128,114,78,'#fff7ec',.68],[84,124,58,'#fff3e2',.62],[172,124,58,'#fff3e2',.62],[114,92,54,'#fff',.72],[148,96,48,'#fffcf5',.68]];
    for(let i=0;i<12;i++){const ly=82+r()*76;lb.push([68+r()*120,ly,26+r()*34,ly<124?'#fff':'#cfdbe6',.28+r()*.22]);}
    for(const [cx,cy,rd,hx,a] of lb){const g=x.createRadialGradient(cx,cy-rd*.15,rd*.08,cx,cy,rd);g.addColorStop(0,hx);g.addColorStop(.58,hx);g.addColorStop(1,'rgba(255,255,255,0)');x.globalAlpha=a;dot(x,cx,cy,rd,g);}
    x.globalAlpha=1;
  });
}

export function createFoliageTexture() {
  return makeTex(256,256,(x)=>{const r=rng(31415);fR(x,'#2d6338',0,0,256,256);for(let i=0;i<650;i++){const v=r();dot(x,r()*256,r()*256,4+r()*13,v>.66?'#4f9148':v>.33?'#2c6536':'#1b4326');}},{rep:true});
}

export function createCockpitMetalTexture() {
  return makeTex(512,512,(x)=>{
    const r=rng(7721);fGr(x,x.createLinearGradient(0,0,512,512),[[0,'#2a343f'],[.5,'#1d252d'],[1,'#26303b']],0,0,512,512);
    for(let i=0;i<6000;i++)fR(x,r()>.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.12)',r()*512,r()*512,2,2);
    x.strokeStyle='rgba(145,175,195,.22)';x.lineWidth=2;x.strokeRect(10,10,492,492);
    for(let i=28;i<500;i+=44){dot(x,i,20,2.8,'rgba(180,205,220,.35)');dot(x,i,492,2.8,'rgba(180,205,220,.35)');}
  },{rep:true});
}

export function createSoftParticleTexture(k = 'smoke') {
  return makeTex(128,128,(x)=>{
    if(k==='glow')fGr(x,x.createRadialGradient(64,64,2,64,64,62),[[0,'rgba(255,255,255,1)'],[.28,'rgba(255,245,215,.72)'],[.65,'rgba(255,200,120,.22)'],[1,'rgba(255,180,90,0)']],0,0,128,128);
    else if(k==='prop'){
      fGr(x,x.createRadialGradient(64,64,8,64,64,62),[[0,'rgba(30,36,44,.45)'],[.45,'rgba(215,228,236,.28)'],[.84,'rgba(248,184,48,.48)'],[.95,'rgba(248,184,48,.65)'],[1,'rgba(248,184,48,0)']],0,0,128,128);
      x.save();x.translate(64,64);x.fillStyle='rgba(20,26,34,.28)';for(let i=0;i<3;i++){x.rotate(P2/3);x.beginPath();x.moveTo(0,0);x.arc(0,0,60,-.18,.18);x.fill();}x.restore();
    }else for(const [bx,by,br,a] of [[64,64,48,.72],[48,56,34,.45],[80,58,32,.45],[62,78,36,.42]]){const g=x.createRadialGradient(bx,by,3,bx,by,br);g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(.55,`rgba(245,248,252,${a*.48})`);g.addColorStop(1,'rgba(245,248,252,0)');dot(x,bx,by,br,g);}
  });
}

export function createHighResRunwayTexture(cA, cB) {
  return makeTex(512,2048,(x)=>{
    const r=rng(cA.charCodeAt(0)*97+cB.charCodeAt(0));fR(x,'#282e35',0,0,512,2048);
    for(let i=0;i<2400;i++){const a=.03+r()*.06;fR(x,r()>.5?`rgba(255,255,255,${a})`:`rgba(0,0,0,${a*1.8})`,r()*512,r()*2048,2+r()*8,8+r()*28);}
    [210,1460].forEach((y0)=>fGr(x,x.createLinearGradient(0,y0,0,y0+380),[[0,'rgba(10,12,15,0)'],[.45,'rgba(10,12,15,.58)'],[1,'rgba(10,12,15,0)']],108,y0,296,380));
    x.fillStyle='#eef2f6';x.fillRect(20,28,12,1992);x.fillRect(480,28,12,1992);
    for(let y=290;y<1760;y+=108)x.fillRect(249,y,14,56);
    for(let i=0;i<8;i++){x.fillRect(52+i*54,42,30,118);x.fillRect(52+i*54,1888,30,118);}
    [[104,345],[360,345],[104,1577],[360,1577]].forEach(([a,b])=>x.fillRect(a,b,48,126));
    x.fillStyle='#f4f7fa';x.font='bold 104px monospace';x.textAlign='center';x.textBaseline='middle';
    x.fillText(cA,256,1785);x.save();x.translate(256,260);x.rotate(PI);x.fillText(cB,0,0);x.restore();
  },{an:8});
}
