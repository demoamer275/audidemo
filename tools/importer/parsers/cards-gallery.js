/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-gallery (audi.com model page image / video gallery grid).
 *
 * Source: .page-item--gallery .gallery-panel--content (grid of .gallery-item)
 *   .gallery-item                                   -> one row
 *     img (src resolved by audicom-cleanup)         -> image (+ alt)
 *     a[href] (plain href, not the lightbox up-href) -> title link target
 *                                                      (/en/images/detail/... or /en/videos/video/...)
 *     img[alt] / .cropped-image[title]              -> title text
 *     [up-data] descriptionHtml .meta--item         -> category label (Photo, Illustration, ...);
 *                                                      only when present in the DOM (image items)
 *
 * User decision: only the FIRST 8 items of an image gallery and the FIRST 4 items of a
 * video gallery are kept (DOM order). A gallery is a video gallery when its items contain
 * .image.is-video or link to /videos/video/.
 *
 * Row per item (model cards-gallery-item):
 *   cell 1: field:image (imageAlt collapsed into alt)
 *   cell 2: field:text  (optional <p>category</p>, <p><a href>title</a></p>)
 */

const AUDICOM_ORIGIN = 'https://www.audi.com';
const IMAGE_LIMIT = 8;
const VIDEO_LIMIT = 4;
const DATE_RE = /^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/;

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

function isVideoItem(item) {
  return !!item.querySelector('.image.is-video, a[href*="/videos/video/"]');
}

/** Category label from DOM data only (data attributes or the lightbox up-data meta). */
function categoryOf(item, document) {
  const holder = item.querySelector('[data-category], [data-media-type]') || item;
  const direct = cleanText(holder.getAttribute('data-category') || holder.getAttribute('data-media-type'));
  if (direct) return direct;
  const raw = item.getAttribute('up-data');
  if (!raw) return '';
  try {
    const data = JSON.parse(raw);
    if (!data || !data.descriptionHtml) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = data.descriptionHtml;
    const meta = [...tmp.querySelectorAll('.meta--item')]
      .map((m) => cleanText(m.textContent))
      .filter((t) => t && !DATE_RE.test(t));
    return meta[0] || '';
  } catch (e) {
    return '';
  }
}

function buildItem(item, document) {
  const srcImg = item.querySelector('img');
  const src = srcImg ? (srcImg.getAttribute('src') || '').trim() : '';
  const alt = cleanText(srcImg ? srcImg.getAttribute('alt') : '');
  const cropped = item.querySelector('.cropped-image[title]');
  const title = alt || cleanText(cropped ? cropped.getAttribute('title') : '');

  let imageCell = '';
  if (src) {
    const img = document.createElement('img');
    img.setAttribute('src', src);
    img.setAttribute('alt', alt || title);
    imageCell = hinted(document, 'image', [img]);
  }

  const textNodes = [];
  const category = categoryOf(item, document);
  if (category) {
    const p = document.createElement('p');
    p.textContent = category;
    textNodes.push(p);
  }
  if (title) {
    const link = item.querySelector('a[href]');
    const href = link ? absolutize(link.getAttribute('href')) : '';
    const p = document.createElement('p');
    if (href) {
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = title;
      p.appendChild(a);
    } else {
      p.textContent = title;
    }
    textNodes.push(p);
  }
  const textCell = textNodes.length ? hinted(document, 'text', textNodes) : '';

  if (!imageCell && !textCell) return null;
  return [imageCell, textCell];
}

export default function parse(element, { document }) {
  let items = [...element.querySelectorAll(':scope > .gallery-item')];
  if (!items.length) items = [...element.querySelectorAll('.gallery-item')];
  const isVideoGallery = items.some(isVideoItem);
  const limit = isVideoGallery ? VIDEO_LIMIT : IMAGE_LIMIT;

  const cells = [];
  items.slice(0, limit).forEach((item) => {
    const row = buildItem(item, document);
    if (row) cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-gallery', cells });
  element.replaceWith(block);
}
