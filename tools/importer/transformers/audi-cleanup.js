/* eslint-disable */
/* global WebImporter */

/**
 * Audi (www.audi.de) cleanup transformer.
 *
 * beforeTransform (runs before block parsers):
 *  - removes the Acquire live chat widget ([class~="acquire-livechat-widget"]) and counts removals
 *  - removes cookie / consent dialogs, global header, global footer, skip links,
 *    popup-group notifications, spacers, scripts/styles/iframes/links, tracking pixels
 *  - normalizes footnote references to plain <sup>N</sup>
 *  - converts the footnote engine list into a clean <ol>
 *  - normalizes emea-dam.audi.com /adobe/assets/urn:... image URLs (strip query params)
 *  - rewrites audi.de links (migrated paths -> relative, everything else absolute)
 *
 * afterTransform (runs after block parsers):
 *  - re-applies link + image normalization on parser output (idempotent)
 *  - promotes the intro H2 to H1 when the page has no H1
 *  - strips tracking attributes. HTML comments are NEVER removed (XWalk field hints).
 *
 * Import report integration (livechatWidgetsRemoved):
 *  The validator/importer inline this file as a classic script, so it cannot use named
 *  exports. The count is therefore exposed in three places:
 *    - payload.params.livechatWidgetsRemoved   (params object is shared across hooks)
 *    - payload.livechatWidgetsRemoved
 *    - document.excatCleanupReport.livechatWidgetsRemoved   (survives payload copies)
 *  In the import script's transform(), add it to the report, e.g.:
 *
 *    const { livechatWidgetsRemoved = 0 } = document.excatCleanupReport || {};
 *    return [{ element: main, path, report: { ...report, livechatWidgetsRemoved } }];
 */

const SOURCE_ORIGIN = 'https://www.audi.de';
const AUDI_HOSTS = ['www.audi.de', 'audi.de'];

/**
 * Paths that are migrated to EDS. Links to these paths become relative.
 * Extend this list as more pages are migrated (always with trailing slash).
 */
const MIGRATED_PATHS = [
  '/de/elektromobilitaet/',
  '/de/neuwagen/a3/a3-limousine/',
  '/de/neuwagen/a3/a3-allstreet/',
  '/de/neuwagen/a3/a3-sportback-e-hybrid/',
  '/de/neuwagen/a3/a3-sportback/',
  '/de/neuwagen/a2-e-tron/a2-e-tron/',
  '/de/neuwagen/q5/q5-suv/',
  '/de/neuwagen/q5/q5-suv-e-hybrid/',
  '/de/neuwagen/q5/q5-sportback/',
  '/de/neuwagen/q5/q5-sportback-e-hybrid/',
];

/**
 * Migrated pages live under the AEM language root (/content/audidemo/language-masters/...),
 * so links between them are rewritten to /language-masters/<source path>.
 */
const CONTENT_ROOT = '/language-masters';

const CONFIGURATOR_PATH_RE = /(konfigurator|configurator|configure)/i;
const CONFIGURATOR_HOST_RE = /^(configurator|konfigurator)\./i;

const TRACKING_HOST_RE = /(googlesyndication|doubleclick|facebook\.com\/tr|facebook\.net|connect\.facebook|google-analytics|googletagmanager|googleadservices|adservice\.google|bat\.bing|analytics\.|pixel\.|adnxs|krxd|everesttech|mathtag|demdex|omtrdc|linkedin\.com\/px|ads\.linkedin|t\.co\/i|analytics\.twitter|criteo|taboola|outbrain|hotjar|scorecardresearch)/i;

const DAM_URN_RE = /^https?:\/\/emea-dam\.audi\.com\/adobe\/assets\/urn:/i;

function setReport(document, payload, key, value) {
  if (document) {
    document.excatCleanupReport = { ...(document.excatCleanupReport || {}), [key]: value };
  }
  if (payload) {
    payload[key] = value;
    if (payload.params && typeof payload.params === 'object') {
      payload.params[key] = value;
    }
  }
}

function removeAll(root, selector) {
  let count = 0;
  root.querySelectorAll(selector).forEach((el) => {
    if (el.isConnected !== false && el.parentNode) {
      el.remove();
      count += 1;
    }
  });
  return count;
}

/** Remove the closest feature-app wrapper (or the element itself) for each match. */
function removeFeatureApps(root, selector) {
  root.querySelectorAll(selector).forEach((el) => {
    const target = el.closest('feature-app') || el;
    if (target.parentNode) target.remove();
  });
}

function isConfiguratorUrl(url) {
  return CONFIGURATOR_HOST_RE.test(url.hostname) || CONFIGURATOR_PATH_RE.test(url.pathname);
}

function normalizePath(p) {
  return p.endsWith('/') ? p : `${p}/`;
}

function rewriteLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = (a.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(href)) return;

    const isRootRelative = href.startsWith('/') && !href.startsWith('//');
    let url;
    try {
      url = new URL(href, SOURCE_ORIGIN);
    } catch (e) {
      return;
    }

    if (isConfiguratorUrl(url)) {
      // configurator links stay absolute and untouched
      if (isRootRelative) a.setAttribute('href', url.href);
      return;
    }

    const isAudi = isRootRelative || AUDI_HOSTS.includes(url.hostname.toLowerCase());
    if (!isAudi) return;

    const migrated = MIGRATED_PATHS.some((p) => normalizePath(url.pathname) === normalizePath(p));
    if (migrated) {
      // The importer absolutizes root-relative hrefs after laying out block tables (which
      // can break them); emit the absolute form up front, post-import-dam.mjs restores
      // /language-masters/... afterwards.
      a.setAttribute('href', `${SOURCE_ORIGIN}${CONTENT_ROOT}${url.pathname}${url.search}${url.hash}`);
    } else {
      a.setAttribute('href', `${SOURCE_ORIGIN}${url.pathname}${url.search}${url.hash}`);
    }
  });
}

function cleanDamUrl(src) {
  if (!src || !DAM_URN_RE.test(src)) return src;
  return src.split('?')[0].split('#')[0];
}

function normalizeImages(root) {
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (TRACKING_HOST_RE.test(src)
      || (img.getAttribute('width') === '1' && img.getAttribute('height') === '1')) {
      img.remove();
      return;
    }
    if (DAM_URN_RE.test(src)) {
      img.setAttribute('src', cleanDamUrl(src));
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.removeAttribute('loading');
      if (!img.hasAttribute('alt')) img.setAttribute('alt', '');
    }
  });
  // <source> elements would compete with the plain <img src>; drop DAM variants
  root.querySelectorAll('picture source').forEach((s) => {
    const srcset = s.getAttribute('srcset') || '';
    if (!srcset || DAM_URN_RE.test(srcset)) s.remove();
  });
}

function normalizeFootnoteReferences(root, document) {
  root.querySelectorAll('sup.audi-footnote-anchor__text').forEach((sup) => {
    const text = sup.textContent.trim();
    const clean = document.createElement('sup');
    clean.textContent = text;
    sup.replaceWith(clean);
  });
  // any remaining footnote engine anchors -> plain text
  root.querySelectorAll('a.audi-j-footnote-reference').forEach((a) => {
    a.replaceWith(document.createTextNode(a.textContent.trim()));
  });
}

function convertFootnoteList(root, document) {
  root.querySelectorAll('.audi-footnote-engine ul').forEach((ul) => {
    const ol = document.createElement('ol');
    let start = null;
    ul.querySelectorAll(':scope > li').forEach((li) => {
      const p = li.querySelector('p') || li;
      const spans = p.querySelectorAll(':scope > span');
      const item = document.createElement('li');
      if (spans.length >= 2) {
        const num = parseInt(spans[0].textContent.trim(), 10);
        if (start === null && !Number.isNaN(num)) start = num;
        for (let i = 1; i < spans.length; i += 1) {
          while (spans[i].firstChild) item.append(spans[i].firstChild);
        }
      } else {
        // the importer unwraps attribute-less spans before transform, merging the
        // number into the text ("1Voraussetzung ..."): strip the expected footnote number
        const expected = (start === null ? 1 : start) + ol.children.length;
        const walker = document.createTreeWalker(p, 4);
        let first = walker.nextNode();
        while (first && !first.textContent.trim()) first = walker.nextNode();
        const m = first && first.textContent.match(/^\s*(\d+)/);
        if (m && parseInt(m[1], 10) === expected) {
          if (start === null) start = expected;
          first.textContent = first.textContent.slice(m[0].length).replace(/^\s+/, '');
        }
        while (p.firstChild) item.append(p.firstChild);
      }
      if (item.textContent.trim()) ol.append(item);
    });
    if (start !== null && start !== 1) ol.setAttribute('start', String(start));
    ul.replaceWith(ol);
  });
}

function promoteH1(root, document) {
  if (root.querySelector('h1') || document.querySelector('h1')) return;
  let h2 = root.querySelector('feature-app[id="676fd0de-2275-40ef-8a91-60515ad4a12d-1"] h2');
  if (!h2) {
    h2 = [...root.querySelectorAll('h2')].find((h) => /Elektromobilität von Audi/i.test(h.textContent));
  }
  if (!h2) return;
  const h1 = document.createElement('h1');
  h1.textContent = h2.textContent.replace(/\s+/g, ' ').trim();
  h2.replaceWith(h1);
}

export default function transform(hookName, element, payload) {
  const document = (payload && payload.document) || element.ownerDocument;

  if (hookName === 'beforeTransform') {
    // 1. Live chat widget (whole-token class match) - counted for the import report
    const livechatWidgetsRemoved = removeAll(element, '[class~="acquire-livechat-widget"]');
    setReport(document, payload, 'livechatWidgetsRemoved', livechatWidgetsRemoved);

    // 2. Cookie / consent dialogs
    WebImporter.DOMUtils.remove(element, [
      '#ensModalWrapper',
      '#ensModalBackdrop',
      '.ensPrivacyManager',
      '[id*="usercentrics"]',
      '[class*="usercentrics"]',
      '[id^="cookie"]',
      '[class*="cookie-banner"]',
      '[class*="consent-banner"]',
      '.AdSense',
    ]);

    // Global header, footer, skip link, notifications popup, spacers
    removeFeatureApps(element, 'feature-app[id="b373ebe8-46bc-4942-b1b9-078ea99a36ba-1"]');
    removeFeatureApps(element, '[class*="AudiHeaderStyles__HeaderStyled"]');
    removeFeatureApps(element, '[class*="audi-footer__OneFooterStyled"]');
    removeFeatureApps(element, '#skip-to-content-link');
    removeFeatureApps(element, '[class*="popup-group__"]');
    removeFeatureApps(element, '[class*="Spacer__StyledSpacer"]');

    // Headline apps (e7de798a…) sit in their own wrapper: tag each with the app that
    // follows it in document order so sections can group heading + block.
    const apps = [...element.querySelectorAll('feature-app[id]')];
    apps.forEach((app, i) => {
      if (!app.id.startsWith('e7de798a')) return;
      const next = apps.slice(i + 1).find((a) => !a.id.startsWith('970c9160'));
      if (next) app.setAttribute('data-heading-for', next.id.slice(0, 8));
    });
    // Embedded car configurator app (out of scope) and its headline
    removeFeatureApps(element, 'feature-app[data-heading-for="7f5cb958"]');
    removeFeatureApps(element, 'feature-app[id^="7f5cb958"]');
    // Sticky model sub-navigation repeated on every model page (page chrome)
    removeFeatureApps(element, 'feature-app[id^="0d76e233"]');

    // Vehicle stock teaser app (fa9786fe…): live dealer stock counts come from an API and
    // cannot be authored. Rebuild it from the app's own German fallback configuration
    // (data-content): fallback image, headline, new/used car search buttons — no counts.
    element.querySelectorAll('feature-app[id^="fa9786fe"]').forEach((app) => {
      let fields = {};
      try { fields = JSON.parse(app.getAttribute('data-content') || '{}').fields || {}; } catch (e) { /* keep empty */ }
      const wrap = document.createElement('div');
      const img = fields.fallbackImageUrl && fields.fallbackImageUrl.path;
      if (img) {
        const pic = document.createElement('p');
        const im = document.createElement('img');
        im.setAttribute('src', img);
        im.setAttribute('alt', fields.fallbackImageUrl.title || '');
        pic.append(im);
        wrap.append(pic);
      }
      if (fields.headLine) {
        const h2 = document.createElement('h2');
        h2.textContent = fields.headLine;
        wrap.append(h2);
      }
      [['Neuwagen', fields.newCarsCtaFallbackUrl, 'strong'], ['Gebrauchtwagen', fields.usedCarsCtaFallbackUrl, 'em']].forEach(([label, href, tag]) => {
        if (!href) return;
        const para = document.createElement('p');
        const fmt = document.createElement(tag);
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = label;
        fmt.append(a);
        para.append(fmt);
        wrap.append(para);
      });
      app.replaceChildren(wrap);
    });

    // Button group apps (92c3930b…): one paragraph per button so EDS decorates them.
    // Audi: first button of a group = primary (grey pill, <strong>), others and single
    // buttons = secondary (dark pill, <em>).
    element.querySelectorAll('feature-app[id^="92c3930b"]').forEach((app) => {
      const links = [...app.querySelectorAll('a[href]')];
      if (!links.length) return;
      const wrap = document.createElement('div');
      links.forEach((a, i) => {
        const link = document.createElement('a');
        link.setAttribute('href', a.getAttribute('href'));
        link.textContent = a.textContent.trim();
        const fmt = document.createElement(links.length > 1 && i === 0 ? 'strong' : 'em');
        fmt.append(link);
        const para = document.createElement('p');
        para.append(fmt);
        wrap.append(para);
      });
      app.replaceChildren(wrap);
    });
    [...element.querySelectorAll('a')]
      .filter((a) => /Spring zum Inhalt/i.test(a.textContent))
      .forEach((a) => a.remove());
    WebImporter.DOMUtils.remove(element, ['header', 'footer', 'nav']);

    // Non-authorable technical elements
    WebImporter.DOMUtils.remove(element, ['script', 'style', 'noscript', 'iframe', 'link', 'dialog']);

    // Footnotes
    normalizeFootnoteReferences(element, document);
    convertFootnoteList(element, document);

    // Images + links
    normalizeImages(element);
    rewriteLinks(element);
  }

  if (hookName === 'afterTransform') {
    normalizeImages(element);
    rewriteLinks(element);
    promoteH1(element, document);

    // Tracking attributes (never touch comments here: XWalk field hints)
    element.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (/^(data-track|data-tracking|data-gtm|data-analytics|onclick|onload)/i.test(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });
    });
    element.querySelectorAll('#impression-tracking-box').forEach((el) => el.removeAttribute('id'));
  }
}
