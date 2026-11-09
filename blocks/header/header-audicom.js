import { loadCSS } from '../../scripts/aem.js';

/*
 * audi.com header (pages under /master/en): logo, "Menu" button and inline search in a
 * black bar; the menu opens a left off-canvas drawer whose items open a second layer.
 *
 * Fragment sections (content/master/en/nav.plain.html):
 *   1. brand: linked logo image
 *   2. menu: "Menu" label, "Close menu" label (each with an icon image), main link list
 *      (nested lists become the second layer)
 *   3. extra links (Sign in, Legal)
 *   4. tools: search link (href = form action, text = placeholder) + quick action icon links
 *   5. languages: one link per language
 *   6. breadcrumb start: links placed before the page trail (e.g. Home, Models)
 */

// drawer and sub layer side by side from tablet width (audi.com: 768px); one layer at a time below
const isTablet = window.matchMedia('(width >= 768px)');

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  });
  node.append(...children);
  return node;
}

/** mask icon from an image of the fragment (icons are single-colour shapes) */
function icon(img, extraClass = '') {
  const span = el('span', { class: `acn-icon ${extraClass}`.trim(), 'aria-hidden': 'true' });
  if (img) span.style.setProperty('--acn-icon', `url("${img.src}")`);
  return span;
}

/** label paragraph of the menu section: its text and its icon image */
function labelOf(p) {
  return { text: p ? p.textContent.trim() : '', img: p && p.querySelector('img') };
}

/** two-letter language of the current page, taken from the language root in the path */
function pageLanguage() {
  const m = window.location.pathname.match(/\/master\/([a-z]{2})(\/|$)/);
  return m ? m[1].toUpperCase() : document.documentElement.lang.slice(0, 2).toUpperCase();
}

function buildSearch(section) {
  const link = section && section.querySelector(':scope > p a');
  if (!link) return null;
  const placeholder = link.textContent.trim();
  const img = link.querySelector('img');
  const label = (img && img.alt) || placeholder;
  const form = el('form', {
    class: 'acn-search', action: link.href, method: 'get', role: 'search',
  });
  const input = el('input', {
    type: 'search', name: 'query', placeholder, 'aria-label': label, autocomplete: 'off',
  });
  const submit = el('button', { type: 'submit', class: 'acn-search-submit', 'aria-label': label }, icon(img));
  form.append(input, submit);
  return form;
}

/** language links; the current language stays on this page, others go to the fragment target */
function buildLanguageList(langs, listClass, linkClass) {
  const current = pageLanguage();
  const langList = el('ul', { class: listClass });
  [...langs.children].forEach((li) => {
    const link = li.querySelector('a');
    if (!link) return;
    const text = link.textContent.trim();
    const a = el('a', { class: linkClass, href: link.href, lang: text.toLowerCase() }, text);
    if (text.toUpperCase() === current) {
      a.href = window.location.pathname;
      a.classList.add('is-active');
      a.setAttribute('aria-current', 'true');
    }
    langList.append(el('li', {}, a));
  });
  return langList;
}

/** page title used as breadcrumb label: og:title, then the first heading, then the title */
function titleOf(doc) {
  const og = doc.querySelector('meta[property="og:title"]');
  const h1 = doc.querySelector('h1');
  return ((og && og.content) || (h1 && h1.textContent) || doc.title || '').trim();
}

/**
 * Pages of the trail between the language root and the current page, e.g. for
 * /master/en/audi-q5-59/audi-q5-suv-12871 the page /master/en/audi-q5-59.
 * Labels come from each page's own title.
 */
async function pageTrail() {
  const { pathname } = window.location;
  const m = pathname.match(/^((?:\/content)?\/master\/[a-z]{2})((?:\/[^/]+)*?)\/?$/);
  if (!m) return [];
  const segments = m[2].split('/').filter(Boolean);
  const ancestors = segments.slice(0, -1)
    .map((_, i) => `${m[1]}/${segments.slice(0, i + 1).join('/')}`);
  const parser = new DOMParser();
  const trail = await Promise.all(ancestors.map(async (path) => {
    try {
      const resp = await fetch(path);
      if (!resp.ok) return null;
      const label = titleOf(parser.parseFromString(await resp.text(), 'text/html'));
      return label ? { label, href: path } : null;
    } catch (e) {
      return null;
    }
  }));
  return [...trail.filter(Boolean), { label: titleOf(document) }];
}

/** breadcrumb bar: fragment start links, the page trail, then the language links */
async function buildBreadcrumb(section, langs) {
  const startLinks = section ? [...section.querySelectorAll('a')] : [];
  const trail = await pageTrail();
  const start = startLinks.map((a) => ({ label: a.textContent.trim(), href: a.href }));
  const items = [...start, ...trail];
  if (items.length < 2) return null;
  const crumbs = el('ol', { class: 'acn-crumbs' });
  items.forEach((item, i) => {
    const current = i === items.length - 1;
    const label = el('span', { class: 'acn-crumb-label' }, item.label);
    const chevron = el('span', { class: 'acn-icon acn-crumb-icon', 'aria-hidden': 'true' });
    const crumb = current || !item.href
      ? el('span', { class: 'acn-crumb is-current' }, label)
      : el('a', { class: 'acn-crumb', href: item.href }, label, chevron);
    if (current) crumb.setAttribute('aria-current', 'page');
    crumbs.append(el('li', {}, crumb));
  });
  const breadcrumb = el('nav', { class: 'acn-breadcrumb', 'aria-label': 'Breadcrumb' }, crumbs);
  if (langs) breadcrumb.append(buildLanguageList(langs, 'acn-lang acn-crumb-lang', 'acn-lang-link'));
  return breadcrumb;
}

function buildLinkList(ul, onSub) {
  const list = el('ul', { class: 'acn-links' });
  [...ul.children].forEach((li) => {
    const link = li.querySelector(':scope > a, :scope > p > a');
    if (!link) return;
    const item = el('li');
    const a = el('a', { href: link.href }, el('span', {}, link.textContent.trim()));
    item.append(a);
    const sub = li.querySelector(':scope > ul');
    if (sub && onSub) onSub(a, sub);
    list.append(item);
  });
  return list;
}

/**
 * loads and decorates the audi.com header
 * @param {Element} block The header block element
 * @param {Element} fragment parsed nav fragment
 */
export default async function decorate(block, fragment) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/header/header-audicom.css`);
  block.classList.add('audicom');
  const [brandSection, menuSection, extraSection, toolsSection, langSection, crumbSection] = [
    ...fragment.children,
  ];
  const labels = menuSection ? [...menuSection.querySelectorAll(':scope > p')] : [];
  const [menuLabel, closeLabel] = labels.map(labelOf);

  const nav = el('nav', { class: 'acn', 'aria-label': 'Main navigation' });
  const bar = el('div', { class: 'acn-bar' });

  // brand
  const brandLink = brandSection && brandSection.querySelector('a');
  if (brandLink) {
    const img = brandLink.querySelector('img');
    const brand = el('a', { class: 'acn-brand', href: brandLink.href, 'aria-label': (img && img.alt) || brandLink.textContent.trim() });
    if (img) {
      const logo = img.cloneNode();
      logo.alt = '';
      brand.append(logo);
    }
    bar.append(brand);
  }

  // menu button
  const menuButton = el('button', {
    type: 'button', class: 'acn-pill acn-menu-button', 'aria-controls': 'acn-drawer', 'aria-expanded': 'false',
  }, icon(menuLabel && menuLabel.img), el('span', { class: 'acn-pill-label' }, menuLabel ? menuLabel.text : 'Menu'));
  if (menuLabel) menuButton.setAttribute('aria-label', menuLabel.text);
  bar.append(menuButton);

  // search: icon link to the search page on smaller screens, inline form on wide screens
  const search = buildSearch(toolsSection);
  if (search) {
    const submit = search.querySelector('.acn-search-submit');
    const searchLink = el('a', {
      class: 'acn-pill acn-icon-button acn-search-link', href: search.action, 'aria-label': submit.getAttribute('aria-label'),
    }, submit.firstElementChild.cloneNode(true));
    bar.append(searchLink, search);
  }

  // drawer
  const drawer = el('div', { class: 'acn-menu', id: 'acn-drawer' });
  const backdrop = el('div', { class: 'acn-backdrop' });
  const root = el('div', {
    class: 'acn-layer acn-layer-root', role: 'dialog', 'aria-modal': 'true', 'aria-label': menuLabel ? menuLabel.text : 'Menu',
  });
  const closeButton = el('button', { type: 'button', class: 'acn-pill acn-close' }, icon(closeLabel && closeLabel.img), el('span', { class: 'acn-pill-label' }, closeLabel ? closeLabel.text : 'Close'));
  const subLayers = [];
  const openers = [];
  const closeButtons = [closeButton];

  const closeSubLayers = () => {
    subLayers.forEach((layer) => layer.classList.remove('is-open'));
    openers.forEach((a) => {
      a.classList.remove('is-active');
      a.setAttribute('aria-expanded', 'false');
    });
    root.classList.remove('has-sub-open');
  };

  const mainList = menuSection && menuSection.querySelector(':scope > ul');
  const links = mainList ? buildLinkList(mainList, (a, sub) => {
    // chevron and back arrow are design icons (icons/), not fragment content
    a.append(el('span', { class: 'acn-icon acn-icon-forward', 'aria-hidden': 'true' }));
    a.setAttribute('aria-expanded', 'false');
    a.setAttribute('aria-haspopup', 'true');
    const layer = el('div', { class: 'acn-layer acn-layer-sub' });
    const back = el('button', { type: 'button', class: 'acn-back' }, el('span', { class: 'acn-icon acn-icon-back', 'aria-hidden': 'true' }), el('span', {}, a.textContent.trim()));
    // on mobile the sub layer covers the root layer, so it repeats the close button
    const subClose = closeButton.cloneNode(true);
    closeButtons.push(subClose);
    layer.append(
      el('div', { class: 'acn-layer-top' }, subClose),
      el('div', { class: 'acn-back-row' }, back),
      el('div', { class: 'acn-scroll' }, buildLinkList(sub)),
    );
    back.addEventListener('click', () => {
      closeSubLayers();
      a.focus();
    });
    subLayers.push(layer);
    openers.push(a);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const wasOpen = layer.classList.contains('is-open');
      closeSubLayers();
      if (wasOpen && isTablet.matches) return;
      layer.classList.add('is-open');
      a.classList.add('is-active');
      a.setAttribute('aria-expanded', 'true');
      root.classList.add('has-sub-open');
      if (!isTablet.matches) back.focus();
    });
  }) : el('ul');

  const extra = extraSection && extraSection.querySelector('ul');
  const bottom = el('div', { class: 'acn-bottom' });
  const quick = toolsSection && toolsSection.querySelector(':scope > ul');
  if (quick) {
    const quickList = el('ul', { class: 'acn-quick' });
    [...quick.children].forEach((li) => {
      const link = li.querySelector('a');
      if (!link) return;
      const img = link.querySelector('img');
      quickList.append(el('li', {}, el('a', { class: 'acn-pill acn-icon-button', href: link.href, 'aria-label': (img && img.alt) || link.textContent.trim() }, icon(img))));
    });
    bottom.append(quickList);
  }
  const langs = langSection && langSection.querySelector('ul');
  if (langs) bottom.append(buildLanguageList(langs, 'acn-lang', 'acn-lang-link'));

  const extraList = extra ? buildLinkList(extra) : el('ul');
  extraList.classList.add('acn-extra');
  root.append(
    el('div', { class: 'acn-layer-top' }, closeButton),
    el('div', { class: 'acn-scroll' }, links),
    extraList,
    bottom,
  );
  drawer.append(backdrop, root, ...subLayers);

  // open / close
  const close = () => {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    closeSubLayers();
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('acn-scroll-lock');
    menuButton.focus();
  };
  const open = () => {
    drawer.classList.add('is-open');
    menuButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('acn-scroll-lock');
    closeButton.focus();
  };
  menuButton.addEventListener('click', () => (drawer.classList.contains('is-open') ? close() : open()));
  closeButtons.forEach((button) => button.addEventListener('click', close));
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape' || !drawer.classList.contains('is-open')) return;
    if (!isTablet.matches && root.classList.contains('has-sub-open')) closeSubLayers();
    else close();
  });
  // crossing the tablet breakpoint changes the layer layout: start from the root layer
  isTablet.addEventListener('change', closeSubLayers);

  nav.append(bar, drawer);
  block.append(nav);

  // breadcrumb bar below the header bar (shown from tablet width)
  const breadcrumb = await buildBreadcrumb(crumbSection, langs);
  if (breadcrumb) block.append(breadcrumb);
}
