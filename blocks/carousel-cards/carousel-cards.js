import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation, getDamAssetUrl } from '../../scripts/scripts.js';

const VIDEO_PATTERN = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const LABEL_PREV = 'Vorherige Folie';
const LABEL_NEXT = 'Nächste Folie';

let carouselId = 0;

function getVideoLink(cell) {
  const links = [...cell.querySelectorAll('a[href]')];
  if (links.length !== 1 || cell.querySelector('picture, h2, h3, h4')) return null;
  return VIDEO_PATTERN.test(links[0].getAttribute('href')) ? links[0] : null;
}

function buildVideo(link, reducedMotion) {
  const video = document.createElement('video');
  video.className = 'carousel-cards-video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  // source shows native controls (no download / playback rate / PiP)
  video.controls = true;
  video.disablePictureInPicture = true;
  video.setAttribute('controlslist', 'nodownload noplaybackrate');
  if (reducedMotion) video.preload = 'metadata';
  const source = document.createElement('source');
  source.src = getDamAssetUrl(link.href);
  source.type = 'video/mp4';
  video.append(source);
  moveInstrumentation(link, video);
  return video;
}

/**
 * Plays slide videos only while they are visible (never when reduced motion is requested).
 * @param {HTMLVideoElement[]} videos
 */
function observeVideos(videos) {
  if (!videos.length || !('IntersectionObserver' in window)) return;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting && !motionQuery.matches) {
        target.play().catch(() => { /* autoplay blocked */ });
      } else {
        target.pause();
      }
    });
  }, { threshold: 0.5 });
  videos.forEach((video) => observer.observe(video));
}

/**
 * Builds one slide from an authored row.
 * Cells: image | video link | title + text (each optional, detected by content).
 * @param {Element} row
 * @param {boolean} reducedMotion
 * @returns {HTMLLIElement}
 */
function buildSlide(row, reducedMotion) {
  const li = document.createElement('li');
  li.className = 'carousel-cards-slide';
  moveInstrumentation(row, li);

  const media = document.createElement('div');
  media.className = 'carousel-cards-media';
  const body = document.createElement('div');
  body.className = 'carousel-cards-body';

  let videoLink = null;
  [...row.children].forEach((cell) => {
    const link = getVideoLink(cell);
    if (link && !videoLink) {
      videoLink = link;
    } else if (cell.querySelector('picture') && cell.textContent.trim() === '') {
      moveInstrumentation(cell, media);
      media.append(...cell.childNodes);
    } else if (cell.textContent.trim() !== '') {
      const part = document.createElement('div');
      moveInstrumentation(cell, part);
      part.append(...cell.childNodes);
      body.append(part);
    }
  });

  media.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });

  if (videoLink) {
    const video = buildVideo(videoLink, reducedMotion);
    const img = media.querySelector('img');
    if (img) {
      // image doubles as poster; video replaces it visually
      video.poster = img.currentSrc || img.src;
      media.querySelector('picture').classList.add('carousel-cards-poster');
    }
    media.append(video);
  }

  if (media.childElementCount) li.append(media);
  if (body.childElementCount) li.append(body);
  return li;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  carouselId += 1;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const trackId = `carousel-cards-${carouselId}`;

  const track = document.createElement('ul');
  track.className = 'carousel-cards-track';
  track.id = trackId;
  track.tabIndex = 0;

  const rows = [...block.children];
  rows.forEach((row, index) => {
    const slide = buildSlide(row, reducedMotion);
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${index + 1} / ${rows.length}`);
    track.append(slide);
  });

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  const heading = block.closest('.section')?.querySelector('h2');
  if (heading) {
    if (!heading.id) heading.id = `${trackId}-heading`;
    block.setAttribute('aria-labelledby', heading.id);
  }

  const nav = document.createElement('div');
  nav.className = 'carousel-cards-nav';
  const makeButton = (dir, label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `carousel-cards-${dir}`;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-controls', trackId);
    return button;
  };
  const prev = makeButton('prev', LABEL_PREV);
  const next = makeButton('next', LABEL_NEXT);
  nav.append(prev, next);

  const step = () => {
    const first = track.querySelector('.carousel-cards-slide');
    if (!first) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  };
  const scrollBySlide = (dir) => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    track.scrollBy({ left: dir * step(), behavior });
  };
  const updateButtons = () => {
    const max = track.scrollWidth - track.clientWidth - 1;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max;
    nav.hidden = max <= 0;
  };

  prev.addEventListener('click', () => scrollBySlide(-1));
  next.addEventListener('click', () => scrollBySlide(1));
  track.addEventListener('keydown', (e) => {
    if (e.target !== track) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollBySlide(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollBySlide(1);
    }
  });
  track.addEventListener('scroll', updateButtons, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(updateButtons).observe(track);

  block.replaceChildren(track, nav);
  updateButtons();
  observeVideos([...track.querySelectorAll('video')]);
}
