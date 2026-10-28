import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const LABEL_PREV = 'Vorherige Slide';
const LABEL_NEXT = 'Nächste Slide';

let sliderId = 0;

function createIcon(name) {
  const span = document.createElement('span');
  span.className = `icon icon-${name}`;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

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

/**
 * Static, non-functional filter chips (first chip shown as selected, as on the source).
 * @param {Element} cell rich-text cell holding the ul
 */
function decorateFilters(cell) {
  cell.className = 'carline-slider-filters';
  cell.querySelectorAll('ul').forEach((ul) => {
    [...ul.children].forEach((li, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'carline-slider-chip';
      chip.setAttribute('aria-disabled', 'true');
      if (i === 0) chip.classList.add('is-selected');
      chip.append(...li.childNodes);
      // ":charging: Alle Elektro" (raw icon notation, local preview) -> icon span
      const first = chip.firstChild;
      const match = first && first.nodeType === Node.TEXT_NODE && first.textContent.match(/^\s*:([a-z0-9-]+):\s*/);
      if (match) {
        first.textContent = first.textContent.slice(match[0].length);
        chip.prepend(createIcon(match[1]));
      }
      li.replaceChildren(chip);
    });
  });
}

/**
 * One model line card: [image] [text: h3 title + count link] [electric].
 * The whole card is clickable via the count link (stretched link).
 * @param {Element} row
 * @returns {Element|null} li
 */
function buildCard(row) {
  const li = document.createElement('li');
  li.className = 'carline-slider-card';
  moveInstrumentation(row, li);
  let electric = false;

  [...row.children].forEach((cell) => {
    const bool = readBoolean(cell);
    if (bool !== null) {
      electric = bool;
      return;
    }
    if (cell.querySelector('picture') && cell.textContent.trim() === '') {
      cell.className = 'carline-slider-image';
      li.append(cell);
      return;
    }
    if (cell.textContent.trim() === '') return;
    cell.className = 'carline-slider-body';
    li.append(cell);
  });

  const body = li.querySelector('.carline-slider-body');
  const link = body && body.querySelector('a[href]');
  if (link) {
    link.classList.remove('button', 'primary', 'secondary', 'accent');
    const wrapper = link.closest('.button-wrapper, .button-container');
    if (wrapper) wrapper.classList.remove('button-wrapper', 'button-container');
    link.classList.add('carline-slider-link');
    link.append(createIcon('chevron'));
  }

  if (electric) {
    const badge = document.createElement('span');
    badge.className = 'carline-slider-badge';
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', 'Elektromodell');
    badge.append(createIcon('charging'));
    li.append(badge);
  }
  return li.childElementCount ? li : null;
}

/**
 * loads and decorates the block
 * Rows: [filters (ul of chips)] [count] then one row per model line card.
 * Chips are static; the arrows scroll the card track.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  sliderId += 1;
  const trackId = `carline-slider-${sliderId}`;
  let filters = null;
  let count = null;
  const track = document.createElement('ul');
  track.className = 'carline-slider-track';
  track.id = trackId;
  track.tabIndex = 0;

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const isCard = cells.length > 1 || row.querySelector('picture');
    if (!isCard && row.querySelector('ul') && !filters) {
      [filters] = cells;
      moveInstrumentation(row, filters);
      decorateFilters(filters);
    } else if (!isCard && !count && cells[0] && cells[0].textContent.trim()) {
      [count] = cells;
      moveInstrumentation(row, count);
      count.className = 'carline-slider-count';
    } else if (isCard) {
      const card = buildCard(row);
      if (card) track.append(card);
    }
  });

  track.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  // count + arrows row
  const bar = document.createElement('div');
  bar.className = 'carline-slider-bar';
  const nav = document.createElement('div');
  nav.className = 'carline-slider-nav';
  const makeButton = (dir, label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `carline-slider-${dir}`;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-controls', trackId);
    button.append(createIcon('chevron'));
    return button;
  };
  const prev = makeButton('prev', LABEL_PREV);
  const next = makeButton('next', LABEL_NEXT);
  nav.append(prev, next);
  if (count) bar.append(count);
  bar.append(nav);

  const step = () => {
    const first = track.querySelector('.carline-slider-card');
    if (!first) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const perView = Math.max(1, Math.floor(track.clientWidth / (first.offsetWidth + gap)) - 1);
    return perView * (first.offsetWidth + gap);
  };
  const scrollByStep = (dir) => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    track.scrollBy({ left: dir * step(), behavior });
  };
  const updateButtons = () => {
    const max = track.scrollWidth - track.clientWidth - 1;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max;
    nav.hidden = max <= 0;
  };
  prev.addEventListener('click', () => scrollByStep(-1));
  next.addEventListener('click', () => scrollByStep(1));
  track.addEventListener('keydown', (e) => {
    if (e.target !== track) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollByStep(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollByStep(1);
    }
  });
  track.addEventListener('scroll', updateButtons, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(updateButtons).observe(track);

  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', 'Modellreihen');
  block.replaceChildren(...[filters, bar, track].filter(Boolean));
  decorateIcons(block);
  updateButtons();
}
