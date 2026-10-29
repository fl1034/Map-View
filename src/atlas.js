import {normalizeResult, validCoordinates} from './model.js';
const API='https://atlas.ripe.net/api/v2';
async function get(path,signal) {
 const response=await fetch(`${API}${path}`,{signal});
 if(!response.ok) throw new Error(`RIPE Atlas returned HTTP ${response.status}.`);
 return response.json();
}
export class AtlasFeed {
 constructor({onEvent,onStatus}) {Object.assign(this,{onEvent,onStatus});this.controller=new AbortController();this.probes=new Map();this.pending=new Map();this.alive=true;this.sockets=[];}
 stop() {this.alive=false;this.controller.abort();clearTimeout(this.timeout);clearInterval(this.watchdog);this.sockets.forEach(s=>s.close());}
 async start() {
  this.onStatus('connecting','Discovering public anchor measurements…');
  this.timeout=setTimeout(()=>this.fail('RIPE Atlas did not respond in 25 seconds. Check network access and retry.'),25000);
  try {
   const signal=this.controller.signal;
   const anchorsResponse=await get('/anchors/?page_size=500',signal);
   const anchors=anchorsResponse.results.filter(a=>!a.is_disabled && a.ip_v4 && validCoordinates(a.geometry?.coordinates));
   if(!anchors.length) throw new Error('No geographically located anchors were returned.');
   // Spread queries around the globe; only match explicitly located anchor IPs.
   const ordered=anchors.sort((a,b)=>a.geometry.coordinates[0]-b.geometry.coordinates[0]);
   const selected=Array.from({length:6},(_,i)=>ordered[Math.floor(i*ordered.length/6)]);
   const discoveries=await Promise.allSettled(selected.map(async a=>{
    const data=await get(`/measurements/?target_ip=${encodeURIComponent(a.ip_v4)}&type=ping&status=2&is_public=true&page_size=2`,signal);
    return data.results.map(m=>({id:m.id,target:{coordinates:a.geometry.coordinates,label:a.fqdn || a.city || 'RIPE Atlas anchor'}}));
   }));
   if(!this.alive)return;
   const measurements=discoveries.filter(r=>r.status==='fulfilled').flatMap(r=>r.value);
   if(!measurements.length) throw new Error('No running public ping measurements were available for the selected anchors.');
   this.targets=new Map(measurements.map(m=>[m.id,m.target]));
   this.onStatus('connecting',`Subscribing to ${measurements.length} public measurements…`);
   const ws=new WebSocket('wss://atlas-stream.ripe.net/stream/');this.sockets.push(ws);
   ws.onopen=()=>{
    for(const m of measurements) ws.send(JSON.stringify(['atlas_subscribe',{stream_type:'result',msm:m.id}]));
    this.onStatus('waiting','Connected. Waiting for a fresh, geographically located measurement…');
    clearTimeout(this.timeout);
    this.lastArrival=Date.now();
    this.watchdog=setInterval(()=>{if(Date.now()-this.lastArrival>45000)this.onStatus('waiting','No fresh located measurements in 45 seconds. The stream may be quiet or stalled.');},5000);
   };
   ws.onmessage=async message=>{
    try {
     const [type,payload]=JSON.parse(message.data);
     if(type==='atlas_error') {this.fail('RIPE Atlas rejected the stream subscription.');return;}
     if(type!=='atlas_result')return;
     for(const raw of Array.isArray(payload)?payload:[payload]) {
      if(!raw || raw.type!=='ping' || !this.targets.has(raw.msm_id))continue;
      // Reject old stream results before issuing any probe metadata requests.
      if(!Number.isFinite(raw.timestamp)||raw.timestamp*1000<Date.now()-60000||raw.timestamp*1000>Date.now()+60000)continue;
      const probe=await this.probe(raw.prb_id);
      if(!this.alive) return;
      const event=normalizeResult(raw,probe,this.targets.get(raw.msm_id));
      if(event){this.lastArrival=Date.now();this.onStatus('live','Receiving public RIPE Atlas measurements');this.onEvent(event);}
     }
    }catch{/* Ignore malformed frames; no measurement is fabricated. */}
   };
   ws.onerror=()=>this.fail('The measurement stream could not connect. Check network access and retry.');
   ws.onclose=()=>{if(this.alive)this.fail('The measurement stream closed. Retry to reconnect.');};
  }catch(error){if(this.alive)this.fail(error.message === 'Failed to fetch' ? 'RIPE Atlas could not be reached. Check network access or browser restrictions, then retry.' : error.message || 'RIPE Atlas is unavailable.');}
 }
 async probe(id) {
  if(this.probes.has(id))return this.probes.get(id);
  if(!this.pending.has(id)) {
   // Bound outstanding metadata requests during large stream bursts.
   if(this.pending.size>=12)return null;
   this.pending.set(id,get(`/probes/${id}/`,this.controller.signal).then(p=>{this.probes.set(id,p);return p;}).catch(()=>null).finally(()=>this.pending.delete(id)));
  }
  return this.pending.get(id);
 }
 fail(message) {if(!this.alive)return;this.onStatus('error',message);this.stop();}
}
