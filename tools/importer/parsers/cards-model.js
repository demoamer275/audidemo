/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-model (Audi model finder sub page: one tile per model).
 *
 * Source: [class*="CardList__CardListWrapper"] > [class*="CardList__CardListItem"]
 *           > [class*="CarlineCard__CardWrapper"][data-testid="carCard-<id>"]
 *   [data-testid="frostyBadge"]            -> badges (Neu / Benzin/Diesel / Hybrid / Elektrisch ...)
 *   [class*="CardImage"] img               -> image (+ alt)
 *   h2.carlineTitle                        -> model name
 *   [class*="Price__StyledPrice"] (x2)     -> price (<sup>N</sup>) + "inkl. MwSt"
 *   [data-testid="primaryCta"]             -> Konfigurieren (absolute configurator URL)
 *   [data-testid="secondaryCta"]           -> Entdecken (model page)
 *   [data-testid="newCarsVtpLink"]         -> Zur Neuwagenbörse (only when it is a link)
 *   [data-testid="usedCarsVtpLink"]        -> Zur Gebrauchtwagenbörse (only when it is a link)
 *   [data-testid="cae"]                    -> consumption / emissions
 *   "Vergleichen" checkbox                 -> dropped
 * Every part is optional (S6/RS 6, Nuvolari, R26: no price / no Konfigurieren / disabled stock links).
 *
 * Row per card (model cards-model-card):
 *   cell 1: field:image       (imageAlt collapsed into alt; data-dam-name="cards/<slug of model name>")
 *   cell 2: field:text        (ul badges, h2 name, p price, p strong a Konfigurieren,
 *                              p em a Entdecken, p a Zur Neuwagenbörse, p a Zur Gebrauchtwagenbörse)
 *   cell 3: field:consumption (rich text with <sup>N</sup>)
 */

const ORIGIN = 'https://www.audi.de';

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function slugify(text) {
  return cleanText(text).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  if (/^https?:\/\//i.test(h)) return h;
  if (h.startsWith('//')) return `https:${h}`;
  if (h.startsWith('/')) return `${ORIGIN}${h}`;
  return h;
}

/** Best real image URL: plain src (original render), else the largest srcset candidate. */
function imageUrl(img) {
  const src = (img.getAttribute('src') || '').trim();
  if (/^https?:\/\//i.test(src) && !/placeholder/i.test(src)) return src;
  const candidates = (img.getAttribute('srcset') || '').split(/,\s+/)
    .map((s) => s.trim().split(/\s+/))
    .filter(([u]) => /^https?:\/\//i.test(u || ''))
    .map(([u, w]) => ({ u, w: parseInt(w, 10) || 0 }))
    .sort((a, b) => b.w - a.w);
  if (candidates.length) return candidates[0].u.split('?')[0];
  return '';
}

/**
 * Copy inline content into target as clean rich text: wrapper spans unwrapped,
 * whitespace collapsed, comments/icons dropped, footnote refs as plain <sup>N</sup>.
 */
function appendInline(source, target, document) {
  source.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const text = node.textContent.replace(/\s+/g, ' ');
      if (text) target.appendChild(document.createTextNode(text));
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toUpperCase();
    if (['IMG', 'SVG', 'SCRIPT', 'STYLE', 'PICTURE', 'INPUT', 'BUTTON'].includes(tag)) return;
    if (tag === 'SUP') {
      const t = cleanText(node.textContent);
      if (!t) return;
      const sup = document.createElement('sup');
      sup.textContent = t;
      target.appendChild(sup);
      return;
    }
    if (tag === 'BR') {
      target.appendChild(document.createElement('br'));
      return;
    }
    if (['STRONG', 'B', 'EM', 'I', 'SUB'].includes(tag)) {
      const el = document.createElement(tag.toLowerCase());
      appendInline(node, el, document);
      target.appendChild(el);
      return;
    }
    // links (footnote anchors etc.) and wrappers -> text content only
    appendInline(node, target, document);
  });
  return target;
}

function trimEdges(el) {
  // merge/trim leading and trailing whitespace text
  while (el.firstChild && el.firstChild.nodeType === 3 && !el.firstChild.textContent.trim()) el.firstChild.remove();
  while (el.lastChild && el.lastChild.nodeType === 3 && !el.lastChild.textContent.trim()) el.lastChild.remove();
  if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.textContent = el.firstChild.textContent.replace(/^\s+/, '');
  if (el.lastChild && el.lastChild.nodeType === 3) el.lastChild.textContent = el.lastChild.textContent.replace(/\s+$/, '');
  // no space before a footnote reference
  el.querySelectorAll('sup').forEach((sup) => {
    const prev = sup.previousSibling;
    if (prev && prev.nodeType === 3) prev.textContent = prev.textContent.replace(/\s+$/, '');
  });
  return el;
}

function getCards(element) {
  let cards = [...element.querySelectorAll('[class*="CarlineCard__CardWrapper"]')];
  if (!cards.length) cards = [...element.querySelectorAll('[data-testid^="carCard-"]')];
  if (!cards.length) cards = [...element.querySelectorAll('[class*="CardList__CardListItem"]')];
  return cards.filter((c) => !cards.some((o) => o !== c && o.contains(c)));
}

function linkPara(document, href, text, wrapTag) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.setAttribute('href', href);
  a.textContent = text;
  if (wrapTag) {
    const w = document.createElement(wrapTag);
    w.appendChild(a);
    p.appendChild(w);
  } else {
    p.appendChild(a);
  }
  return p;
}

function buildCard(card, document) {
  const titleEl = card.querySelector('h2, h3, [class*="CarlineCard__Title"]');
  const title = cleanText(titleEl ? titleEl.textContent : '');
  const srcImg = card.querySelector('[class*="CardImage"] img') || card.querySelector('img');

  // image cell
  let imageCell = '';
  const url = srcImg ? imageUrl(srcImg) : '';
  if (url) {
    const img = document.createElement('img');
    img.setAttribute('src', url);
    const alt = cleanText(srcImg.getAttribute('alt')) || title;
    img.setAttribute('alt', alt);
    const slug = slugify(title || alt);
    if (slug) img.setAttribute('data-dam-name', `cards/${slug}`);
    imageCell = hinted(document, 'image', [img]);
  }

  // text cell
  const textNodes = [];

  const badges = [...card.querySelectorAll('[data-testid="frostyBadge"]')]
    .map((b) => cleanText(b.textContent)).filter(Boolean);
  if (badges.length) {
    const ul = document.createElement('ul');
    badges.forEach((b) => {
      const li = document.createElement('li');
      li.textContent = b;
      ul.appendChild(li);
    });
    textNodes.push(ul);
  }

  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    textNodes.push(h2);
  }

  let priceParts = [...card.querySelectorAll('[class*="Price__StyledPrice"]')];
  if (!priceParts.length) priceParts = [...card.querySelectorAll('[data-testid="price"]')];
  priceParts = priceParts.filter((p) => !priceParts.some((o) => o !== p && o.contains(p)));
  if (priceParts.length) {
    const p = document.createElement('p');
    priceParts.forEach((part, i) => {
      if (i > 0) p.appendChild(document.createTextNode(' '));
      appendInline(part, p, document);
    });
    trimEdges(p);
    if (cleanText(p.textContent)) textNodes.push(p);
  }

  const primary = card.querySelector('a[data-testid="primaryCta"][href]');
  if (primary && absolutize(primary.getAttribute('href'))) {
    textNodes.push(linkPara(document, absolutize(primary.getAttribute('href')), cleanText(primary.textContent) || 'Konfigurieren', 'strong'));
  }
  const secondary = card.querySelector('a[data-testid="secondaryCta"][href]');
  if (secondary && absolutize(secondary.getAttribute('href'))) {
    textNodes.push(linkPara(document, absolutize(secondary.getAttribute('href')), cleanText(secondary.textContent) || 'Entdecken', 'em'));
  }
  ['newCarsVtpLink', 'usedCarsVtpLink'].forEach((id) => {
    // disabled stock "links" are <button>s without href (count 0): omitted
    const a = card.querySelector(`a[data-testid="${id}"][href]`);
    const href = a ? absolutize(a.getAttribute('href')) : '';
    if (!href) return;
    const text = cleanText(a.textContent).replace(/\s*\(\s*\d[\d.]*\s*\)\s*$/, '');
    if (text) textNodes.push(linkPara(document, href, text));
  });

  const textCell = textNodes.length ? hinted(document, 'text', textNodes) : '';

  // consumption cell
  let consumptionCell = '';
  const caeEls = [...card.querySelectorAll('[data-testid="cae"]')];
  const caeParas = (caeEls.length ? caeEls : [...card.querySelectorAll('[class*="CarlineCard__DisclaimerWrapper"] p')])
    .map((el) => trimEdges(appendInline(el, document.createElement('p'), document)))
    .filter((p) => cleanText(p.textContent));
  if (caeParas.length) consumptionCell = hinted(document, 'consumption', caeParas);

  if (!imageCell && !textCell && !consumptionCell) return null;
  return [imageCell, textCell, consumptionCell];
}

export default function parse(element, { document }) {
  const cells = [];
  getCards(element).forEach((card) => {
    const row = buildCard(card, document);
    if (row) cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-model', cells });
  element.replaceWith(block);
}
