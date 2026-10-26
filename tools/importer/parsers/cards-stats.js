/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-stats (Audi EditorialColumns in NumbersMode: key-fact tiles).
 *
 * Source: [class*="EditorialColumns-style__EditorialColumnsContainer"]:has([class*="NumbersMode-style"])
 *   [class*="NumbersMode-style__ComponentContainer"]          -> one tile (row)
 *     [class*="EditorialNumbers__StyledTitle"]                -> eyebrow (text)
 *     [class*="EditorialNumbers__StyledValue"]                -> value (text)
 *     [class*="EditorialNumbers__StyledUnit"]                 -> unit (richtext, keeps <sup>)
 *     [class*="EditorialNumbers__StyledDescription"]          -> caption (richtext, keeps <sup>)
 *   [class*="EditorialColumns-style__LegalInfoContainer"] p   -> NOT part of the block:
 *       consumption disclaimer, kept as default content right after the block
 *
 * Row per tile (model cards-stats-card): eyebrow | value | unit | caption
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

function textCell(document, field, el) {
  const text = el ? cleanText(el.textContent) : '';
  return text ? hinted(document, field, [document.createTextNode(text)]) : '';
}

function richCell(document, field, el) {
  if (!el || !cleanText(el.textContent)) return '';
  return hinted(document, field, [inline(el, 'p', document)]);
}

export default function parse(element, { document }) {
  const tiles = [...element.querySelectorAll('[class*="NumbersMode-style__ComponentContainer"]')];
  const cells = [];
  tiles.forEach((tile) => {
    const eyebrow = tile.querySelector('[class*="EditorialNumbers__StyledTitle"]');
    const value = tile.querySelector('[class*="EditorialNumbers__StyledValue-"]');
    const unit = tile.querySelector('[class*="EditorialNumbers__StyledUnit"]');
    const caption = tile.querySelector('[class*="EditorialNumbers__StyledDescription"]');
    const row = [
      textCell(document, 'eyebrow', eyebrow),
      textCell(document, 'value', value),
      richCell(document, 'unit', unit),
      richCell(document, 'caption', caption),
    ];
    if (row.some((c) => c !== '')) cells.push(row);
  });

  // consumption disclaimer below the tiles -> default content after the block
  const legal = element.querySelector('[class*="EditorialColumns-style__LegalInfoContainer"]');
  const legalParas = legal
    ? [...legal.querySelectorAll('p')].filter((p) => cleanText(p.textContent)) : [];
  const trailing = legalParas.map((p) => inline(p, 'p', document));

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-stats', cells });
  trailing.reverse().forEach((p) => element.after(p));
  element.replaceWith(block);
}
