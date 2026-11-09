import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Moves the authored content of a cell into a table cell, keeping inline
 * markup such as <strong>, <sub> and <sup>. A cell holding a single
 * paragraph is unwrapped so the table cell carries the text directly.
 * @param {Element} source authored cell (div)
 * @param {string} tag 'th' or 'td'
 * @returns {HTMLTableCellElement}
 */
function buildCell(source, tag) {
  const cell = document.createElement(tag);
  if (!source) return cell;
  moveInstrumentation(source, cell);
  const only = source.children.length === 1 ? source.firstElementChild : null;
  const from = only && only.tagName === 'P' && !only.attributes.length ? only : source;
  cell.append(...from.childNodes);
  return cell;
}

/**
 * loads and decorates the block
 * Rows: [label] [value]. With the "header" option the first row becomes the
 * column header row (<thead>). In every body row the first cell is the row
 * header (<th scope="row">).
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.children.length);
  const hasHeader = block.classList.contains('header') && rows.length > 1;

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);
    const isHeaderRow = hasHeader && index === 0;

    [...row.children].forEach((source, cellIndex) => {
      let tag = 'td';
      if (isHeaderRow) tag = 'th';
      else if (cellIndex === 0) tag = 'th';
      const cell = buildCell(source, tag);
      if (tag === 'th') {
        cell.scope = isHeaderRow ? 'col' : 'row';
        // an empty column header carries no meaning; keep it a plain cell
        if (isHeaderRow && !cell.textContent.trim()) {
          const td = document.createElement('td');
          td.append(...cell.childNodes);
          moveInstrumentation(cell, td);
          tr.append(td);
          return;
        }
      }
      tr.append(cell);
    });

    (isHeaderRow ? thead : tbody).append(tr);
  });

  if (thead.children.length) table.append(thead);
  table.append(tbody);
  block.replaceChildren(table);
}
