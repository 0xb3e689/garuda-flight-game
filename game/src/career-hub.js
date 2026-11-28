// MSFS-style Career Hub: illustrated Certification Paths (Training + Exam), Specializations, Missions, Free Flight & Winged Badges.
const ART={
  ppl:`<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e5799"/><stop offset=".6" stop-color="#e89d5b"/><stop offset="1" stop-color="#113c54"/></linearGradient><rect width="240" height="92" fill="url(#g)"/><circle cx="192" cy="34" r="14" fill="#fff2c2" opacity=".85"/><path d="M0 68 Q60 44 120 62 T240 60 L240 92 L0 92Z" fill="#1b4d3e"/><path d="M98 92 L116 62 L124 62 L142 92Z" fill="#2a3441"/><path d="M119 66 L121 66 L122 88 L118 88Z" fill="#f8fafc" opacity=".8"/><path d="M56 34 L88 30 L96 22 L100 30 L122 33 L98 37 L90 42 L85 36Z" fill="#f8fafc"/>`,
  mer:`<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#153866"/><stop offset=".65" stop-color="#d98752"/><stop offset="1" stop-color="#221e28"/></linearGradient><rect width="240" height="92" fill="url(#g)"/><path d="M0 92 L48 36 L88 64 L140 24 L196 58 L240 42 L240 92Z" fill="#2b2d38"/><path d="M126 26 L140 24 L154 38 L142 36Z" fill="#ff7b3b" opacity=".75"/><path d="M64 38 L112 38 M88 26 L88 46" stroke="#e2e8f0" stroke-width="3.2" stroke-linecap="round"/><circle cx="76" cy="38" r="5" fill="none" stroke="#38bdf8" stroke-width="2"/><circle cx="100" cy="38" r="5" fill="none" stroke="#38bdf8" stroke-width="2"/>`,
  ir:`<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f294a"/><stop offset=".5" stop-color="#2b6cb0"/><stop offset=".5" stop-color="#5c4028"/><stop offset="1" stop-color="#1f1a14"/></linearGradient><rect width="240" height="92" fill="url(#g)"/><line x1="0" y1="46" x2="240" y2="46" stroke="#fff" stroke-width="1.5"/><path d="M60 92 L105 46 M180 92 L135 46 M120 92 L120 46" stroke="#4ade80" stroke-opacity=".35"/><path d="M92 46 L112 46 L116 52 M148 46 L128 46 L124 52" fill="none" stroke="#f5b942" stroke-width="3"/><polygon points="120,70 126,76 120,82 114,76" fill="#e879f9"/><polygon points="204,40 210,46 204,52 198,46" fill="#e879f9"/>`,
  jet:`<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1d3a"/><stop offset=".55" stop-color="#3a4c7a"/><stop offset="1" stop-color="#f28c4b"/></linearGradient><rect width="240" height="92" fill="url(#g)"/><path d="M0 78 Q45 58 95 72 T190 66 T240 76 L240 92 L0 92Z" fill="#fff" opacity=".18"/><path d="M36 72 L156 32" stroke="#f5b942" stroke-width="2.5" stroke-dasharray="6 4" opacity=".8"/><path d="M136 38 L178 24 L170 36 L192 40 L166 44 L152 54 L150 42Z" fill="#f8fafc"/>`,
  atpl:`<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset=".65" stop-color="#28384d"/><stop offset="1" stop-color="#0c2638"/></linearGradient><rect width="240" height="92" fill="url(#g)"/><path d="M156 12 L144 36 L154 36 L142 62" fill="none" stroke="#fde047" stroke-width="2.6"/><path d="M0 72 Q60 64 120 72 T240 70 L240 92 L0 92Z" fill="#0b2f45"/><rect x="174" y="54" width="28" height="12" rx="2" fill="#dc2626"/><rect x="182" y="45" width="12" height="9" fill="#f8fafc"/><path d="M52 38 L92 34 L104 28 L102 36 L122 39 L96 42 L84 47Z" fill="#e2e8f0"/>`,
};
const artSvg=(id)=>`<svg class="card-art" viewBox="0 0 240 92" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${(ART[id]||ART.ppl).replaceAll('id="g"',`id="g-${id}"`).replaceAll('url(#g)',`url(#g-${id})`)}</svg>`;
const wingSvg=(code,col,on)=>`<svg class="wing-emblem${on?' on':''}" viewBox="0 0 120 52" style="--bc:${col}" aria-hidden="true"><path d="M8 22 L42 22 L38 28 L16 28Z M14 30 L42 30 L39 35 L24 35Z M112 22 L78 22 L82 28 L104 28Z M106 30 L78 30 L81 35 L96 35Z" fill="${on?col:'#64748b'}" opacity="${on?.92:.45}"/><path d="M60 6 L78 14 L75 34 L60 46 L45 34 L42 14Z" fill="${on?'#0e1b2a':'#141e2b'}" stroke="${on?col:'#64748b'}" stroke-width="2.4"/><text x="60" y="29" text-anchor="middle" fill="${on?'#fff':'#94a3b8'}" font-size="12" font-weight="800" font-family="system-ui,sans-serif">${code}</text></svg>`;

export const CERTS=[
  {id:'ppl',code:'PPL',name:'Private Pilot',sub:'C-172 · High-Wing VFR',col:'#22c55e',pre:null,mIdx:0,
    cfg:{name:'Private Pilot Checkride',shortTag:'PPL · C-172',goal:'VFR Takeoff & Harbor Circuit · Land RWY 36',shortGoal:'VFR Circuit · RWY 36',atmosphere:'golden',wind:[2.2,0,1],windDesc:'05 kt WSW',dropZone:null,targetRunwayId:'RWY36',
      spawn:{x:0,y:16.45,z:245,headingDeg:0,pitchDeg:0,rollDeg:0,speedKts:0,throttle:.12,flapStage:1,gearDown:true,fuelPct:90,onGround:true,aircraftType:'prop1'},
      rings:[[0,90,-520,0,75,'NORTH DEP'],[320,180,-120,165,85,'CBD SKYLINE'],[-240,125,920,210,85,'PANAMAX PORT'],[0,65,680,0,70,'FINAL RWY 36']]},
    exam:'Takeoff C-172 from RWY 36, fly harbor circuit, stop on RWY 36 (< 4.6 m/s).',
    steps:[['Takeoff RWY 36','Shift + S',(s)=>!s.onGround&&s.aglM>12],['Climb 300 ft','W / S',(s)=>s.altitudeFt>300],['Bank over Harbor','A / D',(s)=>Math.abs(s.rollDeg)>12],['Flaps & Gear','F / G',(s)=>s.flapStage>=1&&s.gearDown],['Full Stop RWY 36','B',(s)=>s.status==='landed']]},
  {id:'mer',code:'MER',name:'Multi-Engine',sub:'G-4 Twin · Engine-Out',col:'#38bdf8',pre:'ppl',mIdx:1,failAt:5,
    cfg:{name:'Multi-Engine Checkride',shortTag:'MER · G-4',goal:'Recover Port Engine Failure · Land RWY 36',shortGoal:'Engine-Out · RWY 36',atmosphere:'golden',wind:[3.8,0,-1.5],windDesc:'08 kt WNW',dropZone:null,targetRunwayId:'RWY36',
      spawn:{x:-420,y:250,z:-760,headingDeg:148,pitchDeg:-1,rollDeg:0,speedKts:122,throttle:.74,flapStage:0,gearDown:false,fuelPct:64,aircraftType:'twin'},
      rings:[[-240,200,-240,165,85,'DIVERT ENTRY'],[-80,120,420,180,85,'BASE RWY 36'],[0,65,680,0,75,'FINAL RWY 36']]},
    exam:'Compensate live port engine failure in G-4 Twin and land safely on RWY 36.',
    steps:[['Climb Power > 75%','Shift',(s)=>s.throttle>.75],['Counter Yaw','Q / E',(s)=>s.malfunctions?.leftEngineOut&&Math.abs(s.controlSurface.rudder)>.15],['Pitch Trim','[ / ]',(s)=>Math.abs(s.trimPitch)>.015],['Autopilot Hold','P',(s)=>s.apEngaged],['Single-Engine Stop','B',(s)=>s.status==='landed']]},
  {id:'ir',code:'IR',name:'Instrument',sub:'G-4 G1000 · IMC ILS',col:'#c084fc',pre:'ppl',mIdx:2,autoCockpit:true,
    cfg:{name:'Instrument Checkride',shortTag:'IR · G1000',goal:'Dense IMC Fog ILS Approach · Land RWY 09',shortGoal:'IMC ILS · RWY 09',atmosphere:'imc',wind:[1.5,0,4.5],windDesc:'09 kt IMC',dropZone:null,targetRunwayId:'RWY09',
      spawn:{x:420,y:145,z:-1260,headingDeg:90,pitchDeg:-2,rollDeg:0,speedKts:98,throttle:.52,flapStage:1,gearDown:true,fuelPct:62,aircraftType:'twin'},
      rings:[[740,104,-1250,90,65,'ILS OUTER'],[940,84,-1250,90,60,'ILS MIDDLE']]},
    exam:'Track G1000 Synthetic Vision & ILS glideslope through IMC fog to RWY 09.',
    steps:[['G1000 Cockpit','C',(_,__,cm)=>cm==='cockpit'],['ILS Lock','ILS',(s)=>s.ilsActive],['Autopilot','P',(s)=>s.apEngaged],['Flaps 30° / Brake','F / X',(s)=>s.flapStage===2||s.speedbrake],['Land RWY 09','B',(s)=>s.status==='landed']]},
  {id:'jet',code:'JET',name:'Turbine / Jet',sub:'CJ-4 Jet · Swept Wing',col:'#f5b942',pre:'mer',mIdx:0,
    cfg:{name:'Turbine Jet Checkride',shortTag:'JET · CJ-4',goal:'High-Speed Corridor (>220 kt) · Land RWY 36',shortGoal:'Jet Ops · RWY 36',atmosphere:'dusk',wind:[3.2,0,1.5],windDesc:'07 kt SW',dropZone:null,targetRunwayId:'RWY36',
      spawn:{x:220,y:340,z:1480,headingDeg:354,pitchDeg:-2,rollDeg:0,speedKts:215,throttle:.92,flapStage:0,gearDown:false,fuelPct:88,jetMode:true,aircraftType:'jet'},
      rings:[[340,260,120,358,90,'CBD HIGH-RISE'],[650,210,-340,45,90,'BRIDGE'],[0,95,720,0,75,'FINAL RWY 36']]},
    exam:'Cruise CJ-4 Jet > 220 kt over skyline, decelerate with [X], land RWY 36.',
    steps:[['Exceed 220 kt','Shift',(s)=>s.airspeedKts>=220],['Deploy Speedbrake','X',(s)=>s.speedbrake],['Slow < 130 kt','Ctrl + X',(s)=>s.airspeedKts<130],['Gear & Flaps','G / F',(s)=>s.gearDown&&s.flapStage>=1],['Land RWY 36','B',(s)=>s.status==='landed']]},
  {id:'atpl',code:'ATPL',name:'Airline Transport',sub:'A320 · Wide-Body Storm',col:'#fb923c',pre:'ir',mIdx:3,comfort:true,
    cfg:{name:'Airline Transport Checkride',shortTag:'ATPL · A320',goal:'Commercial Storm Arrival (Pax >= 70%) · RWY 04',shortGoal:'Storm Ops · RWY 04',atmosphere:'storm',wind:[8.5,0,4.8],windDesc:'19 kt STORM',dropZone:null,targetRunwayId:'RWY04',
      spawn:{x:280,y:215,z:-240,headingDeg:222,pitchDeg:-1,rollDeg:0,speedKts:142,throttle:.74,flapStage:0,gearDown:false,fuelPct:58,aircraftType:'airliner'},
      rings:[[-240,155,920,215,85,'PANAMAX PORT'],[-540,115,610,215,85,'SHOAL BASE'],[-760,48,860,35,75,'RWY 04 FINAL']]},
    exam:'Fly A320 storm arrival (Pax Comfort >= 70%) to RWY 04.',
    steps:[['Storm Wipers','C',(_,__,cm)=>cm==='cockpit'],['Autopilot Cruise','P',(s)=>s.apEngaged],['Comfort >= 80%','Smooth',(s)=>s.comfortPct>=80&&s.airspeedKts>90],['Flaps & Gear','F / G',(s)=>s.flapStage>=1&&s.gearDown],['Land RWY 04','B',(s)=>s.status==='landed']]},
];
export const SPECS=[
  {id:'bush',code:'BUSH',art:'ppl',name:'Metro Coastal Mail',req:'ppl',mIdx:0,sub:'C-172 · Harbor & CBD · RWY 36',cfg:{name:'Metro Coastal Mail',shortTag:'BUSH · C-172',dropZone:null,spawn:{x:24,y:118,z:920,headingDeg:358,pitchDeg:-2,rollDeg:0,speedKts:96,throttle:.68,flapStage:1,gearDown:true,fuelPct:84,aircraftType:'prop1'}}},
  {id:'cargo',code:'CARGO',art:'mer',name:'Caldera Aerial Cargo',req:'mer',mIdx:1,sub:'G-4 · Cargo Drop · RWY 36',cfg:{name:'Caldera Aerial Cargo',shortTag:'CARGO · G-4'}},
  {id:'charter',code:'CHARTER',art:'ir',name:'Karang VIP Charter',req:'ir',mIdx:2,sub:'CJ-4 Jet · 18 kt ILS · RWY 09',cfg:{name:'Karang VIP Charter',shortTag:'VIP · CJ-4',dropZone:null,spawn:{x:440,y:135,z:-1260,headingDeg:90,pitchDeg:-2,rollDeg:0,speedKts:138,throttle:.54,flapStage:1,gearDown:true,fuelPct:64,jetMode:true,aircraftType:'jet'}}},
  {id:'sar',code:'SAR',art:'atpl',name:'Maritime Storm SAR',req:'atpl',mIdx:3,sub:'G-4 · Raft Drop · RWY 04',cfg:{name:'Maritime Storm SAR',shortTag:'SAR · G-4'}},
];
const KEY='garuda_career_v1',RANKS=['Student Pilot','Private Pilot','Multi-Engine Pilot','Instrument Captain','Turbine Captain','Senior ATP Captain'];

export function createCareerHub({onLaunch}){
  const load=()=>{try{const r=JSON.parse(localStorage.getItem(KEY)||'{}');return {badges:r.badges||{},flights:r.flights||0,score:r.score||0};}catch{return {badges:{},flights:0,score:0};}};
  let prof=load(),tab='cert',selCert=null,ses={mode:'mission',cert:null,spec:null,step:0,done:[],finished:false,elapsed:0,failedEng:false};
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(prof));}catch{}},bc=()=>Object.keys(prof.badges).length;

  function startSession(mode,mIdx,cert=null,spec=null,freeAc=null){
    ses={mode,cert,spec,step:0,done:cert?cert.steps.map(()=>false):[],finished:false,elapsed:0,failedEng:false};
    onLaunch({mode,mIdx,cert,spec,freeAc});
  }
  function startFreeFlight(acType='twin'){
    const isJ=acType==='jet'||acType==='airliner';
    startSession('free',0,null,null,{name:'Free Flight',shortTag:'FREE FLIGHT',goal:'Open Archipelago VFR / IFR Flight',shortGoal:'Open VFR / IFR',atmosphere:'golden',wind:[2.4,0,1],windDesc:'05 kt VFR',dropZone:null,targetRunwayId:null,rings:[],spawn:{x:0,y:185,z:1120,headingDeg:356,pitchDeg:-1,rollDeg:0,speedKts:isJ?185:acType==='prop1'?92:120,throttle:.7,flapStage:0,gearDown:false,fuelPct:100,jetMode:isJ,aircraftType:acType}});
  }
  function stepSession(st,ms,cm,dt,onStep,onEvent){
    if(!ses.cert)return;
    ses.elapsed+=dt;
    if(ses.cert.failAt&&!ses.failedEng&&ses.elapsed>=ses.cert.failAt&&st.status==='flying'){
      ses.failedEng=true;st.malfunctions.leftEngineOut=true;st.engineHealth=Math.min(st.engineHealth,68);
      onEvent?.('PORT ENGINE FAILURE — COMPENSATE WITH RUDDER [Q/E] & TRIM');
    }
    if(ses.mode!=='training'||ses.finished)return;
    const cur=ses.cert.steps[ses.step];
    if(cur&&cur[2](st,ms,cm)){
      ses.done[ses.step]=true;ses.step++;
      if(ses.step>=ses.cert.steps.length){ses.finished=true;onStep?.(true,`Training Complete — Press [ENTER] for ${ses.cert.code} Exam`);}
      else onStep?.(false,`✓ ${cur[0]} · Next: ${ses.cert.steps[ses.step][0]}`);
    }
  }
  function recordOutcome(st,ms){
    prof.flights++;prof.score+=ms.score||0;
    if(ses.mode==='exam'&&ses.cert&&st.status==='landed'&&st.hasBeenAirborne){
      const reqRw=ses.cert.cfg?.targetRunwayId;
      if(reqRw&&st.incidentReport?.runwayId&&st.incidentReport.runwayId!==reqRw){save();if(st.incidentReport)st.incidentReport.title=`EXAM FAILED — WRONG RUNWAY (NEED ${reqRw})`;return {earned:false};}
      if(ses.cert.comfort&&st.comfortPct<70){save();if(st.incidentReport)st.incidentReport.title=`EXAM FAILED — PAX COMFORT ${Math.round(st.comfortPct)}% (<70%)`;return {earned:false};}
      const g=st.hullPct>=92&&!st.malfunctions?.gearDamaged?'A+':st.hullPct>=78?'A':'B';
      prof.badges[ses.cert.id]={code:ses.cert.code,name:ses.cert.name,grade:g,score:ms.score||0,date:new Date().toISOString().slice(0,10)};
      save();
      if(st.incidentReport){st.incidentReport.title=`★ ${ses.cert.code} WINGS EARNED (${g})`;st.incidentReport.detail=`${ses.cert.name} added to Pilot Logbook.`;st.incidentReport.missionComplete=true;}
      return {earned:true,cert:ses.cert,grade:g};
    }
    save();return {earned:false};
  }
  function getHudState(st){
    if(ses.mode==='training'&&ses.cert)return {mode:'training',cert:ses.cert,code:ses.cert.code,tag:`${ses.cert.code} TRN`,name:ses.cert.name,sub:ses.cert.sub,step:ses.step,total:ses.cert.steps.length,steps:ses.cert.steps,doneList:ses.done,done:ses.finished,comfort:Boolean(ses.cert.comfort)};
    if(ses.mode==='exam'&&ses.cert)return {mode:'exam',cert:ses.cert,code:ses.cert.code,tag:`${ses.cert.code} EXAM`,name:ses.cert.name,sub:ses.cert.exam,comfort:Boolean(ses.cert.comfort)};
    if(ses.mode==='spec'&&ses.spec)return {mode:'spec',code:ses.spec.code,tag:ses.spec.code,name:ses.spec.name,sub:ses.spec.sub};
    if(ses.mode==='free')return {mode:'free',code:'VFR',tag:'FREE',name:'Free Flight',sub:'Open Archipelago · [ESC] Switch Aircraft'};
    return null;
  }

  function renderHub(el,missions,curIdx,badgeEl){
    if(!el)return;
    const n=bc();if(badgeEl)badgeEl.textContent=`${n} / ${CERTS.length} Wings`;
    const tabs=[['cert','Certifications'],['spec','Specializations'],['missions','Missions'],['badges','Logbook']];
    let body='';
    if(tab==='cert'){
      if(!selCert){
        body=`<div class="card-grid cols-5">${CERTS.map((c)=>{
          const eb=prof.badges[c.id];
          return `<button type="button" class="vis-card${eb?' earned':''}" style="--bc:${c.col}" data-cert="${c.id}"><div class="art-wrap">${artSvg(c.id)}<span class="art-tag">${eb?`★ ${eb.grade}`:c.pre?c.pre.toUpperCase():'Entry'}</span></div><div class="card-body">${wingSvg(c.code,c.col,Boolean(eb))}<strong>${c.name}</strong><span>${c.sub}</span></div></button>`;
        }).join('')}</div>`;
      }else{
        const c=CERTS.find((x)=>x.id===selCert)||CERTS[0],eb=prof.badges[c.id];
        body=`<div class="detail-wrap"><div class="detail-hero" style="--bc:${c.col}">${artSvg(c.id)}<div class="hero-ov"><button type="button" class="back-btn" data-back="1">← Back</button><div class="hero-title">${wingSvg(c.code,c.col,Boolean(eb))}<div><h2>${c.name}</h2><span>${c.sub}${eb?` · Grade ${eb.grade}`:''}</span></div></div></div></div><div class="mode-split"><div class="mode-box"><h3>Training</h3><ol class="syl-list">${c.steps.map(([t,k])=>`<li><span>${t}</span><kbd>${k}</kbd></li>`).join('')}</ol><button type="button" class="act-btn trn" data-run="training" data-id="${c.id}">Training</button></div><div class="mode-box exm-box"><h3>Exam</h3><div class="exam-emblem">${wingSvg(c.code,c.col,true)}<span>${c.exam}</span></div><button type="button" class="act-btn exm" data-run="exam" data-id="${c.id}">Exam · ${c.code}</button></div></div></div>`;
      }
    }else if(tab==='spec'){
      body=`<div class="card-grid cols-4">${SPECS.map((sp)=>{
        const ok=Boolean(prof.badges[sp.req]);
        return `<button type="button" class="vis-card${ok?' earned':''}" style="--bc:${ok?'#38bdf8':'#94a3b8'}" data-spec="${sp.id}"><div class="art-wrap">${artSvg(sp.art)}<span class="art-tag">${ok?`✓ ${sp.req.toUpperCase()}`:`Req. ${sp.req.toUpperCase()}`}</span></div><div class="card-body"><strong>${sp.name}</strong><span>${sp.sub}</span></div></button>`;
      }).join('')}</div>`;
    }else if(tab==='missions'){
      const arts=['ppl','mer','ir','atpl'];
      body=`<div class="card-grid cols-4">${missions.map((m,i)=>`<button type="button" class="vis-card${i===curIdx?' active':''}" data-mis="${i}"><div class="art-wrap">${artSvg(arts[i])}<span class="art-tag">${m.windDesc}</span></div><div class="card-body"><strong>${m.name}</strong><span>${m.shortGoal}</span></div></button>`).join('')}</div>`;
    }else{
      const rk=RANKS[Math.min(RANKS.length-1,n)];
      body=`<div class="prof-hero"><div><span class="kicker">PILOT LOGBOOK · PK-GRD</span><h2>${rk}</h2></div><div class="prof-kpis"><div><b>${n}/${CERTS.length}</b><span>Wings</span></div><div><b>${prof.flights}</b><span>Sorties</span></div><div><b>${prof.score}</b><span>Score</span></div></div></div><div class="card-grid cols-5">${CERTS.map((c)=>{
        const eb=prof.badges[c.id];
        return `<div class="wing-card${eb?' earned':''}" style="--bc:${c.col}">${wingSvg(c.code,c.col,Boolean(eb))}<strong>${c.name}</strong><span>${eb?`Grade ${eb.grade} · ${eb.date}`:'Locked'}</span></div>`;
      }).join('')}</div>`;
    }
    el.innerHTML=`<div class="hub-nav">${tabs.map(([k,l])=>`<button type="button" class="hub-tab${tab===k?' active':''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
    el.querySelectorAll('[data-tab]').forEach((b)=>b.addEventListener('click',()=>{tab=b.dataset.tab;selCert=null;renderHub(el,missions,curIdx,badgeEl);}));
    el.querySelectorAll('[data-cert]').forEach((b)=>b.addEventListener('click',()=>{selCert=b.dataset.cert;renderHub(el,missions,curIdx,badgeEl);}));
    el.querySelectorAll('[data-back]').forEach((b)=>b.addEventListener('click',()=>{selCert=null;renderHub(el,missions,curIdx,badgeEl);}));
    el.querySelectorAll('[data-run]').forEach((b)=>b.addEventListener('click',()=>{const c=CERTS.find((x)=>x.id===b.dataset.id);if(c)startSession(b.dataset.run,c.mIdx,c);}));
    el.querySelectorAll('[data-spec]').forEach((b)=>b.addEventListener('click',()=>{const sp=SPECS.find((x)=>x.id===b.dataset.spec);if(sp)startSession('spec',sp.mIdx,null,sp);}));
    el.querySelectorAll('[data-mis]').forEach((b)=>b.addEventListener('click',()=>startSession('mission',Number(b.dataset.mis))));
  }
  return {renderHub,startSession,startFreeFlight,stepSession,recordOutcome,getHudState,getSession:()=>ses,getProfile:()=>prof,setTab:(t)=>{tab=t;selCert=null;}};
}
