import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const VIDEO_PATTERN = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

/**
 * Returns the video link of a cell when the cell only holds a link to a video file.
 * @param {Element} cell
 * @returns {HTMLAnchorElement|null}
 */
function getVideoLink(cell) {
  const links = [...cell.querySelectorAll('a[href]')];
  if (links.length !== 1 || cell.querySelector('picture, h1, h2, h3')) return null;
  return VIDEO_PATTERN.test(links[0].getAttribute('href')) ? links[0] : null;
}

function isPictureOnly(cell) {
  return cell.querySelector('picture') && cell.textContent.trim() === '';
}

/**
 * Builds the background video element from an authored link.
 * @param {HTMLAnchorElement} link
 * @param {boolean} reducedMotion
 * @returns {HTMLVideoElement}
 */
function buildVideo(link, reducedMotion) {
  const video = document.createElement('video');
  video.className = 'hero-video-video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  video.preload = reducedMotion ? 'none' : 'auto';
  if (!reducedMotion) {
    video.autoplay = true;
    video.setAttribute('autoplay', '');
  }
  const source = document.createElement('source');
  source.src = link.href;
  source.type = 'video/mp4';
  video.append(source);
  moveInstrumentation(link, video);
  return video;
}

/**
 * Groups consecutive link-only paragraphs into a CTA container.
 * @param {Element} content
 */
function decorateCtas(content) {
  const ctaParagraphs = [...content.querySelectorAll('p')].filter((p) => {
    const links = p.querySelectorAll('a[href]');
    if (!links.length || p.querySelector('img')) return false;
    const linkText = [...links].map((a) => a.textContent).join('').replace(/\s+/g, '');
    return linkText === p.textContent.replace(/\s+/g, '');
  });
  if (!ctaParagraphs.length) return;

  let group = null;
  ctaParagraphs.forEach((p) => {
    p.querySelectorAll('a[href]').forEach((a) => {
      a.classList.add('button');
      if (!a.classList.contains('secondary') && !a.classList.contains('accent')) {
        a.classList.add('primary');
      }
    });
    p.classList.add('hero-video-cta');
    const prev = p.previousElementSibling;
    if (!group || prev !== group) {
      group = document.createElement('div');
      group.className = 'hero-video-actions';
      p.before(group);
    }
    group.append(p);
  });
}

/**
 * loads and decorates the block
 * Expected rows (one cell each): video link | poster image | text (h1, price, CTAs) | disclaimer.
 * Rows are detected by content, so missing or reordered rows degrade gracefully.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const media = document.createElement('div');
  media.className = 'hero-video-media';
  const content = document.createElement('div');
  content.className = 'hero-video-content';

  let videoLink = null;
  let pictureCell = null;
  const textCells = [];

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      if (!videoLink && getVideoLink(cell)) {
        videoLink = getVideoLink(cell);
      } else if (!pictureCell && isPictureOnly(cell)) {
        pictureCell = cell;
      } else if (cell.textContent.trim() !== '' || cell.querySelector('img')) {
        textCells.push(cell);
      }
    });
  });

  if (pictureCell) {
    const picture = pictureCell.querySelector('picture');
    const img = picture.querySelector('img');
    const optimized = createOptimizedPicture(img.src, img.alt, true, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]);
    moveInstrumentation(img, optimized.querySelector('img'));
    moveInstrumentation(pictureCell, media);
    optimized.classList.add('hero-video-poster');
    media.append(optimized);
  }

  if (videoLink) {
    const video = buildVideo(videoLink, reducedMotion);
    media.append(video);
    if (!reducedMotion) {
      video.addEventListener('playing', () => block.classList.add('is-playing'), { once: true });
      const playPromise = video.play();
      if (playPromise) playPromise.catch(() => { /* autoplay blocked: poster stays visible */ });
    } else if (!pictureCell) {
      // no poster available: show the first frame instead of an empty stage
      video.preload = 'metadata';
    }
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (e.matches) video.pause();
      else video.play().catch(() => {});
    });
  }

  textCells.forEach((cell, index) => {
    const part = document.createElement('div');
    moveInstrumentation(cell, part);
    while (cell.firstChild) part.append(cell.firstChild);
    const isDisclaimer = index === textCells.length - 1 && index > 0
      && !part.querySelector('h1, h2, h3, a.button');
    part.className = isDisclaimer ? 'hero-video-disclaimer' : 'hero-video-text';
    content.append(part);
  });

  content.querySelectorAll('.hero-video-text').forEach(decorateCtas);

  const children = [];
  if (media.childElementCount) children.push(media);
  if (content.childElementCount) children.push(content);
  block.replaceChildren(...children);
}
