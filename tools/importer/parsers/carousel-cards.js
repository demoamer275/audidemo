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
 *     [data-testid$="-item-cta"] a (slide link)          -> content_text, link paragraph
 *     [data-testid$="-item-wltp"] (consumption line)     -> content_text, last paragraph
 *   carousel title (h2 inside the carousel)            -> <h2> before the block, unless a
 *     separate headline app is tagged for this carousel (data-heading-for, car pages)
 *
 * Row per slide (model carousel-cards-slide): image | video | content_title + content_text
 * Media URLs are NOT rewritten here (the audi-dam-assets transformer does that).
 *
 * audi.com variant (media-release slider, e.g. /en/audi-q5-59), detected by .teaser-card:
 * Source: .page-list.-teaser > .page-list--items (.splide)
 *   .splide__slide (div or li; .splide__slide--clone skipped) .teaser-card -> one slide (row)
 *     .teaser-card--image img                       -> image (src kept as resolved by
 *                                                      audicom-cleanup; badge overlay dropped)
 *     .teaser-card--tags .tag ("Archived content")  -> content_text, first paragraph
 *     .teaser-card--meta .meta--item (date, category) -> content_text, "date · category"
 *     .teaser-card--title a                         -> content_text, <h3> linked to the release
 *   The linked title goes into the richtext content_text (content_title is a plain text
 *   field and would drop the link). Video cell is empty. The list title (.page-list--title)
 *   sits outside the block element and stays default content.
 */

const AUDICOM_ORIGIN = 'https://www.audi.com';

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

function absolutizeAudiCom(href) {
  const h = (href || '').trim();
  if (!h || h.startsWith('#')) return '';
  try { return new URL(h, AUDICOM_ORIGIN).href; } catch (e) { return h; }
}

/** audi.com .teaser-card slide -> [image, video (empty), content_text]. */
function buildAudiComSlide(card, document) {
  let imageCell = '';
  const img = card.querySelector('.teaser-card--image img') || card.querySelector('img');
  const src = img ? (img.getAttribute('src') || '').trim() : '';
  if (src) {
    const out = document.createElement('img');
    out.setAttribute('src', src);
    out.setAttribute('alt', cleanText(img.getAttribute('alt')));
    imageCell = hinted(document, 'image', [out]);
  }

  const textNodes = [];
  [...card.querySelectorAll('.teaser-card--tags .tag')]
    .map((t) => cleanText(t.textContent)).filter(Boolean)
    .forEach((t) => {
      const p = document.createElement('p');
      p.textContent = t;
      textNodes.push(p);
    });
  const meta = [...card.querySelectorAll('.teaser-card--meta .meta--item')]
    .map((m) => cleanText(m.textContent)).filter(Boolean);
  if (meta.length) {
    const p = document.createElement('p');
    p.textContent = meta.join(' · ');
    textNodes.push(p);
  }
  const titleEl = card.querySelector('.teaser-card--title');
  const title = cleanText(titleEl ? titleEl.textContent : '');
  if (title) {
    const link = (titleEl.querySelector('a[href]')) || card.querySelector('.teaser-card--image a[href]');
    const href = link ? absolutizeAudiCom(link.getAttribute('href')) : '';
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
  const contentCell = textNodes.length ? hinted(document, 'content_text', textNodes) : '';

  if (!imageCell && !contentCell) return null;
  return [imageCell, '', contentCell];
}

export default function parse(element, { document }) {
  const teaserCards = element.querySelectorAll('.teaser-card');
  if (teaserCards.length) {
    const cells = [];
    [...element.querySelectorAll('.splide__slide')]
      .filter((slide) => !slide.classList.contains('splide__slide--clone'))
      .map((slide) => slide.querySelector('.teaser-card'))
      .filter(Boolean)
      .forEach((card) => {
        const row = buildAudiComSlide(card, document);
        if (row) cells.push(row);
      });
    // slider markup without splide slides: take the cards directly
    if (!cells.length) {
      [...teaserCards].forEach((card) => {
        const row = buildAudiComSlide(card, document);
        if (row) cells.push(row);
      });
    }
    const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-cards', cells });
    element.replaceWith(block);
    return;
  }

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
    // slide link ("Audi Q9 entdecken und konfigurieren") and consumption line
    const cta = li.querySelector('a[data-testid$="-item-cta"]');
    if (cta && cleanText(cta.textContent) && cta.getAttribute('href')) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', cta.getAttribute('href'));
      a.textContent = cleanText(cta.textContent);
      p.appendChild(a);
      textNodes.push(p);
    }
    const wltp = li.querySelector('[data-testid$="-item-wltp"]');
    if (wltp && cleanText(wltp.textContent)) {
      const line = inline(wltp, 'p', document);
      // the source separates the values with spans: "…km;CO₂" -> "…km; CO₂"
      line.innerHTML = line.innerHTML.replace(/;(?!\s|$)/g, '; ');
      textNodes.push(line);
    }
    if (textNodes.length) content.push(hinted(document, 'content_text', textNodes));

    const row = [imageCell, videoCell, content.length ? content : ''];
    if (row.some((c) => c !== '')) cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-cards', cells });

  // carousel title: keep it as default content before the block (home page); car pages
  // already carry it in a separate headline app tagged with data-heading-for
  const app = element.closest('feature-app[id]');
  const tagged = app && document.querySelector(`feature-app[data-heading-for="${app.id.slice(0, 8)}"]`);
  const titleEl = [...element.querySelectorAll('h2')].find((h) => !h.closest('li'));
  if (titleEl && !tagged && cleanText(titleEl.textContent)) {
    const h2 = document.createElement('h2');
    h2.textContent = cleanText(titleEl.textContent);
    element.replaceWith(h2, block);
  } else {
    element.replaceWith(block);
  }
}
