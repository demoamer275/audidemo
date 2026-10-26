/* eslint-disable */
/* global WebImporter */

/**
 * Parser for carousel-cards (Audi fa-carousel "Fakten, die begeistern").
 *
 * Source: .faCarousel (inside feature-app[data-content])
 *   li.splide__slide (clones skipped)                -> one slide (row)
 *     img.faCarousel__image                          -> image (placeholder assets skipped)
 *     feature-app data-content slides[].fields
 *       .slideVideoLandscapeAsset / ...Portrait...   -> video (mp4 link; the player is
 *                                                       rendered client-side, so the DOM is empty)
 *     .faCarousel__slideTitle (bold lead-in)          -> content_title as <h3>
 *     .faCarousel__slideDescription p                 -> content_text (keeps <sup>)
 *
 * Row per slide (model carousel-cards-slide): image | video | content_title + content_text
 * Media URLs are NOT rewritten here (the audi-dam-assets transformer does that).
 */

const PLACEHOLDER_RE = /\/PH-[^/]*\.(jpe?g|png|webp)$/i;

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function cleanMediaUrl(url) {
  return (url || '').trim().split('#')[0].split('?')[0];
}

function isPlaceholder(src, alt) {
  const url = cleanMediaUrl(src);
  return !url || url.startsWith('data:') || PLACEHOLDER_RE.test(url) || (alt || '').trim() === '#';
}

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
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

function readSlideData(element) {
  const app = element.closest('feature-app[data-content]');
  if (!app) return [];
  try {
    const data = JSON.parse(app.getAttribute('data-content'));
    return ((data.fields && data.fields.slides) || []).map((s) => s.fields || {});
  } catch (e) {
    return [];
  }
}

function videoUrlOf(data) {
  if (!data) return '';
  const keys = ['slideVideoLandscapeAsset', 'slideVideoPortraitAsset', 'slideVideoAsset'];
  for (const key of keys) {
    const asset = data[key];
    const url = cleanMediaUrl(asset && (asset.path || asset));
    if (typeof url === 'string' && /\.(mp4|webm|mov|m4v)$/i.test(url)) return url;
  }
  return '';
}

export default function parse(element, { document }) {
  const slideData = readSlideData(element);
  const slides = [...element.querySelectorAll('li.splide__slide')]
    .filter((li) => !li.classList.contains('splide__slide--clone'));

  const cells = [];
  slides.forEach((li, index) => {
    const titleEl = li.querySelector('.faCarousel__slideTitle');
    const title = titleEl ? cleanText(titleEl.textContent) : '';
    // pair with the CMS data by title, fall back to position
    const data = slideData.find((d) => cleanText(d.slideTitle) === title) || slideData[index];

    // image
    let imageCell = '';
    const img = [...li.querySelectorAll('img[src]')]
      .find((i) => !isPlaceholder(i.getAttribute('src'), i.getAttribute('alt')));
    if (img) {
      const out = document.createElement('img');
      out.setAttribute('src', cleanMediaUrl(img.getAttribute('src')));
      out.setAttribute('alt', img.getAttribute('alt') || '');
      imageCell = hinted(document, 'image', [out]);
    }

    // video
    let videoCell = '';
    const domVideo = li.querySelector('video source[src], video[src]');
    const videoUrl = (domVideo && cleanMediaUrl(domVideo.getAttribute('src'))) || videoUrlOf(data);
    if (videoUrl) {
      const a = document.createElement('a');
      a.setAttribute('href', videoUrl);
      a.textContent = videoUrl;
      videoCell = hinted(document, 'video', [a]);
    }

    // title + text
    const content = [];
    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title;
      content.push(hinted(document, 'content_title', [h3]));
    }
    const desc = li.querySelector('.faCarousel__slideDescription');
    const paras = desc ? [...desc.querySelectorAll('p')].filter((p) => cleanText(p.textContent)) : [];
    const textNodes = paras.length
      ? paras.map((p) => inline(p, 'p', document))
      : (desc && cleanText(desc.textContent) ? [inline(desc, 'p', document)] : []);
    if (textNodes.length) content.push(hinted(document, 'content_text', textNodes));

    const row = [imageCell, videoCell, content.length ? content : ''];
    if (row.some((c) => c !== '')) cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-cards', cells });
  element.replaceWith(block);
}
