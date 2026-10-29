export const WINDOW_MS = 60_000;
export const MAX_EVENTS = 720;
export const palette = {mint:[91,240,196], blue:[97,164,255], amber:[255,196,111], coral:[255,116,132]};
export function color(event) {
  return event.loss > 0 ? palette.coral : event.latency === null ? palette.blue : event.latency < 80 ? palette.mint : event.latency < 180 ? palette.blue : palette.amber;
}
export function cssColor(event) { return `rgb(${color(event).join(',')})`; }
export function validCoordinates(value) {return Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0])<=180 && Math.abs(value[1])<=90;}
export function normalizeResult(raw, probe, target, now = Date.now()) {
  if (raw.type !== 'ping' || !probe || !validCoordinates(probe.geometry?.coordinates) || !Number.isFinite(raw.timestamp)) return null;
  const observedAt = raw.timestamp * 1000;
  if (observedAt > now + 60_000 || observedAt < now - WINDOW_MS) return null;
  const packets = Array.isArray(raw.result) ? raw.result : [];
  const rtts = packets.map(p=>p.rtt).filter(n=>Number.isFinite(n) && n>=0);
  const latency = rtts.length ? rtts.reduce((a,b)=>a+b,0)/rtts.length : Number.isFinite(raw.avg) && raw.avg>=0 ? raw.avg : null;
  return {
    id:`${raw.msm_id}:${raw.prb_id}:${raw.timestamp}`, probeId:raw.prb_id, measurementId:raw.msm_id,
    source:probe.geometry.coordinates.slice(0,2), sourceLabel:probe.description || `Probe ${raw.prb_id}`,
    country:probe.country_code || 'Unknown', target:validCoordinates(target?.coordinates)?target.coordinates:null,
    targetLabel:target?.label || raw.dst_name || raw.dst_addr || 'Measurement target',
    latency, loss:packets.length ? (packets.length-rtts.length)/packets.length : null,
    observedAt, receivedAt:now, synthetic:false
  };
}
export function retain(events, event, now = Date.now()) {
  const recent=events.filter(e=>e.observedAt>=now-WINDOW_MS);
  if (event && !recent.some(e=>e.id===event.id)) recent.push(event);
  return recent.sort((a,b)=>a.observedAt-b.observedAt).slice(-MAX_EVENTS);
}
export function summarize(events) {
  const latency=events.map(e=>e.latency).filter(Number.isFinite).sort((a,b)=>a-b);
  const mid=Math.floor(latency.length/2);
  return {count:events.length, countries:new Set(events.map(e=>e.country)).size,
    probes:new Set(events.map(e=>e.probeId)).size,
    median:latency.length ? (latency.length%2 ? latency[mid] : (latency[mid-1]+latency[mid])/2):null};
}
