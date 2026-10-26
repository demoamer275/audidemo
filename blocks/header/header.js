// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');
// wide desktop: inline top-level navigation instead of the hamburger
const isWide = window.matchMedia('(width >= 1200px)');

// opens/closes the sub-layer of a top-level menu item
const subLayerOpeners = new WeakMap();

/**
 * Fetches the nav fragment. Metadata-independent: /content first (local preview),
 * then the site root (Edge Delivery). Relative image paths are resolved against
 * the fragment URL so they work from any page depth.
 * @returns {Promise<HTMLElement|null>} container holding the fragment sections
 */
async function fetchNav() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const container = document.createElement('div');
  container.innerHTML = await resp.text();
  const base = new URL(resp.url, window.location.href);
  container.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  return container;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  });
  node.append(...children);
  return node;
}

/** label text of a tool item: text of its first paragraph */
function itemLabel(li) {
  const p = li.querySelector(':scope > p');
  return p ? p.textContent.trim() : '';
}

/**
 * Header state: only one of menu / search / popover is open at a time.
 */
function createState(nav) {
  const state = { open: null };
  const close = () => {
    if (!state.open) return;
    const { trigger, panel, onClose } = state.open;
    trigger.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    nav.classList.remove(`has-${panel.dataset.kind}-open`);
    document.body.classList.remove('nav-scroll-lock');
    if (onClose) onClose();
    state.open = null;
  };
  const open = (trigger, panel, { lockScroll = false, onClose } = {}) => {
    close();
    trigger.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');
    nav.classList.add(`has-${panel.dataset.kind}-open`);
    if (lockScroll) document.body.classList.add('nav-scroll-lock');
    state.open = { trigger, panel, onClose };
  };
  const toggle = (trigger, panel, opts) => {
    if (state.open && state.open.panel === panel) close();
    else open(trigger, panel, opts);
  };
  return {
    state, open, close, toggle,
  };
}

/**
 * Builds the menu layer from the sections list: top-level links, sub-layers
 * (back button + grouped link columns) and the dealer row.
 */
function buildMenuLayer(section) {
  const layer = el('div', { class: 'nav-layer', id: 'nav-layer', 'data-kind': 'menu' });
  const inner = el('div', { class: 'nav-layer-inner' });
  const list = section.querySelector(':scope > ul');
  const sections = el('div', { class: 'nav-sections' });
  if (list) {
    list.classList.add('nav-sections-list');
    [...list.children].forEach((li) => {
      const link = li.querySelector(':scope > a');
      const sub = li.querySelector(':scope > ul');
      li.classList.add('nav-item');
      if (link) link.classList.add('nav-link');
      if (!link || !sub) return;
      li.classList.add('nav-drop');
      link.setAttribute('aria-haspopup', 'true');
      link.setAttribute('aria-expanded', 'false');
      // sub-layer: back button + groups
      const back = el('button', { type: 'button', class: 'nav-back' }, link.textContent.trim());
      const groups = el('div', { class: 'nav-groups' });
      [...sub.children].forEach((groupLi) => {
        const group = el('div', { class: 'nav-group' });
        const label = groupLi.querySelector(':scope > p');
        if (label) {
          label.classList.add('nav-group-label');
          group.append(label);
        }
        const links = groupLi.querySelector(':scope > ul');
        if (links) {
          links.classList.add('nav-group-links');
          group.append(links);
        }
        groups.append(group);
      });
      const panel = el('div', { class: 'nav-sublayer' }, back, groups);
      sub.replaceWith(panel);

      const setOpen = (open) => {
        li.classList.toggle('is-active', open);
        sections.classList.toggle('has-active', open);
        link.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      subLayerOpeners.set(li, setOpen);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        setOpen(true);
        back.focus();
      });
      back.addEventListener('click', () => {
        setOpen(false);
        link.focus();
      });
    });
    sections.append(list);
  }
  inner.append(sections);

  // dealer row: paragraph(s) after the list
  [...section.querySelectorAll(':scope > p')].forEach((p) => {
    const dealer = el('div', { class: 'nav-dealer' });
    dealer.append(...p.childNodes);
    inner.append(dealer);
  });
  layer.append(inner);
  return layer;
}

/** Builds the search overlay (form controls live in JS, copy comes from the fragment). */
function buildSearch(li, closeAll) {
  const paragraphs = [...li.querySelectorAll(':scope > p')];
  const placeholder = paragraphs[1] ? paragraphs[1].textContent.trim() : '';
  const quickLabel = paragraphs[2] ? paragraphs[2].textContent.trim() : '';
  const actionLink = paragraphs[0] && paragraphs[0].querySelector('a');
  const action = actionLink ? actionLink.href : '';
  const searchIcon = paragraphs[0] && paragraphs[0].querySelector('img');

  const panel = el('div', {
    class: 'nav-search', 'data-kind': 'search', role: 'dialog', 'aria-modal': 'true', 'aria-label': itemLabel(li),
  });
  const closeBtn = el('button', { type: 'button', class: 'nav-search-close', 'aria-label': 'Suche schließen' });
  closeBtn.addEventListener('click', closeAll);
  const input = el('input', {
    type: 'search', class: 'nav-search-input', name: 'query', placeholder, 'aria-label': placeholder, autocomplete: 'off',
  });
  const form = el('form', { class: 'nav-search-form', role: 'search', action: action || '#' });
  if (searchIcon) {
    const icon = searchIcon.cloneNode();
    icon.className = 'nav-search-icon';
    icon.alt = '';
    form.append(icon);
  }
  const clear = el('button', { type: 'button', class: 'nav-search-clear', 'aria-label': 'Eingabe löschen' });
  clear.addEventListener('click', () => {
    input.value = '';
    input.focus();
    form.classList.remove('has-value');
  });
  input.addEventListener('input', () => form.classList.toggle('has-value', !!input.value));
  form.append(input, clear);
  form.addEventListener('submit', (e) => {
    if (!action || !input.value.trim()) e.preventDefault();
  });

  const results = el('div', { class: 'nav-search-results' });
  if (quickLabel) results.append(el('p', { class: 'nav-search-quick-label' }, quickLabel));
  const quick = li.querySelector(':scope > ul');
  if (quick) {
    quick.classList.add('nav-search-quick');
    quick.querySelectorAll(':scope > li').forEach((q) => {
      if (q.querySelector('a')) return;
      // plain entries are search suggestions: fill the field and submit
      const term = q.textContent.trim();
      const btn = el('button', { type: 'button' }, term);
      btn.addEventListener('click', () => {
        input.value = term;
        form.classList.add('has-value');
        if (action) form.requestSubmit();
      });
      q.replaceChildren(btn);
    });
    results.append(quick);
  }
  panel.append(el('div', { class: 'nav-search-bar' }, closeBtn, form), results);
  return { panel, input };
}

/** Builds a popover (wishlist, myAudi) from the remaining tool item content. */
function buildPopover(li) {
  const panel = el('div', {
    class: 'nav-popover', 'data-kind': 'popover', role: 'dialog', 'aria-label': itemLabel(li),
  });
  [...li.children].slice(1).forEach((child) => {
    const strong = child.querySelector(':scope > strong > a, :scope > em > a');
    if (strong) {
      strong.classList.add('nav-popover-button', child.querySelector(':scope > em') ? 'secondary' : 'primary');
      child.replaceChildren(strong);
      child.classList.add('nav-popover-action');
    } else if (child.tagName === 'P' && child.children.length === 1 && child.firstElementChild.tagName === 'A' && child.textContent.trim() === child.firstElementChild.textContent.trim()) {
      child.classList.add('nav-popover-more');
    } else if (child.tagName === 'P' && child.querySelector('a')) {
      child.classList.add('nav-popover-legal');
    }
    panel.append(child);
  });
  return panel;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNav();
  block.textContent = '';
  if (!fragment) return;
  const [brandSection, menuSection, toolsSection] = [...fragment.children];

  const nav = el('nav', { id: 'nav', 'aria-label': 'Hauptnavigation' });
  const bar = el('div', { class: 'nav-bar' });
  const ui = createState(nav);

  // hamburger (morphs to a cross when the menu layer is open)
  const hamburger = el('div', { class: 'nav-hamburger' });
  const menuButton = el('button', {
    type: 'button', 'aria-controls': 'nav-layer', 'aria-expanded': 'false', 'aria-label': 'Menü',
  });
  menuButton.innerHTML = '<span class="nav-hamburger-icon"><span></span><span></span><span></span><span></span></span>';
  hamburger.append(menuButton);

  // brand
  const brand = el('div', { class: 'nav-brand' });
  if (brandSection) {
    const link = brandSection.querySelector('a');
    if (link) {
      const img = link.querySelector('img');
      link.setAttribute('aria-label', img && img.alt ? img.alt : link.textContent.trim());
      brand.append(link);
    }
  }

  // menu layer
  const layer = menuSection ? buildMenuLayer(menuSection) : null;
  const resetLayer = () => {
    if (!layer) return;
    layer.querySelectorAll('.nav-item.is-active').forEach((li) => li.classList.remove('is-active'));
    layer.querySelector('.nav-sections').classList.remove('has-active');
    layer.querySelectorAll('[aria-expanded="true"]').forEach((a) => a.setAttribute('aria-expanded', 'false'));
  };
  menuButton.addEventListener('click', () => {
    if (layer) ui.toggle(menuButton, layer, { lockScroll: true, onClose: resetLayer });
  });

  // wide desktop: the same top-level items inline in the bar; items with a
  // sub-layer open the menu layer directly on that sub-layer
  const inline = el('ul', { class: 'nav-inline' });
  if (layer) {
    layer.querySelectorAll('.nav-sections-list > .nav-item').forEach((li) => {
      const link = li.querySelector(':scope > .nav-link');
      if (!link) return;
      const inlineLink = el('a', { href: link.getAttribute('href'), class: 'nav-inline-link' }, link.textContent.trim());
      const setOpen = subLayerOpeners.get(li);
      if (setOpen) {
        inlineLink.setAttribute('aria-haspopup', 'true');
        inlineLink.setAttribute('aria-expanded', 'false');
        inlineLink.setAttribute('aria-controls', 'nav-layer');
        inlineLink.addEventListener('click', (e) => {
          e.preventDefault();
          if (ui.state.open && ui.state.open.trigger === inlineLink) {
            ui.close();
            return;
          }
          ui.open(inlineLink, layer, { lockScroll: true, onClose: resetLayer });
          setOpen(true);
        });
      }
      inline.append(el('li', {}, inlineLink));
    });
  }

  // wide desktop: dealer link shown in the bar (copy of the menu layer's dealer row)
  const dealerBar = el('div', { class: 'nav-dealer-bar' });
  const dealerLink = layer && layer.querySelector('.nav-dealer a');
  if (dealerLink) dealerBar.append(dealerLink.cloneNode(true));

  // tools: search overlay + popovers
  const tools = el('div', { class: 'nav-tools' });
  const overlays = [];
  if (toolsSection) {
    const list = toolsSection.querySelector('ul');
    [...(list ? list.children : [])].forEach((li, i) => {
      const label = itemLabel(li);
      const icon = li.querySelector(':scope > p img');
      const button = el('button', {
        type: 'button', class: 'nav-tool-button', 'aria-label': label, 'aria-expanded': 'false',
      });
      if (icon) {
        const buttonIcon = icon.cloneNode();
        buttonIcon.alt = '';
        button.append(buttonIcon);
      }
      const tool = el('div', { class: 'nav-tool' }, button);
      if (i === 0 && li.querySelector('ul')) {
        tool.classList.add('nav-tool-search');
        const { panel, input } = buildSearch(li, () => ui.close());
        overlays.push(panel);
        button.addEventListener('click', () => {
          ui.toggle(button, panel, { lockScroll: true });
          if (panel.classList.contains('is-open')) input.focus();
        });
      } else {
        const panel = buildPopover(li);
        tool.classList.add('nav-tool-popover');
        tool.append(panel);
        button.setAttribute('aria-haspopup', 'dialog');
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          ui.toggle(button, panel);
        });
      }
      tools.append(tool);
    });
  }

  bar.append(hamburger, brand, inline, dealerBar, tools);
  nav.append(bar);
  if (layer) nav.append(layer);
  nav.append(...overlays);

  // close on Escape and on outside click (popovers)
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && ui.state.open) {
      const { trigger } = ui.state.open;
      ui.close();
      trigger.focus();
    }
  });
  document.addEventListener('click', (e) => {
    const { open } = ui.state;
    if (open && open.panel.dataset.kind === 'popover' && !open.panel.contains(e.target)) ui.close();
  });
  // crossing a desktop breakpoint resets any open panel
  isDesktop.addEventListener('change', () => ui.close());
  isWide.addEventListener('change', () => ui.close());

  const navWrapper = el('div', { class: 'nav-wrapper' }, nav);
  block.append(navWrapper);
}
