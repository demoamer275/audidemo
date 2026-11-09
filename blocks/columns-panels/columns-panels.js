import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Marks the parts of one panel. Every part is optional:
 * image-only paragraph -> portrait, tel:/mailto: paragraphs -> contact links,
 * trailing link-only paragraph -> call-to-action.
 * @param {Element} panel
 */
function decoratePanel(panel) {
  [...panel.querySelectorAll('p')].forEach((p) => {
    if (p.querySelector('picture') && p.textContent.trim() === '') {
      p.classList.add('columns-panels-image');
      return;
    }
    const links = p.querySelectorAll('a[href]');
    if (links.length === 1 && /^(tel|mailto):/i.test(links[0].getAttribute('href'))) {
      p.classList.add('columns-panels-contact');
    }
  });

  // a picture that is the direct content of the cell (UE image component)
  [...panel.children].forEach((el) => {
    if (el.tagName === 'PICTURE') el.classList.add('columns-panels-image');
  });

  const last = panel.lastElementChild;
  const ctaLinks = last && last.tagName === 'P' ? last.querySelectorAll('a[href]') : [];
  if (ctaLinks.length === 1 && !last.querySelector('img')
    && last.textContent.trim() === ctaLinks[0].textContent.trim()
    && !last.classList.contains('columns-panels-contact')) {
    last.classList.add('columns-panels-cta');
  }
}

/**
 * loads and decorates the block
 * One row, one cell per panel (typically two). Each cell holds title,
 * image, text and button components. Rows and cells keep their
 * Universal Editor instrumentation; only classes are added.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  const cols = firstRow ? firstRow.children.length : 0;
  block.classList.add(`columns-panels-${cols}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('columns-panels-row');
    [...row.children].forEach((cell) => {
      if (cell.textContent.trim() === '' && !cell.querySelector('img')) {
        cell.classList.add('columns-panels-panel', 'columns-panels-empty');
        return;
      }
      cell.classList.add('columns-panels-panel');
      decoratePanel(cell);
    });
  });

  block.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
    const picture = img.closest('picture');
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    optimizedPic.className = picture.className;
    picture.replaceWith(optimizedPic);
  });
}
