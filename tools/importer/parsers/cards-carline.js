/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-carline (Audi model finder overview: one tile per model line).
 *
 * Source: [class*="Results__GroupCardGrid"] > button.TileAlpha[data-testid="cargroupCard-<value>"] (x15)
 *   [class*="CargroupCard_alpha__HeaderRow"] p   -> title ("Audi A3")
 *   [data-testid="frostyBadge"] / charging icon  -> electric
 *   [class*="CardImage__Wrapper"] img            -> image (+ alt)
 *   [class*="CargroupCard_alpha__BottomRow"] p   -> count ("9 Modelle")
 *
 * Row per card (model cards-carline-card):
 *   cell 1: field:image    (imageAlt collapsed into alt; data-dam-name="cards/<slug of title>")
 *   cell 2: field:text     (h2 title + p with count link -> /language-masters/de/neuwagen/<page name>)
 *   cell 3: field:electric ("true" / "false")
 * Links are emitted absolute (https://www.audi.de/language-masters/...) on purpose:
 * post-import-dam.mjs restores the root-relative /language-masters/... form.
 */

const ORIGIN = 'https://www.audi.de';
const CONTENT_ROOT = '/language-masters/de/neuwagen';

// title -> bycarlinegroup value (page-templates.json, template neuwagen-finder, carlineGroups)
const CARLINE_GROUPS = {
  'Audi A2 e-tron': 'a2etron',
  'Audi A3': 'a3',
  'Audi A5': 'a5',
  'Audi A6': 'a6',
  'Audi A6 e-tron': 'a6etron',
  'Audi Q3': 'q3',
  'Audi Q4 e-tron': 'q4',
  'Audi Q5': 'q5',
  'Audi Q6 e-tron': 'q6',
  'Audi Q7': 'q7',
  'Audi Q8': 'q8',
  'Audi Q9': 'q9',
  'Audi e-tron GT': 'etrongt',
  'Audi Nuvolari': 'nuvolari',
  'Audi F1': 'f1',
};

// bycarlinegroup value -> AEM page name, where it differs (default: the value itself)
const PAGE_NAMES = {
  a2etron: 'a2-e-tron',
};

/**
 * AEM page name of a model-line sub page (shared with the import script).
 * @param {string} value bycarlinegroup value
 * @returns {string}
 */
export function carlinePageName(value) {
  return PAGE_NAMES[value] || value;
}

/**
 * bycarlinegroup value of a model line title ("Audi A3" -> "a3"), shared with other parsers.
 * @param {string} title
 * @returns {string} '' when unknown
 */
export function carlineGroupValue(title) {
  return CARLINE_GROUPS[(title || '').replace(/\s+/g, ' ').trim()] || '';
}

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

function getCards(element) {
  let cards = [...element.querySelectorAll('button[data-testid^="cargroupCard-"]')];
  if (!cards.length) cards = [...element.querySelectorAll('[data-testid^="cargroupCard-"]')];
  if (!cards.length) cards = [...element.querySelectorAll(':scope > button, :scope > a, :scope > div')];
  return cards.filter((c) => !cards.some((o) => o !== c && o.contains(c)));
}

function buildCard(card, document) {
  const header = card.querySelector('[class*="CargroupCard_alpha__HeaderRow"]');
  const bottom = card.querySelector('[class*="CargroupCard_alpha__BottomRow"]');
  const paras = [...card.querySelectorAll('p')];
  const titleEl = (header && header.querySelector('p, h2, h3, h4')) || paras[0];
  const countEl = (bottom && bottom.querySelector('p')) || (paras.length > 1 ? paras[paras.length - 1] : null);
  const srcImg = card.querySelector('[class*="CardImage__Wrapper"] img') || card.querySelector('img');

  const title = cleanText(titleEl ? titleEl.textContent : '') || cleanText(srcImg ? srcImg.getAttribute('alt') : '');
  const count = cleanText(countEl ? countEl.textContent : '');
  const testId = (card.getAttribute('data-testid') || '').replace(/^cargroupCard-/, '');
  const value = CARLINE_GROUPS[title] || testId;

  // image cell
  let imageCell = '';
  const url = srcImg ? imageUrl(srcImg) : '';
  if (url) {
    const img = document.createElement('img');
    img.setAttribute('src', url);
    img.setAttribute('alt', cleanText(srcImg.getAttribute('alt')) || title);
    const slug = slugify(title || srcImg.getAttribute('alt'));
    if (slug) img.setAttribute('data-dam-name', `cards/${slug}`);
    imageCell = hinted(document, 'image', [img]);
  }

  // text cell
  const textNodes = [];
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    textNodes.push(h2);
  }
  if (count) {
    const p = document.createElement('p');
    if (value) {
      const a = document.createElement('a');
      a.setAttribute('href', `${ORIGIN}${CONTENT_ROOT}/${carlinePageName(value)}`);
      a.textContent = count;
      p.appendChild(a);
    } else {
      p.textContent = count;
    }
    textNodes.push(p);
  }
  const textCell = textNodes.length ? hinted(document, 'text', textNodes) : '';

  // electric cell
  const electric = !!card.querySelector('use[href*="charging"], [data-testid="frostyBadge"]');
  const electricCell = hinted(document, 'electric', [document.createTextNode(electric ? 'true' : 'false')]);

  if (!imageCell && !textCell) return null;
  return [imageCell, textCell, electricCell];
}

export default function parse(element, { document }) {
  const cells = [];
  getCards(element).forEach((card) => {
    const row = buildCard(card, document);
    if (row) cells.push(row);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-carline', cells });
  element.replaceWith(block);
}
