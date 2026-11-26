// Dynamic sky dome, 4 weather atmosphere presets with storm lightning, and multi-wave Gerstner ocean shader.
import * as T from 'three';
import { OCEAN_RADIUS, WORLD_SIZE } from './config.js';
import { sampleTerrainHeight } from './terrain-height.js';

const C = (h) => ({ value: new T.Color(h) }), V = (x, y, z) => ({ value: new T.Vector3(x, y, z) });

export function buildShorelineDepthTexture() {
  const n = 384, d = new Uint8Array(n * n * 4), h = WORLD_SIZE * 0.5;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const e = Math.max(0, Math.min(255, Math.round(((sampleTerrainHeight(-h + (i / (n - 1)) * WORLD_SIZE, -h + (j / (n - 1)) * WORLD_SIZE) + 20) / 40) * 255))), k = (j * n + i) * 4;
    d[k] = d[k + 1] = d[k + 2] = e; d[k + 3] = 255;
  }
  const t = new T.DataTexture(d, n, n, T.RGBAFormat);
  t.minFilter = t.magFilter = T.LinearFilter; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.needsUpdate = true; return t;
}

export function createSkyDome() {
  const m = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { uTime: { value: 0 }, topColor: C('#144780'), midColor: C('#5a98c8'), horizonColor: C('#f7c17e'), sunDir: { value: new T.Vector3(0.55, 0.34, -0.76).normalize() }, sunColor: C('#fff2c4'), cirrusOpacity: { value: 0.34 }, uLightning: { value: 0 } },
    vertexShader: `varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uTime,cirrusOpacity,uLightning;uniform vec3 topColor,midColor,horizonColor,sunDir,sunColor;varying vec3 vD;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=vn(p)*a;p=p*2.15+vec2(13.2,-7.4);a*=.5;}return s;}
void main(){vec3 d=normalize(vD);float y=clamp(d.y,0.,1.);vec3 c=mix(mix(horizonColor,midColor,smoothstep(0.,.24,y)),topColor,smoothstep(.22,.78,y));if(y>.03)c=mix(c,mix(horizonColor,vec3(1.),.68),smoothstep(.46,.78,fb(d.xz/(y+.26)*2.4+vec2(uTime*.012,-uTime*.008)))*cirrusOpacity*smoothstep(.03,.2,y));float s=max(dot(d,normalize(sunDir)),0.);c+=sunColor*(pow(s,22.)*.32+pow(s,260.)*1.35);gl_FragColor=vec4(mix(c,vec3(.92,.96,1.),uLightning*.55),1.);}`,
  });
  return { mesh: new T.Mesh(new T.SphereGeometry(16500, 36, 24), m), material: m };
}

export function createOceanMesh(depthTex) {
  const m = new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSunDir: { value: new T.Vector3(0.55, 0.34, -0.76).normalize() },
      uDeepColor: C('#073250'), uMidColor: C('#0f5b78'), uShallowColor: C('#1ea0a8'), uSkyColor: C('#7db4d8'), uFogColor: C('#e9c494'),
      uTerrainMap: { value: depthTex }, uWorldSize: { value: WORLD_SIZE }, uPlanePos: V(0, 100, 0), uPlaneFwd: V(0, 0, -1), uPlaneRight: V(1, 0, 0), uPlaneActive: { value: 1 },
    },
    vertexShader: `uniform float uTime;varying vec3 vW;varying float vH;void main(){vec4 w=modelMatrix*vec4(position,1.);float h=sin(w.x*.017+w.z*.011+uTime*1.35)*.62+sin(-w.x*.024+w.z*.019+uTime*1.05)*.42+cos(w.x*.041+w.z*.033-uTime*1.85)*.24+sin(w.z*.068-w.x*.022+uTime*2.2)*.14;w.y+=h;vH=h;vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float uTime,uWorldSize,uPlaneActive;uniform vec3 uSunDir,uDeepColor,uMidColor,uShallowColor,uSkyColor,uFogColor,uPlanePos,uPlaneFwd,uPlaneRight;uniform sampler2D uTerrainMap;varying vec3 vW;varying float vH;
float wn(vec2 p){return sin(p.x*.08+uTime*1.6)*cos(p.y*.09-uTime*1.3)*.5+sin(p.x*.16-p.y*.14+uTime*2.3)*.3+cos(p.x*.29+p.y*.25-uTime*2.9)*.2;}
float ac(vec2 l,vec2 f,vec2 r,float b){float a=dot(l,f),c=dot(l,r);return 1.-smoothstep(-b*.35,b,min(max(abs(c)-1.35,abs(a-.5)-6.6),min(max(abs(c)-8.5,abs(a-.6)-1.45),max(abs(c)-3.3,abs(a+6.9)-.85))));}
void main(){vec3 vd=normalize(cameraPosition-vW);vec2 p=vW.xz,o=vec2(4.2,-3.1);float e=.65,hC=wn(p)+wn(p*2.1+o)*.45,hX=wn(p+vec2(e,0))+wn((p+vec2(e,0))*2.1+o)*.45,hZ=wn(p+vec2(0,e))+wn((p+vec2(0,e))*2.1+o)*.45;vec3 n=normalize(vec3((hC-hX)*.24+cos(p.x*.017+p.y*.011+uTime*1.35)*.09,1.,(hC-hZ)*.24+sin(-p.x*.024+p.y*.019+uTime*1.05)*.08));vec2 uv=p/uWorldSize+.5;float ib=step(.005,uv.x)*step(uv.x,.995)*step(.005,uv.y)*step(uv.y,.995),dp=max(0.,-mix(-20.,texture2D(uTerrainMap,clamp(uv,0.,1.)).r*40.-20.,ib)),sh=(1.-smoothstep(0.,10.5,dp))*ib,fr=pow(1.-max(dot(vd,n),0.),3.4);vec3 bs=mix(mix(uDeepColor,uMidColor,clamp(vH*.35+.45+fr*.4,0.,1.)),uShallowColor,sh*.82);float fm=clamp(smoothstep(.45,.92,sin(dp*3.6-uTime*3.1+hC*2.4))*(1.-smoothstep(.3,4.2,dp))*ib*.78+(1.-smoothstep(0.,1.25,dp))*ib*.92+smoothstep(.86,1.38,vH+hC*.55)*(1.-sh*.5)*.42,0.,1.);vec3 hv=normalize(uSunDir+vd),c=mix(mix(bs,uSkyColor,fr*.42)+vec3(1.,.91,.7)*(pow(max(dot(n,hv),0.),160.)*1.85+pow(max(dot(n,hv),0.),24.)*.24),vec3(.95,.98,1.),fm*.85);if(uPlaneActive>.5&&uPlanePos.y>-.5&&uPlanePos.y<220.){vec2 fz=normalize(uPlaneFwd.xz+vec2(1e-4,0)),rz=normalize(uPlaneRight.xz+vec2(0,1e-4)),ww=vec2(hC-hX,hC-hZ)*(6.5+max(0.,uPlanePos.y)*.08),sp=uPlanePos.xz-uSunDir.xz*(max(0.,uPlanePos.y)/max(.32,uSunDir.y));float rb=.62+.38*sin(p.x*.35+uTime*3.8+hC*5.)*cos(p.y*.31-uTime*3.2),py=max(0.,uPlanePos.y);c*=1.-ac(p-sp+ww*.75,fz,rz,1.45+py*.095)*(1.-smoothstep(8.,185.,uPlanePos.y))*.54*(.82+.18*rb);c=mix(c,mix(uDeepColor*.65,vec3(.75,.84,.88),.18),ac(p-uPlanePos.xz+ww*1.9,fz,rz,2.2+py*.075)*(1.-smoothstep(1.5,68.,uPlanePos.y))*rb*.32);if(uPlanePos.y<26.){float du=length(p-uPlanePos.xz+ww*.5);c=mix(c,vec3(.88,.96,1.),smoothstep(.38,.92,sin(du*1.55-uTime*9.2+hC*2.8))*(1.-smoothstep(1.5,26.,uPlanePos.y))*(1.-smoothstep(2.5,25.,du))*.38);}}gl_FragColor=vec4(mix(c,uFogColor,smoothstep(4200.,15500.,length(cameraPosition-vW))),1.);}`,
  });
  return { mesh: new T.Mesh(new T.PlaneGeometry(OCEAN_RADIUS * 2, OCEAN_RADIUS * 2, 160, 160).rotateX(-Math.PI / 2), m), material: m };
}

const PRESETS = {
  storm: ['#182433', '#374b5d', '#6d8394', '#c4d8e8', 0.62, '#071d2c', '#123648', '#1d5666', '#586e80', '#6f8496', 0.00042, '#cde0ee', 1.5, 0.88, '#8291a0'],
  rain: ['#284057', '#547188', '#96aebf', '#dce8f2', 0.55, '#0a2a3f', '#184c63', '#257585', '#7a94a8', '#92aab9', 0.00032, '#ddebf5', 1.85, 0.94, '#b4c2ce'],
  dusk: ['#19315c', '#747ea8', '#f69c68', '#ffd49e', 0.42, '#0b2c46', '#164b68', '#227684', '#c48f88', '#e5a37a', 0.00022, '#ffbe82', 2.35, 0.92, '#ffdcc4'],
  golden: ['#144780', '#5a98c8', '#f7c17e', '#fff2c4', 0.34, '#073250', '#0f5b78', '#1ea0a8', '#7db4d8', '#e8c494', 0.00018, '#ffe3b5', 2.55, 0.98, '#fff7ed'],
};

export function applyWeatherAtmosphere(p, { scene, sky, ocean, sunLight, hemiLight, cloudSpriteMats }) {
  const [tp, md, hr, sn, cr, dp, om, sh, os, fg, fd, lt, si, hm, cl] = PRESETS[p] ?? PRESETS.golden;
  const su = sky.material.uniforms, ou = ocean.material.uniforms;
  su.topColor.value.set(tp); su.midColor.value.set(md); su.horizonColor.value.set(hr); su.sunColor.value.set(sn); su.cirrusOpacity.value = cr;
  ou.uDeepColor.value.set(dp); ou.uMidColor.value.set(om); ou.uShallowColor.value.set(sh); ou.uSkyColor.value.set(os); ou.uFogColor.value.set(fg);
  scene.fog = new T.FogExp2(fg, fd); sunLight.color.set(lt); sunLight.intensity = si; hemiLight.intensity = hm;
  for (const m of cloudSpriteMats) m.color.set(cl);
  return si;
}
