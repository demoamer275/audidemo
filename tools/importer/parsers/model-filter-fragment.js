/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the filter rail on normal model finder pages (template block "fragment").
 *
 * Source: [class*="FeatureApp__FilterWrapperDesktop"] (+ sibling [class*="VtpLinks__VtpLinksWrapper"])
 * The rail is authored once in the shared fragment page (see parsers/model-filter.js);
 * every finder page references it with a Fragment block.
 *
 * Row (model fragment): [field:reference (aem-content) -> link to the fragment page]
 * The reference is emitted ABSOLUTE on purpose: the importer re-absolutizes root-relative
 * hrefs after the table layout (breaking the table); tools/importer/post-import-dam.mjs
 * rewrites https://www.audi.de/language-masters/... back to /language-masters/... .
 */

const FRAGMENT_PATH = '/language-masters/de/neuwagen/fragments/model-filter';
const FRAGMENT_URL = `https://www.audi.de${FRAGMENT_PATH}`;
const VTP_SEL = '[class*="VtpLinks__VtpLinksWrapper"]';

export default function parse(element, { document }) {
  // the rail links are part of the fragment: drop the sibling links wrapper
  const parent = element.parentElement;
  if (parent) {
    [...parent.children]
      .filter((c) => c !== element && c.matches(VTP_SEL))
      .forEach((c) => c.remove());
  }

  const p = document.createElement('p');
  const a = document.createElement('a');
  a.setAttribute('href', FRAGMENT_URL);
  a.textContent = FRAGMENT_PATH;
  p.appendChild(a);

  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(' field:reference '));
  frag.appendChild(p);

  const cells = [[frag]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'fragment', cells });
  element.replaceWith(block);
}
