/* Headless Chrome smoke test: PUPPETEER=/path/to/puppeteer-core node browser-test.js http://localhost:8781/ shot.png */
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');
const URL = process.argv[2] || 'http://localhost:8781/'; const SHOT = process.argv[3];
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.createBrowserContext(); const pg = await ctx.newPage();
  await pg.emulateTimezone('Australia/Perth');
  await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = [], bad = [];
  pg.on('pageerror', e => errs.push('pageerror ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  pg.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  pg.on('dialog', d => d.accept());
  await ctx.overridePermissions(new globalThis.URL(URL).origin, ['geolocation']);
  await pg.setGeolocation({ latitude: -34.2420, longitude: 116.1450, accuracy: 5 });
  await pg.goto(URL, { waitUntil: 'networkidle0' });
  await pg.evaluate(() => navigator.serviceWorker.ready);
  const W = ms => new Promise(r => setTimeout(r, ms));
  const click = async s => { await pg.waitForSelector(s); await pg.click(s); await W(200); };
  await click('a[href="#edit/new"]');
  await pg.type('[name=name]', 'Block 3 Hass'); await pg.select('[name=crop]', 'avocado'); await pg.type('[name=variety]', 'Hass / Dusa');
  await pg.type('[name=rowSp]', '7'); await pg.type('[name=treeSp]', '4'); await pg.type('[name=rows]', '3'); await pg.type('[name=perRow]', '5'); await pg.type('[name=year]', '2016');
  const calc = await pg.$eval('#calc', e => e.textContent);
  await click('button[type=submit]');
  await click('a[href^="#walk/"]'); await W(800);
  const seq = ['ok', 'ok', 'missing', 'ok', 'dead', 'ok', 'sick', 'ok', 'ok', 'replant', 'ok', 'ok'];
  for (const s of seq) { await pg.setGeolocation({ latitude: -34.2420 + Math.random() * 1e-4, longitude: 116.1450, accuracy: 5 }); await click('[data-s=' + s + ']'); }
  const posAfter = await pg.$eval('#cRow', e => e.textContent) + '/' + await pg.$eval('#cPos', e => e.textContent);
  if (SHOT) { await W(2400); await pg.screenshot({ path: SHOT }); }
  await click('[data-s=ok]'); await click('#bUndo');
  const posUndo = await pg.$eval('#cRow', e => e.textContent) + '/' + await pg.$eval('#cPos', e => e.textContent);
  // photo + note on the last issue (go back to row 2 tree 5 = replant)
  await click('#bPh'); await W(400); await pg.type('[name=notes]', '=collar rot, +check'); await click('#bPhoto'); await W(1500); await click('#snap'); await W(1500);
  const thumbs = await pg.$$eval('#th img', e => e.length);
  await click('button[type=submit]'); await W(400);
  const hash = await pg.evaluate(() => location.hash); const bid = hash.split('/')[1];
  await pg.goto(URL + '#sum/' + bid, { waitUntil: 'load' }); await W(600);
  const sumTbl = await pg.$$eval('.lt td', e => e.map(x => x.textContent));
  const plist = await pg.$$eval('.plist li', e => e.map(x => x.textContent));
  await click('#bShare'); const share = await pg.$eval('#sumTxt', e => e.value); await click('[data-close]');
  await pg.goto(URL + '#yield/' + bid, { waitUntil: 'load' }); await W(500);
  await pg.type('#yc', '120 150 90 200 130 160 110 140 170 125'); await pg.type('[name=fruitG]', '230'); await W(200);
  const yFruit = await pg.$eval('#yFruit', e => e.textContent); const yT = await pg.$eval('#yT', e => e.textContent); const yTrees = await pg.$eval('[name=trees]', e => e.value);
  await click('button[type=submit]');
  const csv = await pg.evaluate(id => OC.toCSV(OC.CSV_COLS, OC.csvRows(OCApp.DB, id, STRINGS.en)).split('\r\n'), bid);
  await pg.goto(URL + '#block/' + bid, { waitUntil: 'load' }); await W(400);
  await click('#bExp'); const expBtns = await pg.$$eval('#sheet button', e => e.length); await click('[data-close]');
  await pg.setOfflineMode(true); await pg.goto(URL + '#block/' + bid, { waitUntil: 'load' }); await W(800);
  const off = await pg.$$eval('.rec b', e => e.length);
  await pg.goto(URL + '#about', { waitUntil: 'load' }); await W(400);
  const aboutOk = await pg.$eval('main', e => e.textContent.includes('10 000') && e.textContent.includes('More free tools by John Richards'));
  const moreLinks = await pg.$$eval('.more-tools a', e => e.map(a => a.href));
  await pg.setOfflineMode(false);
  console.log(JSON.stringify({ errs, bad, calc, posAfter, posUndo, thumbs, sumTbl, plist, share, yFruit, yT, yTrees, csvLines: csv.length, csv2: csv[10], expBtns, offlineRecords: off, aboutOk, moreLinks }, null, 1));
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
