/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-media-text (Audi BasicTeaser: image left, text right).
 *
 * Source: [class*="BasicTeaser__StyledContainer"]
 *   [class*="BasicTeaser__StyledMedia"] img            -> image
 *   [class*="BasicTeaser__StyledTextArea"] h2          -> heading
 *   [class*="RichText__StyledText"] p + ul             -> body (paragraph + list)
 *   .buttons a.button                                  -> button link
 *
 * Output: one row, two cells: [image] | [heading, body, button].
 * Block names starting with "columns" are converted by md2jcr as a columns
 * block (default content per cell), so no xwalk field hints are added here.
 */

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/** Copy text content with inline <sup>/<strong>/<em>/links, dropping wrappers and icons. */
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
    if (['IMG', 'SVG', 'PICTURE', 'SCRIPT', 'STYLE'].includes(tag)) return;
    // decorative list bullet ("›") rendered as a div inside list items
    if (tag === 'DIV' && node.parentElement && node.parentElement.tagName.toUpperCase() === 'LI'
      && /^[›>•\-\s]*$/.test(node.textContent)) return;
    if (tag === 'SUP') {
      const t = cleanText(node.textContent);
      if (!t) return;
      const sup = document.createElement('sup');
      sup.textContent = /^[,;]$/.test(t) ? `${t} ` : t;
      target.appendChild(sup);
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
    if (tag === 'BR') {
      target.appendChild(document.createElement('br'));
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

export default function parse(element, { document }) {
  // image cell
  const imageCell = [];
  const srcImg = element.querySelector('[class*="BasicTeaser__StyledMedia"] img, [class*="BasicTeaser__StyledImage"] img')
    || element.querySelector('img');
  if (srcImg && srcImg.getAttribute('src') && !srcImg.getAttribute('src').startsWith('data:')) {
    const img = document.createElement('img');
    img.setAttribute('src', srcImg.getAttribute('src'));
    img.setAttribute('alt', srcImg.getAttribute('alt') || '');
    imageCell.push(img);
  }

  // text cell
  const textArea = element.querySelector('[class*="BasicTeaser__StyledTextArea"]') || element;
  const textCell = [];

  const heading = textArea.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && cleanText(heading.textContent)) {
    const h = document.createElement(heading.tagName.toLowerCase());
    h.textContent = cleanText(heading.textContent);
    textCell.push(h);
  }

  const buttonsArea = textArea.querySelector('.buttons, [class*="button-group"]');
  const richText = textArea.querySelector('[class*="RichText__StyledText"]');
  const bodyRoot = richText || textArea;
  bodyRoot.querySelectorAll('p, ul, ol').forEach((node) => {
    if (buttonsArea && buttonsArea.contains(node)) return;
    if (heading && heading.contains(node)) return;
    // only top-level body elements (skip p inside li etc.)
    const parentBody = node.parentElement && node.parentElement.closest('p, ul, ol');
    if (parentBody && bodyRoot.contains(parentBody)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'p') {
      if (cleanText(node.textContent)) textCell.push(inline(node, 'p', document));
      return;
    }
    const list = document.createElement(tag);
    node.querySelectorAll(':scope > li').forEach((li) => {
      const item = inline(li, 'li', document);
      if (cleanText(item.textContent)) list.appendChild(item);
    });
    if (list.children.length) textCell.push(list);
  });

  const buttons = buttonsArea
    ? [...buttonsArea.querySelectorAll('a[href]')]
    : [...textArea.querySelectorAll('a.button[href]')];
  buttons.forEach((btn) => {
    const label = cleanText(btn.textContent);
    if (!label) return;
    const a = document.createElement('a');
    a.setAttribute('href', btn.getAttribute('href'));
    a.textContent = label;
    const p = document.createElement('p');
    p.appendChild(a);
    textCell.push(p);
  });

  const cells = [[imageCell.length ? imageCell : '', textCell.length ? textCell : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media-text', cells });
  element.replaceWith(block);
}
