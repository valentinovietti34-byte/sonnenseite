// German interface check: renders the main views with a de-CH browser and lists text that is still English.
const { chromium } = require('playwright');
const fx = require('./fixtures');
const out = process.env.SS_SHOTS || require('path').join(__dirname, '.shots');
(async () => {
  const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY || process.env.https_proxy, bypass: 'localhost,127.0.0.1' } });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'de-CH' });
  const page = await ctx.newPage(); const issues = [];
  page.on('pageerror', (e) => issues.push('pageerror: ' + e.message.slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') issues.push('console: ' + m.text().slice(0, 160)); });
  await page.route(/open-meteo\.com/, (r) => { const b = fx.lookup(r.request().url()); if (b) r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: b }); else r.continue(); });
  await page.route(/router\.project-osrm\.org/, (r) => { try { const body = require('child_process').execFileSync('curl', ['-sS', '-m', '40', r.request().url()], { encoding: 'utf8', maxBuffer: 1 << 26 }); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); } catch (e) { r.abort(); } });
  await page.addInitScript(() => { try { if (!localStorage.getItem('ss.settings.v1')) localStorage.setItem('ss.settings.v1', JSON.stringify({ archive: '2026-11-02' })); } catch (e) {} });
  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => window.SS && SS.engine.fc && document.querySelectorAll('#results .row').length > 0, null, { timeout: 60000 });
  await page.waitForTimeout(5000);
  const english = async () => page.evaluate(() => {
    const re = /\b(the|and|of|at|from|to|is|are|you|your|sun|fog|cloud|show|more|away|place|places|minutes|hour|lift|this|with|for|not|no|by|car|train|measured|webcam|sunny|today|tomorrow|day|height)\b/i;
    const found = new Set(), it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = it.nextNode())) { const p = n.parentElement; if (!p || p.closest('script,style,.leaflet-control-attribution') || p.closest('[hidden]')) continue; const t = n.nodeValue.trim(); if (t && re.test(t)) found.add(t.slice(0, 120)); }
    document.querySelectorAll('[aria-label],[title],[placeholder]').forEach((e) => ['aria-label', 'title', 'placeholder'].forEach((a) => { const v = e.getAttribute(a); if (v && re.test(v) && !/·/.test(v)) found.add('@' + a + ': ' + v.slice(0, 100)); }));
    return [...found];
  });
  const seen = new Set(), report = (label, list) => { const fresh = list.filter((x) => !seen.has(x)); fresh.forEach((x) => seen.add(x)); console.log('--', label, '(' + fresh.length + ' new English-looking texts)'); fresh.forEach((x) => console.log('   ', x)); };
  report('list view', await english());
  await page.screenshot({ path: out + '/de-list.png' });
  await page.click('#results .row'); await page.waitForTimeout(2500);
  report('place sheet', await english());
  await page.screenshot({ path: out + '/de-sheet.png' });
  await page.click('#sheet [data-act="conn"]'); await page.waitForTimeout(4000);
  report('connections', await english());
  await page.click('#sheet [data-act="close"]'); await page.click('#btn-settings'); await page.waitForTimeout(800);
  report('settings', await english());
  await page.screenshot({ path: out + '/de-settings.png' });
  await page.click('#settings [data-act="close"]'); await page.click('#btn-view'); await page.waitForTimeout(3000);
  await page.click('#btn-layers'); await page.waitForTimeout(500);
  report('map and layers', await english());
  console.log(issues.length ? 'ISSUES: ' + [...new Set(issues)].join(' | ') : 'no console errors');
  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
