/* node test.js - unit tests for logic.js */
process.env.TZ = 'Australia/Perth';
var O = require('./logic.js'), assert = require('assert'), n = 0;
function t(name, fn) { fn(); n++; console.log('ok', name); }
t('trees per hectare = 10000 / (row x tree spacing)', function () {
  assert.strictEqual(O.treesPerHa(7, 4), 357); assert.strictEqual(O.treesPerHa(8, 5), 250); assert.strictEqual(O.treesPerHa('4,5', 2), 1111);
  assert.strictEqual(O.treesPerHa(0, 4), null); assert.strictEqual(O.treesPerHa('', 4), null);
});
t('trees per row, expected trees, block area', function () {
  assert.strictEqual(O.treesInRow(100, 4), 26); assert.strictEqual(O.treesInRow(99.9, 4), 25); assert.strictEqual(O.treesInRow(12, 0.4 * 10), 4);
  assert.strictEqual(O.perRow({ perRow: '40', rowLen: 100, treeSp: 4 }), 40);
  assert.strictEqual(O.expectedTrees({ rows: 10, perRow: 40 }), 400); assert.strictEqual(O.expectedTrees({ rows: 10, rowLen: 100, treeSp: 4 }), 260);
  assert.strictEqual(O.expectedTrees({ rows: 10 }), null);
  assert.strictEqual(O.blockHa({ rows: 10, perRow: 40, rowSp: 7, treeSp: 4 }), 1.12);
  assert.strictEqual(O.ageYears(2018, new Date(2026, 5, 1)), 8); assert.strictEqual(O.ageYears(2030, new Date(2026, 5, 1)), null);
});
t('walk position auto-advance (straight and snake)', function () {
  var b = { perRow: 3 };
  assert.deepStrictEqual(O.nextPos({ row: 1, pos: 1 }, b), { row: 1, pos: 2, newRow: false });
  assert.deepStrictEqual(O.nextPos({ row: 1, pos: 3 }, b), { row: 2, pos: 1, newRow: true });
  var s = { perRow: 3, snake: true };
  assert.deepStrictEqual(O.nextPos({ row: 1, pos: 3 }, s), { row: 2, pos: 3, newRow: true });
  assert.deepStrictEqual(O.nextPos({ row: 2, pos: 3 }, s), { row: 2, pos: 2, newRow: false });
  assert.deepStrictEqual(O.nextPos({ row: 2, pos: 1 }, s), { row: 3, pos: 1, newRow: true });
  assert.deepStrictEqual(O.nextPos({ row: 4, pos: 99 }, {}), { row: 4, pos: 100, newRow: false }); // unknown row length: keep counting
});
t('summary: gap %, replant list, latest record per tree wins, scale-up', function () {
  var b = { rows: 10, perRow: 10, rowSp: 7, treeSp: 4 }, R = [];
  function add(row, pos, st, tm) { R.push({ id: row + '-' + pos + '-' + tm, row: row, pos: pos, status: st, t: '2026-10-21T0' + tm + ':00:00Z' }); }
  for (var p = 1; p <= 10; p++) add(1, p, 'ok', 1);
  add(1, 3, 'missing', 2); add(1, 7, 'dead', 2); add(2, 1, 'replant', 1); add(2, 2, 'sick', 1); add(2, 3, 'missing', 1); add(2, 4, 'ok', 1); add(2, 4, 'missing', 0); // older one ignored
  var o = O.summary(b, R);
  assert.strictEqual(o.counted, 14); assert.strictEqual(o.missing, 2); assert.strictEqual(o.dead, 1); assert.strictEqual(o.replant, 1); assert.strictEqual(o.sick, 1); assert.strictEqual(o.ok, 9);
  assert.strictEqual(o.gapPct, 14.3); assert.strictEqual(o.lossPct, 21.4); assert.strictEqual(o.replantN, 4); assert.strictEqual(o.replantPct, 28.6);
  assert.strictEqual(o.expected, 100); assert.strictEqual(o.coverPct, 14); assert.strictEqual(o.estLiving, 71); assert.strictEqual(o.estReplant, 29);
  assert.deepStrictEqual(o.replantList.map(function (r) { return r.row + '/' + r.pos; }), ['1/3', '1/7', '2/1', '2/3']);
  assert.strictEqual(o.rowsWalked, 2); assert.strictEqual(O.summary({}, []).gapPct, null);
});
t('yield estimate maths', function () {
  var e = O.yieldEstimate([100, 120, 80, 100], 1000, 200);
  assert.strictEqual(e.mean, 100); assert.strictEqual(e.sd, 16.3); assert.strictEqual(e.se, 8.2); assert.strictEqual(e.t, 3.18);
  assert.strictEqual(e.fruit, 100000); assert.strictEqual(e.tonnes, 20); assert.strictEqual(e.lo, 74); assert.strictEqual(e.hi, 126); assert(e.warnFew);
  var one = O.yieldEstimate([50], 10); assert.strictEqual(one.sd, null); assert.strictEqual(one.fruit, 500); assert.strictEqual(one.lo, null);
  assert.strictEqual(O.yieldEstimate([], 10), null);
  assert.deepStrictEqual(O.parseCounts('12, 30;  7\n x 4,5'), [12, 30, 7, 4, 5]);
  assert.strictEqual(O.t95(9), 2.26); assert(Math.abs(O.t95(200) - 1.972) < 0.01);
});
t('CSV escaping + formula-injection guard', function () {
  assert.strictEqual(O.csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"'); assert.strictEqual(O.csvCell('+1 bad'), "'+1 bad"); assert.strictEqual(O.csvCell('@x'), "'@x");
  assert.strictEqual(O.csvCell(-31.95), '-31.95'); assert.strictEqual(O.csvCell('-31.95'), '-31.95'); assert.strictEqual(O.csvCell('a,b'), '"a,b"'); assert.strictEqual(O.csvCell(true), 'yes');
  var db = { blocks: [{ id: 'b', name: 'Blk', crop: 'avocado' }], records: [{ id: 'r2', blockId: 'b', row: 1, pos: 2, status: 'dead', t: '2026-10-21T02:00:00Z', lat: -34.25, lon: 116.15, acc: 6.4, notes: '=cmd' }, { id: 'r1', blockId: 'b', row: 1, pos: 1, status: 'ok', t: '2026-10-21T01:00:00Z' }], photos: [{ recordId: 'r2', bearing: 90 }] };
  var csv = O.toCSV(O.CSV_COLS, O.csvRows(db, null, { status: { dead: 'Dead' } })).split('\r\n');
  assert.strictEqual(csv[0], O.CSV_COLS.join(',')); assert(csv[1].indexOf('Blk,avocado,,1,1,ok,no') === 0);
  assert(csv[2].indexOf(',1,2,Dead,yes,2026-10-21 10:00,-34.25,116.15,6,1,90,\'=cmd,r2') > 0, csv[2]);
});
t('compass', function () { assert.strictEqual(O.compassWord(44), 'NE'); assert.strictEqual(O.norm360(-10), 350); });
console.log(n + ' tests passed');
