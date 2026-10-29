import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://atlas.ripe.net/**',route=>route.abort());});
test('globe and map render; shared filters, independent layers, selection and mobile work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#scene-loading')).toHaveCount(0);await page.locator('#demo').click();await expect(page.locator('.activity-item').first()).toBeVisible();
 await expect(page.locator('#source-badge')).toContainText('SIMULATION');
 await expect(page.locator('.render-host:not([hidden]) canvas')).toBeVisible();
 await page.locator('#pause').click();
 const count=await page.locator('#stat-count').textContent();
 await page.locator('.activity-item').first().click();await expect(page.locator('#detail')).toContainText('Simulated measurement');
 await page.locator('#map-view').click();
 const map=page.locator('.maplibregl-canvas');await expect(map).toBeVisible();
 expect((await map.boundingBox()).height).toBeGreaterThan(300);
 await expect(page.locator('#stat-count')).toHaveText(count);
 await page.locator('[data-layer="jets"]').uncheck();await expect(page.locator('[data-layer="arcs"]')).toBeChecked();
 await page.locator('#region').selectOption('europe');expect(Number(await page.locator('#stat-count').textContent())).toBeLessThan(Number(count));
 await page.locator('#globe-view').click();
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
test('live failures clear simulated observations and never display a live badge',async({page})=>{
 await page.route('https://atlas.ripe.net/**',route=>route.abort());
 await page.goto('/');await expect(page.locator('#scene-loading')).toHaveCount(0);await page.locator('#demo').click();await expect(page.locator('.activity-item').first()).toBeVisible();
 await page.locator('#connect').click();await expect(page.locator('#source-badge')).toContainText('DISCONNECTED');
 await expect(page.locator('#stat-count')).toHaveText('0');await expect(page.locator('.activity-item')).toHaveCount(0);
 await page.locator('#demo').click();await expect(page.locator('#source-badge')).toContainText('SIMULATION');await expect(page.locator('.activity-item').first()).toBeVisible();
});
test('mock Atlas protocol: located results render, duplicate and stale results do not',async({page})=>{
 // Fixtures validate the integration contract; this is not a live-provider test.
 await page.route('https://atlas.ripe.net/api/v2/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const data=path.includes('/anchors/')?{results:[{ip_v4:'192.0.2.10',geometry:{coordinates:[4.9,52.37]},fqdn:'fixture-anchor'}]}:path.includes('/probes/')?{geometry:{coordinates:[-79.38,43.65]},country_code:'CA',description:'Fixture Toronto probe'}:{results:[{id:900001}]};
  await route.fulfill({json:data});
 });
 await page.routeWebSocket('wss://atlas-stream.ripe.net/stream/',ws=>{
  let sent=false;
  ws.onMessage(()=>{if(sent)return;sent=true;setTimeout(()=>{
   const raw={type:'ping',timestamp:Math.floor(Date.now()/1000),prb_id:900002,msm_id:900001,result:[{rtt:105},{rtt:115},{x:'*'}]};
   ws.send(JSON.stringify(['atlas_result',raw]));ws.send(JSON.stringify(['atlas_result',raw]));ws.send(JSON.stringify(['atlas_result',{...raw,timestamp:raw.timestamp-120}]));
  },150);});
 });
 await page.goto('/');await expect(page.locator('#scene-loading')).toHaveCount(0);await page.locator('#demo').click();await expect(page.locator('.activity-item').first()).toBeVisible();await page.locator('#connect').click();
 await expect(page.locator('#source-badge')).toContainText('LIVE · RIPE ATLAS');await expect(page.locator('#stat-count')).toHaveText('1');
 await page.locator('.activity-item').click();await expect(page.locator('#detail')).toContainText('110.0 ms');await expect(page.locator('#detail')).toContainText('33%');await expect(page.locator('#detail')).toContainText('RIPE Atlas probe 900002');
 await expect(page.locator('#detail a')).toHaveAttribute('href','https://atlas.ripe.net/measurements/900001/');
});
