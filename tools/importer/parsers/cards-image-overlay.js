/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-image-overlay (Audi content tiles "Testen Sie es selbst").
 *
 * Source: feature-app > ... > [class*="styles__Container"] > [class*="StyledContentTileContainer"] (x3)
 *   [class*="MediaContainer"] img / picture source / background-image -> image
 *   [class*="StyledHeadline"]                                         -> title (H3)
 *   [class*="WLTPContainer"] p                                        -> disclaimer
 * Tiles navigate via JS click handlers (no href in DOM): links are resolved from an
 * anchor inside the tile when present, otherwise from the title fallback map below.
 *
 * Row per card (model cards-image-overlay-card):
 *   cell 1: image          -> field:image (imageAlt collapsed into alt)
 *   cell 2: title + link   -> field:content_title, field:content_link (linkText = title)
 *   cell 3: disclaimer     -> field:disclaimer
 */

const TILE_SEL = '[class*="StyledContentTileContainer"]';

const LINK_FALLBACK = {
  'reichweiten-simulator': 'https://www.audi.de/de/elektromobilitaet/reichweite/',
  'ladezeit-simulator': 'https://www.audi.de/de/elektromobilitaet/laden/',
  ladestationen: 'https://www.audi.de/de/elektromobilitaet/ladestation-finden/',
};

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function isAttached(el, document) {
  if (typeof el.isConnected === 'boolean') return el.isConnected;
  return document.documentElement.contains(el);
}

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function firstSrcsetUrl(srcset) {
  if (!srcset) return '';
  return srcset.split(',')[0].trim().split(/\s+/)[0] || '';
}

function findImage(tile) {
  const media = tile.querySelector('[class*="MediaContainer"]') || tile;
  const img = media.querySelector('img');
  let src = '';
  let alt = '';
  if (img) {
    alt = img.getAttribute('alt') || '';
    src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:')) {
      src = img.getAttribute('data-src') || firstSrcsetUrl(img.getAttribute('srcset') || img.getAttribute('data-srcset'));
    }
  }
  if (!src || src.startsWith('data:')) {
    const source = [...media.querySelectorAll('picture source')]
      .map((s) => firstSrcsetUrl(s.getAttribute('srcset') || s.getAttribute('data-srcset')))
      .find((u) => u && !u.startsWith('data:'));
    if (source) src = source;
  }
  if (!src || src.startsWith('data:')) {
    const bgEl = [media, ...media.querySelectorAll('[style*="background"]')]
      .find((el) => /url\(/.test(el.getAttribute('style') || ''));
    if (bgEl) {
      const m = (bgEl.getAttribute('style') || '').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
      if (m) src = m[1];
    }
  }
  if (!src || src.startsWith('data:')) return null;
  return { src, alt };
}

/** Copy text with footnote <sup> numbers, unwrapping spans and dropping formatting whitespace. */
function appendInline(source, target, document) {
  source.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const raw = node.textContent;
      if (/^\s*$/.test(raw) && /\n/.test(raw)) return;
      target.appendChild(document.createTextNode(raw.replace(/\s+/g, ' ')));
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toUpperCase();
    if (['IMG', 'SVG', 'PICTURE', 'SCRIPT', 'STYLE'].includes(tag)) return;
    if (tag === 'SUP') {
      const t = cleanText(node.textContent);
      if (!t) return;
      const sup = document.createElement('sup');
      sup.textContent = /^[,;]$/.test(t) ? `${t} ` : t;
      target.appendChild(sup);
      return;
    }
    if (tag === 'A' && node.getAttribute('href') && !node.classList.contains('audi-j-footnote-reference')) {
      const a = document.createElement('a');
      a.setAttribute('href', node.getAttribute('href'));
      appendInline(node, a, document);
      target.appendChild(a);
      return;
    }
    if (['STRONG', 'B', 'EM', 'I', 'U', 'SUB'].includes(tag)) {
      const el = document.createElement(tag.toLowerCase());
      appendInline(node, el, document);
      target.appendChild(el);
      return;
    }
    appendInline(node, target, document);
  });
  return target;
}

function inlineParagraph(source, document) {
  const p = appendInline(source, document.createElement('p'), document);
  const first = p.firstChild;
  if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, '');
  const last = p.lastChild;
  if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, '');
  return p;
}

function resolveLink(tile, title) {
  const a = [...tile.querySelectorAll('a[href]')].find((el) => {
    const href = el.getAttribute('href') || '';
    return href && !href.startsWith('#') && !el.classList.contains('audi-j-footnote-reference')
      && !/^javascript:/i.test(href);
  });
  if (a) return a.getAttribute('href');
  const dataHref = tile.querySelector('[data-href], [data-link], [data-url]');
  if (dataHref) {
    return dataHref.getAttribute('data-href') || dataHref.getAttribute('data-link') || dataHref.getAttribute('data-url');
  }
  return LINK_FALLBACK[cleanText(title).toLowerCase()] || '';
}

function buildCard(tile, document) {
  // image
  const imgData = findImage(tile);
  let imageCell = '';
  if (imgData) {
    const img = document.createElement('img');
    img.setAttribute('src', imgData.src);
    img.setAttribute('alt', imgData.alt);
    imageCell = hinted(document, 'image', [img]);
  }

  // title + link
  const headingEl = tile.querySelector('[class*="StyledHeadline"], [class*="styles__Heading"] h1, [class*="styles__Heading"] h2, h1, h2, h3, h4');
  const title = headingEl ? cleanText(headingEl.textContent) : '';
  const contentNodes = [];
  if (title) {
    const h3 = document.createElement('h3');
    h3.textContent = title;
    contentNodes.push(hinted(document, 'content_title', [h3]));
  }
  const href = resolveLink(tile, title);
  if (href) {
    const a = document.createElement('a');
    a.setAttribute('href', href);
    // button label of the tile ("Jetzt suchen"); tiles without a CTA element use the title
    const cta = tile.querySelector('[data-testid="content-tile-cta"]');
    a.textContent = (cta && cleanText(cta.textContent)) || title || href;
    const p = document.createElement('p');
    p.appendChild(a);
    contentNodes.push(hinted(document, 'content_link', [p]));
  }
  const contentCell = contentNodes.length ? contentNodes : '';

  // disclaimer
  let disclaimerCell = '';
  const wltp = tile.querySelector('[class*="WLTPContainer"], .fg-wltp-content');
  if (wltp && cleanText(wltp.textContent)) {
    const paras = [...wltp.querySelectorAll('p')].filter((p) => cleanText(p.textContent));
    const out = (paras.length ? paras : [wltp]).map((p) => inlineParagraph(p, document));
    disclaimerCell = hinted(document, 'disclaimer', out);
  }

  return [imageCell, contentCell, disclaimerCell];
}

export default function parse(element, { document }) {
  // inner container instance already consumed via its feature-app wrapper
  if (!isAttached(element, document)) return;

  const tiles = [...element.querySelectorAll(TILE_SEL)].filter((tile) => {
    const parentTile = tile.parentElement && tile.parentElement.closest(TILE_SEL);
    return !(parentTile && element.contains(parentTile));
  });

  const cells = tiles.map((tile) => buildCard(tile, document));
  if (!cells.length) return;

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-image-overlay', cells });
  element.replaceWith(block);
}
