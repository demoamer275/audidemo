/* eslint-disable */
/* global WebImporter */

/**
 * Audi corporate site (www.audi.com) cleanup transformer.
 * Use instead of audi-cleanup.js (which is www.audi.de specific) in audi.com import scripts.
 *
 * beforeTransform (runs before block parsers):
 *  - removes page chrome: header.layout--header (+ main menu, search), footer.layout--footer, breadcrumb bar
 *    (incl. the DE/EN .frontend-locale-switcher), the consumption-data (footnote) banner,
 *    flashes / chatbot / screen-reader / resize-observer helpers, the Ensighten cookie
 *    dialog (#ensModalWrapper, #ensModalBackdrop, .ensPrivacyManager, <cookie-consent-change>)
 *  - removes slider UI chrome (.splide__arrows, .splide__arrow, .splide__pagination)
 *  - model pages (audicom-model): gallery category tabs (.gallery-panel--tablist, .tablist),
 *    "Load more" (.load-more-button), download-cart buttons (button > .icon.-cart-button,
 *    plus the table cell they leave empty) and .motorization--add-all-to-cart-button,
 *    duplicated mobile-only data-sheet cells (td.-mobile), .download--icon spans and the
 *    WLTP footnote badges over images (.badge-wrapper--layer incl. their <noscript> copy).
 *    The .page-item--markup <script> goes with the generic script removal; its
 *    "Media contacts" button link (#media-contacts) is kept.
 *  - images: bestImageUrl never goes above the web_2880 rendition and never picks a
 *    media-centre download variant (_small/_medium/_large, ?disposition=attachment)
 *  - removes scripts/styles/noscript/iframes/links, empty .page-row-spacer rows, [hidden]
 *    elements, decorative CSS icons (span.icon) and static.audi.com UI icon/placeholder images
 *  - resolves lazy images (lazysizes: data-src / data-srcset / srcset = blank placeholder)
 *    to the real full-size URL in src, so parsers only ever see one clean <img src>
 *  - merges an intro row (.page-item--intro) into the preceding headline row
 *    (.page-item--headline), so a section selected by the headline row also contains the
 *    intro paragraph and its Section Metadata lands after the intro, not between H1 and intro.
 *    An H1 headline row also absorbs the directly following rows that only hold a key
 *    visual / intro / markup item (audicom-model intro: H1, image, intro, Media contacts)
 *  - absolutizes root-relative links against https://www.audi.com
 *
 * afterTransform (runs after block parsers):
 *  - re-resolves lazy images on parser output (idempotent), strips tracking attributes.
 *    HTML comments are NEVER removed (XWalk field hints).
 *
 * Gated on audi.com markup: the transformer does nothing on other pages (e.g. www.audi.de).
 * Report: document.excatCleanupReport.audicomChromeRemoved (number of removed chrome nodes).
 */

const SOURCE_ORIGIN = 'https://www.audi.com';
const AUDI_COM_HOST_RE = /(^|\.)audi\.com$/i;
/** static.audi.com UI assets (icon sprites, logos, lazy placeholders): never content */
const UI_ASSET_RE = /^https?:\/\/static\.audi\.com\/assets\/(?:images\/(?:frontend\/|blank-)|[^/]+\.(?:css|js)(?:[?#]|$))/i;
const TRACKING_ATTR_RE = /^(data-track|data-tracking|data-gtm|data-analytics|amtv-tracking|onclick|onload|up-)/i;

function setReport(document, payload, key, value) {
  if (document) {
    document.excatCleanupReport = { ...(document.excatCleanupReport || {}), [key]: value };
  }
  if (payload) {
    payload[key] = value;
    if (payload.params && typeof payload.params === 'object') payload.params[key] = value;
  }
}

function isAudiComPage(element, document, payload) {
  try {
    const u = new URL(payload && payload.params && payload.params.originalURL);
    if (AUDI_COM_HOST_RE.test(u.hostname)) return true;
    if (u.hostname) return false;
  } catch (e) { /* no URL (validation run): fall back to markup */ }
  const body = (document && document.body) || element;
  const base = (body && body.getAttribute && body.getAttribute('data-base-url')) || '';
  if (/^https?:\/\/(www\.)?audi\.com\//i.test(base)) return true;
  return !!element.querySelector('header.layout--header, footer.layout--footer, .main-content > .page-row');
}

function removeAll(root, selectors) {
  let count = 0;
  selectors.forEach((sel) => {
    let nodes = [];
    try { nodes = [...root.querySelectorAll(sel)]; } catch (e) { return; }
    nodes.forEach((el) => {
      if (el.parentNode) { el.remove(); count += 1; }
    });
  });
  return count;
}

function isPlaceholder(url) {
  return !url || /^data:/i.test(url) || UI_ASSET_RE.test(url) || /\/blank[-.]/i.test(url);
}

function absolute(url) {
  try { return new URL(url, SOURCE_ORIGIN).href; } catch (e) { return url; }
}

/** size hint of an audi.com rendition URL (web_1440_..., A123_web_2880.jpg), thumb_ = tiny */
function renditionSize(url) {
  const file = (url.split('?')[0].split('/').pop()) || '';
  const m = file.match(/(?:^|_)web_(\d+)(?:_|\.)/i);
  if (m) return parseInt(m[1], 10);
  if (/^thumb_/i.test(file)) return 1;
  return null;
}

/**
 * Largest rendition that may be used (user decision: gallery / key visual / video posters
 * at web_2880). Larger web_N renditions rank below every allowed one.
 */
const MAX_RENDITION = 2880;
/** media-centre download variants (A123_large.jpg, ...?disposition=attachment): never an image */
const DOWNLOAD_VARIANT_RE = /(?:_(?:small|medium|large)\.[a-z0-9]+(?:[?#]|$)|[?&]disposition=attachment)/i;

function rank(size) {
  if (size > MAX_RENDITION) return MAX_RENDITION / size; // < 1: only if nothing else exists
  return size;
}

function parseSrcset(value) {
  return (value || '').split(/,\s+/).map((part) => {
    const [url, desc] = part.trim().split(/\s+/);
    return { url, w: parseInt(desc, 10) || 0 };
  }).filter((c) => c.url && !isPlaceholder(c.url));
}

/**
 * Real full-size URL of a (lazy) image. The plain src is the full-size original on
 * audi.com (the srcset sometimes stops one size below it), then data-src, then the
 * largest srcset / data-srcset candidate; placeholders never win.
 */
function bestImageUrl(img) {
  const cands = [];
  ['src', 'data-src'].forEach((attr) => {
    const url = (img.getAttribute(attr) || '').trim();
    if (!isPlaceholder(url)) cands.push({ url, score: rank(renditionSize(url) ?? 1e6), pri: attr === 'src' ? 2 : 1 });
  });
  ['data-srcset', 'srcset'].forEach((attr) => {
    parseSrcset(img.getAttribute(attr)).forEach((c) => {
      cands.push({ url: c.url, score: rank(Math.max(c.w, renditionSize(c.url) || 0)), pri: 0 });
    });
  });
  // download variants rank last (kept only when they are the sole candidate)
  cands.forEach((c) => { if (DOWNLOAD_VARIANT_RE.test(c.url)) c.score = -1; });
  if (!cands.length) return '';
  cands.sort((a, b) => (b.score - a.score) || (b.pri - a.pri));
  return cands[0].url;
}

function resolveImages(root) {
  root.querySelectorAll('img').forEach((img) => {
    const best = bestImageUrl(img);
    if (!best) {
      // only placeholders / UI icons / inline svg: not content
      img.remove();
      return;
    }
    img.setAttribute('src', /^\.?\.?\//.test(best) && !best.startsWith('/') ? best : absolute(best));
    ['srcset', 'data-srcset', 'data-src', 'data-sizes', 'sizes', 'loading', 'decoding', 'style', 'class']
      .forEach((a) => img.removeAttribute(a));
    if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
  });
  // <source> candidates would compete with the resolved <img src>
  root.querySelectorAll('picture source').forEach((s) => s.remove());
}

/**
 * Row of the page intro that belongs to the H1 headline row (audicom-model pages:
 * key visual, intro text, "Media contacts" markup button). Rows holding anything else
 * (a gallery, a page list, a nested section, ...) never qualify.
 */
function isIntroCompanionRow(row) {
  const items = [...row.querySelectorAll('[class*="page-item--"]')]
    .filter((el) => [...el.classList].some((c) => c.startsWith('page-item--')));
  return items.length > 0 && items.every((el) => el.matches('.page-item--image, .page-item--intro, .page-item--markup'));
}

/**
 * headline row + following intro row -> one row (Section Metadata goes after the intro).
 * An H1 headline row also absorbs the directly following key visual / intro / markup rows
 * (audicom-model), so its Section Metadata lands after the "Media contacts" button.
 */
function mergeIntoHeadlineRows(root) {
  root.querySelectorAll('.main-content > .page-row').forEach((row) => {
    if (!row.parentNode || !row.querySelector('.page-item--headline')) return;
    const isH1Row = !!row.querySelector('.page-item--headline h1');
    for (;;) {
      let next = row.nextElementSibling;
      while (next && next.classList.contains('page-row-spacer')) next = next.nextElementSibling;
      if (!next || !next.classList.contains('page-row')) return;
      if (next.querySelector('.page-item--headline')) return;
      const isIntro = !!next.querySelector('.page-item--intro');
      if (!isIntro && !(isH1Row && isIntroCompanionRow(next))) return;
      while (next.firstChild) row.append(next.firstChild);
      next.remove();
      // previous behaviour: one intro row; H1 rows keep collecting companion rows
      if (!isH1Row) return;
    }
  });
}

function rewriteLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = (a.getAttribute('href') || '').trim();
    if (href.startsWith('/') && !href.startsWith('//')) a.setAttribute('href', absolute(href));
  });
}

function stripAttributes(root) {
  root.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (TRACKING_ATTR_RE.test(attr.name)) el.removeAttribute(attr.name);
    });
  });
}

export default function transform(hookName, element, payload) {
  const document = (payload && payload.document) || element.ownerDocument;
  if (!isAudiComPage(element, document, payload)) return;

  if (hookName === 'beforeTransform') {
    const removed = removeAll(element, [
      // header / navigation, breadcrumb + DE/EN language switch, footer
      'header.layout--header',
      // main menu layers, search bar and overlay (siblings of the header)
      '.main-menu',
      '.header-search-bar',
      'form.search-overlay',
      'nav.layout--breadcrumb-bar',
      '.frontend-locale-switcher',
      'footer.layout--footer',
      // hidden footnote container (consumption data banner, filled by JS)
      '.consumption-data-banner',
      // cookie / consent (Ensighten)
      '#ensModalWrapper',
      '#ensModalBackdrop',
      '.ensPrivacyManager',
      'cookie-consent-change',
      // Sprinklr live chat, injected after consent (its empty <audio src> becomes an empty link)
      '#spr-live-chat-app',
      '#spr-lc-announcements',
      '#spr-live-chat-frame',
      // layout helpers without authorable content
      '.layout--banner',
      '.layout--flashes',
      '.chatbot-indicator',
      '#screen-reader-announcements-container',
      '.resize-observer',
      '[amtv-tracking]',
      // slider UI chrome
      '.splide__arrows',
      '.splide__arrow',
      '.splide__pagination',
      // model pages (audicom-model): gallery category tabs + "Load more", data-sheet
      // download cart, duplicated mobile-only data-sheet cells, download icons,
      // WLTP footnote badges laid over images (their <noscript> copies go with them)
      '.gallery-panel--tablist',
      '.tablist',
      '.load-more-button',
      '.motorization--add-all-to-cart-button',
      'td.-mobile',
      '.download--icon',
      '.badge-wrapper--layer',
      // inline WLTP footnote markers in text (e.g. "SQ5<sup>2</sup>"), numbered by the site's script
      'sup.inline-consumption-data',
      // technical
      'script', 'style', 'noscript', 'iframe', 'link', 'dialog',
      '[hidden]',
    ]);
    // "Add to cart" buttons (button > span.icon.-cart-button); a table cell left empty by
    // the removal goes too, so data-sheet rows keep the header row's column count
    let cartRemoved = 0;
    element.querySelectorAll('.icon.-cart-button').forEach((icon) => {
      const button = icon.closest('button');
      if (!button || !button.parentNode) return;
      const cell = button.parentElement && button.parentElement.closest('td, th');
      button.remove();
      cartRemoved += 1;
      if (cell && !cell.textContent.trim() && !cell.querySelector('img, a, picture, video')) cell.remove();
    });
    setReport(document, payload, 'audicomChromeRemoved', removed + cartRemoved);

    // empty spacer rows and decorative CSS mask icons
    element.querySelectorAll('.page-row-spacer').forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector('img, video, picture')) el.remove();
    });
    element.querySelectorAll('span.icon').forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector('img, svg')) el.remove();
    });

    // data-sheet consumption text is bare text + <sub> in a div: the markdown step would split
    // it into one paragraph per node, so keep it together in one <p>
    element.querySelectorAll('.download--consumption-data').forEach((el) => {
      if (el.querySelector('p, div')) return;
      const p = document.createElement('p');
      while (el.firstChild) p.append(el.firstChild);
      el.append(p);
    });

    mergeIntoHeadlineRows(element);
    resolveImages(element);
    rewriteLinks(element);
  }

  if (hookName === 'afterTransform') {
    resolveImages(element);
    rewriteLinks(element);
    stripAttributes(element);
  }
}
