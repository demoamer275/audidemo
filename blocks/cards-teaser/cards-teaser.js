import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Classifies a cell of a teaser row.
 * Expected cells: [image] [title, body, CTA link] [disclaimer].
 * Falls back gracefully when cells are missing or empty.
 * @param {Element} cell
 * @param {number} index
 * @param {number} lastIndex
 * @returns {string}
 */
function cellRole(cell, index, lastIndex) {
  const onlyPicture = cell.querySelector('picture')
    && cell.textContent.trim() === '';
  if (onlyPicture) return 'image';
  if (index > 1 && index === lastIndex) return 'disclaimer';
  return 'body';
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    const cells = [...row.children];
    const lastIndex = cells.length - 1;
    cells.forEach((cell, index) => {
      const role = cellRole(cell, index, lastIndex);
      cell.className = `cards-teaser-card-${role}`;
      if (role !== 'image' && cell.textContent.trim() === '' && !cell.querySelector('img')) {
        cell.remove();
        return;
      }
      li.append(cell);
    });

    // last link in the body acts as the teaser's text CTA
    const body = li.querySelector('.cards-teaser-card-body');
    if (body) {
      const links = body.querySelectorAll('a[href]');
      const cta = links[links.length - 1];
      if (cta) {
        cta.classList.remove('button', 'primary', 'secondary');
        cta.classList.add('cards-teaser-card-cta');
        const container = cta.closest('.button-container');
        if (container) container.classList.remove('button-container');
      }
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(ul);
}
