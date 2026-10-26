/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-teaser (Audi EditorialTeaser grid).
 *
 * Source: feature-app > ... > [class*="EditorialTeaserContainer"] > [class*="EditorialTeaser__StyledComponent"] (x3)
 * The page has several consecutive teaser containers (3 teasers each). All teasers are
 * merged into ONE block (source order); the other container instances are removed.
 *
 * Row per card (model cards-teaser-card):
 *   cell 1: image          -> field:image (imageAlt collapsed into alt)
 *   cell 2: title/body/CTA -> field:text_title, field:text_body, field:text_link
 *   cell 3: disclaimer     -> field:disclaimer (consumption / emission info incl. <sup>)
 */

const CONTAINER_SEL = '[class*="EditorialTeaserContainer"]';
const TEASER_SEL = '[class*="EditorialTeaser__StyledComponent"]';

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

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function buildImage(teaser, document) {
  const src = teaser.querySelector('[class*="EditorialTeaser__Media"] img, img[class*="StyledImage"]');
  if (!src || !src.getAttribute('src') || src.getAttribute('src').startsWith('data:')) return null;
  const img = document.createElement('img');
  img.setAttribute('src', src.getAttribute('src'));
  img.setAttribute('alt', src.getAttribute('alt') || '');
  return img;
}

const KEEP_INLINE = ['STRONG', 'B', 'EM', 'I', 'U', 'SUB'];

/**
 * Copy inline content of a source node into target as clean rich text:
 * wrapper spans are unwrapped, whitespace collapsed, React comment markers and
 * decorative icons dropped, footnote references kept as plain <sup>N</sup>.
 */
function appendInline(source, target, document) {
  source.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const raw = node.textContent;
      // whitespace-only nodes with line breaks are markup formatting, not content
      if (/^\s*$/.test(raw) && /\n/.test(raw)) return;
      const text = raw.replace(/\s+/g, ' ');
      if (text) target.appendChild(document.createTextNode(text));
      return;
    }
    if (node.nodeType !== 1) return; // comments etc.
    const tag = node.tagName.toUpperCase();
    if (['IMG', 'SVG', 'SCRIPT', 'STYLE', 'PICTURE'].includes(tag)) return;
    if (tag === 'SUP') {
      const t = node.textContent.replace(/\s+/g, ' ').trim();
      if (!t) return;
      const sup = document.createElement('sup');
      // keep ", " separators between footnote numbers
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
    if (KEEP_INLINE.includes(tag)) {
      const el = document.createElement(tag.toLowerCase());
      appendInline(node, el, document);
      target.appendChild(el);
      return;
    }
    appendInline(node, target, document);
  });
  return target;
}

function trimEdges(el) {
  const first = el.firstChild;
  if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s+/, '');
  const last = el.lastChild;
  if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+$/, '');
  return el;
}

function copyInline(source, target) {
  const document = target.ownerDocument;
  return trimEdges(appendInline(source, target, document));
}

function buildCard(teaser, document) {
  const textArea = teaser.querySelector('[class*="EditorialTeaser__TextArea"]') || teaser;

  // image cell
  const img = buildImage(teaser, document);
  const imageCell = img ? hinted(document, 'image', [img]) : '';

  // text cell: title + body + CTA
  const textNodes = [];
  const heading = textArea.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && cleanText(heading.textContent)) {
    const h = document.createElement(heading.tagName.toLowerCase());
    h.textContent = cleanText(heading.textContent);
    textNodes.push(hinted(document, 'text_title', [h]));
  }

  const legal = textArea.querySelector('[class*="LegalInfoContainer"]');
  const legalParas = legal
    ? [...legal.querySelectorAll('p')].filter((p) => cleanText(p.textContent)) : [];
  // model pages: product facts ("•\tAb 46.900,00 EUR ...") sit in the legal box -> body list
  const isFact = (p) => /^[•·]/.test(cleanText(p.textContent));
  const factParas = legalParas.filter(isFact);
  const disclaimerParas = legalParas.filter((p) => !isFact(p));

  const bodyNodes = [...textArea.querySelectorAll('p')]
    .filter((p) => !(legal && legal.contains(p)) && cleanText(p.textContent))
    .map((p) => copyInline(p, document.createElement('p')));
  if (factParas.length) {
    const ul = document.createElement('ul');
    factParas.forEach((p) => {
      const li = copyInline(p, document.createElement('li'));
      const first = li.firstChild;
      if (first && first.nodeType === 3) first.textContent = first.textContent.replace(/^\s*[•·]\s*/, '');
      ul.appendChild(li);
    });
    bodyNodes.push(ul);
  }

  // CTAs: every button link in source order; the last one fills text_link (single
  // aem-content field), any additional ones stay as link paragraphs in the rich text body.
  let ctas = [...textArea.querySelectorAll('[class*="ButtonContainer"] a[href]')];
  if (!ctas.length) {
    const fallback = [...textArea.querySelectorAll('a[href]')].find((a) => !(legal && legal.contains(a))
      && !(a.getAttribute('href') || '').startsWith('#'));
    if (fallback) ctas = [fallback];
  }
  const linkParas = ctas
    .filter((cta) => cleanText(cta.textContent))
    .map((cta) => {
      const a = document.createElement('a');
      a.setAttribute('href', cta.getAttribute('href'));
      a.textContent = cleanText(cta.textContent);
      const p = document.createElement('p');
      p.appendChild(a);
      return p;
    });
  const mainLink = linkParas.pop();
  bodyNodes.push(...linkParas);

  if (bodyNodes.length) textNodes.push(hinted(document, 'text_body', bodyNodes));
  if (mainLink) textNodes.push(hinted(document, 'text_link', [mainLink]));

  const textCell = textNodes.length ? textNodes : '';

  // disclaimer cell (consumption / emission data)
  let disclaimerCell = '';
  if (legal && cleanText(legal.textContent) && (disclaimerParas.length || !legalParas.length)) {
    const out = (disclaimerParas.length ? disclaimerParas : [legal])
      .map((p) => copyInline(p, document.createElement('p')));
    disclaimerCell = hinted(document, 'disclaimer', out);
  }

  return [imageCell, textCell, disclaimerCell];
}

export default function parse(element, { document }) {
  // already consumed by a previous instance (merged + removed)
  if (!isAttached(element, document)) return;

  // all teaser containers on the page, in document order, starting with this instance
  const own = element.matches(CONTAINER_SEL) ? [element] : [...element.querySelectorAll(CONTAINER_SEL)];
  const all = [...document.querySelectorAll(CONTAINER_SEL)];
  const containers = all.filter((c) => own.includes(c)
    || (own.length && (own[0].compareDocumentPosition(c) & 4)));

  const cells = [];
  containers.forEach((container) => {
    container.querySelectorAll(TEASER_SEL).forEach((teaser) => {
      // skip nested StyledComponent matches
      const parentTeaser = teaser.parentElement && teaser.parentElement.closest(TEASER_SEL);
      if (parentTeaser && container.contains(parentTeaser)) return;
      cells.push(buildCard(teaser, document));
    });
  });

  // remove the merged follow-up instances (whole feature-app wrapper when present)
  containers.forEach((container) => {
    if (element.contains(container) || container.contains(element)) return;
    const wrapper = container.closest('feature-app') || container;
    if (wrapper.parentNode && !wrapper.contains(element)) wrapper.remove();
  });

  if (!cells.length) return;
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-teaser', cells });
  element.replaceWith(block);
}
