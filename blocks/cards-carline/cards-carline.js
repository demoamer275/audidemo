import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Reads a boolean cell rendered by Universal Editor ("true"/"false").
 * @param {Element} cell
 * @returns {boolean|null} null when the cell is not a boolean cell
 */
function readBoolean(cell) {
  const value = cell.textContent.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function createIcon(name) {
  const span = document.createElement('span');
  span.className = `icon icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

/**
 * loads and decorates the block
 * Item cells: [image] [text: h2 title + count link] [electric: boolean].
 * The whole card is clickable via the count link (stretched link);
 * the chevron and the electric badge are added here.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    let electric = false;

    [...row.children].forEach((cell) => {
      const bool = readBoolean(cell);
      if (bool !== null) {
        electric = bool;
        return;
      }
      if (cell.querySelector('picture') && cell.textContent.trim() === '') {
        cell.className = 'cards-carline-image';
        li.append(cell);
        return;
      }
      if (cell.textContent.trim() === '') return;
      cell.className = 'cards-carline-body';
      li.append(cell);
    });

    const body = li.querySelector('.cards-carline-body');
    if (body) {
      const link = body.querySelector('a[href]');
      if (link) {
        link.classList.remove('button', 'primary', 'secondary', 'accent');
        const wrapper = link.closest('.button-wrapper, .button-container');
        if (wrapper) wrapper.classList.remove('button-wrapper', 'button-container');
        link.classList.add('cards-carline-link');
        link.append(createIcon('chevron'));
        li.classList.add('cards-carline-clickable');
      }
    }

    if (electric) {
      const badge = document.createElement('span');
      badge.className = 'cards-carline-badge';
      badge.setAttribute('role', 'img');
      badge.setAttribute('aria-label', 'Elektromodell');
      badge.append(createIcon('charging'));
      li.prepend(badge);
    }

    if (li.childElementCount) ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  decorateIcons(ul);
  block.replaceChildren(ul);
}
