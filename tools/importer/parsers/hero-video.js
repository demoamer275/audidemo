/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-video (Audi model page stage with background video).
 *
 * Source: [class*="StageContainer__StageContainerWrap"] (inside feature-app[data-content])
 *   video > source[src]                         -> video (mp4 link, "#t=0.001"/query stripped)
 *   feature-app[data-content] JSON              -> poster image (assetPortraitPoster + alt text);
 *                                                  the poster is not rendered in the DOM
 *   h1 + RichText p (price)                     -> text
 *   StageButtons a[href] (first button set)     -> text (CTA link paragraphs)
 *   StageLegal Disclaimers p                    -> disclaimer
 *
 * Rows follow the project model blocks/hero-video/_hero-video.json (one cell each):
 *   video | image (imageAlt collapsed into alt) | text | disclaimer
 * Media URLs are NOT rewritten here (the audi-dam-assets transformer does that).
 */

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function cleanMediaUrl(url) {
  return (url || '').trim().split('#')[0].split('?')[0];
}

function readStageData(element) {
  const app = element.closest('feature-app[data-content]')
    || element.querySelector('feature-app[data-content]');
  if (!app) return null;
  try {
    return JSON.parse(app.getAttribute('data-content'));
  } catch (e) {
    return null;
  }
}

/** Inline copy keeping <sup>, <strong>, <em>, <br> and links; wrappers are unwrapped. */
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
    if (['IMG', 'SVG', 'PICTURE', 'SCRIPT', 'STYLE', 'VIDEO'].includes(tag)) return;
    if (tag === 'SUP') {
      const t = cleanText(node.textContent);
      if (!t) return;
      const sup = document.createElement('sup');
      sup.textContent = /^[,;]$/.test(t) ? `${t} ` : t;
      target.appendChild(sup);
      return;
    }
    if (tag === 'BR') {
      target.appendChild(document.createElement('br'));
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

function inline(source, tagName, document) {
  const el = appendInline(source, document.createElement(tagName), document);
  const first = el.firstChild;
  if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, '');
  const last = el.lastChild;
  if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, '');
  return el;
}

export default function parse(element, { document }) {
  const data = readStageData(element);
  const fields = (data && data.fields) || {};
  const assetFields = (fields.asset && fields.asset.fields) || {};

  // row 1: video link
  let videoCell = '';
  const source = element.querySelector('video source[src], video[src]');
  let videoUrl = source ? cleanMediaUrl(source.getAttribute('src')) : '';
  if (!videoUrl && assetFields.assetLandscape
    && /\.mp4$/i.test(cleanMediaUrl(assetFields.assetLandscape.path))) {
    videoUrl = cleanMediaUrl(assetFields.assetLandscape.path);
  }
  if (videoUrl) {
    const a = document.createElement('a');
    a.setAttribute('href', videoUrl);
    a.textContent = videoUrl;
    videoCell = hinted(document, 'video', [a]);
  }

  // row 2: poster / fallback image
  let imageCell = '';
  const domImg = [...element.querySelectorAll('img[src]')]
    .find((img) => !img.getAttribute('src').startsWith('data:'));
  const poster = assetFields.assetPortraitPoster;
  const posterSrc = domImg ? domImg.getAttribute('src') : (poster && poster.path);
  if (posterSrc) {
    const img = document.createElement('img');
    img.setAttribute('src', cleanMediaUrl(posterSrc));
    img.setAttribute('alt', domImg ? (domImg.getAttribute('alt') || '')
      : (assetFields.assetPortraitAltText || assetFields.assetAlt || ''));
    imageCell = hinted(document, 'image', [img]);
  }

  // row 3: headline, price, CTAs
  const textNodes = [];
  const heading = element.querySelector('h1, h2');
  if (heading && cleanText(heading.textContent)) {
    const h = document.createElement(heading.tagName.toLowerCase());
    h.textContent = cleanText(heading.textContent);
    textNodes.push(h);
  }
  const headWrap = element.querySelector('[class*="StyledHeadlineSubLineWrapper"]')
    || (heading && heading.parentElement);
  if (headWrap) {
    headWrap.querySelectorAll('p').forEach((p) => {
      if (cleanText(p.textContent)) textNodes.push(inline(p, 'p', document));
    });
  }
  // desktop and mobile button sets are duplicates: take the first set only
  const buttonSet = element.querySelector('[class*="StageButtons__ButtonsContainer"]');
  const seen = new Set();
  (buttonSet ? [...buttonSet.querySelectorAll('a[href]')] : []).forEach((btn) => {
    const label = cleanText(btn.textContent);
    const href = btn.getAttribute('href');
    if (!label || seen.has(`${href}|${label}`)) return;
    seen.add(`${href}|${label}`);
    const a = document.createElement('a');
    a.setAttribute('href', href);
    a.textContent = label;
    const p = document.createElement('p');
    p.appendChild(a);
    textNodes.push(p);
  });
  const textCell = textNodes.length ? hinted(document, 'text', textNodes) : '';

  // row 4: consumption / emission disclaimer
  let disclaimerCell = '';
  const legal = element.querySelector('[class*="StageLegal"]');
  const legalParas = legal
    ? [...legal.querySelectorAll('p')].filter((p) => cleanText(p.textContent)) : [];
  if (legalParas.length) {
    disclaimerCell = hinted(document, 'disclaimer', legalParas.map((p) => inline(p, 'p', document)));
  } else if (Array.isArray(fields.disclaimers) && fields.disclaimers.length) {
    disclaimerCell = hinted(document, 'disclaimer', fields.disclaimers.map((t) => {
      const p = document.createElement('p');
      p.textContent = cleanText(t);
      return p;
    }));
  }

  const cells = [[videoCell], [imageCell], [textCell], [disclaimerCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-video', cells });
  element.replaceWith(block);
}
