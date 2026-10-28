/* eslint-disable */
/**
 * Upload the local DAM mirror (content/content/dam/audidemo/**, including sub folders
 * such as cards/) to AEM author /content/dam/audidemo using AEM as a Cloud Service
 * direct binary upload (missing sub folders are created via the Assets HTTP API):
 *   1. POST <folder>.initiateUpload.json   (fileName, fileSize)
 *   2. PUT the binary to the returned upload URI(s)
 *   3. POST <folder>.completeUpload.json  (fileName, mimeType, uploadToken)
 * Files that already exist on author are skipped. Nothing is published.
 *
 * Authentication is injected by the environment (no Authorization header here).
 * Run with NODE_USE_ENV_PROXY=1 so fetch goes through the configured proxy.
 *
 * Usage:
 *   NODE_USE_ENV_PROXY=1 node tools/importer/upload-dam-assets.mjs [--dry-run] [file ...]
 *   (file = path relative to the DAM folder, e.g. cards/a3-limousine.png)
 */
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'https://author-p182083-e1919654.adobeaemcloud.com';
const FOLDER = '/content/dam/audidemo';
const LOCAL = path.join(process.cwd(), 'content', 'content', 'dam', 'audidemo');
const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4', '.gif': 'image/gif',
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.filter((a) => !a.startsWith('--'));

/** all files below the local DAM folder, as relative paths (cards/x.png) */
function listFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) return listFiles(path.join(dir, e.name), rel);
    return e.isFile() ? [rel] : [];
  });
}
// default: the migrated assets from the asset list (not every file in the local mirror)
const CSV = path.join(process.cwd(), 'tools', 'importer', 'dam-upload', 'audidemo-dam-assets.csv');
const listed = fs.existsSync(CSV)
  ? fs.readFileSync(CSV, 'utf8').split(/\r?\n/).slice(1).map((l) => l.split(',')[0]).filter(Boolean)
  : listFiles(LOCAL);
const files = (only.length ? only : listed).filter((f) => fs.existsSync(path.join(LOCAL, f))).sort();
const missing = (only.length ? only : listed).filter((f) => !fs.existsSync(path.join(LOCAL, f)));
if (missing.length) console.log(`! ${missing.length} listed file(s) missing locally: ${missing.join(', ')}`);
const encodePath = (rel) => rel.split('/').map(encodeURIComponent).join('/');
const API_ROOT = `/api/assets${FOLDER.replace(/^\/content\/dam/, '')}`;

const knownFolders = new Set(['']);
/** create the DAM sub folder (and its parents) when missing */
async function ensureFolder(dir) {
  if (knownFolders.has(dir)) return;
  await ensureFolder(path.posix.dirname(dir) === '.' ? '' : path.posix.dirname(dir));
  const url = `${HOST}${API_ROOT}/${encodePath(dir)}`;
  const head = await fetch(`${url}.json`);
  if (head.status === 401 || head.status === 403) throw new Error(`AEM author returned ${head.status} (not authorized)`);
  if (!head.ok) {
    if (dryRun) {
      console.log(`~ ${dir}/ (would create folder)`);
    } else {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class: 'assetFolder', properties: { title: path.posix.basename(dir) } }),
      });
      if (!r.ok && r.status !== 409) throw new Error(`create folder ${dir} HTTP ${r.status}`);
      console.log(`+ ${dir}/ (folder created)`);
    }
  }
  knownFolders.add(dir);
}

async function exists(file) {
  const r = await fetch(`${HOST}${FOLDER}/${encodePath(file)}.json`, { method: 'GET' });
  if (r.status === 401 || r.status === 403) throw new Error(`AEM author returned ${r.status} (not authorized)`);
  return r.ok;
}

async function upload(file) {
  const full = path.join(LOCAL, file);
  const size = fs.statSync(full).size;
  const mimeType = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const dir = path.posix.dirname(file) === '.' ? '' : path.posix.dirname(file);
  const fileName = path.posix.basename(file);
  await ensureFolder(dir);
  const target = dir ? `${FOLDER}/${encodePath(dir)}` : FOLDER;
  const init = await fetch(`${HOST}${target}.initiateUpload.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ fileName, fileSize: String(size) }),
  });
  if (!init.ok) throw new Error(`initiateUpload HTTP ${init.status}`);
  const info = await init.json();
  const entry = info.files[0];
  const uris = entry.uploadURIs;
  const partSize = Math.max(entry.minPartSize, Math.ceil(size / uris.length));
  if (partSize > entry.maxPartSize) throw new Error('file too large for the offered upload parts');
  const fd = fs.openSync(full, 'r');
  try {
    for (let i = 0, offset = 0; offset < size; i += 1, offset += partSize) {
      const len = Math.min(partSize, size - offset);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, offset);
      const put = await fetch(uris[i], { method: 'PUT', body: buf, headers: { 'Content-Type': mimeType } });
      if (!put.ok) throw new Error(`binary PUT part ${i + 1} HTTP ${put.status}`);
    }
  } finally {
    fs.closeSync(fd);
  }
  const done = await fetch(`${HOST}${info.completeURI}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ fileName, mimeType, uploadToken: entry.uploadToken, fileSize: String(size) }),
  });
  if (!done.ok) throw new Error(`completeUpload HTTP ${done.status}`);
  return `${Math.round(size / 1024)} KB`;
}

let uploaded = 0; let skipped = 0; let failed = 0;
for (const file of files) {
  try {
    if (await exists(file)) {
      skipped += 1;
      console.log(`= ${file} (already on author)`);
      continue;
    }
    if (dryRun) {
      console.log(`~ ${file} (would upload)`);
      continue;
    }
    console.log(`+ ${file} (${await upload(file)})`);
    uploaded += 1;
  } catch (e) {
    failed += 1;
    console.error(`✗ ${file}: ${e.message}`);
    if (/not authorized/.test(e.message)) break;
  }
}
console.log(`\nuploaded ${uploaded}, skipped ${skipped}, failed ${failed}${dryRun ? ' (dry run)' : ''}`);
process.exit(failed ? 1 : 0);
