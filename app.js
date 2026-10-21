/* Orchard Counter - UI. All data in IndexedDB on this phone only. */
(function () {
  'use strict';
  var VERSION = OC.VERSION;
  var lang = (navigator.language || 'en').slice(0, 2); if (!STRINGS[lang]) lang = 'en';
  var L = STRINGS[lang];
  function t(k, v) {
    var s = L[k] != null ? L[k] : STRINGS.en[k]; if (s == null) s = k;
    if (v && typeof s === 'string') Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  function tt(k, sub) { var o = t(k); return (o && o[sub] != null) ? o[sub] : sub; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  var main = $('main');
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function toast(msg) { var e = $('toast'); e.textContent = msg; e.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { e.hidden = true; }, 2200); }
  function mapURL(r) { return 'https://www.openstreetmap.org/?mlat=' + r.lat + '&mlon=' + r.lon + '#map=19/' + r.lat + '/' + r.lon; }
  var COLORS = { ok: '#3d7a43', missing: '#8d6e63', dead: '#424242', sick: '#c77800', replant: '#1565c0' };

  // ---------- storage ----------
  var STORES = ['blocks', 'records', 'photos'], DB = { blocks: [], records: [], photos: [] }, idb = null;
  function openDB() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no idb'));
      var q = indexedDB.open('orchard-counter', 1);
      q.onupgradeneeded = function () { STORES.forEach(function (s) { if (!q.result.objectStoreNames.contains(s)) q.result.createObjectStore(s, { keyPath: 'id' }); }); };
      q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
    });
  }
  function tx(store, mode, fn) {
    return new Promise(function (res, rej) {
      if (!idb) return res();
      var x = idb.transaction(store, mode), r = fn(x.objectStore(store));
      x.oncomplete = function () { res(r && r.result); }; x.onerror = function () { rej(x.error); };
    });
  }
  function put(store, obj) {
    var arr = DB[store], i = arr.findIndex(function (o) { return o.id === obj.id; });
    if (i >= 0) arr[i] = obj; else arr.push(obj);
    return tx(store, 'readwrite', function (s) { s.put(obj); }).catch(function () { toast(t('storageWarn')); });
  }
  function del(store, id) { DB[store] = DB[store].filter(function (o) { return o.id !== id; }); return tx(store, 'readwrite', function (s) { s.delete(id); }); }
  function loadAll() { return Promise.all(STORES.map(function (s) { return tx(s, 'readonly', function (st) { return st.getAll(); }).then(function (r) { DB[s] = r || []; }); })); }
  function get(store, id) { return DB[store].filter(function (o) { return o.id === id; })[0]; }
  function recsOf(bid) { return DB.records.filter(function (r) { return r.blockId === bid; }).sort(function (a, b) { return a.t < b.t ? 1 : -1; }); }
  function photosOf(rid) { return DB.photos.filter(function (p) { return p.recordId === rid; }); }
  function delRecord(r) { photosOf(r.id).forEach(function (p) { del('photos', p.id); }); return del('records', r.id); }

  // ---------- sensors ----------
  var heading = null, gotAbs = false, compassOn = false;
  function onOrient(e, abs) {
    if (e.webkitCompassHeading != null) { heading = OC.norm360(e.webkitCompassHeading); if (window.onHeading) window.onHeading(); return; }
    var a = e.alpha; if (a == null || (!abs && !e.absolute)) return;
    var h = OC.cameraHeading(a, e.beta || 0, e.gamma || 0); if (h == null) h = OC.norm360(360 - a);
    heading = h; if (window.onHeading) window.onHeading();
  }
  function startCompass() {
    if (compassOn) return; compassOn = true;
    var go = function () {
      if ('ondeviceorientationabsolute' in window) addEventListener('deviceorientationabsolute', function (e) { gotAbs = true; onOrient(e, true); });
      addEventListener('deviceorientation', function (e) { if (!gotAbs) onOrient(e, false); });
    };
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then(go, go);
    else go();
  }
  // Continuous GPS while walking; each tap takes the latest fix (if under 30 s old).
  var gps = { watch: null, fix: null, lock: null };
  function startGps(cb) {
    stopGps(); if (!navigator.geolocation) return cb && cb(null);
    gps.watch = navigator.geolocation.watchPosition(function (p) {
      gps.fix = { lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy * 10) / 10, at: Date.now() }; if (cb) cb(gps.fix);
    }, function () { if (cb) cb(null); }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 30000 });
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { gps.lock = l; }, function () {});
  }
  function stopGps() { if (gps.watch != null && navigator.geolocation) navigator.geolocation.clearWatch(gps.watch); gps.watch = null; if (gps.lock) { gps.lock.release().catch(function () {}); gps.lock = null; } }
  function freshFix() { return gps.fix && Date.now() - gps.fix.at < 30000 ? gps.fix : null; }

  // ---------- files ----------
  function download(name, blob) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
    toast(t('exported', { f: name }));
  }
  function stamp() { return OC.localStamp(new Date().toISOString()).slice(0, 10); }
  function slug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30); }
  function blobToData(b) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(b); }); }
  function dataToBlob(d) { return fetch(d).then(function (r) { return r.blob(); }); }
  function exportSheet(bid) {
    var b = bid && get('blocks', bid), base = 'orchard-counter' + (b ? '-' + slug(b.name) : '') + '-' + stamp();
    sheet('<h2>' + t('exportTitle') + (b ? ': ' + esc(b.name) : '') + '</h2><button class="go" id="eCsv">' + t('csv') + '</button>' + (b ? '<button class="go" id="eTxt">' + t('listTxt') + '</button>' : '') +
      '<button id="eJson">' + t('backup') + '</button><button data-close>' + t('close') + '</button>', function () {
      $('eCsv').onclick = function () { var rows = OC.csvRows(DB, bid, L); if (!rows.length) return toast(t('nothing')); download(base + '-records.csv', new Blob(['\ufeff' + OC.toCSV(OC.CSV_COLS, rows)], { type: 'text/csv' })); };
      if ($('eTxt')) $('eTxt').onclick = function () { download(base + '-replant-list.txt', new Blob([replantText(b)], { type: 'text/plain' })); };
      $('eJson').onclick = function () { backup(bid, base); };
    });
  }
  function backup(bid, base) {
    var bl = DB.blocks.filter(function (b) { return !bid || b.id === bid; }); if (!bl.length) return toast(t('nothing'));
    var ids = {}; bl.forEach(function (b) { ids[b.id] = 1; });
    var recs = DB.records.filter(function (r) { return ids[r.blockId]; }), rids = {}; recs.forEach(function (r) { rids[r.id] = 1; });
    var ph = DB.photos.filter(function (p) { return rids[p.recordId]; });
    var withPhotos = ph.length && confirm(t('backupPhotos'));
    (withPhotos ? Promise.all(ph.map(function (p) { return blobToData(p.blob).then(function (d) { var c = Object.assign({}, p); delete c.blob; c.data = d; return c; }); })) : Promise.resolve([])).then(function (photos) {
      var o = { app: 'orchard-counter', version: VERSION, exported: new Date().toISOString(), blocks: bl, records: recs, photos: photos };
      download(base + '-backup.json', new Blob([JSON.stringify(o)], { type: 'application/json' }));
    });
  }
  function restore(file) {
    var r = new FileReader();
    r.onload = function () {
      var o; try { o = JSON.parse(r.result); } catch (e) { o = null; }
      if (!o || o.app !== 'orchard-counter') return toast(t('badFile'));
      var n = 0, jobs = [];
      ['blocks', 'records'].forEach(function (s) { (o[s] || []).forEach(function (x) { if (x && x.id) { n++; jobs.push(put(s, x)); } }); });
      (o.photos || []).forEach(function (p) { if (!p || !p.data) return; n++; jobs.push(dataToBlob(p.data).then(function (bb) { var c = Object.assign({}, p); delete c.data; c.blob = bb; return put('photos', c); })); });
      Promise.all(jobs).then(function () { toast(t('restored', { n: n })); render(); });
    };
    r.readAsText(file);
  }
  function replantText(b) {
    var o = OC.summary(b, recsOf(b.id)), out = [t('listHead', { name: b.name, crop: tt('crops', b.crop), date: stamp() })];
    out.push(t('counted') + ': ' + o.counted + (o.expected ? ' / ' + o.expected : '') + ' · ' + t('gapPct') + ': ' + (o.gapPct == null ? '-' : o.gapPct + ' %') + ' · ' + t('replantList', { n: o.replantN }));
    out.push('');
    o.replantList.forEach(function (r) { out.push(t('rowWord') + ' ' + r.row + ', ' + t('posWord').toLowerCase() + ' ' + r.pos + ' – ' + tt('status', r.status) + (r.notes ? ' – ' + r.notes : '') + (r.lat != null ? ' (' + r.lat + ', ' + r.lon + ' ±' + Math.round(r.acc) + ' m)' : '')); });
    if (!o.replantList.length) out.push(t('none'));
    if (o.sickList.length) { out.push(''); out.push(t('sickList', { n: o.sickList.length })); o.sickList.forEach(function (r) { out.push(t('rowWord') + ' ' + r.row + ', ' + t('posWord').toLowerCase() + ' ' + r.pos + (r.notes ? ' – ' + r.notes : '')); }); }
    out.push(''); out.push('— ' + t('listFoot') + ' ' + location.href.split('#')[0]);
    return out.join('\n');
  }
  function shareText(txt) {
    sheet('<h2>' + esc(t('share')) + '</h2><textarea id="sumTxt" rows="12" readonly>' + esc(txt) + '</textarea><button class="go" id="cp">' + t('copy') + '</button>' +
      (navigator.share ? '<button id="shr">' + t('share') + '</button>' : '') + '<button data-close>' + t('close') + '</button>', function () {
      $('cp').onclick = function () { $('sumTxt').select(); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast(t('copied')); }, function () { document.execCommand('copy'); toast(t('copied')); }); };
      if ($('shr')) $('shr').onclick = function () { navigator.share({ title: t('appName'), text: txt }).catch(function () {}); };
    });
  }
  function sheet(html, init) {
    var s = $('sheet'); s.innerHTML = '<div class="panel">' + html + '</div>'; s.hidden = false;
    s.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeSheet; }); if (init) init(s);
  }
  function closeSheet() { $('sheet').hidden = true; $('sheet').innerHTML = ''; }

  // ---------- views ----------
  var cleanup = null;
  function go(h) { location.hash = h; }
  function render() {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    stopGps(); window.onHeading = null; closeSheet();
    var h = location.hash.replace(/^#\/?/, '').split('/'), v = h[0] || '', id = h[1];
    document.body.className = 'v-' + (v || 'home'); scrollTo(0, 0);
    if (v === 'block' && get('blocks', id)) viewBlock(get('blocks', id));
    else if (v === 'edit') viewEdit(id === 'new' ? null : get('blocks', id));
    else if (v === 'walk' && get('blocks', id)) viewWalk(get('blocks', id));
    else if (v === 'rec' && get('records', id)) viewRecord(get('records', id));
    else if (v === 'photo' && get('records', id)) viewPhoto(get('records', id));
    else if (v === 'sum' && get('blocks', id)) viewSummary(get('blocks', id));
    else if (v === 'yield' && get('blocks', id)) viewYield(get('blocks', id));
    else if (v === 'about') viewAbout();
    else viewHome();
  }
  function top(title, backTo) {
    return '<header class="bar">' + (backTo != null ? '<a class="back" href="#' + backTo + '">' + t('back') + '</a>' : '<img class="logo" src="icons/icon-192.png" alt="">') + '<h1>' + esc(title) + '</h1></header>';
  }
  function sel(name, map, cur) { return '<select name="' + name + '">' + Object.keys(map).map(function (k) { return '<option value="' + esc(k) + '"' + (k === (cur || '') ? ' selected' : '') + '>' + esc(map[k]) + '</option>'; }).join('') + '</select>'; }
  function inp(name, label, val, mode) { return '<label>' + label + '<input name="' + name + '"' + (mode ? ' inputmode="' + mode + '"' : '') + ' value="' + esc(val == null ? '' : val) + '"></label>'; }

  function viewHome() {
    var h = top(t('appName')) + '<p class="lead">' + t('tagline') + '</p><a class="btn go big" href="#edit/new">' + t('newBlock') + '</a><h2>' + t('blocks') + '</h2>';
    var list = DB.blocks.slice().sort(function (a, b) { return a.created < b.created ? 1 : -1; });
    if (!list.length) h += '<p class="empty">' + t('noBlocks') + '</p>';
    list.forEach(function (b) {
      var o = OC.summary(b, recsOf(b.id));
      h += '<a class="item" href="#block/' + b.id + '"><b>' + esc(b.name) + '</b><span>' + esc(tt('crops', b.crop)) + ' · ' + o.counted + (o.expected ? ' / ' + o.expected : '') + ' trees · ' + t('statReplant') + ' ' + o.replantN + '</span></a>';
    });
    h += '<div class="row"><button id="bExp">' + t('exportAll') + '</button><button id="bRes">' + t('restore') + '</button></div>' +
      '<input type="file" id="fRes" accept=".json,application/json" hidden><a class="btn" href="#about">' + t('about') + '</a><p class="small center">' + t('version', { v: VERSION }) + ' · John Richards</p>';
    main.innerHTML = h;
    $('bExp').onclick = function () { exportSheet(null); };
    $('bRes').onclick = function () { $('fRes').click(); }; $('fRes').onchange = function () { if (this.files[0]) restore(this.files[0]); };
  }

  function viewEdit(b) {
    var isNew = !b; b = b || { id: uid(), created: new Date().toISOString(), crop: 'avocado', cur: { row: 1, pos: 1 } };
    var h = top(isNew ? t('newBlock').replace('+ ', '') : t('editBlock'), isNew ? '' : 'block/' + b.id) + '<form id="f" class="form">' +
      '<label>' + t('blockName') + '<input name="name" required maxlength="80" placeholder="' + esc(t('blockNameEg')) + '" value="' + esc(b.name || '') + '"></label>' +
      '<label>' + t('crop') + sel('crop', t('crops'), b.crop) + '</label>' + inp('variety', t('variety'), b.variety) +
      '<div class="row">' + inp('rowSp', t('rowSp'), b.rowSp, 'decimal') + inp('treeSp', t('treeSp'), b.treeSp, 'decimal') + '</div>' +
      '<div class="row">' + inp('rows', t('rows'), b.rows, 'numeric') + inp('perRow', t('perRow'), b.perRow, 'numeric') + '</div>' + inp('rowLen', t('rowLen'), b.rowLen, 'decimal') +
      '<p class="small">' + t('perRowHelp') + '</p><p class="hint" id="calc"></p>' + inp('year', t('year'), b.year, 'numeric') +
      '<label class="opt"><input type="checkbox" name="snake"' + (b.snake ? ' checked' : '') + '> ' + t('snake') + '</label>' +
      '<label>' + t('notes') + '<textarea name="notes" rows="2">' + esc(b.notes || '') + '</textarea></label>' +
      '<button class="go big" type="submit">' + t('save') + '</button>' + (isNew ? '' : '<button type="button" class="bad" id="bDel">' + t('delBlock') + '</button>') + '</form>';
    main.innerHTML = h;
    var f = $('f');
    function vals() { return { rowSp: f.rowSp.value.trim(), treeSp: f.treeSp.value.trim(), rows: f.rows.value.trim(), perRow: f.perRow.value.trim(), rowLen: f.rowLen.value.trim(), year: f.year.value.trim() }; }
    function upd() {
      var v = vals(), ha = OC.treesPerHa(v.rowSp, v.treeSp), n = OC.expectedTrees(v), age = OC.ageYears(v.year);
      $('calc').textContent = ha ? t('calc', { a: Math.round(OC.num(v.rowSp) * OC.num(v.treeSp) * 10) / 10, ha: ha, n: n || '?', b: OC.blockHa(v) || '?' }) + (age != null ? t('calcAge', { y: age }) : '') : t('calcNeed');
    }
    f.addEventListener('input', upd); upd();
    f.onsubmit = function (e) {
      e.preventDefault(); var v = vals();
      b.name = f.name.value.trim() || 'Block'; b.crop = f.crop.value; b.variety = f.variety.value.trim(); Object.assign(b, v); b.snake = f.snake.checked; b.notes = f.notes.value;
      put('blocks', b).then(function () { go('block/' + b.id); });
    };
    if ($('bDel')) $('bDel').onclick = function () { if (!confirm(t('confirmDelBlock'))) return; recsOf(b.id).forEach(delRecord); del('blocks', b.id).then(function () { go(''); }); };
  }

  function stat(label, val) { return '<div><small>' + label + '</small><b>' + val + '</b></div>'; }
  function recLine(r) {
    var np = photosOf(r.id).length;
    return '<div class="item rec" style="--c:' + COLORS[r.status] + '"><a href="#rec/' + r.id + '"><b>' + tt('icons', r.status) + ' ' + t('rowWord') + ' ' + r.row + ' · ' + t('posWord') + ' ' + r.pos + ' — ' + esc(tt('status', r.status)) + '</b><span>' +
      OC.localStamp(r.t).slice(11) + ' · ' + (r.lat != null ? '±' + Math.round(r.acc) + ' m' : t('noGps')) + (np ? ' · 📷' + np : '') + (r.notes ? ' · ' + esc(r.notes) : '') + '</span></a></div>';
  }
  function viewBlock(b) {
    var rs = recsOf(b.id), o = OC.summary(b, rs);
    var h = top(b.name, '') + '<p class="small">' + esc(tt('crops', b.crop)) + (b.variety ? ' · ' + esc(b.variety) : '') + (o.perHa ? ' · ' + t('perHaShort', { v: o.perHa }) : '') + (o.ha ? ' · ' + o.ha + ' ha' : '') + '</p>' +
      '<div class="card stats">' + stat(t('statCounted'), o.counted) + stat(t('statExpected'), o.expected || '–') + stat(t('statGap'), o.gapPct == null ? '–' : o.gapPct + ' %') + stat(t('statReplant'), o.replantN) + '</div>' +
      '<a class="btn go big" href="#walk/' + b.id + '">' + t('walk') + '</a><a class="btn go" href="#sum/' + b.id + '">' + t('summary') + '</a><a class="btn" href="#yield/' + b.id + '">' + t('yieldBtn') + '</a>' +
      '<div class="row"><button id="bExp">' + t('exportThis') + '</button><a class="btn" href="#edit/' + b.id + '">' + t('editBlock') + '</a></div>' +
      '<h2>' + t('recordsN') + '</h2>' + (rs.length ? rs.slice(0, 30).map(recLine).join('') : '<p class="empty">' + t('noRecords') + '</p>');
    main.innerHTML = h;
    $('bExp').onclick = function () { exportSheet(b.id); };
  }

  function viewWalk(b) {
    b.cur = b.cur || { row: 1, pos: OC.startPos(1, b) };
    var n = OC.perRow(b);
    var h = top(b.name, 'block/' + b.id) + '<div class="card pos"><div><small>' + t('rowWord') + '</small><b id="cRow"></b><small>' + (b.rows ? t('of', { n: b.rows }) : '&nbsp;') + '</small></div>' +
      '<div><small>' + t('posWord') + '</small><b id="cPos"></b><small>' + (n ? t('of', { n: n }) : '&nbsp;') + '</small></div></div>' +
      '<p class="small center" id="gpsTxt">' + t('gpsWait') + '</p><div class="sbtns">' +
      OC.STATUS.map(function (k) { return '<button class="sb s-' + k + '" data-s="' + k + '" style="--c:' + COLORS[k] + '"><i>' + tt('icons', k) + '</i>' + esc(tt('status', k)) + '</button>'; }).join('') + '</div>' +
      '<div class="row"><button id="bUndo">' + t('undo') + '</button><button id="bPh">' + t('addPhoto') + '</button></div>' +
      '<p class="small" id="last"></p><details><summary>' + t('jump') + '</summary><div class="row"><label>' + t('rowWord') + '<input id="jRow" inputmode="numeric"></label><label>' + t('posWord') + '<input id="jPos" inputmode="numeric"></label></div><button id="bJump">' + t('go') + '</button></details>' +
      '<p class="small">' + t('walkHelp') + '</p>';
    main.innerHTML = h;
    function show() { $('cRow').textContent = b.cur.row; $('cPos').textContent = b.cur.pos; $('jRow').value = b.cur.row; $('jPos').value = b.cur.pos; var r = recsOf(b.id)[0]; $('last').innerHTML = r ? t('lastWord') + ': ' + t('rowWord') + ' ' + r.row + ' · ' + t('posWord') + ' ' + r.pos + ' — <b>' + esc(tt('status', r.status)) + '</b>' : ''; }
    show();
    startGps(function (fx) { if ($('gpsTxt')) $('gpsTxt').textContent = fx ? t('gpsGot', { acc: Math.round(fx.acc) }) : t('gpsFail'); });
    main.querySelectorAll('[data-s]').forEach(function (btn) {
      btn.onclick = function () {
        var fx = freshFix(), r = { id: uid(), blockId: b.id, row: b.cur.row, pos: b.cur.pos, status: btn.dataset.s, t: new Date().toISOString(), lat: fx ? fx.lat : null, lon: fx ? fx.lon : null, acc: fx ? fx.acc : null, notes: '' };
        put('records', r); if (navigator.vibrate) navigator.vibrate(btn.dataset.s === 'ok' ? 15 : [30, 40, 30]);
        var nx = OC.nextPos(b.cur, b); if (nx.newRow) toast(t('newRow', { r: b.cur.row, n: nx.row }));
        b.cur = { row: nx.row, pos: nx.pos }; put('blocks', b); show();
      };
    });
    $('bUndo').onclick = function () { var r = recsOf(b.id)[0]; if (!r) return; b.cur = { row: r.row, pos: r.pos }; delRecord(r); put('blocks', b); toast(t('undone', { r: r.row, p: r.pos })); show(); };
    $('bPh').onclick = function () { var r = recsOf(b.id)[0]; if (r) go('rec/' + r.id); };
    $('bJump').onclick = function () { var rr = parseInt($('jRow').value, 10), pp = parseInt($('jPos').value, 10); if (rr > 0 && pp > 0) { b.cur = { row: rr, pos: pp }; put('blocks', b); show(); } };
  }

  function viewRecord(r) {
    var b = get('blocks', r.blockId);
    var h = top(t('recTitle', { r: r.row, p: r.pos }), 'walk/' + b.id) + '<form id="f" class="form">' +
      '<div class="card gps"><span id="gpsTxt">' + (r.lat != null ? t('gpsKeep', { acc: Math.round(r.acc) }) + ' (' + r.lat + ', ' + r.lon + ') <a target="_blank" rel="noopener" href="' + mapURL(r) + '">' + t('openMap') + '</a>' : t('noGps')) + '</span> <button type="button" class="btn small" id="bGps">' + t('gpsAgain') + '</button></div>' +
      '<div class="row"><label>' + t('rowWord') + '<input name="row" inputmode="numeric" value="' + r.row + '"></label><label>' + t('posWord') + '<input name="pos" inputmode="numeric" value="' + r.pos + '"></label></div>' +
      '<fieldset><legend>Status</legend><div class="seg">' + OC.STATUS.map(function (k) { return '<label><input type="radio" name="status" value="' + k + '"' + (k === r.status ? ' checked' : '') + '><span>' + esc(tt('status', k)) + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<label>' + t('notes') + '<textarea name="notes" rows="2" placeholder="e.g. collar rot, rabbit damage, graft failed">' + esc(r.notes || '') + '</textarea></label>' +
      '<div class="thumbs" id="th"></div><button type="button" id="bPhoto">📷 Add photo</button><button class="go big" type="submit">' + t('save') + '</button><button type="button" class="bad" id="bDel">' + t('del') + '</button></form>';
    main.innerHTML = h;
    var f = $('f'), urls = [];
    $('th').innerHTML = photosOf(r.id).map(function (p) { var u = URL.createObjectURL(p.blob); urls.push(u); return '<figure><img src="' + u + '" alt=""><figcaption>' + (p.bearing != null ? p.bearing + '° ' + OC.compassWord(p.bearing) : '') + '</figcaption></figure>'; }).join('');
    cleanup = function () { urls.forEach(URL.revokeObjectURL); };
    $('bGps').onclick = function () { startGps(function (fx) { if (!fx) return; r.lat = fx.lat; r.lon = fx.lon; r.acc = fx.acc; $('gpsTxt').textContent = t('gpsGot', { acc: Math.round(fx.acc) }) + ' (' + fx.lat + ', ' + fx.lon + ')'; }); };
    function collect() { var rr = parseInt(f.row.value, 10), pp = parseInt(f.pos.value, 10); if (rr > 0) r.row = rr; if (pp > 0) r.pos = pp; r.status = (f.querySelector('[name=status]:checked') || {}).value || r.status; r.notes = f.notes.value.trim(); return put('records', r); }
    f.onsubmit = function (e) { e.preventDefault(); stopGps(); collect().then(function () { toast(t('saved')); go('walk/' + b.id); }); };
    $('bPhoto').onclick = function () { stopGps(); collect().then(function () { go('photo/' + r.id); }); };
    $('bDel').onclick = function () { if (confirm(t('confirmDel'))) delRecord(r).then(function () { go('block/' + b.id); }); };
  }

  function compress(src, w, h) {
    var max = 1280, k = Math.min(1, max / Math.max(w, h)), cv = document.createElement('canvas');
    cv.width = Math.round(w * k); cv.height = Math.round(h * k); cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
    return new Promise(function (res) { cv.toBlob(function (bb) { res({ blob: bb, w: cv.width, h: cv.height }); }, 'image/jpeg', 0.7); });
  }
  function viewPhoto(r) {
    var stream = null, back = '#rec/' + r.id;
    main.innerHTML = '<div class="cam"><video id="vid" playsinline muted autoplay></video>' +
      '<div class="camtop"><a class="back" href="' + back + '">' + t('back') + '</a><span>' + t('recTitle', { r: r.row, p: r.pos }) + '</span><span id="hd">' + t('noCompass') + '</span></div>' +
      '<div class="cambot"><button class="go big" id="snap">' + t('takePhoto') + '</button><button id="pick">' + t('pickPhoto') + '</button>' +
      '<input type="file" id="file" accept="image/*" capture="environment" hidden></div></div>';
    document.body.className = 'v-photo';
    cleanup = function () { if (stream) stream.getTracks().forEach(function (tr) { tr.stop(); }); };
    startCompass();
    window.onHeading = function () { if (heading != null && $('hd')) $('hd').textContent = t('facing', { b: Math.round(heading), w: OC.compassWord(heading) }); };
    function saveBlob(x) { put('photos', { id: uid(), recordId: r.id, date: new Date().toISOString(), bearing: heading == null ? null : Math.round(heading), w: x.w, h: x.h, blob: x.blob }).then(function () { toast(t('photoSaved')); location.hash = back; }); }
    var vid = $('vid');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
        .then(function (st) { stream = st; vid.srcObject = st; }, function () { toast(t('noCamera')); });
    } else toast(t('noCamera'));
    $('snap').onclick = function () { if (!stream || !vid.videoWidth) return $('file').click(); compress(vid, vid.videoWidth, vid.videoHeight).then(saveBlob); };
    $('pick').onclick = function () { $('file').click(); };
    $('file').onchange = function () { var fl = this.files[0]; if (!fl) return; var img = new Image(), u = URL.createObjectURL(fl); img.onload = function () { compress(img, img.naturalWidth, img.naturalHeight).then(function (x) { URL.revokeObjectURL(u); saveBlob(x); }); }; img.src = u; };
  }

  function row(a, b) { return '<tr><td>' + a + '</td><td><b>' + b + '</b></td></tr>'; }
  function pct(v) { return v == null ? '–' : v + ' %'; }
  function viewSummary(b) {
    var o = OC.summary(b, recsOf(b.id));
    function lst(arr) { return arr.length ? '<ol class="plist">' + arr.map(function (r) { return '<li><a href="#rec/' + r.id + '"><b>' + t('rowWord') + ' ' + r.row + ', ' + t('posWord').toLowerCase() + ' ' + r.pos + '</b></a> — ' + esc(tt('status', r.status)) + (r.notes ? ' · ' + esc(r.notes) : '') + (photosOf(r.id).length ? ' 📷' : '') + '</li>'; }).join('') + '</ol>' : '<p class="empty">' + t('none') + '</p>'; }
    var h = top(t('sumTitle') + ': ' + b.name, 'block/' + b.id) +
      '<div class="card"><table class="lt">' + row(t('counted'), o.counted + (o.expected ? ' / ' + o.expected : '')) + row(t('rowsWalked'), o.rowsWalked) + (o.coverPct != null ? row(t('coverage'), pct(o.coverPct)) : '') +
      OC.STATUS.map(function (k) { return row('<i class="dot" style="background:' + COLORS[k] + '"></i>' + esc(tt('status', k)), o[k]); }).join('') +
      row(t('gapPct'), pct(o.gapPct)) + row(t('lossPct'), pct(o.lossPct)) + row(t('replantPct'), pct(o.replantPct)) +
      (o.estLiving != null ? row(t('estLiving'), o.estLiving) + row(t('estReplant'), o.estReplant) : '') + '</table>' + (o.estLiving != null ? '<p class="small">' + t('estNote') + '</p>' : '') + '</div>' +
      '<div class="card"><h3>' + t('replantList', { n: o.replantN }) + '</h3>' + lst(o.replantList) + '<h3>' + t('sickList', { n: o.sickList.length }) + '</h3>' + lst(o.sickList) + '</div>' +
      '<div class="row"><button id="bShare">' + t('shareList') + '</button><button id="bExp">' + t('exportThis') + '</button></div>';
    main.innerHTML = h;
    $('bShare').onclick = function () { shareText(replantText(b)); }; $('bExp').onclick = function () { exportSheet(b.id); };
  }

  function viewYield(b) {
    var o = OC.summary(b, recsOf(b.id)), y = b.yieldS || {}, defTrees = y.trees || o.estLiving || o.expected || '';
    var h = top(t('yTitle'), 'block/' + b.id) + '<div class="card warn">' + t('yCaveat') + '</div><form id="f" class="form">' +
      '<label>' + t('yCounts') + '<textarea name="counts" id="yc" rows="3" inputmode="numeric" placeholder="120 95 160 140 …">' + esc(y.counts || '') + '</textarea></label>' +
      '<div class="step"><span class="small">' + t('yAdd') + '</span><input id="one" inputmode="numeric"><button type="button" id="bOne">+</button></div>' +
      '<label>' + t('yTrees') + '<input name="trees" inputmode="numeric" value="' + esc(defTrees) + '"></label><p class="small">' + t('yTreesHelp') + '</p>' +
      '<label>' + t('yFruitG') + '<input name="fruitG" inputmode="decimal" value="' + esc(y.fruitG || '') + '"></label><p class="small">' + t('yFruitEg') + '</p>' +
      '<div class="card" id="yOut"></div><button class="go big" type="submit">' + t('ySave') + '</button></form>';
    main.innerHTML = h;
    var f = $('f');
    function fmt(x) { return x == null ? '–' : Number(x).toLocaleString('en'); }
    function upd() {
      var e = OC.yieldEstimate(OC.parseCounts(f.counts.value), f.trees.value, f.fruitG.value);
      if (!e) { $('yOut').innerHTML = '<p class="empty">' + t('yNone') + '</p>'; return; }
      var m = '<h3>' + t('yMaths') + '</h3><table class="lt">' + row('Trees sampled (n)', e.n) + row('Total fruit counted', fmt(e.sum)) + row('Average per tree = ' + fmt(e.sum) + ' ÷ ' + e.n, fmt(e.mean)) +
        (e.sd != null ? row('Spread (standard deviation)', fmt(e.sd) + ' (CV ' + e.cv + ' %)') + row('Standard error = SD ÷ √n', fmt(e.se)) + row('95 % range per tree = mean ± ' + e.t + ' × SE', fmt(e.lo) + ' – ' + fmt(e.hi)) : '') +
        (e.trees ? row('Block fruit = ' + fmt(e.mean) + ' × ' + fmt(e.trees) + ' trees', '<span id="yFruit">' + fmt(e.fruit) + '</span>') + (e.fruitLo != null ? row('Block range', fmt(e.fruitLo) + ' – ' + fmt(e.fruitHi)) : '') : '') +
        (e.tonnes != null ? row('Tonnes = fruit × ' + e.fruitG + ' g ÷ 1 000 000', '<span id="yT">' + e.tonnes + ' t</span>' + (e.tLo != null ? ' (' + e.tLo + ' – ' + e.tHi + ')' : '')) : '') + '</table>' +
        (e.warnFew ? '<p class="ck-below"><b>' + t('yFew') + '</b></p>' : '') + (e.nFor10 ? '<p class="small">For about ±10 % on the average, you would need roughly ' + e.nFor10 + ' sample trees with this much spread.</p>' : '');
      $('yOut').innerHTML = m;
    }
    f.addEventListener('input', upd); upd();
    $('bOne').onclick = function () { var v = OC.num($('one').value); if (v == null || v < 0) return; f.counts.value = (f.counts.value.trim() ? f.counts.value.trim() + ' ' : '') + Math.round(v); $('one').value = ''; $('one').focus(); upd(); };
    f.onsubmit = function (e) { e.preventDefault(); b.yieldS = { counts: f.counts.value.trim(), trees: f.trees.value.trim(), fruitG: f.fruitG.value.trim(), date: new Date().toISOString() }; put('blocks', b).then(function () { toast(t('yOk')); }); };
  }

  function viewAbout() {
    main.innerHTML = top(t('about'), '') + '<div class="card">' + t('aboutText') + '</div><div class="card"><h3>How to use</h3>' + t('howToText') + '</div>' +
      '<div class="card"><h3>' + t('limitsTitle') + '</h3>' + t('limitsText') + '</div><div class="card"><h3>' + t('sourcesTitle') + '</h3>' + t('sourcesText') + '</div>' +
      (window.MoreTools ? MoreTools.html('orchard-counter') : '') +
      '<p class="small center">' + t('version', { v: VERSION }) + ' · <a href="https://github.com/johnrichardszpe-dot/orchard-counter">GitHub</a></p>';
  }

  // ---------- start ----------
  window.addEventListener('hashchange', render);
  $('sheet').addEventListener('click', function (e) { if (e.target.id === 'sheet') closeSheet(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && gps.watch != null && navigator.wakeLock && (!gps.lock || gps.lock.released)) navigator.wakeLock.request('screen').then(function (l) { gps.lock = l; }, function () {}); });
  openDB().then(function (d) { idb = d; return loadAll(); }).catch(function () { toast(t('storageWarn')); }).then(function () {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    render();
  });
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  window.OCApp = { DB: DB, version: VERSION, replantText: replantText };
})();
