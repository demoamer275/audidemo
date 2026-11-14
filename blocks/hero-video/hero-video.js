/* eslint-disable no-underscore-dangle */
import { moveInstrumentation } from '../../scripts/scripts.js';

const GRAPHQL_ENDPOINT = 'https://publish-p182083-e1919654.adobeaemcloud.com/graphql/execute.json/audidemo/getcarmodel';

const ACTIONS = [
  { label: 'Jetzt konfigurieren', href: '#', variant: 'primary' },
  { label: 'Mehr erfahren', href: '#', variant: 'secondary' },
];

function getCfPath(block) {
  const a = block.querySelector('a[href]');
  const raw = (a ? a.getAttribute('href') : block.textContent).trim();
  if (!raw) return '';
  try {
    return new URL(raw, window.location.origin).pathname.replace(/\.html$/, '');
  } catch {
    return raw;
  }
}

async function fetchCarModel(path) {
  const resp = await fetch(`${GRAPHQL_ENDPOINT};path=${path};variation=master`);
  if (!resp.ok) throw new Error(`GraphQL request failed: ${resp.status}`);
  const json = await resp.json();
  return json?.data?.carModelByPath?.item;
}

function buildPoster(url, alt) {
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.src = url;
  img.alt = alt;
  img.loading = 'eager';
  img.fetchPriority = 'high';
  picture.append(img);
  return picture;
}

function buildVideo(url, reducedMotion) {
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
  source.src = url;
  source.type = 'video/mp4';
  video.append(source);
  return video;
}

function buildActions() {
  const group = document.createElement('div');
  group.className = 'hero-video-actions';
  ACTIONS.forEach(({ label, href, variant }) => {
    const p = document.createElement('p');
    p.className = 'hero-video-cta';
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.className = `button ${variant}`;
    p.append(a);
    group.append(p);
  });
  return group;
}

/**
 * loads and decorates the block
 * Single authored row: reference to a car model content fragment.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const path = getCfPath(block);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const media = document.createElement('div');
  media.className = 'hero-video-media';
  const content = document.createElement('div');
  content.className = 'hero-video-content';
  moveInstrumentation(block.firstElementChild, content);
  block.replaceChildren();

  if (!path) return;

  let item;
  try {
    item = await fetchCarModel(path);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('hero-video:', e);
  }
  if (!item) return;

  const posterUrl = item.heroImage?._publishUrl;
  if (posterUrl) {
    const poster = buildPoster(posterUrl, item.title || '');
    poster.classList.add('hero-video-poster');
    media.append(poster);
  }

  const videoUrl = item.heroVideo?._publishUrl;
  if (videoUrl) {
    const video = buildVideo(videoUrl, reducedMotion);
    media.append(video);
    if (!reducedMotion) {
      video.addEventListener('playing', () => block.classList.add('is-playing'), { once: true });
      video.play()?.catch(() => { /* autoplay blocked: poster stays visible */ });
    } else if (!posterUrl) {
      video.preload = 'metadata';
    }
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (e.matches) video.pause();
      else video.play().catch(() => {});
    });
  }

  const text = document.createElement('div');
  text.className = 'hero-video-text';
  text.innerHTML = item.description?.html || '';
  text.append(buildActions());
  content.append(text);

  if (item.stats?.html) {
    const disclaimer = document.createElement('div');
    disclaimer.className = 'hero-video-disclaimer';
    disclaimer.innerHTML = item.stats.html;
    content.append(disclaimer);
  }

  block.replaceChildren(...[media, content].filter((el) => el.childElementCount));
}
