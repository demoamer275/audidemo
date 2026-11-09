/* eslint-disable */
/* global WebImporter */

/**
 * Audi DAM assets -> project DAM folder.
 *
 * Images and videos served from Audi's AEM Assets delivery
 * (https://<host>/adobe/assets/urn:<id>/original/as/<file> and the rendition form
 * .../urn:<id>/as/<file>?width=...) are placed in the project DAM folder
 * /content/dam/audidemo/<file> (decision: audi-dam-asset-rule).
 *
 * Hook: 'afterTransform', but the import script must call this transformer on its own
 * AFTER WebImporter.rules.adjustImageUrls (not in the generic transformer loop), because
 * adjustImageUrls would otherwise re-absolutize the root-relative DAM paths against the
 * source origin.
 *
 * Report integration: the mapping { "<file>": "<full-size original URL>" } is stored on
 *   document.excatCleanupReport.damAssets
 * so the import script can add it to the import report; a download step fetches each
 * original into content/content/dam/audidemo/<file>.
 *
 * Option damFolder (sub folder below /content/dam/audidemo, e.g. "q5"): read from
 * payload.damFolder, payload.params.damFolder or payload.template.damFolder (first set wins).
 * When set, every rewritten asset goes to /content/dam/audidemo/<damFolder>/<file> and is
 * reported as { "<damFolder>/<file>": "<source URL>" }. Not set = previous behaviour.
 *
 * audi.com assets: images/videos on uploads.audi.com and static.audi.com (www.audi.com
 * pages) are rewritten the same way, using the full-size original (the plain src, else
 * data-src, else the largest (data-)srcset candidate; lazy placeholders never win). Active
 * when damFolder is set or the page itself is on *.audi.com, so audi.de imports are
 * unaffected. static.audi.com UI assets (icon sprites, logos, blank placeholders) are
 * chrome, never content: such <img>s are dropped.
 */

const DAM_FOLDER = '/content/dam/audidemo';
const DAM_ASSET_RE = /^(https?:\/\/[^/]+\/adobe\/assets\/urn:[^/]+)\/(?:original\/)?as\/([^?#]+)/i;
const AUDI_COM_ASSET_RE = /^https?:\/\/(?:uploads|static)\.audi\.com\/[^?#]+\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm|m4v|mov)(?:[?#]|$)/i;
const AUDI_COM_UI_RE = /^https?:\/\/static\.audi\.com\/assets\/images\/(?:frontend\/|blank-)/i;
const VIDEO_EXT_RE = /\.(?:mp4|webm|m4v|mov)(?:[?#]|$)/i;

/** per-run options, set by transform() */
let opts = { folder: '', audiCom: false };

function damKey(name) {
  return opts.folder ? `${opts.folder}/${name}` : name;
}

function safeFileName(file) {
  let name = file;
  try { name = decodeURIComponent(name); } catch (e) { /* keep as is */ }
  // keep file names DAM-friendly
  return name.replace(/[()]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-');
}

function toDamPath(url, assets) {
  const raw = (url || '').trim();
  const m = raw.match(DAM_ASSET_RE);
  if (!m) return toAudiComDamPath(raw, assets);
  const key = damKey(safeFileName(m[2].split('/').pop()));
  assets[key] = `${m[1]}/original/as/${m[2]}`;
  return `${DAM_FOLDER}/${key}`;
}

function isAudiComAsset(url) {
  return opts.audiCom && AUDI_COM_ASSET_RE.test(url || '') && !AUDI_COM_UI_RE.test(url || '');
}

/** uploads.audi.com / static.audi.com original -> <folder>/<file>; source URL kept as is */
function toAudiComDamPath(url, assets) {
  if (!isAudiComAsset(url)) return null;
  const key = damKey(safeFileName(url.split(/[?#]/)[0].split('/').pop()));
  assets[key] = url;
  return `${DAM_FOLDER}/${key}`;
}

/** audi.com rendition size hint (web_1440_..., A123_web_2880.jpg); thumb_ = tiny */
function renditionSize(url) {
  const file = url.split('?')[0].split('/').pop() || '';
  const m = file.match(/(?:^|_)web_(\d+)(?:_|\.)/i);
  if (m) return parseInt(m[1], 10);
  return /^thumb_/i.test(file) ? 1 : null;
}

/**
 * Largest audi.com rendition used (user decision: web_2880 for gallery images, key visual
 * and video posters); larger web_N renditions rank below every allowed one.
 */
const MAX_RENDITION = 2880;
/** media-centre download variants (A123_large.jpg, ...?disposition=attachment): never an image */
const DOWNLOAD_VARIANT_RE = /(?:_(?:small|medium|large)\.[a-z0-9]+(?:[?#]|$)|[?&]disposition=attachment)/i;
const rank = (size) => (size > MAX_RENDITION ? MAX_RENDITION / size : size);

/** full-size URL of a (lazy) audi.com image: src, data-src, largest (data-)srcset candidate */
function bestAudiComUrl(img) {
  const cands = [];
  ['src', 'data-src'].forEach((attr) => {
    const url = (img.getAttribute(attr) || '').trim();
    if (isAudiComAsset(url)) cands.push({ url, score: rank(renditionSize(url) ?? 1e6), pri: attr === 'src' ? 2 : 1 });
  });
  ['data-srcset', 'srcset'].forEach((attr) => {
    (img.getAttribute(attr) || '').split(/,\s+/).forEach((part) => {
      const [url, desc] = part.trim().split(/\s+/);
      if (isAudiComAsset(url)) cands.push({ url, score: rank(Math.max(parseInt(desc, 10) || 0, renditionSize(url) || 0)), pri: 0 });
    });
  });
  // download variants rank last (kept only when they are the sole candidate)
  cands.forEach((c) => { if (DOWNLOAD_VARIANT_RE.test(c.url)) c.score = -1; });
  cands.sort((a, b) => (b.score - a.score) || (b.pri - a.pri));
  return cands.length ? cands[0].url : '';
}

/** audi.com pages: resolve lazy images to the full-size original, drop UI chrome icons */
function resolveAudiComImages(root) {
  if (!opts.audiCom) return;
  root.querySelectorAll('img').forEach((img) => {
    const src = (img.getAttribute('src') || '').trim();
    if (AUDI_COM_UI_RE.test(src) && !bestAudiComUrl(img)) { img.remove(); return; }
    const best = bestAudiComUrl(img);
    if (!best) return;
    img.setAttribute('src', best);
    // file-named audi.com originals go to <folder>/<file>, not to a parser's data-dam-name
    img.removeAttribute('data-dam-name');
    ['srcset', 'data-srcset', 'data-src', 'data-sizes', 'sizes'].forEach((a) => img.removeAttribute(a));
  });
  root.querySelectorAll('source[srcset]').forEach((el) => {
    const best = bestAudiComUrl({ getAttribute: (a) => (a === 'srcset' ? el.getAttribute('srcset') : '') });
    if (best) el.setAttribute('srcset', best);
  });
}

/**
 * Images without a file name (e.g. mediaservice.audi.com renders) that a parser tagged with
 * data-dam-name="<folder>/<name>" (folder relative to DAM_FOLDER, e.g. "cards/audi-a3").
 * The extension follows the source format (png unless the URL says otherwise).
 */
function toNamedDamPath(img, assets) {
  const name = img.getAttribute('data-dam-name');
  if (!name) return null;
  img.removeAttribute('data-dam-name');
  const src = (img.getAttribute('src') || '').trim();
  if (!/^https?:/i.test(src)) return null;
  const ext = (src.split('?')[0].match(/\.(png|jpe?g|webp|gif|svg)$/i) || [null, 'png'])[1].toLowerCase();
  const safe = name.split('/').map((part) => part.replace(/[^A-Za-z0-9._-]+/g, '-')).join('/');
  const key = damKey(`${safe}.${ext}`);
  assets[key] = src;
  return `${DAM_FOLDER}/${key}`;
}

function rewrite(root, document, origin) {
  const report = document.excatCleanupReport || {};
  const assets = report.damAssets || {};
  resolveAudiComImages(root);
  root.querySelectorAll('img[src]').forEach((img) => {
    const dam = toNamedDamPath(img, assets) || toDamPath(img.getAttribute('src'), assets);
    if (dam) img.setAttribute('src', dam);
  });
  root.querySelectorAll('source[srcset], img[srcset]').forEach((el) => {
    const first = (el.getAttribute('srcset') || '').split(',')[0].trim().split(' ')[0];
    const dam = toDamPath(first, assets);
    if (dam) el.setAttribute('srcset', dam);
  });
  root.querySelectorAll('video[src], video source[src]').forEach((el) => {
    const dam = toDamPath(el.getAttribute('src'), assets);
    if (dam) el.setAttribute('src', dam);
  });
  if (opts.audiCom) {
    root.querySelectorAll('video[poster]').forEach((el) => {
      const dam = toAudiComDamPath(el.getAttribute('poster'), assets);
      if (dam) el.setAttribute('poster', dam);
    });
  }
  // videos are authored as links (aem-content fields)
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = (a.getAttribute('href') || '').trim();
    // audi.com: only video files are assets; links to images/downloads stay links
    if (!DAM_ASSET_RE.test(href) && !VIDEO_EXT_RE.test(href)) return;
    const dam = toDamPath(href, assets);
    if (!dam) return;
    // a URL-like link text stays raw HTML in the markdown table and breaks it: use the file name
    if (/^(https?:|\/)/.test(a.textContent.trim())) a.textContent = dam.split('/').pop();
    // The importer absolutizes root-relative link hrefs AFTER laying out the block
    // tables, which lengthens the line and breaks the table. Emit the absolute form
    // up front; tools/importer/post-import-dam.mjs restores the /content/dam path.
    a.setAttribute('href', origin ? `${origin}${dam}` : dam);
    // a bare link directly in a table cell is kept as raw HTML by the markdown step,
    // which breaks the block table: give it its own paragraph like image cells
    const parent = a.parentElement;
    if (parent && !parent.closest('p, li, h1, h2, h3, h4, h5, h6')) {
      const p = document.createElement('p');
      a.replaceWith(p);
      p.append(a);
    }
  });
  document.excatCleanupReport = { ...report, damAssets: assets };
}

export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  const document = (payload && payload.document) || element.ownerDocument;
  let origin = '';
  let host = '';
  try {
    const u = new URL(payload.params.originalURL);
    origin = u.origin;
    host = u.hostname;
  } catch (e) { /* relative */ }
  const p = payload || {};
  const folder = String(p.damFolder || (p.params && p.params.damFolder) || (p.template && p.template.damFolder) || '')
    .replace(/^\/+|\/+$/g, '')
    .split('/').map((part) => part.replace(/[^A-Za-z0-9._-]+/g, '-'))
    .filter((part) => part && !/^\.+$/.test(part))
    .join('/');
  opts = { folder, audiCom: !!folder || /(^|\.)audi\.com$/i.test(host) };
  rewrite(element, document, origin);
}
