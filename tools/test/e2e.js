// End-to-end check in headless Chromium. Forecast requests are answered from saved responses when available.
const { chromium } = require('playwright');
const fx = require('./fixtures');
const out = process.env.SS_SHOTS || require('path').join(__dirname, '.shots');
require('fs').mkdirSync(out, { recursive: true });
const base = process.env.SS_URL || 'http://localhost:8765/';
(async () => {
  const scenario = process.argv[2] || 'fog';          // fog | live
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY || process.env.https_proxy, bypass: 'localhost,127.0.0.1' } });
  const issues = [];
  async function open(viewport, settings, name, steps) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: settings.__scheme || 'light', geolocation: { latitude: 47.2267, longitude: 8.8184 }, permissions: ['geolocation'] });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') issues.push(`[${name}] console: ${m.text().slice(0, 200)}`); });
    page.on('pageerror', (e) => issues.push(`[${name}] pageerror: ${e.message.slice(0, 300)}`));
    page.on('requestfailed', (r) => { const u = r.url(); if (!/tile|wmts|terrarium|fonts|roundshot|foto-webcam|cartocdn/.test(u)) issues.push(`[${name}] failed: ${u.slice(0, 110)} ${r.failure() && r.failure().errorText}`); });
    let hits = 0, misses = 0;
    await page.route(/open-meteo\.com/, (route) => { const b = fx.lookup(route.request().url()); if (b) { hits++; route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: b }); } else { misses++; route.continue(); } });
    /* this sandbox's network proxy refuses in-page requests to the routing server; fetch them from Node instead so the app's parsing is tested on real answers */
    await page.route(/router\.project-osrm\.org/, (route) => {
      try { const body = require('child_process').execFileSync('curl', ['-sS', '-m', '40', route.request().url()], { encoding: 'utf8', maxBuffer: 1 << 26 }); route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); }
      catch (e) { route.abort(); }
    });
    const s = Object.assign({}, settings); delete s.__scheme;
    await page.addInitScript((st) => { try { if (!localStorage.getItem('ss.settings.v1')) localStorage.setItem('ss.settings.v1', JSON.stringify(st)); } catch (e) {} }, s);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SS && SS.engine && SS.engine.fc && document.querySelectorAll('#results .row').length > 0, null, { timeout: 60000 }).catch(() => issues.push(`[${name}] forecast did not load`));
    await page.waitForTimeout(6000);
    await steps(page);
    console.log(`[${name}] forecast fixtures used: ${hits}, passed to network: ${misses}`);
    await ctx.close();
  }
  const fog = scenario === 'fog' ? { archive: '2026-11-02' } : {};
  await open({ width: 1280, height: 860 }, fog, 'desktop', async (page) => {
    console.log('brief:', (await page.textContent('#brief h2')).trim(), '|', (await page.textContent('#brief p')).trim().slice(0, 160));
    console.log('rows:', await page.$$eval('#results .row', (r) => r.length), 'first:', await page.$$eval('#results .row', (r) => r.slice(0, 5).map((x) => x.querySelector('b').textContent + ' ' + x.querySelector('.row-sun b').textContent)));
    console.log('fog layer:', JSON.stringify(await page.evaluate(() => { const f = SS.map._fog, t = f._tiles || {}; const ks = Object.keys(t); return { onMap: SS.map.leaflet.hasLayer(f), tiles: ks.length, withElev: ks.filter((k) => t[k].el._elev).length, fn: typeof SS.map.fogFn, sample: SS.map.fogFn ? Math.round(SS.map.fogFn(47.37, 8.54)) : null }; })));
    console.log('drive source:', await page.evaluate(() => SS.engine.driveSource), '| obs stations:', await page.evaluate(() => SS.engine.obs ? SS.engine.obs.list.length : 0));
    await page.screenshot({ path: `${out}/${scenario}-desktop.png` });
    await page.click('#results .row'); await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${scenario}-desktop-place.png` });
    const sh = await page.$('#sheet'); await sh.evaluate((el) => { el.scrollTop = 900; }); await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${scenario}-desktop-place2.png` });
    await sh.evaluate((el) => { el.scrollTop = 99999; }); await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${scenario}-desktop-place3.png` });
    await page.click('#sheet [data-act="close"]'); await page.click('#btn-settings'); await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${scenario}-desktop-settings.png` });
  });
  await open({ width: 390, height: 844 }, Object.assign({ __scheme: 'dark' }, fog), 'phone-dark', async (page) => {
    await page.screenshot({ path: `${out}/${scenario}-phone.png` });
    await page.click('#btn-view'); await page.waitForTimeout(5000);
    await page.screenshot({ path: `${out}/${scenario}-phone-map.png` });
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log('phone horizontal overflow px:', scroll);
  });
  console.log(issues.length ? 'ISSUES:\n' + [...new Set(issues)].slice(0, 30).join('\n') : 'no console errors or failed requests');
  await browser.close();
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
