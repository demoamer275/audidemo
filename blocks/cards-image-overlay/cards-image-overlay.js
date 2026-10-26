import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * loads and decorates the block
 * Expected cells per row: [image] [title + link] [disclaimer].
 * The image and title are rendered as one clickable tile; the
 * disclaimer is shown below the tile.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);

    const cells = [...row.children];
    const imageCell = cells.find((cell) => cell.querySelector('picture'));
    const rest = cells.filter((cell) => cell !== imageCell);
    const contentCell = rest.find((cell) => cell.querySelector('h1, h2, h3, h4, h5, h6, a[href]'))
      || rest[0];
    const disclaimerCell = rest.find((cell) => cell !== contentCell
      && cell.textContent.trim() !== '');

    const link = contentCell?.querySelector('a[href]');
    const tile = document.createElement(link ? 'a' : 'div');
    tile.className = 'cards-image-overlay-tile';

    if (link) {
      tile.href = link.href;
      if (link.target) tile.target = link.target;
      if (link.title) tile.title = link.title;
      moveInstrumentation(link, tile);
      // no heading authored: keep the link text as the tile title
      if (!contentCell.querySelector('h1, h2, h3, h4, h5, h6')
        && link.textContent.trim() && !/^https?:\/\//.test(link.textContent.trim())) {
        const title = document.createElement('p');
        title.textContent = link.textContent.trim();
        contentCell.prepend(title);
      }
      const linkWrapper = link.closest('p, .button-container');
      if (linkWrapper && contentCell.contains(linkWrapper)) linkWrapper.remove();
      else link.remove();
    }

    if (imageCell) {
      imageCell.className = 'cards-image-overlay-card-image';
      tile.append(imageCell);
    }

    if (contentCell) {
      contentCell.className = 'cards-image-overlay-card-title';
      if (contentCell.textContent.trim() !== '') tile.append(contentCell);
      if (link && !tile.getAttribute('aria-label')) {
        const label = contentCell.textContent.trim();
        if (label) tile.setAttribute('aria-label', label);
      }
    }

    li.append(tile);

    if (disclaimerCell) {
      disclaimerCell.className = 'cards-image-overlay-card-disclaimer';
      li.append(disclaimerCell);
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
