import { moveInstrumentation } from '../../scripts/scripts.js';

const ROLES = ['eyebrow', 'value', 'unit', 'caption'];

/**
 * loads and decorates the block
 * Each row is one stat: eyebrow | value | unit | caption (all optional).
 * Value and unit are grouped into one figure line; original cells are kept
 * so Universal Editor field instrumentation stays intact.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    const cells = [...row.children];
    const figure = document.createElement('div');
    figure.className = 'cards-stats-figure';

    cells.forEach((cell, index) => {
      const role = ROLES[index] || 'caption';
      cell.className = `cards-stats-${role}`;
      if (cell.textContent.trim() === '') {
        cell.remove();
        return;
      }
      if (role === 'value' || role === 'unit') {
        figure.append(cell);
        if (figure.parentElement !== li) li.append(figure);
      } else {
        li.append(cell);
      }
    });

    if (li.childElementCount) ul.append(li);
  });

  block.replaceChildren(ul);
}
