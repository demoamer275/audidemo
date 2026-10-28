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
 */

const DAM_FOLDER = '/content/dam/audidemo';
const DAM_ASSET_RE = /^(https?:\/\/[^/]+\/adobe\/assets\/urn:[^/]+)\/(?:original\/)?as\/([^?#]+)/i;

function toDamPath(url, assets) {
  const m = (url || '').trim().match(DAM_ASSET_RE);
  if (!m) return null;
  let file = m[2].split('/').pop();
  try { file = decodeURIComponent(file); } catch (e) { /* keep as is */ }
  // keep file names DAM-friendly
  const safe = file.replace(/[()]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-');
  assets[safe] = `${m[1]}/original/as/${m[2]}`;
  return `${DAM_FOLDER}/${safe}`;
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
  const key = `${safe}.${ext}`;
  assets[key] = src;
  return `${DAM_FOLDER}/${key}`;
}

function rewrite(root, document, origin) {
  const report = document.excatCleanupReport || {};
  const assets = report.damAssets || {};
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
  // videos are authored as links (aem-content fields)
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
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
  try { origin = new URL(payload.params.originalURL).origin; } catch (e) { /* relative */ }
  rewrite(element, document, origin);
}
