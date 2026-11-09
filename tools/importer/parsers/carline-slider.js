/* eslint-disable */
/* global WebImporter */

import { carlineGroupValue, carlinePageName } from './cards-carline.js';

/**
 * Parser for carline-slider (Audi home page model teaser, feature app "lean moxx",
 * feature-app[id^="a23eb832"]).
 *
 * Source:
 *   [class*="TagGroupContainer"] label > div (input + optional icon + text) -> filter chips
 *   [class*="ResultAndNavigationWrapper"] p                                 -> count ("61 Modelle")
 *   ul[data-testid="slider-container"] > li > button[aria-label]           -> one card per model line
 *     img (mediaservice render), title span, count p, charging icon        -> electric
 *   [class*="ExploreCompareButtons__ButtonWrapper"] a (first group only)    -> buttons after the block
 * The card foldout (models of the clicked line) and the mobile <select> are dropped.
 *
 * Block (model carline-slider): block fields filters (richtext ul) and count (text),
 * then one row per card (model carline-slider-card): image | text (h3 + count link) | electric.
 * Card links point to the migrated model finder sub pages
 * (/language-masters/de/neuwagen/<page name>), emitted absolute and restored by post-import-dam.mjs.
 * Card images are named cards/<slug>; post-import-dam.mjs reuses the existing cards/ file
 * with the same source URL.
 */

const ORIGIN = 'https://www.audi.de';
const FINDER = '/language-masters/de/neuwagen';

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

/** mediaservice render URL without size/format parameters (same form as the cards/ registry) */
function imageUrl(img) {
  const src = (img.getAttribute('src') || '').trim();
  if (!/^https?:\/\//i.test(src)) return '';
  return src.split('?')[0].replace(/\.(webp|jpe?g)$/i, '.png');
}

function absolutize(href) {
  const h = (href || '').trim();
  if (/^https?:\/\//i.test(h)) return h;
  if (h.startsWith('/')) return `${ORIGIN}${h}`;
  return h;
}

/** chips: one per checkbox (the importer may merge adjacent <label>s into one) */
function buildFilters(element, document) {
  const group = element.querySelector('[class*="TagGroupContainer"]');
  if (!group) return null;
  const ul = document.createElement('ul');
  group.querySelectorAll('input').forEach((input) => {
    const chip = input.parentElement;
    const text = cleanText(chip.textContent);
    if (!text) return;
    const li = document.createElement('li');
    const electric = input.value === 'BEV' || !!chip.querySelector('use[href*="charging"]');
    li.textContent = electric ? `:charging: ${text}` : text;
    ul.appendChild(li);
  });
  return ul.children.length ? ul : null;
}

function buildCard(li, document) {
  const button = li.querySelector('button') || li;
  const img = li.querySelector('img');
  const title = cleanText(button.getAttribute('aria-label'))
    || cleanText((li.querySelector('span') || {}).textContent)
    || cleanText(img && img.getAttribute('alt'));
  // "1 Modell" / "9 Modelle": a leaf span (or p) of the card
  const count = cleanText([...li.querySelectorAll('p, span')]
    .filter((e) => !e.children.length)
    .map((e) => e.textContent)
    .find((t) => /^\s*\d+\s+Modell/.test(t)) || '');
  const value = carlineGroupValue(title);

  let imageCell = '';
  const url = img ? imageUrl(img) : '';
  if (url) {
    const pic = document.createElement('img');
    pic.setAttribute('src', url);
    pic.setAttribute('alt', cleanText(img.getAttribute('alt')) || title);
    pic.setAttribute('data-dam-name', `cards/${slugify(title)}`);
    imageCell = hinted(document, 'image', [pic]);
  }

  const textNodes = [];
  if (title) {
    const h3 = document.createElement('h3');
    h3.textContent = title;
    textNodes.push(h3);
  }
  if (count) {
    const p = document.createElement('p');
    if (value) {
      const a = document.createElement('a');
      a.setAttribute('href', `${ORIGIN}${FINDER}/${carlinePageName(value)}`);
      a.textContent = count;
      p.appendChild(a);
    } else {
      p.textContent = count;
    }
    textNodes.push(p);
  }
  const electric = !!li.querySelector('use[href*="charging"]');
  const electricP = document.createElement('p');
  electricP.textContent = electric ? 'true' : 'false';

  return [
    imageCell,
    textNodes.length ? hinted(document, 'text', textNodes) : '',
    hinted(document, 'electric', [electricP]),
  ];
}

export default function parse(element, { document }) {
  const cells = [];

  const filters = buildFilters(element, document);
  cells.push([filters ? hinted(document, 'filters', [filters]) : '']);

  const countEl = element.querySelector('[class*="ResultAndNavigationWrapper"] p');
  const countP = document.createElement('p');
  countP.textContent = cleanText(countEl ? countEl.textContent : '');
  cells.push([countP.textContent ? hinted(document, 'count', [countP]) : '']);

  const cards = [...element.querySelectorAll('ul[data-testid="slider-container"] > li')];
  cards.forEach((li) => cells.push(buildCard(li, document)));

  const block = WebImporter.Blocks.createBlock(document, { name: 'carline-slider', cells });

  // "Audi Modelle entdecken" / "vergleichen": secondary buttons after the block (first group only)
  const after = [];
  const group = element.querySelector('[class*="ExploreCompareButtons__ButtonWrapper"]');
  if (group) {
    group.querySelectorAll('a[href]').forEach((a) => {
      const text = cleanText(a.textContent);
      if (!text) return;
      const p = document.createElement('p');
      const em = document.createElement('em');
      const link = document.createElement('a');
      link.setAttribute('href', absolutize(a.getAttribute('href')));
      link.textContent = text;
      em.appendChild(link);
      p.appendChild(em);
      after.push(p);
    });
  }

  element.replaceWith(block, ...after);
}
