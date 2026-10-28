/* eslint-disable */
/**
 * Post-import step: merge byte-identical DAM assets in one DAM sub folder.
 *
 * Example: the model finder overview card "Audi A3" and the A3 sub page card
 * "A3 Limousine" use the same render, downloaded twice as cards/audi-a3.png and
 * cards/a3-limousine.png. This keeps one file and points every page at it.
 *
 * Canonical name of a group of identical files: the name referenced by the deepest
 * page (sub page wins over the overview); ties -> the name with most referencing
 * pages, then alphabetical.
 *
 * Updates: content/**\/*.plain.html references, the local DAM mirror (duplicates are
 * deleted), tools/importer/dam-assets-registry.json and the asset lists
 * (tools/importer/dam-upload/audidemo-dam-assets.csv, migration-work/upload/audidemo-dam-assets.csv).
 *
 * Run after post-import-dam.mjs, whenever the pages using the folder were re-imported.
 * Usage: node tools/importer/dedupe-dam-assets.mjs <folder>   (e.g. cards)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const folder = (process.argv[2] || '').replace(/^\/+|\/+$/g, '');
if (!folder) {
  console.error('Usage: node tools/importer/dedupe-dam-assets.mjs <folder>');
  process.exit(1);
}

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'content');
const DAM_DIR = path.join(CONTENT, 'content', 'dam', 'audidemo', folder);
const DAM_PATH = `/content/dam/audidemo/${folder}/`;
const REGISTRY = path.join(ROOT, 'tools', 'importer', 'dam-assets-registry.json');
const CSVS = [
  path.join(ROOT, 'tools', 'importer', 'dam-upload', 'audidemo-dam-assets.csv'),
  path.join(ROOT, 'migration-work', 'upload', 'audidemo-dam-assets.csv'),
];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 1. identical files
const groups = new Map();
fs.readdirSync(DAM_DIR).filter((f) => fs.statSync(path.join(DAM_DIR, f)).isFile()).forEach((f) => {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(DAM_DIR, f))).digest('hex');
  if (!groups.has(hash)) groups.set(hash, []);
  groups.get(hash).push(f);
});

// 2. which pages reference which file
const pages = [];
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (p !== path.join(CONTENT, 'content')) walk(p);
    } else if (e.name.endsWith('.plain.html')) pages.push(p);
  });
}(CONTENT));
const pagePath = (file) => `/${path.relative(CONTENT, file).replace(/\.plain\.html$/, '')}`;
const refs = new Map(); // name -> Set(page path)
const refRe = new RegExp(`${escape(DAM_PATH)}([^"'\\s?)]+)`, 'g');
pages.forEach((file) => {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(refRe)) {
    if (!refs.has(m[1])) refs.set(m[1], new Set());
    refs.get(m[1]).add(pagePath(file));
  }
});
const depth = (name) => Math.max(0, ...[...(refs.get(name) || [])].map((p) => p.split('/').length));
const count = (name) => (refs.get(name) || new Set()).size;

// 3. canonical name per group
const replace = new Map(); // dropped name -> canonical name
groups.forEach((names) => {
  if (names.length < 2) return;
  const [keep, ...drop] = [...names].sort((a, b) => depth(b) - depth(a) || count(b) - count(a) || a.localeCompare(b));
  drop.forEach((d) => replace.set(d, keep));
});
if (!replace.size) {
  console.log(`${folder}: no identical files`);
  process.exit(0);
}

// 4. page references
pages.forEach((file) => {
  const html = fs.readFileSync(file, 'utf8');
  let out = html;
  replace.forEach((keep, drop) => {
    out = out.replace(new RegExp(`${escape(DAM_PATH + drop)}(?=["'\\s?)])`, 'g'), DAM_PATH + keep);
  });
  if (out !== html) {
    fs.writeFileSync(file, out);
    console.log(`updated ${pagePath(file)}`);
  }
});

// 5. local DAM mirror + registry
const registry = fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) : {};
replace.forEach((keep, drop) => {
  try {
    fs.rmSync(path.join(DAM_DIR, drop));
  } catch (e) {
    console.log(`could not delete ${folder}/${drop}: ${e.message}`);
  }
  delete registry[`${folder}/${drop}`];
  console.log(`${folder}/${drop} -> ${folder}/${keep}`);
});
fs.writeFileSync(REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);

// 6. asset lists: drop duplicate rows, merge their pages into the kept row
CSVS.filter((f) => fs.existsSync(f)).forEach((csv) => {
  const raw = fs.readFileSync(csv, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(eol);
  const rows = lines.map((l) => l.split(','));
  const byFile = new Map(rows.map((r) => [r[0], r]));
  replace.forEach((keep, drop) => {
    const kept = byFile.get(`${folder}/${keep}`);
    const dropped = byFile.get(`${folder}/${drop}`);
    if (kept && dropped) kept[4] = [...new Set([...kept[4].split(' '), ...dropped[4].split(' ')].filter(Boolean))].sort().join(' ');
  });
  const out = rows.filter((r) => !(r[0].startsWith(`${folder}/`) && replace.has(r[0].slice(folder.length + 1))));
  fs.writeFileSync(csv, out.map((r) => r.join(',')).join(eol));
  console.log(`${path.relative(ROOT, csv)}: ${rows.length - out.length} row(s) removed`);
});
console.log(`${replace.size} duplicate(s) merged`);
