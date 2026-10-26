import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * loads and decorates the block
 * Accepts either one row with two cells (image | text) or the
 * Universal Editor shape with one cell per row (image row, text row).
 * Renders a two-column media/text layout.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const cells = [...block.children].flatMap((row) => [...row.children]);

  const media = document.createElement('div');
  media.className = 'columns-media-text-media';
  const text = document.createElement('div');
  text.className = 'columns-media-text-text';

  cells.forEach((cell) => {
    const isMedia = cell.querySelector('picture') && cell.textContent.trim() === '';
    if (isMedia) {
      while (cell.firstChild) media.append(cell.firstChild);
      moveInstrumentation(cell, media);
    } else if (cell.textContent.trim() !== '' || cell.querySelector('img')) {
      const part = document.createElement('div');
      moveInstrumentation(cell, part);
      while (cell.firstChild) part.append(cell.firstChild);
      text.append(part);
    }
  });

  media.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '900' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  // mark a trailing paragraph that only holds one link as the call-to-action
  const lastP = [...text.querySelectorAll('p')].pop();
  const ctaLinks = lastP ? lastP.querySelectorAll('a[href]') : [];
  if (ctaLinks.length === 1 && !lastP.querySelector('img')
    && lastP.textContent.trim() === ctaLinks[0].textContent.trim()
    && lastP === lastP.parentElement.lastElementChild) {
    lastP.classList.add('columns-media-text-cta');
  }

  const layout = document.createElement('div');
  layout.className = 'columns-media-text-layout';
  if (media.childElementCount) layout.append(media);
  if (text.childElementCount) layout.append(text);

  block.replaceChildren(layout);
}
