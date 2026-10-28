/* eslint-disable */
/**
 * Post-import step for Audi DAM assets (see transformers/audi-dam-assets.js).
 *
 * 1. Links: the importer re-absolutizes root-relative link hrefs against the source
 *    origin, so `/content/dam/audidemo/<file>` links (videos) come out as
 *    `https://www.audi.de/content/dam/audidemo/<file>`. Restore the DAM path.
 * 2. Assets: download every asset recorded in the import report (`damAssets`:
 *    { "<file>": "<full-size original URL>" }) into the local DAM mirror
 *    content/content/dam/audidemo/<file> (served as /content/dam/audidemo/<file>).
 *
 * 3. Name collisions: the DAM folder is flat, so two different Audi assets can share a
 *    file name. tools/importer/dam-assets-registry.json remembers which source asset owns
 *    each name; a different asset with a taken name gets a short asset-id suffix
 *    (<name>-<id8>.<ext>) and the page's references are rewritten to it.
 *
 * 4. Page links: links between migrated pages are emitted as
 *    `https://www.audi.de/language-masters/...`; restore the root-relative
 *    `/language-masters/...` form.
 *
 * Usage: node tools/importer/post-import-dam.mjs <report.json> [<report.json> ...]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DAM_DIR = path.join(ROOT, 'content', 'content', 'dam', 'audidemo');
const ABS_DAM = /https?:\/\/(?:www\.)?audi\.de(\/content\/dam\/audidemo\/)/g;
const ABS_PAGE = /https?:\/\/(?:www\.)?audi\.de(\/language-masters\/)/g;
const REGISTRY = path.join(ROOT, 'tools', 'importer', 'dam-assets-registry.json');
const registry = fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) : {};

/** source asset id (urn) of an original URL */
const assetKey = (url) => url.split('/original/')[0];

/** unique DAM file name for this source asset */
function claimName(file, url) {
  const owner = registry[file];
  if (!owner || owner === assetKey(url)) {
    registry[file] = assetKey(url);
    return file;
  }
  const id = (assetKey(url).match(/urn:aaid:aem:([0-9a-f]{8})/) || [])[1] || 'x';
  const dot = file.lastIndexOf('.');
  const alt = dot > 0 ? `${file.slice(0, dot)}-${id}${file.slice(dot)}` : `${file}-${id}`;
  registry[alt] = assetKey(url);
  return alt;
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return 'exists';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (!buf.length) throw new Error('empty response');
  fs.writeFileSync(dest, buf);
  return `${Math.round(buf.length / 1024)} KB`;
}

const reports = process.argv.slice(2);
if (!reports.length) {
  console.error('Usage: node tools/importer/post-import-dam.mjs <report.json> [...]');
  process.exit(1);
}
fs.mkdirSync(DAM_DIR, { recursive: true });
let failures = 0;
for (const reportPath of reports) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const page = path.join(ROOT, 'content', `${report.path}.plain.html`);
  const html = fs.readFileSync(page, 'utf8');
  let fixed = html.replace(ABS_DAM, '$1').replace(ABS_PAGE, '$1');
  const fixedCount = (html.match(ABS_DAM) || []).length;
  const pageLinks = (html.match(ABS_PAGE) || []).length;

  const assets = typeof report.damAssets === 'string' ? JSON.parse(report.damAssets || '{}') : (report.damAssets || {});
  const renamed = [];
  for (const [file, url] of Object.entries(assets)) {
    const name = claimName(file, url);
    if (name !== file) {
      fixed = fixed.split(`/content/dam/audidemo/${file}`).join(`/content/dam/audidemo/${name}`);
      renamed.push(`${file} -> ${name}`);
      delete assets[file];
      assets[name] = url;
    }
  }
  if (fixed !== html) fs.writeFileSync(page, fixed);
  console.log(`${report.path}: ${fixedCount} DAM link(s), ${pageLinks} page link(s) restored${renamed.length ? `, renamed: ${renamed.join(', ')}` : ''}`);

  for (const [file, url] of Object.entries(assets)) {
    try {
      const dest = path.join(DAM_DIR, file);
      fs.mkdirSync(path.dirname(dest), { recursive: true }); // e.g. cards/<name>.png
      const res = await download(url, dest);
      console.log(`  ✓ ${file} (${res})`);
    } catch (e) {
      failures += 1;
      console.error(`  ✗ ${file}: ${e.message} (${url})`);
    }
  }
}
fs.writeFileSync(REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);
process.exit(failures ? 1 : 0);
