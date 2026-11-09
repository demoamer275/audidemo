import { loadCSS } from '../../scripts/aem.js';

/*
 * audi.com footer (pages under /master/en): legal link row, meta row (copyright + language
 * buttons) and the WLTP emissions disclaimer.
 *
 * Fragment sections (content/master/en/footer.plain.html):
 *   1. legal links (list)
 *   2. copyright paragraph + language list
 *   3. disclaimer paragraph(s)
 */

/** two-letter language of the current page, taken from the language root in the path */
function pageLanguage() {
  const m = window.location.pathname.match(/\/master\/([a-z]{2})(\/|$)/);
  return m ? m[1].toUpperCase() : document.documentElement.lang.slice(0, 2).toUpperCase();
}

/** links leaving audi.com (and this site) open in a new tab, like on audi.com */
function decorateExternalLinks(root) {
  root.querySelectorAll('a[href^="http"]').forEach((a) => {
    const { hostname } = new URL(a.href);
    if (hostname === window.location.hostname || /(^|\.)audi\.com$/.test(hostname)) return;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
}

function decorateLinks(section) {
  section.classList.add('acf-links');
  const list = section.querySelector(':scope > ul');
  if (list) list.classList.add('acf-link-list');
  // placeholder links (cookie settings until a consent manager exists) do nothing
  section.querySelectorAll('a[href="#"]').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });
}

function decorateMeta(section) {
  section.classList.add('acf-meta');
  const copyright = section.querySelector(':scope > p');
  if (copyright) copyright.classList.add('acf-copyright');
  const list = section.querySelector(':scope > ul');
  if (!list) return;
  list.classList.add('acf-lang');
  const current = pageLanguage();
  list.querySelectorAll('a').forEach((a) => {
    const text = a.textContent.trim();
    a.classList.add('acf-lang-link');
    a.lang = text.toLowerCase();
    // the current language stays on this page; other languages go to the fragment target
    if (text.toUpperCase() === current) {
      a.href = window.location.pathname;
      a.classList.add('is-active');
      a.setAttribute('aria-current', 'true');
    }
  });
}

/**
 * loads and decorates the audi.com footer
 * @param {Element} block The footer block element
 * @param {Element} fragment parsed footer fragment
 */
export default async function decorate(block, fragment) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/footer/footer-audicom.css`);
  block.classList.add('audicom');
  const [links, meta, ...disclaimers] = [...fragment.children];
  const footer = document.createElement('div');
  footer.className = 'acf';
  if (links) {
    decorateLinks(links);
    footer.append(links);
  }
  if (meta) {
    decorateMeta(meta);
    footer.append(meta);
  }
  disclaimers.forEach((section) => {
    section.classList.add('acf-disclaimer');
    footer.append(section);
  });
  decorateExternalLinks(footer);
  block.append(footer);
}
