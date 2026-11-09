import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const isEmpty = (cell) => !cell || (cell.textContent.trim() === '' && !cell.querySelector('img'));

/**
 * Classifies the children of the body cell. Every part is optional:
 * paragraphs before the heading -> meta line (date · category),
 * h2-h6 -> linked title, paragraphs after the heading -> description.
 * @param {Element} body
 */
function decorateBody(body) {
  let seenTitle = false;
  [...body.children].forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName)) {
      el.classList.add('cards-list-title');
      seenTitle = true;
      return;
    }
    if (el.tagName !== 'P') return;
    el.classList.add(seenTitle ? 'cards-list-description' : 'cards-list-meta');
  });
  // without a heading there is no meta line; treat everything as description
  if (!seenTitle) {
    body.querySelectorAll('.cards-list-meta').forEach((p) => {
      p.classList.replace('cards-list-meta', 'cards-list-description');
    });
  }
}

/**
 * Links the image to the title target. Hidden from assistive tech and the
 * tab order: the title link is the accessible link.
 * @param {Element} li
 */
function linkImage(li) {
  const picture = li.querySelector('.cards-list-image picture');
  const target = li.querySelector('.cards-list-title a[href]')
    || li.querySelector('.cards-list-body a[href]');
  if (!picture || !target || picture.closest('a')) return;
  const a = document.createElement('a');
  a.href = target.getAttribute('href');
  a.tabIndex = -1;
  a.setAttribute('aria-hidden', 'true');
  picture.replaceWith(a);
  a.append(picture);
}

/**
 * loads and decorates the block
 * Item cells: [image] [text: meta line, linked heading, optional description].
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    const cells = [...row.children];
    const imageCell = cells.find((cell) => cell.querySelector('picture') && cell.textContent.trim() === '');
    // UE renders every field as a cell: [image] [text]; an empty first cell is the missing image
    let rest = cells.filter((cell) => cell !== imageCell);
    if (!imageCell && cells.length >= 2 && isEmpty(cells[0])) rest = cells.slice(1);
    const bodyCell = rest.find((cell) => !isEmpty(cell));

    if (imageCell) {
      imageCell.className = 'cards-list-image';
      li.append(imageCell);
    }
    if (bodyCell) {
      bodyCell.className = 'cards-list-body';
      decorateBody(bodyCell);
      li.append(bodyCell);
    }

    if (li.childElementCount) ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  ul.querySelectorAll(':scope > li').forEach(linkImage);

  block.replaceChildren(ul);
}
