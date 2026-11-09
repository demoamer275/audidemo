/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-panels (audi.com media contacts + customer service panel).
 *
 * Source: .page-item--contacts .media-contacts
 *   .media-contacts--contacts .media-contacts-list        -> column 1
 *     h3.media-contacts-list--title                       -> <h3>
 *     .media-contact (one or more)
 *       .media-contact--image img                         -> portrait <p><img></p>
 *       .media-contact--name                              -> name (link when it has an href)
 *       .media-contact--position                          -> position paragraph
 *       .media-contact--mobile / --phone a[href^="tel:"]  -> tel: link paragraph
 *       .media-contact--email a[href^="mailto:"]          -> mailto: link paragraph
 *     a.media-contacts-list--button                       -> "All media contacts" link
 *   .media-contacts--not-a-journalist .not-a-journalist-banner -> column 2
 *     h3, p.not-a-journalist-banner--paragraph, action button link ("Customer Service")
 *
 * Output: one row, two cells. Block names starting with "columns" are converted by md2jcr
 * as a columns block (default content per cell), so no xwalk field hints are added here.
 * Image src is kept as resolved by audicom-cleanup (no data-dam-name).
 */

const AUDICOM_ORIGIN = 'https://www.audi.com';

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function absolutize(href) {
  const h = (href || '').trim();
  if (!h || h.startsWith('#')) return '';
  if (/^(tel|mailto):/i.test(h)) return h;
  try { return new URL(h, AUDICOM_ORIGIN).href; } catch (e) { return h; }
}

function heading(document, el, tag = 'h3') {
  const text = cleanText(el ? el.textContent : '');
  if (!text) return null;
  const h = document.createElement(tag);
  h.textContent = text;
  return h;
}

function textPara(document, text) {
  const t = cleanText(text);
  if (!t) return null;
  const p = document.createElement('p');
  p.textContent = t;
  return p;
}

function linkPara(document, link) {
  if (!link) return null;
  const href = absolutize(link.getAttribute('href'));
  const text = cleanText(link.textContent);
  if (!text) return null;
  if (!href) return textPara(document, text);
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.setAttribute('href', href);
  const title = cleanText(link.getAttribute('title'));
  if (title) a.setAttribute('title', title);
  a.textContent = text;
  p.appendChild(a);
  return p;
}

function contactsColumn(root, document) {
  const nodes = [];
  const list = root.querySelector('.media-contacts-list') || root.querySelector('.media-contacts--contacts') || root;
  nodes.push(heading(document, list.querySelector('.media-contacts-list--title, h3')));

  list.querySelectorAll('.media-contact').forEach((contact) => {
    const srcImg = contact.querySelector('.media-contact--image img') || contact.querySelector('img');
    const src = srcImg ? (srcImg.getAttribute('src') || '').trim() : '';
    // the import engine merges the adjacent image and name links (same href) into the
    // image link, so the name may only survive as that link's text
    const imageLink = contact.querySelector('a.media-contact--image');
    const nameEl = contact.querySelector('.media-contact--name')
      || (imageLink && cleanText(imageLink.textContent) ? imageLink : null);
    const name = cleanText(nameEl ? nameEl.textContent : '');
    if (src) {
      const p = document.createElement('p');
      const img = document.createElement('img');
      img.setAttribute('src', src);
      img.setAttribute('alt', cleanText(srcImg.getAttribute('alt')) || name);
      p.appendChild(img);
      nodes.push(p);
    }
    if (nameEl) {
      nodes.push(nameEl.matches('a[href]') ? linkPara(document, nameEl) : textPara(document, name));
    }
    const position = contact.querySelector('.media-contact--position');
    if (position) nodes.push(textPara(document, position.textContent));
    contact.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]').forEach((a) => {
      nodes.push(linkPara(document, a));
    });
  });

  nodes.push(linkPara(document, list.querySelector('a.media-contacts-list--button')));
  return nodes.filter(Boolean);
}

function serviceColumn(root, document) {
  const banner = root.querySelector('.not-a-journalist-banner') || root.querySelector('.media-contacts--not-a-journalist');
  if (!banner) return [];
  const nodes = [];
  nodes.push(heading(document, banner.querySelector('.not-a-journalist-banner--title, h3')));
  let paras = [...banner.querySelectorAll('.not-a-journalist-banner--paragraph')];
  if (!paras.length) paras = [...banner.querySelectorAll('p')];
  paras.forEach((p) => nodes.push(textPara(document, p.textContent)));
  banner.querySelectorAll('.not-a-journalist-banner--action-button a[href]').forEach((a) => {
    nodes.push(linkPara(document, a));
  });
  return nodes.filter(Boolean);
}

export default function parse(element, { document }) {
  const col1 = contactsColumn(element, document);
  const col2 = serviceColumn(element, document);
  const cells = [[col1.length ? col1 : '', col2.length ? col2 : '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-panels', cells });
  element.replaceWith(block);
}
