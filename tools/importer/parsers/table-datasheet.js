/* eslint-disable */
/* global WebImporter */

/**
 * Parser for table-datasheet (audi.com model page technical details).
 *
 * Layout A, summary (Q5, Q5 Sportback, e-hybrid): .page-item--technical-details .motorization-summary
 *   <table> thead ("" | "Data sheet"), tbody tr per motorization:
 *     th .motorization-header--name            -> label, <p><strong>name</strong></p>
 *     th .motorization-header--consumption-data -> label, <p>consumption (keeps <sub>)</p>
 *     td a[href$=".pdf"] ("Download")          -> value, <p><a href>Download</a></p> (external)
 *   (td.-mobile duplicates and cart cells are removed by audicom-cleanup)
 *   Output: block option "header" + header row "" | "Data sheet" + one row per motorization.
 *
 * Layout B, spec table (SQ5 pages): .page-item--technical-details .motorization--table
 *   <table> tr: th (label, keeps <sub>) | td (value). No header option.
 *
 * Only the table is replaced: the H4 engine heading, .motorization--downloads and the
 * "Audi prices in your country" link are siblings and stay default content.
 *
 * Row per table row (model table-datasheet-row): field:label | field:value
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

/** Inline copy keeping <sub>, <sup>, <strong>, <em>, <br> and links; wrappers are unwrapped. */
function appendInline(source, target, document) {
  source.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      target.appendChild(document.createTextNode(node.textContent.replace(/\s+/g, ' ')));
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toUpperCase();
    if (['IMG', 'SVG', 'PICTURE', 'SCRIPT', 'STYLE', 'VIDEO', 'BUTTON'].includes(tag)) return;
    if (tag === 'BR') {
      target.appendChild(document.createElement('br'));
      return;
    }
    if (tag === 'A' && node.getAttribute('href')) {
      const a = document.createElement('a');
      a.setAttribute('href', node.getAttribute('href').trim());
      appendInline(node, a, document);
      target.appendChild(a);
      return;
    }
    if (['SUB', 'SUP', 'STRONG', 'B', 'EM', 'I'].includes(tag)) {
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

function inline(source, tagName, document) {
  return trimEdges(appendInline(source, document.createElement(tagName), document));
}

function textP(document, text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

/** Layout A row: [label (name + consumption), value (Download link)] */
function summaryRow(tr, document) {
  const labelNodes = [];
  const name = tr.querySelector('.motorization-header--name');
  if (name && cleanText(name.textContent)) {
    const p = document.createElement('p');
    p.appendChild(inline(name, 'strong', document));
    labelNodes.push(p);
  }
  const consumption = tr.querySelector('.motorization-header--consumption-data');
  if (consumption && cleanText(consumption.textContent)) labelNodes.push(inline(consumption, 'p', document));
  if (!labelNodes.length) {
    const th = tr.querySelector('th');
    if (th && cleanText(th.textContent)) labelNodes.push(inline(th, 'p', document));
  }

  const valueNodes = [];
  const link = tr.querySelector('a[href*=".pdf"]') || tr.querySelector('td a[href]');
  if (link) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.setAttribute('href', link.getAttribute('href').trim());
    a.textContent = cleanText(link.textContent) || 'Download';
    p.appendChild(a);
    valueNodes.push(p);
  }

  if (!labelNodes.length && !valueNodes.length) return null;
  return [
    labelNodes.length ? hinted(document, 'label', labelNodes) : '',
    valueNodes.length ? hinted(document, 'value', valueNodes) : '',
  ];
}

/** Layout B row: [th, td] keeping <sub> */
function specRow(tr, document) {
  const cellsOf = [...tr.children].filter((c) => /^(TH|TD)$/i.test(c.tagName));
  if (!cellsOf.length) return null;
  const labelEl = tr.querySelector('th') || cellsOf[0];
  const valueEl = cellsOf.find((c) => c !== labelEl);
  const label = cleanText(labelEl.textContent) ? inline(labelEl, 'p', document) : null;
  const value = valueEl && cleanText(valueEl.textContent) ? inline(valueEl, 'p', document) : null;
  if (!label && !value) return null;
  return [
    label ? hinted(document, 'label', [label]) : '',
    value ? hinted(document, 'value', [value]) : '',
  ];
}

export default function parse(element, { document }) {
  const table = element.matches('table') ? element : element.querySelector('table');
  const isSummary = element.matches('.motorization-summary')
    || !!(table && table.querySelector('.motorization-header'));

  const cells = [];
  const bodyRows = table
    ? [...table.querySelectorAll('tr')].filter((tr) => !tr.closest('thead'))
    : [];

  if (isSummary) {
    // header row "" | "Data sheet" (from thead; set only together with the header option)
    const headCells = table ? [...table.querySelectorAll('thead th, thead td')] : [];
    const headText = cleanText(headCells.length > 1 ? headCells[headCells.length - 1].textContent : '') || 'Data sheet';
    cells.push(['', hinted(document, 'value', [textP(document, headText)])]);
    bodyRows.forEach((tr) => {
      const row = summaryRow(tr, document);
      if (row) cells.push(row);
    });
  } else {
    bodyRows.forEach((tr) => {
      const row = specRow(tr, document);
      if (row) cells.push(row);
    });
  }

  const name = isSummary ? 'table-datasheet (header)' : 'table-datasheet';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  // replace only the table: keep anything else the wrapper may hold (default content)
  const hasOtherContent = table && table !== element
    && [...element.childNodes].some((n) => n !== table && cleanText(n.textContent));
  if (hasOtherContent) table.replaceWith(block);
  else element.replaceWith(block);
}
