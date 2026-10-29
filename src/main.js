import './style.css';
import {Scene} from './scene.js';
import {AtlasFeed} from './atlas.js';
import {demoEvent} from './demo.js';
import {retain,summarize,cssColor} from './model.js';

const icons={globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',home:'<circle cx="12" cy="12" r="7"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6"/>',jet:'<path d="M12 21V3m-5 6 5-6 5 6M6 21v-7M18 21v-7"/>',arc:'<path d="M3 18C3 1 21 1 21 18M17 14l4 4 2-5"/>',pulse:'<path d="M1 12h5l3-8 5 16 3-8h6"/>',arrow:'<path d="M4 12h16m-5-5 5 5-5 5"/>',chevron:'<path d="m9 5 7 7-7 7"/>',play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.pulse}</svg>`;
const $=s=>document.querySelector(s);
$('#app').innerHTML=`
<header class="header">
 <a class="brand" href="#" aria-label="Internet Pulse home"><span class="brand-icon">${icon('pulse')}</span><span>internet<span class="brand-light">pulse</span><small>THE CONNECTIVITY OBSERVATORY</small></span></a>
 <nav class="view-switch" aria-label="Visualization"><button class="active" id="globe-view" aria-pressed="true">${icon('globe')}<span>Globe</span></button><button id="map-view" aria-pressed="false">${icon('map')}<span>World map</span></button></nav>
 <div class="header-right"><span class="utc" id="clock"></span><span class="source-badge" id="source-badge"><i></i> CONNECTING</span></div>
</header>
<div class="source-notice" id="source-notice"><span class="notice-dot"></span><span id="notice-text">Preparing a direct connection to public RIPE Atlas measurements.</span><button id="connect-top">Connect RIPE Atlas ${icon('arrow')}</button></div>
<main class="dashboard">
 <aside class="sidebar controls">
  <div class="eyebrow">EXPLORE THE NETWORK</div><h1>A world in<br><span>connection.</span></h1><p class="intro">Watch internet measurements take shape across the planet.</p>
  <section class="control-section"><div class="section-label">DATA SOURCE <span>01</span></div>
   <div class="source-card"><div class="source-title"><span class="source-symbol">R</span><div>RIPE Atlas<small>Public internet measurements</small></div></div><p>Latency. Reachability. A different perspective on the world.</p><button class="primary" id="connect">Connect live stream ${icon('arrow')}</button><button class="text-button" id="demo">Use simulation</button><label class="field-label" id="density-label" for="density">Simulated results / second<select id="density"><option value="2">2 · Quiet</option><option value="10" selected>10 · Active</option><option value="20">20 · Busy</option></select></label></div>
  </section>
  <section class="control-section"><div class="section-label">VISUAL LAYERS <span>02</span></div>
   ${[['jets','jet','Measurement jets'],['arcs','arc','Connection arcs'],['glow','pulse','Surface pulses']].map(([name,glyph,label])=>`<label class="toggle-row">${icon(glyph)}<span>${label}</span><input type="checkbox" data-layer="${name}" checked><span class="switch"></span></label>`).join('')}
  </section>
  <section class="control-section"><div class="section-label">FOCUS <span>03</span></div>
   <label class="field-label" for="region">Probe region</label><select id="region"><option value="all">Worldwide</option><option value="americas">Americas</option><option value="europe">Europe</option><option value="africa">Africa</option><option value="asia">Asia & Oceania</option></select>
   <label class="field-label range-label" for="latency">Latency ceiling <output id="latency-label">400 ms</output></label><input id="latency" type="range" min="20" max="400" step="10" value="400"><div class="range-limits"><span>20 ms</span><span>400 ms</span></div>
   <p class="small-note">Timeouts remain visible. Filters apply to both views.</p>
  </section>
  <div class="sidebar-foot"><span class="tiny-dot"></span> OBSERVE · EXPLORE · UNDERSTAND</div>
 </aside>
 <section class="visualization" aria-label="Interactive geographic visualization">
  <div class="scene-heading"><div><span class="eyebrow" id="view-eyebrow">PLANETARY VIEW</span><h2>The internet, in motion</h2></div><span class="scene-tag">60 SECOND WINDOW</span></div>
  <div id="scene"><div class="scene-loading" id="scene-loading">Preparing the observatory…</div></div>
  <div class="scene-tools"><button id="home" class="icon-button" title="Return to global view" aria-label="Return to global view">${icon('home')}</button><button id="rotate" class="tool-text" aria-pressed="true">Auto-rotate <span>ON</span></button></div>
  <div class="scene-bottom"><div class="scene-caption"><span class="tiny-dot"></span><span id="scene-hint">Drag to explore · Scroll to zoom</span></div><div class="latency-legend"><span>LATENCY</span><i></i><span>Low</span><b></b><span>High</span><em></em><span>Loss</span></div></div>
 </section>
 <aside class="sidebar insights">
  <div class="section-label">NETWORK SNAPSHOT <span>↗</span></div><p class="window-note">Filtered observations · last 60 seconds</p>
  <div class="main-stat"><strong id="stat-count">0</strong><span>measurements</span><div class="sparkline" aria-hidden="true">${Array.from({length:34},(_,i)=>`<i style="--h:${15+((i*17+13)%43)}px"></i>`).join('')}</div></div>
  <div class="stat-pair"><div><strong id="stat-probes">0</strong><span>Unique probes</span></div><div><strong id="stat-countries">0</strong><span>Countries</span></div></div>
  <div class="median"><span>Median latency</span><strong><span id="stat-median">—</span><small> ms</small></strong></div>
  <section class="selected-section"><div class="section-label">MEASUREMENT DETAIL <span>◎</span></div><div id="detail"><div class="empty-detail">${icon('home')}<h3>Follow a connection</h3><p>Select a point, arc, or activity below to inspect its measurement.</p></div></div></section>
  <div class="reading-key"><h3>Reading the globe</h3><p><span>↑</span> Jet height represents latency.</p><p><span>⌒</span> Arcs connect probes to targets.</p><p><span>◎</span> Pulses mark arriving results.</p><small>Connections show endpoints, not physical cable routes. Coverage follows available probes.</small></div>
 </aside>
 <section class="activity"><div class="activity-header"><div class="activity-title"><span class="tiny-dot"></span><h2>Recent activity</h2><span id="activity-mode">SIMULATED</span></div><div class="activity-actions"><span id="last-update">Waiting for observations</span><button id="pause" aria-label="Pause simulated arrivals">${icon('pause')} Pause simulation</button></div></div><div id="activity-list" class="activity-list"></div></section>
</main>
<footer><span>INTERNET PULSE <span class="footer-divider">/</span> A world in connection</span><span>Geography: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> · Live source: <a href="https://atlas.ripe.net/" target="_blank" rel="noreferrer">RIPE Atlas</a></span></footer>
<div id="announcement" class="sr-only" role="status" aria-live="polite"></div>`;

let scene,events=[],sequence=0,feed=null,source='live',paused=false,selected=null,rendered=[],region='all',ceiling=400,streamState='connecting',lastEventAt=0,simulationRate=10,lastListUpdate=0,queuedRefresh=null;
function matches(event){
 const [lng,lat]=event.source;
 const inRegion=region==='all'||region==='americas'&&lng< -30||region==='europe'&&lng>=-25&&lng<=45&&lat>=35||region==='africa'&&lng>=-20&&lng<=55&&lat<35&&lat>=-36||region==='asia'&&(lng>55||lng< -150&&lat<0);
 return inRegion&&(event.latency===null||event.latency<=ceiling);
}
function scheduleRefresh(){if(queuedRefresh===null)queuedRefresh=setTimeout(()=>{queuedRefresh=null;refresh();},200);}
function add(event){events=retain(events,event);lastEventAt=Date.now();scheduleRefresh();}
function refresh(forceList=false){
 events=retain(events,null);rendered=events.filter(matches);scene?.setEvents(rendered);
 const summary=summarize(rendered);
 $('#stat-count').textContent=summary.count;$('#stat-probes').textContent=summary.probes;$('#stat-countries').textContent=summary.countries;$('#stat-median').textContent=summary.median===null?'—':summary.median.toFixed(0);
 const list=$('#activity-list');
 if(forceList || (Date.now()-lastListUpdate>=1000 && !list.matches(':hover') && !list.contains(document.activeElement))){
 lastListUpdate=Date.now();list.replaceChildren();
 for(const event of rendered.slice(-6).reverse()){
  const button=document.createElement('button');button.className='activity-item';button.dataset.id=event.id;button.style.setProperty('--event-color',cssColor(event));
  const route=document.createElement('span');route.className='activity-route';const from=document.createElement('strong');from.textContent=event.sourceLabel;const to=document.createElement('small');to.textContent=`→ ${event.targetLabel}`;route.append(from,to);
  const dot=document.createElement('i');const value=document.createElement('span');value.className='activity-value';value.textContent=event.latency===null?'Timeout':`${Math.round(event.latency)} ms`;
  const arrow=document.createElement('span');arrow.className='activity-chevron';arrow.innerHTML=icon('chevron');button.append(dot,route,value,arrow);button.onclick=()=>select(event);list.append(button);
 }
 if(!rendered.length){const empty=document.createElement('p');empty.className='empty-activity';empty.textContent=source==='live'?'Waiting for fresh located measurements. Adjust filters or retry the stream.':'No observations match these filters.';list.append(empty);}
 }
 if(selected && !events.some(e=>e.id===selected.id)){$('#detail-expiry')?.replaceChildren(document.createTextNode('Outside the current 60-second window'));}
 $('#last-update').textContent=lastEventAt?`Last arrival ${Math.floor((Date.now()-lastEventAt)/1000)}s ago`:'Waiting for observations';
 const samples=rendered.reduce((b,e)=>{const index=Math.min(33,Math.max(0,Math.floor((Date.now()-e.observedAt)/1800)));b[33-index]++;return b;},Array(34).fill(0));
 document.querySelectorAll('.sparkline i').forEach((bar,i)=>bar.style.setProperty('--h',`${3+Math.min(45,samples[i]*6)}px`));
}
function select(event){
 selected=event;scene?.focus(event);const detail=$('#detail');detail.replaceChildren();
 const heading=document.createElement('h3');heading.className='detail-heading';heading.textContent=event.sourceLabel;
 const coordinates=document.createElement('p');coordinates.className='detail-coordinates';coordinates.textContent=`${event.source[1].toFixed(3)}°, ${event.source[0].toFixed(3)}° · ${event.country}`;
 detail.append(heading,coordinates);
 const rows=[['Target',event.targetLabel],['Latency',event.latency===null?'No reply':`${event.latency.toFixed(1)} ms`],['Packet loss',event.loss===null?'Unavailable':`${Math.round(event.loss*100)}%`],['Observed',new Date(event.observedAt).toISOString().slice(11,19)+' UTC'],['Source',event.synthetic?'Simulated measurement':`RIPE Atlas probe ${event.probeId}`]];
 for(const [label,value] of rows){const row=document.createElement('div');row.className='detail-row';const key=document.createElement('span');key.textContent=label;const val=document.createElement('strong');val.textContent=value;row.append(key,val);detail.append(row);}
 if(!event.synthetic){const link=document.createElement('a');link.href=`https://atlas.ripe.net/measurements/${event.measurementId}/`;link.target='_blank';link.rel='noreferrer';link.className='detail-link';link.textContent='View source measurement ↗';detail.append(link);}
 const note=document.createElement('p');note.id='detail-expiry';note.className='small-note';note.textContent='Selected observation · endpoints only';detail.append(note);
}
function clearData(){lastListUpdate=0;$('#activity-list').replaceChildren();events=[];selected=null;lastEventAt=0;$('#detail').innerHTML=`<div class="empty-detail">${icon('home')}<h3>Follow a connection</h3><p>Select a point, arc, or activity below to inspect its measurement.</p></div>`;refresh();}
function status(state,message){
 streamState=state;$('#notice-text').textContent=message;$('#source-notice').dataset.state=state;
 const labels={demo:'SIMULATION',connecting:'CONNECTING',waiting:'WAITING',live:'LIVE · RIPE ATLAS',error:'DISCONNECTED'};
 const badge=$('#source-badge');badge.replaceChildren();badge.append(document.createElement('i'),document.createTextNode(labels[state]));badge.dataset.state=state;
 $('#activity-mode').textContent=state==='demo'?'SIMULATED':state==='live'?'LIVE':labels[state];
 $('#connect').disabled=state==='connecting';$('#connect-top').disabled=state==='connecting';
 $('#connect').innerHTML=state==='connecting'?'Connecting…':state==='error'?`Retry live stream ${icon('arrow')}`:`Connect live stream ${icon('arrow')}`;
 $('#announcement').textContent=message;
}
function startDemo(){feed?.stop();feed=null;source='demo';paused=false;$('#pause').hidden=false;$('#pause').innerHTML=`${icon('pause')} Pause simulation`;clearData();status('demo','Design preview · Simulated measurements at real geographic locations. No live observations.');
 $('#density-label').hidden=false;for(let i=0;i<120;i++)events=retain(events,demoEvent(sequence++,Date.now()-(120-i)*100));lastEventAt=Date.now();refresh();}
function startLive(){feed?.stop();source='live';$('#pause').hidden=true;$('#density-label').hidden=true;clearData();feed=new AtlasFeed({onEvent:add,onStatus:status});feed.start();}
$('#connect').onclick=startLive;$('#connect-top').onclick=startLive;$('#demo').onclick=startDemo;
$('#pause').onclick=()=>{paused=!paused;if(paused){clearTimeout(queuedRefresh);queuedRefresh=null;refresh();}$('#pause').innerHTML=`${icon(paused?'play':'pause')} ${paused?'Resume':'Pause'} simulation`;};
for(const mode of ['globe','map'])$(`#${mode}-view`).onclick=()=>{
 if(!scene)return;scene.setMode(mode);
 for(const other of ['globe','map']){$(`#${other}-view`).classList.toggle('active',other===mode);$(`#${other}-view`).setAttribute('aria-pressed',String(other===mode));}
 $('#view-eyebrow').textContent=mode==='globe'?'PLANETARY VIEW':'WORLD MAP';$('#rotate').hidden=mode!=='globe';
};
$('#home').onclick=()=>scene?.home();$('.brand').onclick=e=>{e.preventDefault();scene?.home();};
$('#rotate').onclick=()=>{if(!scene)return;const enabled=!scene.globe.controls().autoRotate;scene.globe.controls().autoRotate=enabled;$('#rotate span').textContent=enabled?'ON':'OFF';$('#rotate').setAttribute('aria-pressed',String(enabled));};
document.querySelectorAll('[data-layer]').forEach(input=>input.onchange=()=>scene?.setLayer(input.dataset.layer,input.checked));
$('#density').onchange=e=>{simulationRate=Number(e.target.value);};
$('#region').onchange=e=>{region=e.target.value;refresh(true);};$('#latency').oninput=e=>{ceiling=Number(e.target.value);$('#latency-label').textContent=`${ceiling} ms`;refresh(true);};
async function init(){
 try {
  const response=await fetch(`${import.meta.env.BASE_URL}countries.geojson`);if(!response.ok)throw new Error('Country boundaries could not load.');
  const countries=await response.json();scene=new Scene($('#scene'),countries,select);$('#scene-loading').remove();startLive();
  scene.globe.controls().addEventListener('start',()=>{$('#rotate span').textContent='OFF';$('#rotate').setAttribute('aria-pressed','false');});
 }catch(error){$('#scene-loading').textContent=`The visualization could not start: ${error.message}. A WebGL2-capable browser is required.`;console.error(error);}
}
init();
let simulationRemainder=0;
setInterval(()=>{if(source==='demo'&&!paused&&scene){simulationRemainder+=simulationRate/10;const count=Math.floor(simulationRemainder);simulationRemainder-=count;for(let i=0;i<count;i++)events=retain(events,demoEvent(sequence++));if(count){lastEventAt=Date.now();scheduleRefresh();}}},100);
setInterval(()=>{refresh();$('#clock').textContent=new Date().toISOString().slice(11,19)+' UTC';if(source==='live'&&streamState==='live'&&Date.now()-lastEventAt>45000)status('waiting','No fresh located measurements in 45 seconds. The stream may be quiet or stalled.');},1000);
