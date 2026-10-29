// Authored geographic locations. Every generated measurement is explicitly synthetic.
const places = [
 ['Vancouver','CA',-123.12,49.28],['San Francisco','US',-122.42,37.77],['New York','US',-74.01,40.71],
 ['Toronto','CA',-79.38,43.65],['Mexico City','MX',-99.13,19.43],['São Paulo','BR',-46.63,-23.55],
 ['Santiago','CL',-70.67,-33.45],['London','GB',-.12,51.5],['Amsterdam','NL',4.9,52.37],
 ['Paris','FR',2.35,48.86],['Frankfurt','DE',8.68,50.11],['Stockholm','SE',18.06,59.33],
 ['Lisbon','PT',-9.14,38.72],['Warsaw','PL',21.01,52.23],['Istanbul','TR',28.98,41.01],
 ['Nairobi','KE',36.82,-1.29],['Cape Town','ZA',18.42,-33.93],['Lagos','NG',3.38,6.52],
 ['Dubai','AE',55.27,25.2],['Mumbai','IN',72.88,19.08],['Singapore','SG',103.82,1.35],
 ['Tokyo','JP',139.69,35.68],['Seoul','KR',126.98,37.57],['Sydney','AU',151.21,-33.87],
 ['Auckland','NZ',174.76,-36.85],['Jakarta','ID',106.85,-6.21],['Taipei','TW',121.56,25.03]
];
export function demoEvent(sequence, now=Date.now()) {
 const a=places[(sequence*7)%places.length], b=places[(sequence*11+8)%places.length];
 const cluster=Math.floor(sequence/places.length)%9;
 const source=[a[2]+((cluster%3)-1)*.8,a[3]+(Math.floor(cluster/3)-1)*.6];
 const latency=Math.round(15+Math.abs(a[2]-b[2])*.7+Math.abs(a[3]-b[3])*.65+(sequence%9)*3);
 return {id:`demo-${sequence}`, probeId:10000+places.indexOf(a)*9+cluster, source, sourceLabel:a[0],country:a[1],
  target:a===b?null:[b[2],b[3]],targetLabel:b[0],latency,loss:sequence%19===0?1/3:0,
  observedAt:now,receivedAt:now,synthetic:true};
}
