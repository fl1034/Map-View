import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeResult,retain,summarize,MAX_EVENTS} from '../src/model.js';
const now=1_800_000_000_000;
const raw={type:'ping',timestamp:now/1000,msm_id:1,prb_id:2,result:[{rtt:12},{x:'*'},{rtt:18}]};
const probe={geometry:{coordinates:[4.9,52.3]},country_code:'NL'};
test('ping normalization preserves loss, timestamps, coordinates and missing target',()=>{
 const event=normalizeResult(raw,probe,null,now);
 assert.equal(event.latency,15);assert.equal(event.loss,1/3);assert.equal(event.target,null);assert.deepEqual(event.source,[4.9,52.3]);assert.equal(event.observedAt,now);
});
test('timeouts remain missing latency rather than false zero',()=>{
 const event=normalizeResult({...raw,result:[{x:'*'},{x:'*'}],avg:-1},probe,null,now);
 assert.equal(event.latency,null);assert.equal(event.loss,1);
});
test('stale, future, non-ping and unlocated measurements are rejected',()=>{
 for(const input of [{...raw,timestamp:raw.timestamp-61},{...raw,timestamp:raw.timestamp+61},{...raw,type:'traceroute'}])assert.equal(normalizeResult(input,probe,null,now),null);
 assert.equal(normalizeResult(raw,{geometry:{coordinates:[181,30]}},null,now),null);
});
test('deduplication, expiry and limits keep the same bounded event window',()=>{
 const event=normalizeResult(raw,probe,null,now);
 assert.equal(retain([event],event,now).length,1);assert.equal(retain([event],null,now+60001).length,0);
 let events=[];for(let i=0;i<MAX_EVENTS+10;i++)events=retain(events,{...event,id:String(i)},now);
 assert.equal(events.length,MAX_EVENTS);assert.equal(events[0].id,'10');
});
test('summary excludes missing latency and computes even-sized median',()=>{
 assert.deepEqual(summarize([{latency:null,country:'US',probeId:1},{latency:10,country:'NL',probeId:2},{latency:30,country:'NL',probeId:2}]),{count:3,countries:2,probes:2,median:20});
});
