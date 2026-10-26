import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * loads and decorates the block
 * Columns container: one or more rows, each cell holds default content
 * (image + caption paragraph). Cells are kept in place so Universal Editor
 * instrumentation on columns and their child components is preserved.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  const cols = firstRow ? firstRow.children.length : 0;
  if (cols) block.classList.add(`columns-gallery-${cols}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('columns-gallery-row');
    [...row.children].forEach((cell) => {
      cell.classList.add('columns-gallery-item');
      const picture = cell.querySelector('picture');
      if (!picture) return;
      const wrapper = picture.closest('p') || picture;
      if (wrapper.parentElement === cell && wrapper.textContent.trim() === '') {
        wrapper.classList.add('columns-gallery-image');
      }
    });
  });

  block.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 900px)', width: '1200' },
      { width: '750' },
    ]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });
}
