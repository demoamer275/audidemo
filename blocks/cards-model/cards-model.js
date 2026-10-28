import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Classifies the children of the body cell. Every part is optional:
 * ul -> badges, h2-h4 -> title, button wrappers -> actions,
 * paragraphs holding only a link -> plain links, other paragraphs -> price/text.
 * @param {Element} body
 */
function decorateBody(body) {
  const actions = document.createElement('div');
  actions.className = 'cards-model-actions';
  const links = document.createElement('div');
  links.className = 'cards-model-links';

  [...body.children].forEach((el) => {
    if (el.tagName === 'UL') {
      el.classList.add('cards-model-badges');
      // "Neu" is the highlighted badge
      [...el.children].forEach((li) => {
        if (/^neu$/i.test(li.textContent.trim())) li.classList.add('cards-model-badge-new');
      });
      return;
    }
    if (/^H[1-6]$/.test(el.tagName)) {
      el.classList.add('cards-model-title');
      return;
    }
    if (el.tagName !== 'P') return;
    const a = el.querySelector('a[href]');
    if (el.classList.contains('button-wrapper') || el.classList.contains('button-container')) {
      actions.append(el);
      return;
    }
    if (a && el.textContent.trim() === a.textContent.trim()) {
      el.classList.add('cards-model-link');
      links.append(el);
      return;
    }
    if (!el.classList.length) el.classList.add('cards-model-price');
  });

  if (actions.childElementCount) body.append(actions);
  if (links.childElementCount) body.append(links);
}

/**
 * Links the image to the model page (same target as the secondary "discover"
 * button). Hidden from assistive tech / tab order, the button is the accessible link.
 * @param {Element} li
 */
function linkImage(li) {
  const image = li.querySelector('.cards-model-image picture');
  const target = li.querySelector('.cards-model-actions a.button.secondary')
    || li.querySelector('.cards-model-title a[href]');
  if (!image || !target) return;
  const a = document.createElement('a');
  a.href = target.getAttribute('href');
  a.tabIndex = -1;
  a.setAttribute('aria-hidden', 'true');
  image.replaceWith(a);
  a.append(image);
}

/**
 * loads and decorates the block
 * Item cells: [image] [text: badges, title, price, CTAs, links] [consumption].
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    const cells = [...row.children];
    const isEmpty = (cell) => !cell || (cell.textContent.trim() === '' && !cell.querySelector('img'));
    const imageCell = cells.find((cell) => cell.querySelector('picture') && cell.textContent.trim() === '');
    // UE renders every field as a cell: [image] [text] [consumption]; an empty
    // first cell is the missing image
    let rest = cells.filter((cell) => cell !== imageCell);
    if (!imageCell && cells.length >= 3 && isEmpty(cells[0])) rest = cells.slice(1);
    const [bodyCell, consumptionCell] = rest;

    if (imageCell) {
      imageCell.className = 'cards-model-image';
      li.append(imageCell);
    }
    if (!isEmpty(bodyCell)) {
      bodyCell.className = 'cards-model-body';
      decorateBody(bodyCell);
      li.append(bodyCell);
    }
    if (!isEmpty(consumptionCell)) {
      consumptionCell.className = 'cards-model-consumption';
      li.append(consumptionCell);
    }

    linkImage(li);
    if (li.childElementCount) ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.replaceChildren(ul);
}
