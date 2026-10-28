/* eslint-disable */
/* global WebImporter */

/**
 * Parser for model-filter (Audi model finder filter rail).
 * Used only for the shared fragment page (/language-masters/de/neuwagen/fragments/model-filter).
 *
 * Source: [class*="FeatureApp__FilterWrapperDesktop"]
 *   > [class*="styles__FilterSection"] > fieldset (x3)
 *       legend                         -> group label (Antriebstyp / Modelle / Fahrzeugtyp)
 *       label.filterTag-chip .name     -> one pill per label (source order)
 * The links (Zur Neuwagenbörse / Zur Gebrauchtwagenbörse) live in the SIBLING
 * [class*="VtpLinks__VtpLinksWrapper"]; it is consumed (removed) here.
 *
 * Rows (all model model-filter-group):
 *   group row: [field:label (text)] [field:buttons (richtext ul, one li per pill)]
 *   links row: [empty label] [field:buttons (richtext, one paragraph per link)]
 * Selected/disabled state, checkmarks and "Filter löschen" are ignored.
 */

const ORIGIN = 'https://www.audi.de';
const SECTION_SEL = '[class*="styles__FilterSection"]';
const VTP_SEL = '[class*="VtpLinks__VtpLinksWrapper"]';
const DEFAULT_LINKS = [
  { text: 'Zur Neuwagenbörse', href: `${ORIGIN}/de/neuwagenboerse/` },
  { text: 'Zur Gebrauchtwagenbörse', href: `${ORIGIN}/de/gebrauchtwagenboerse/` },
];

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function absolutize(href) {
  const h = (href || '').trim();
  if (!h) return '';
  if (/^https?:\/\//i.test(h)) return h;
  if (h.startsWith('//')) return `https:${h}`;
  if (h.startsWith('/')) return `${ORIGIN}${h}`;
  return h;
}

/**
 * Pill elements of one group. The importer merges adjacent inline <label>s into one,
 * so pills are found via their .name span; the pill is the inner wrapper holding
 * input + icon + name (falls back to the label).
 */
function getPills(group) {
  const names = [...group.querySelectorAll('.name')];
  if (names.length) {
    return names.map((name) => {
      let pill = name.parentElement;
      while (pill && pill !== group && !pill.querySelector('input') && pill.tagName !== 'LABEL') {
        pill = pill.parentElement;
      }
      return { el: pill && pill !== group ? pill : name, name };
    });
  }
  return [...group.querySelectorAll('label')].map((el) => ({ el, name: el }));
}

function pillLabel(pill) {
  return cleanText(pill.name.textContent);
}

function isElectricPill(pill, label) {
  const { el } = pill;
  return !!el.querySelector('use[href*="charging"], [href*="charging"]')
    || (el.querySelector('input') && el.querySelector('input').value === 'BEV')
    || /^Elektromodelle$/i.test(label);
}

function buildGroup(group, document) {
  const legend = group.querySelector('legend');
  const label = cleanText(legend ? legend.textContent : '');

  const ul = document.createElement('ul');
  getPills(group).forEach((pill) => {
    const text = pillLabel(pill);
    if (!text) return;
    const li = document.createElement('li');
    li.textContent = isElectricPill(pill, text) ? `:charging: ${text}` : text;
    ul.appendChild(li);
  });
  if (!label && !ul.children.length) return null;

  const labelCell = label ? hinted(document, 'label', [document.createTextNode(label)]) : '';
  const buttonsCell = ul.children.length ? hinted(document, 'buttons', [ul]) : '';
  return [labelCell, buttonsCell];
}

function findVtpLinks(element) {
  const parent = element.parentElement;
  if (parent) {
    const sibling = [...parent.children].find((c) => c !== element && c.matches(VTP_SEL));
    if (sibling) return sibling;
  }
  return element.querySelector(VTP_SEL);
}

function buildLinks(element, document) {
  const vtp = findVtpLinks(element);
  let links = DEFAULT_LINKS;
  if (vtp) {
    const found = [...vtp.querySelectorAll('a[href]')]
      .map((a) => ({ text: cleanText(a.textContent), href: absolutize(a.getAttribute('href')) }))
      .filter((l) => l.text && l.href);
    if (found.length) links = found;
    vtp.remove();
  }
  const paras = links.map((l) => {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.setAttribute('href', l.href);
    a.textContent = l.text;
    p.appendChild(a);
    return p;
  });
  return ['', hinted(document, 'buttons', paras)];
}

export default function parse(element, { document }) {
  let groups = [...element.querySelectorAll(SECTION_SEL)]
    .filter((s, i, all) => !all.some((o) => o !== s && o.contains(s)));
  if (!groups.length) groups = [...element.querySelectorAll('fieldset')];

  const cells = [];
  groups.forEach((group) => {
    const row = buildGroup(group, document);
    if (row) cells.push(row);
  });
  cells.push(buildLinks(element, document));

  const block = WebImporter.Blocks.createBlock(document, { name: 'model-filter', cells });
  element.replaceWith(block);
}
