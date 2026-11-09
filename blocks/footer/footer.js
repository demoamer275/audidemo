// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');

/**
 * Language roots with their own footer fragment and design (module footer-<design>.js).
 * Pages outside these roots use the default (audi.de) footer at the site root.
 */
const LOCALE_FOOTERS = [{
  pattern: /^\/(content\/)?master\/en(\/|$)/,
  paths: ['/content/master/en/footer.plain.html', '/master/en/footer.plain.html'],
  design: 'audicom',
}];

/**
 * Fetches the footer fragment. Metadata-independent: /content first (local preview),
 * then the site root (Edge Delivery). Relative image paths are resolved against
 * the fragment URL so they work from any page depth.
 * @param {object} [locale] entry of LOCALE_FOOTERS for pages under a language root
 * @returns {Promise<HTMLElement|null>} container holding the fragment sections
 */
async function fetchFooter(locale) {
  let resp;
  if (locale) {
    resp = await fetch(locale.paths[0]);
    if (!resp.ok) resp = await fetch(locale.paths[1]);
  } else {
    resp = await fetch('/content/footer.plain.html');
    if (!resp.ok) resp = await fetch('/footer.plain.html');
  }
  if (!resp.ok) return null;
  const container = document.createElement('div');
  container.innerHTML = await resp.text();
  const base = new URL(resp.url, window.location.href);
  container.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  return container;
}

/** links to other hosts open in a new tab */
function decorateExternalLinks(root) {
  root.querySelectorAll('a[href^="http"]').forEach((a) => {
    const { hostname } = new URL(a.href);
    if (hostname !== window.location.hostname && !hostname.endsWith('audi.de')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
}

/** back-to-top: a section holding a single "#" link */
function decorateBackToTop(section) {
  section.classList.add('footer-top');
  const link = section.querySelector('a');
  link.classList.add('footer-top-link');
  link.setAttribute('aria-label', link.textContent.trim());
  link.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * Link columns: each heading + following list becomes a column; on mobile the
 * heading is a toggle button for its list (several can be open at once).
 */
function decorateLinkColumns(section) {
  section.classList.add('footer-sitemap');
  const columns = document.createElement('div');
  columns.className = 'footer-columns';
  [...section.querySelectorAll(':scope > h4')].forEach((heading, i) => {
    const list = heading.nextElementSibling && heading.nextElementSibling.tagName === 'UL'
      ? heading.nextElementSibling : null;
    const column = document.createElement('div');
    column.className = 'footer-column';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'footer-column-toggle';
    button.setAttribute('aria-expanded', 'false');
    const listId = `footer-column-${i}`;
    button.setAttribute('aria-controls', listId);
    button.append(...heading.childNodes);
    // decorative chevron (UI only, no copy)
    button.insertAdjacentHTML('beforeend', '<svg class="footer-column-chevron" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24"><path d="M7 10l5.5 5.5L18 10" fill="none" stroke="currentColor"/></svg>');
    heading.append(button);
    column.append(heading);
    if (list) {
      list.id = listId;
      list.classList.add('footer-column-links');
      column.append(list);
    }
    button.addEventListener('click', () => {
      if (isDesktop.matches) return;
      button.setAttribute('aria-expanded', button.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });
    columns.append(column);
  });
  section.replaceChildren(columns);
}

function decorateSocial(section) {
  section.classList.add('footer-social');
  section.querySelectorAll('a').forEach((a) => {
    const img = a.querySelector('img');
    if (img && img.alt) a.setAttribute('aria-label', img.alt);
    if (img) img.alt = '';
  });
}

function decorateLegal(section) {
  section.classList.add('footer-legal');
  const paragraphs = section.querySelectorAll(':scope > p');
  if (paragraphs[0]) paragraphs[0].classList.add('footer-copyright');
  if (paragraphs[1]) paragraphs[1].classList.add('footer-disclaimer');
  const list = section.querySelector(':scope > ul');
  if (list) list.classList.add('footer-legal-links');
  // placeholder links (e.g. cookie settings until a consent manager exists) do nothing
  section.querySelectorAll('a[href="#"]').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const locale = LOCALE_FOOTERS.find((l) => l.pattern.test(window.location.pathname));
  const fragment = await fetchFooter(locale);
  block.textContent = '';
  if (!fragment) return;
  if (locale) {
    const { default: decorateLocale } = await import(`./footer-${locale.design}.js`);
    await decorateLocale(block, fragment);
    return;
  }

  const footer = document.createElement('div');
  footer.className = 'footer-inner';
  [...fragment.children].forEach((section) => {
    const links = section.querySelectorAll('a');
    if (links.length === 1 && links[0].getAttribute('href') === '#') decorateBackToTop(section);
    else if (section.querySelector(':scope > h4')) decorateLinkColumns(section);
    else if (section.querySelector(':scope > ul img')) decorateSocial(section);
    else if (section.querySelector(':scope > p') && section.querySelector(':scope > ul')) decorateLegal(section);
    footer.append(section);
  });
  decorateExternalLinks(footer);

  // collapsing accordions when switching to desktop keeps the mobile state clean
  isDesktop.addEventListener('change', () => {
    footer.querySelectorAll('.footer-column-toggle').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  });

  block.append(footer);
}
