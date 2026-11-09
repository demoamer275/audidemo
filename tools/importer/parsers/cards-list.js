/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-list (audi.com related articles / media set lists).
 *
 * Source: .page-list.-detailed > ul.page-list--items > li.detailed-page-list-item
 *   .detailed-page-list-item--image img           -> image (+ alt; src kept as resolved by
 *                                                    audicom-cleanup, no data-dam-name)
 *   .badge-wrapper--layer (footnote markers "4, 5") -> dropped
 *   .detailed-page-list-item--tags .tag            -> optional tag paragraph ("Archived content",
 *                                                    e-hybrid model pages), first in the text cell
 *                                                    (same as the carousel-cards audi.com slides)
 *   .detailed-page-list-item--meta .meta--item    -> meta line "date · category"
 *   a.detailed-page-list-item--title[href] h3     -> <h3> linked to the item href
 *   .detailed-page-list-item--intro               -> optional description paragraph
 * The list title (.page-list--title) sits outside the block element and stays default content.
 *
 * Row per item (model cards-list-item):
 *   cell 1: field:image (imageAlt collapsed into alt)
 *   cell 2: field:text  (p tag, p meta, h3 > a title, p description)
 */

const AUDICOM_ORIGIN = 'https://www.audi.com';

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function absolutize(href) {
  const h = (href || '').trim();
  if (!h || h.startsWith('#')) return '';
  try { return new URL(h, AUDICOM_ORIGIN).href; } catch (e) { return h; }
}

function buildItem(item, document) {
  const titleLink = item.querySelector('a.detailed-page-list-item--title[href]');
  const titleEl = item.querySelector('.detailed-page-list-item--title h3, .detailed-page-list-item--title, h3');
  const title = cleanText(titleEl ? titleEl.textContent : '');
  const imageLink = item.querySelector('a.detailed-page-list-item--image[href]');
  const href = absolutize((titleLink || imageLink || { getAttribute: () => '' }).getAttribute('href'));

  // image cell (badge overlay is not copied)
  let imageCell = '';
  const srcImg = item.querySelector('.detailed-page-list-item--image img') || item.querySelector('img');
  const src = srcImg ? (srcImg.getAttribute('src') || '').trim() : '';
  if (src) {
    const img = document.createElement('img');
    img.setAttribute('src', src);
    img.setAttribute('alt', cleanText(srcImg.getAttribute('alt')) || title);
    imageCell = hinted(document, 'image', [img]);
  }

  // text cell
  const textNodes = [];
  [...item.querySelectorAll('.detailed-page-list-item--tags .tag')]
    .map((t) => cleanText(t.textContent)).filter(Boolean)
    .forEach((t) => {
      const p = document.createElement('p');
      p.textContent = t;
      textNodes.push(p);
    });
  const meta =[...item.querySelectorAll('.detailed-page-list-item--meta .meta--item')]
    .map((m) => cleanText(m.textContent)).filter(Boolean);
  if (meta.length) {
    const p = document.createElement('p');
    p.textContent = meta.join(' · ');
    textNodes.push(p);
  }
  if (title) {
    const h3 = document.createElement('h3');
    if (href) {
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = title;
      h3.appendChild(a);
    } else {
      h3.textContent = title;
    }
    textNodes.push(h3);
  }
  const intro = item.querySelector('.detailed-page-list-item--intro');
  const introText = cleanText(intro ? intro.textContent : '');
  if (introText) {
    const paras = [...intro.querySelectorAll('p')].map((p) => cleanText(p.textContent)).filter(Boolean);
    (paras.length ? paras : [introText]).forEach((t) => {
      const p = document.createElement('p');
      p.textContent = t;
      textNodes.push(p);
    });
  }
  const textCell = textNodes.length ? hinted(document, 'text', textNodes) : '';

  if (!imageCell && !textCell) return null;
  return [imageCell, textCell];
}

export default function parse(element, { document }) {
  const cells = [];
  let items = [...element.querySelectorAll('li.detailed-page-list-item')];
  if (!items.length) items = [...element.querySelectorAll(':scope > li')];
  items.forEach((item) => {
    const row = buildItem(item, document);
    if (row) cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-list', cells });
  element.replaceWith(block);
}
