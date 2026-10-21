/* Orchard Counter - pure helpers shared by the app and the node tests (no DOM).
   Sources for every method are listed in README.md and the About screen. */
(function (root) {
  'use strict';
  var VERSION = '0.1.0';
  function num(x) { if (x == null || x === '') return null; x = +String(x).trim().replace(',', '.'); return isFinite(x) ? x : null; }
  function r1(x) { return x == null ? null : Math.round(x * 10) / 10; }
  function r2(x) { return x == null ? null : Math.round(x * 100) / 100; }

  // ---- block layout ----
  // Area per tree (m2) = row spacing x tree spacing; trees/ha = 10 000 / area per tree.
  // (e.g. DPIRD WA avocado 7 m x 4 m = 28 m2 per tree = 357 trees/ha)
  function treesPerHa(rowM, treeM) { var a = num(rowM), b = num(treeM); return a > 0 && b > 0 ? Math.round(10000 / (a * b)) : null; }
  // Trees that fit along a row of a given length (first tree at 0 m): floor(len / spacing) + 1
  function treesInRow(lenM, treeM) { var l = num(lenM), s = num(treeM); return l > 0 && s > 0 ? Math.floor(l / s + 1e-9) + 1 : null; }
  function perRow(b) { var n = num(b && b.perRow); if (n > 0) return Math.round(n); return treesInRow(b && b.rowLen, b && b.treeSp); }
  function expectedTrees(b) { var r = num(b && b.rows), p = perRow(b); return r > 0 && p ? Math.round(r) * p : null; }
  // Block area (ha) from the planting grid: rows x trees per row x area per tree.
  function blockHa(b) { var n = expectedTrees(b), a = num(b && b.rowSp), t = num(b && b.treeSp); return n && a > 0 && t > 0 ? r2(n * a * t / 10000) : null; }
  function ageYears(year, now) { var y = num(year); if (!y) return null; var cur = (now || new Date()).getFullYear(); return y <= cur ? cur - Math.round(y) : null; }

  // ---- walk-a-row position ----
  // Next tree position. Optional "snake" walking: odd rows count up, even rows count down (you walk back along the next row).
  function startPos(row, b) { return b && b.snake && row % 2 === 0 && perRow(b) ? perRow(b) : 1; }
  function nextPos(cur, b) {
    var n = perRow(b), up = !(b && b.snake && cur.row % 2 === 0);
    var p = cur.pos + (up ? 1 : -1);
    if (n && (p > n || p < 1)) { var row = cur.row + 1; return { row: row, pos: startPos(row, b), newRow: true }; }
    if (p < 1) p = 1;
    return { row: cur.row, pos: p, newRow: false };
  }

  // ---- statuses ----
  var STATUS = ['ok', 'missing', 'dead', 'sick', 'replant'];
  var NEEDS_REPLANT = { missing: 1, dead: 1, replant: 1 };
  // Latest record per tree position wins (so a re-walk or correction replaces the old status).
  function latestByTree(recs) {
    var m = {}; (recs || []).forEach(function (r) { var k = r.row + ':' + r.pos; if (!m[k] || m[k].t <= r.t) m[k] = r; });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return a.row - b.row || a.pos - b.pos; });
  }
  function summary(b, recs) {
    var trees = latestByTree(recs), o = { counted: trees.length, ok: 0, missing: 0, dead: 0, sick: 0, replant: 0, rows: {} };
    trees.forEach(function (r) { o[r.status] = (o[r.status] || 0) + 1; o.rows[r.row] = (o.rows[r.row] || 0) + 1; });
    o.rowsWalked = Object.keys(o.rows).length;
    o.expected = expectedTrees(b); o.perHa = treesPerHa(b.rowSp, b.treeSp); o.ha = blockHa(b);
    o.living = o.ok + o.sick + o.replant;            // "needs replant" may be alive but failing
    o.replantN = o.missing + o.dead + o.replant;
    o.gapPct = o.counted ? r1(100 * o.missing / o.counted) : null;                 // empty planting spots
    o.lossPct = o.counted ? r1(100 * (o.missing + o.dead) / o.counted) : null;     // empty + dead
    o.replantPct = o.counted ? r1(100 * o.replantN / o.counted) : null;
    o.coverPct = o.expected ? r1(100 * o.counted / o.expected) : null;
    // Scale up to the whole block only from the share of positions actually walked.
    o.estLiving = o.expected && o.counted ? Math.round(o.expected * (o.ok + o.sick) / o.counted) : null;
    o.estReplant = o.expected && o.counted ? Math.round(o.expected * o.replantN / o.counted) : null;
    o.replantList = trees.filter(function (r) { return NEEDS_REPLANT[r.status]; });
    o.sickList = trees.filter(function (r) { return r.status === 'sick'; });
    return o;
  }

  // ---- yield sample ----
  // Two-sided 95 % Student t values for n-1 degrees of freedom.
  var T95 = [0, 12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20, 2.18, 2.16, 2.14, 2.13, 2.12, 2.11, 2.10, 2.09, 2.09, 2.08, 2.07, 2.07, 2.06, 2.06, 2.06, 2.05, 2.05, 2.05, 2.04];
  function t95(df) { return df < 1 ? null : df < T95.length ? T95[df] : 1.96 + 2.4 / df; }
  function parseCounts(txt) { return String(txt || '').split(/[\s,;]+/).map(num).filter(function (x) { return x != null && x >= 0; }); }
  // mean fruit/tree x productive trees -> block fruit; x average fruit weight -> tonnes. Range = mean +/- t * SE (simple random sample).
  function yieldEstimate(counts, trees, fruitG) {
    var n = counts.length; if (!n) return null;
    var sum = counts.reduce(function (a, b) { return a + b; }, 0), mean = sum / n;
    var sd = n > 1 ? Math.sqrt(counts.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / (n - 1)) : null;
    var se = sd != null ? sd / Math.sqrt(n) : null, tv = n > 1 ? t95(n - 1) : null;
    var lo = se != null ? Math.max(0, mean - tv * se) : null, hi = se != null ? mean + tv * se : null;
    var N = num(trees), g = num(fruitG), o = { n: n, sum: sum, mean: r1(mean), sd: r1(sd), se: r1(se), t: tv, cv: sd != null && mean > 0 ? Math.round(100 * sd / mean) : null, lo: r1(lo), hi: r1(hi), trees: N > 0 ? Math.round(N) : null, fruitG: g > 0 ? g : null };
    if (o.trees) { o.fruit = Math.round(mean * o.trees); o.fruitLo = lo != null ? Math.round(lo * o.trees) : null; o.fruitHi = hi != null ? Math.round(hi * o.trees) : null; }
    if (o.trees && o.fruitG) { var k = o.fruitG / 1e6; o.tonnes = r2(o.fruit * k); o.tLo = o.fruitLo != null ? r2(o.fruitLo * k) : null; o.tHi = o.fruitHi != null ? r2(o.fruitHi * k) : null; }
    // trees needed for +/- 10 % of the mean at 95 % (n = (t * CV / 10)^2), rough guide only
    if (o.cv != null) o.nFor10 = Math.ceil(Math.pow(1.96 * o.cv / 10, 2));
    o.warnFew = n < 10;
    return o;
  }

  // ---- geo / compass / dates (same as sibling apps) ----
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function norm360(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function cameraHeading(alpha, beta, gamma) {
    var a = alpha * D2R, b = beta * D2R, g = gamma * D2R;
    var ca = Math.cos(a), sa = Math.sin(a), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
    var east = -(ca * sg + sa * sb * cg), north = ca * sb * cg - sa * sg;
    if (Math.abs(east) < 1e-9 && Math.abs(north) < 1e-9) return null;
    return norm360(Math.atan2(east, north) * R2D);
  }
  var DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function compassWord(deg) { return deg == null ? '' : DIRS[Math.round(norm360(deg) / 45) % 8]; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function localStamp(iso) { var t = new Date(iso); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes()); }

  // ---- CSV (RFC 4180 + formula-injection guard) ----
  function csvCell(v) {
    if (v == null) return ''; if (typeof v === 'number') return isFinite(v) ? String(v) : '';
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    var s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^[-+]?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(s)) s = "'" + s;
    return /[",\r\n]|^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(cols, rows) { return [cols].concat(rows.map(function (r) { return cols.map(function (c) { return r[c]; }); })).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n'; }
  var CSV_COLS = ['block', 'crop', 'variety', 'row', 'position', 'status', 'needs_replant', 'date_local', 'latitude', 'longitude', 'accuracy_m', 'photos', 'photo_bearings', 'notes', 'record_id'];
  function csvRows(db, blockId, L) {
    L = L || {}; var bl = {}; (db.blocks || []).forEach(function (b) { bl[b.id] = b; });
    return (db.records || []).filter(function (r) { return bl[r.blockId] && (!blockId || r.blockId === blockId); })
      .sort(function (a, b) { return a.blockId < b.blockId ? -1 : a.blockId > b.blockId ? 1 : a.row - b.row || a.pos - b.pos || (a.t < b.t ? -1 : 1); }).map(function (r) {
        var b = bl[r.blockId], ph = (db.photos || []).filter(function (p) { return p.recordId === r.id; });
        return { block: b.name, crop: (L.crops && L.crops[b.crop]) || b.crop || '', variety: b.variety || '', row: r.row, position: r.pos, status: (L.status && L.status[r.status]) || r.status,
          needs_replant: !!NEEDS_REPLANT[r.status], date_local: localStamp(r.t), latitude: r.lat, longitude: r.lon, accuracy_m: r.acc != null ? Math.round(r.acc) : null,
          photos: ph.length || null, photo_bearings: ph.filter(function (p) { return p.bearing != null; }).map(function (p) { return p.bearing; }).join(' '), notes: r.notes || '', record_id: r.id };
      });
  }

  var api = { VERSION: VERSION, num: num, treesPerHa: treesPerHa, treesInRow: treesInRow, perRow: perRow, expectedTrees: expectedTrees, blockHa: blockHa, ageYears: ageYears,
    startPos: startPos, nextPos: nextPos, STATUS: STATUS, NEEDS_REPLANT: NEEDS_REPLANT, latestByTree: latestByTree, summary: summary, t95: t95, parseCounts: parseCounts,
    yieldEstimate: yieldEstimate, norm360: norm360, cameraHeading: cameraHeading, compassWord: compassWord, localStamp: localStamp, csvCell: csvCell, toCSV: toCSV, CSV_COLS: CSV_COLS, csvRows: csvRows };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.OC = api;
})(this);
