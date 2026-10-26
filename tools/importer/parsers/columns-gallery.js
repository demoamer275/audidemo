/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-gallery (Audi EditorialMedia, two images with captions side by side).
 *
 * Source: [class*="StyledEditorialMediaContainer"]
 *   [class*="EditorialMedia__MediaWrapper"]
 *     [class*="StyledMediaWrapper"] img                  -> image of column N
 *     following [class*="StyledLegalInfo"] p (caption)    -> caption of column N
 *   [class*="EditorialMedia__LegalWrapper"]               -> duplicate captions (desktop
 *                                                            layout), used only as fallback
 *
 * The selector also matches a single-image instance (full-width cockpit image + caption).
 * That one is NOT a block: it is unwrapped into default content (image + caption paragraph).
 *
 * Output (2+ images): one row, one cell per image: [img, p caption].
 * Block names starting with "columns" are converted by md2jcr as a columns block
 * (default content per cell), so no xwalk field hints are added here.
 * Media URLs are NOT rewritten here (the audi-dam-assets transformer does that).
 */

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function cleanMediaUrl(url) {
  return (url || '').trim().split('#')[0].split('?')[0];
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

function captionParas(container, document) {
  if (!container) return [];
  return [...container.querySelectorAll('p')]
    .filter((p) => cleanText(p.textContent))
    .map((p) => inline(p, 'p', document));
}

/** Collect [{ img, caption[] }] items in document order. */
function collectItems(element, document) {
  const mediaWrapper = element.querySelector('[class*="EditorialMedia__MediaWrapper"]') || element;
  const legalWrapper = element.querySelector('[class*="EditorialMedia__LegalWrapper"]');
  const fallbackCaptions = legalWrapper
    ? [...legalWrapper.querySelectorAll('[class*="StyledLegalInfo"]')] : [];

  const media = [...mediaWrapper.querySelectorAll('[class*="StyledMediaWrapper"]')]
    .filter((m) => !(legalWrapper && legalWrapper.contains(m)));
  const items = [];
  media.forEach((m, i) => {
    const src = [...m.querySelectorAll('img[src]')]
      .find((img) => !img.getAttribute('src').startsWith('data:'));
    if (!src) return;
    const img = document.createElement('img');
    img.setAttribute('src', cleanMediaUrl(src.getAttribute('src')));
    img.setAttribute('alt', src.getAttribute('alt') || '');

    // caption = the legal-info element directly following this media wrapper
    let captionEl = null;
    let sib = m.nextElementSibling;
    while (sib && !/StyledMediaWrapper/.test(sib.className || '')) {
      if (/StyledLegalInfo/.test(sib.className || '')) {
        captionEl = sib;
        break;
      }
      sib = sib.nextElementSibling;
    }
    if (!captionEl) captionEl = fallbackCaptions[i] || null;
    items.push({ img, caption: captionParas(captionEl, document) });
  });
  return items;
}

export default function parse(element, { document }) {
  const items = collectItems(element, document);

  if (items.length < 2) {
    // single media item: default content (image paragraph + caption), no block
    const frag = document.createDocumentFragment();
    items.forEach(({ img, caption }) => {
      const p = document.createElement('p');
      p.appendChild(img);
      frag.appendChild(p);
      caption.forEach((c) => frag.appendChild(c));
    });
    element.replaceWith(frag);
    return;
  }

  const cells = [items.map(({ img, caption }) => [img, ...caption])];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-gallery', cells });
  element.replaceWith(block);
}
