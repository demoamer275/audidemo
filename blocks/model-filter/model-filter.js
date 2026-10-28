import { decorateIcons } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

let groupCounter = 0;

/**
 * Turns every list item of the buttons cell into a static, non-functional pill.
 * The list stays a list (one li per pill); the pill itself is a disabled-looking
 * <button type="button" aria-disabled="true"> that does nothing.
 * @param {Element} cell The rich-text cell holding the ul
 */
function decoratePills(cell) {
  cell.querySelectorAll('ul').forEach((ul) => {
    ul.classList.add('model-filter-pills');
    [...ul.children].forEach((li) => {
      if (li.querySelector(':scope > button')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'model-filter-pill';
      button.setAttribute('aria-disabled', 'true');
      button.append(...li.childNodes);
      // links inside a pill would make it interactive; keep their text only
      button.querySelectorAll('a').forEach((a) => a.replaceWith(...a.childNodes));
      // ":charging: Elektromodelle" (raw icon notation, local preview) -> icon span
      const first = button.firstChild;
      const match = first && first.nodeType === Node.TEXT_NODE && first.textContent.match(/^\s*:([a-z0-9-]+):\s*/);
      if (match) {
        first.textContent = first.textContent.slice(match[0].length);
        const icon = document.createElement('span');
        icon.className = `icon icon-${match[1]}`;
        button.prepend(icon);
      }
      li.replaceChildren(button);
    });
  });
}

/**
 * Decorates a group row: [label] [buttons (ul)].
 * @param {Element} row
 * @param {Element[]} cells
 * @returns {Element}
 */
function decorateGroup(row, cells) {
  const group = document.createElement('div');
  group.className = 'model-filter-group';
  moveInstrumentation(row, group);

  const listCell = cells.find((cell) => cell.querySelector('ul'));
  const labelCell = cells.find((cell) => cell !== listCell);

  if (labelCell && labelCell.textContent.trim()) {
    groupCounter += 1;
    const id = `model-filter-label-${groupCounter}`;
    labelCell.className = 'model-filter-label';
    labelCell.id = id;
    group.setAttribute('role', 'group');
    group.setAttribute('aria-labelledby', id);
    group.append(labelCell);
  }

  if (listCell) {
    listCell.className = 'model-filter-buttons';
    decoratePills(listCell);
    decorateIcons(listCell);
    group.append(listCell);
  }
  return group;
}

/**
 * Decorates the links row: plain text links, never buttons.
 * @param {Element} row
 * @param {Element[]} cells
 * @returns {Element}
 */
function decorateLinks(row, cells) {
  const links = document.createElement('div');
  links.className = 'model-filter-links';
  moveInstrumentation(row, links);
  cells.forEach((cell) => {
    cell.querySelectorAll('a').forEach((a) => {
      a.classList.remove('button', 'primary', 'secondary', 'accent');
      const wrapper = a.closest('.button-wrapper, .button-container');
      if (wrapper) wrapper.classList.remove('button-wrapper', 'button-container');
    });
    links.append(...cell.childNodes);
  });
  return links;
}

/**
 * loads and decorates the block
 * Rows (all model-filter-group items): [label] [ul of pills]; the links row has an empty
 * label and link paragraphs instead of a list.
 * The pills are static and have no filter behaviour.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const groups = [];
  let links = null;

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter((cell) => cell.textContent.trim() || cell.querySelector('img, picture'));
    if (!cells.length) return;
    const hasList = cells.some((cell) => cell.querySelector('ul'));
    const isLinksRow = !hasList && row.querySelector('a');
    if (isLinksRow) {
      const decorated = decorateLinks(row, cells);
      if (links) links.append(...decorated.childNodes);
      else links = decorated;
    } else {
      groups.push(decorateGroup(row, cells));
    }
  });

  block.replaceChildren(...groups);
  if (links) block.append(links);
}
