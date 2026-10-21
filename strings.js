/* Orchard Counter - all user-facing text. To translate: copy STRINGS.en to e.g. STRINGS.es and translate the values. */
var STRINGS = {
  en: {
    appName: 'Orchard Counter', tagline: 'Free, offline tree counts, gaps and replant lists for orchards, groves and vineyards',
    back: '‹ Back', save: 'Save', saved: 'Saved', del: 'Delete', close: 'Close', copy: 'Copy', copied: 'Copied', share: 'Share',
    newBlock: '+ New block', blocks: 'Your blocks', noBlocks: 'No blocks yet. Tap “New block” to set one up.',
    exportAll: 'Export / backup', restore: 'Restore backup', about: 'About & sources', badFile: 'That is not an Orchard Counter backup file.',
    restored: 'Restored {n} items', nothing: 'Nothing to export yet', exported: 'Saved {f}', storageWarn: 'Could not save on this phone (private mode?). Export often.',
    version: 'Version {v}',
    // block form
    editBlock: 'Edit block', blockName: 'Block name', blockNameEg: 'e.g. Block 3 – Hass, north slope', crop: 'Crop', variety: 'Variety / rootstock (optional)',
    crops: { avocado: 'Avocado', apple: 'Apple', pear: 'Pear', olive: 'Olive', macadamia: 'Macadamia', citrus: 'Citrus', stone: 'Stone fruit (peach, plum, cherry…)', grape: 'Grapevine', nut: 'Other nut (almond, walnut, pecan, hazelnut…)', truffle: 'Truffière (oak / hazel host trees)', mango: 'Mango', plantation: 'Plantation / woodlot', other: 'Other' },
    rowSp: 'Row spacing (m, row to row)', treeSp: 'Tree spacing (m, along the row)', rows: 'Number of rows', perRow: 'Trees per row', rowLen: 'or row length (m)',
    perRowHelp: 'Give trees per row, or the row length and the app works it out (length ÷ spacing + 1).',
    year: 'Planting year (optional)', snake: 'I walk back along the next row (number positions back down on even rows)',
    notes: 'Notes', calc: 'Area per tree {a} m² · {ha} trees/ha · expected {n} trees · block about {b} ha', calcAge: ' · trees {y} years old',
    calcNeed: 'Enter row and tree spacing to see trees per hectare.', delBlock: 'Delete this block', confirmDelBlock: 'Delete this block and all its records and photos?',
    // block page
    walk: '▶ Walk a row', summary: 'Gaps & replant list', yieldBtn: 'Quick yield sample', exportThis: 'Export this block',
    statCounted: 'Trees recorded', statExpected: 'Expected', statGap: 'Gaps', statReplant: 'To replant', recordsN: 'Recent records',
    noRecords: 'Nothing recorded yet. Tap “Walk a row”.', perHaShort: '{v} trees/ha',
    // walk mode
    rowWord: 'Row', posWord: 'Tree', of: 'of {n}', gpsWait: 'GPS: waiting…', gpsGot: 'GPS ±{acc} m', gpsFail: 'No GPS (records still saved)',
    status: { ok: 'Tree OK', missing: 'Missing (gap)', dead: 'Dead', sick: 'Sick', replant: 'Needs replant' },
    statusShort: { ok: 'OK', missing: 'Gap', dead: 'Dead', sick: 'Sick', replant: 'Replant' },
    icons: { ok: '✔', missing: '◌', dead: '✖', sick: '✚', replant: '↻' },
    undo: '↶ Undo last', undone: 'Removed {r}/{p}', jump: 'Change row / tree number', go: 'Go', addPhoto: '📷 Photo / note for last', newRow: 'Row {r} done — now row {n}',
    walkHelp: 'Tap one button per planting spot as you pass it. The tree number moves on by itself. Recording a spot again replaces the old status.',
    lastWord: 'Last',
    // record
    recTitle: 'Row {r}, tree {p}', gpsAgain: 'Update GPS', gpsKeep: 'Saved ±{acc} m', noGps: 'no GPS', takePhoto: 'Take photo', pickPhoto: 'Choose from gallery', noCamera: 'Camera not available – use “Choose from gallery”.',
    noCompass: 'No compass', facing: 'Facing {b}° {w}', photoSaved: 'Photo saved', confirmDel: 'Delete this record?', openMap: 'Map',
    // summary
    sumTitle: 'Gaps & replant', counted: 'Positions recorded', coverage: 'Coverage of expected', gapPct: 'Gap % (missing ÷ recorded)', lossPct: 'Missing + dead %',
    replantPct: 'To replant % (missing + dead + needs replant)', estLiving: 'Estimated living trees in block *', estReplant: 'Estimated replants for whole block *',
    estNote: '* Scaled up from the positions you recorded (expected × share). Only fair if the rows you walked are typical of the block.',
    replantList: 'Replant list ({n})', sickList: 'Sick trees to watch ({n})', none: 'None', shareList: 'Share replant list', rowsWalked: 'Rows walked',
    listHead: 'REPLANT LIST – {name} ({crop}) – {date}', listFoot: 'Made with Orchard Counter (free)',
    // yield
    yTitle: 'Quick yield sample', yCaveat: '<b>Rough estimate only.</b> Count all fruit on a few trees spread through the block (light, medium and heavy parts — at least 10 trees, more is better). The app multiplies the average by the number of trees. Hidden fruit, uneven blocks, fruit drop, picking losses and pick-not-at-once crops all make the real harvest differ. Compare with your packhouse figures each year.',
    yCounts: 'Fruit counted on each sample tree (separate with spaces or commas)', yAdd: 'Add one tree:', yTrees: 'Trees to multiply by (productive trees in block)', yTreesHelp: 'Defaults to the estimated living trees (or expected trees) of this block. Change it if you know better.',
    yFruitG: 'Average fruit weight (g, optional — gives tonnes)', yFruitEg: 'e.g. avocado 200–250 g, apple 150–200 g, macadamia nut-in-shell ~7 g, wine grape bunch 100–150 g',
    yMaths: 'The maths', yNone: 'Enter at least one count.', yFew: 'Fewer than 10 trees — the range is wide and the estimate may be well off.',
    ySave: 'Save sample', yOk: 'Sample saved',
    // export
    exportTitle: 'Export', csv: 'Records CSV (spreadsheet / GIS)', listTxt: 'Replant list (text file)', backup: 'Full backup (JSON)', backupPhotos: 'Include photos in the backup? (Bigger file.)',
    // about
    sourcesTitle: 'Methods & sources', limitsTitle: 'Honest limits',
    aboutText: '<p><b>Orchard Counter</b> is a free phone app for counting trees row by row in orchards, groves, vineyards and plantations anywhere in the world: avocado, apple, olive, macadamia, citrus, vines, nuts, truffière host trees and more. It works offline, needs no account, and keeps your data on this phone until you export it.</p><p>By John Richards.</p>',
    howToText: '<ol><li><b>New block:</b> name it, pick the crop, enter row spacing, tree spacing, number of rows and trees per row (or row length). You see trees per hectare and the expected tree count.</li><li><b>Walk a row:</b> at each planting spot tap <i>Tree OK, Missing, Dead, Sick</i> or <i>Needs replant</i>. Row and tree numbers move on by themselves; GPS is saved with each tap. Use <i>Undo</i> for mistakes and <i>Photo / note</i> for problem trees.</li><li><b>Gaps & replant list:</b> gap %, replant count and a list by row and tree number to share with the crew or nursery.</li><li><b>Quick yield sample</b> (optional): count fruit on 10+ trees for a rough block estimate with the maths shown.</li><li><b>Export</b> CSV, replant list or a JSON backup.</li></ol>',
    limitsText: '<ul><li>A counting notebook, not a certified orchard audit, crop forecast or insurance assessment.</li><li>Phone GPS is often ±5–15 m — enough to find the row, not the exact tree. Row and tree numbers are the reliable address.</li><li>Yield estimates from a few hand-counted trees are rough; the ± range assumes a simple random sample and ignores counting error and hidden fruit.</li><li>Data lives only on this phone; clearing browser data deletes it — export backups.</li><li>English only for now (all text is in strings.js for translation).</li></ul>',
    sourcesText: '<ul><li><b>Trees per hectare</b> = 10 000 m² ÷ (row spacing × tree spacing). Example from DPIRD WA <i>Growing avocados in Western Australia</i> (Bulletin): 7 m × 4 m = 28 m² per tree; close spacing common in WA. <a href="https://library.dpird.wa.gov.au/cgi/viewcontent.cgi?article=1143&context=bulletins">DPIRD library</a></li><li>WA apple spacings 4.5 × 2.0 to 5.5 × 3.5 m: Acta Horticulturae 240 <i>An apple production system for Western Australia</i>; DPIRD <a href="https://www.dpird.wa.gov.au/research/research-areas/horticulture-research/narrow-orchard-systems/">narrow orchard systems</a> (2.5 m rows).</li><li><b>Yield sampling</b>: California Avocado Growers <a href="https://www.californiaavocadogrowers.com/industry/crop-statistics/crop-estimate-form">crop estimate steps</a> (≥ 10 trees across light, medium and heavy areas, average × tree count, check tree count from spacing); Hort Innovation project AV18002 <a href="https://www.horticulture.com.au/information-hub/our-projects/project-reports/av18002">final report</a> and Rahman et al. 2020 (UNE) — 18 trees from high/medium/low vigour zones; visual counts of a few trees can be very inaccurate if they are not representative.</li><li><b>± range</b>: standard Student-t 95 % confidence interval of the mean (mean ± t × SD ÷ √n), from any statistics text. “Trees needed for ±10 %” uses n ≈ (1.96 × CV ÷ 10)².</li></ul>'
  }
};
