/* eslint-disable */
/* global WebImporter */

/**
 * audi.com links to pages migrated in this project -> local page path.
 * Shared by every audi.com import script (import-audi-q5-59.js, the audicom-model script).
 *
 * Hook: 'afterTransform' only, i.e. AFTER the block parsers, so links inside block tables
 * (e.g. the audi-q5-59 cards-model tiles) are rewritten too. Run it as the last entry of the
 * import script's transformer list (after audicom-cleanup, whose afterTransform absolutizes
 * root-relative links, and after audi-sections).
 *
 * Matching: www.audi.com / audi.com links, absolute or root-relative (resolved against the
 * page origin, default https://www.audi.com), trailing slash ignored; query string and
 * hash are kept. Other links (media releases, video pages, PDFs, #anchors, ...) are untouched.
 *
 * Output: https://www.audi.com/master/... (absolute). The importer re-absolutizes
 * root-relative hrefs AFTER laying out the block tables, which lengthens the line and breaks
 * the table, so the absolute form is emitted here and tools/importer/post-import-dam.mjs
 * restores the root-relative /master/... path (same pattern as audi.de /language-masters/).
 *
 * Report: document.excatCleanupReport.audicomPageLinks (number of rewritten links).
 *
 * Shared map for import scripts (static properties of the default export, the transformer
 * validator only accepts a single default-exported function):
 *   import audicomPageLinks from './transformers/audicom-page-links.js';
 *   audicomPageLinks.pageLinks            // { '/en/audi-q5-59': '/master/en/audi-q5-59', ... }
 *   audicomPageLinks.localPagePath(url)   // '/master/en/audi-q5-59/audi-q5-suv-12871' or null
 */

const SOURCE_ORIGIN = 'https://www.audi.com';
const AUDI_COM_HOST_RE = /^(?:www\.)?audi\.com$/i;

/** source path on www.audi.com -> local page path (/master/<lang>/...) */
const AUDICOM_PAGE_LINKS = {
  '/en/audi-q5-59': '/master/en/audi-q5-59',
  '/en/audi-q5-suv-12871': '/master/en/audi-q5-59/audi-q5-suv-12871',
  '/en/audi-q5-sportback-13207': '/master/en/audi-q5-59/audi-q5-sportback-13207',
  '/en/audi-q5-suv-e-hybrid-quattro-16677': '/master/en/audi-q5-59/audi-q5-suv-e-hybrid-quattro-16677',
  '/en/audi-q5-sportback-e-hybrid-quattro-16678': '/master/en/audi-q5-59/audi-q5-sportback-e-hybrid-quattro-16678',
  '/en/audi-sq5-suv-11326': '/master/en/audi-q5-59/audi-sq5-suv-11326',
  '/en/audi-sq5-sportback-13378': '/master/en/audi-q5-59/audi-sq5-sportback-13378',
};

/** local page path of a migrated audi.com URL / path, or null (e.g. for the import path) */
function localPagePath(urlOrPath) {
  let u;
  try { u = new URL(urlOrPath, SOURCE_ORIGIN); } catch (e) { return null; }
  if (!AUDI_COM_HOST_RE.test(u.hostname)) return null;
  const p = u.pathname.replace(/\/+$/, '') || '/';
  return Object.prototype.hasOwnProperty.call(AUDICOM_PAGE_LINKS, p) ? AUDICOM_PAGE_LINKS[p] : null;
}

function pageOrigin(payload) {
  try {
    const u = new URL(payload && payload.params && payload.params.originalURL);
    if (u.origin && u.origin !== 'null') return u.origin;
  } catch (e) { /* validation run: default origin */ }
  return SOURCE_ORIGIN;
}

export default function transform(hookName, element, payload) {
  if (hookName !== 'afterTransform') return;
  const document = (payload && payload.document) || element.ownerDocument;
  const origin = pageOrigin(payload);
  let count = 0;
  element.querySelectorAll('a[href]').forEach((a) => {
    const href = (a.getAttribute('href') || '').trim();
    // absolute http(s) or root-relative only (no #anchors, mailto:, tel:, protocol-relative)
    if (!/^https?:\/\//i.test(href) && !(href.startsWith('/') && !href.startsWith('//'))) return;
    let u;
    try { u = new URL(href, origin); } catch (e) { return; }
    const local = localPagePath(u.href);
    if (!local) return;
    a.setAttribute('href', `${SOURCE_ORIGIN}${local}${u.search}${u.hash}`);
    count += 1;
  });
  if (document) {
    const report = document.excatCleanupReport || {};
    document.excatCleanupReport = { ...report, audicomPageLinks: (report.audicomPageLinks || 0) + count };
  }
}

// shared map + helper for the import scripts (page path of a model page, see header)
transform.pageLinks = AUDICOM_PAGE_LINKS;
transform.localPagePath = localPagePath;
