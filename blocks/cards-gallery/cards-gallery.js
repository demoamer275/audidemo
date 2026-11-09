import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const isEmpty = (cell) => !cell || (cell.textContent.trim() === '' && !cell.querySelector('img'));

/** A tile is a video tile when its title link points to a video page. */
const isVideoLink = (a) => !!a && /\/videos\//.test(a.getAttribute('href') || '');

/**
 * Classifies the body cell: the first link is the title (the tile's only
 * link), paragraphs without it are the category label.
 * Single-link paragraphs are turned into buttons by decorateButtons; undo
 * that for the title, it is a plain text link.
 * @param {Element} body
 * @returns {HTMLAnchorElement|null} the title link
 */
function decorateBody(body) {
  const link = body.querySelector('a[href]');
  if (link) {
    link.classList.remove('button', 'primary', 'secondary');
    const holder = link.closest('.cards-gallery-body > *') || link;
    holder.classList.remove('button-container');
    holder.classList.add('cards-gallery-title');
  }
  [...body.children].forEach((el) => {
    if (el.classList.contains('cards-gallery-title')) return;
    if (el.tagName === 'P') el.classList.add('cards-gallery-label');
  });
  return link;
}

/**
 * Marks a video tile: decorative play indicator on the image, and a
 * visually hidden hint in the title link so the link name says "video".
 * @param {Element} li
 * @param {HTMLAnchorElement} link
 */
function decorateVideo(li, link) {
  li.classList.add('cards-gallery-video');
  const media = li.querySelector('.cards-gallery-image');
  if (media && !media.querySelector('.cards-gallery-play')) {
    const play = document.createElement('span');
    play.className = 'cards-gallery-play';
    play.setAttribute('aria-hidden', 'true');
    media.append(play);
  }
  if (!link.querySelector('.cards-gallery-sr-only')) {
    const hint = document.createElement('span');
    hint.className = 'cards-gallery-sr-only';
    hint.textContent = ' (video)';
    link.append(hint);
  }
}

/**
 * loads and decorates the block
 * Item cells: [image or video poster] [text: category label, title link].
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
      imageCell.className = 'cards-gallery-image';
      li.append(imageCell);
    }
    let link = null;
    if (bodyCell) {
      bodyCell.className = 'cards-gallery-body';
      link = decorateBody(bodyCell);
      li.append(bodyCell);
    }
    if (link) {
      // the title link is stretched over the whole tile in CSS
      li.classList.add('cards-gallery-linked');
      if (isVideoLink(link)) decorateVideo(li, link);
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

  block.replaceChildren(ul);
}
