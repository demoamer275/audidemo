/* eslint-disable */
/* global WebImporter */

/**
 * Audi section transformer.
 *
 * beforeTransform: while the parser target elements still exist, walk the template
 * sections in reverse and insert an <hr> before every non-first section. Styled sections
 * get a temporary marker (data-excat-section-id) on their <hr>; a styled first section
 * gets a temporary marked <hr> so it can be located after parsing.
 *
 * afterTransform: walk sections in reverse again and append a Section Metadata block
 * (style) at the end of each styled section (after the surviving section element, or,
 * if a parser replaced it, right before the next section break following the marker).
 * Markers are removed; the first section's temporary <hr> is removed entirely.
 */

const MARKER_ATTR = 'data-excat-section-id';

function findSectionElement(root, section) {
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (e) {
      // unsupported selector in this DOM implementation; try next
    }
  }
  return null;
}

function isSectionBreak(node) {
  return node && node.nodeType === 1 && node.tagName === 'HR';
}

export default function transform(hookName, element, payload) {
  const document = (payload && payload.document) || element.ownerDocument;
  const template = payload && payload.template;
  const sections = (template && template.sections) || [];
  if (sections.length < 2) return;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const el = findSectionElement(element, section);
      if (!el || !el.parentNode) continue;
      if (i === 0 && !section.style) continue;
      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(MARKER_ATTR, section.id);
      el.parentNode.insertBefore(hr, el);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const marker = element.querySelector(`hr[${MARKER_ATTR}="${section.id}"]`);

      if (section.style) {
        const meta = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });

        const el = findSectionElement(element, section);
        if (el && el.parentNode) {
          el.after(meta);
        } else if (marker && marker.parentNode) {
          // section element was replaced by a parser: place metadata at the end of the
          // section, i.e. before the next section break (or at the end of the container)
          let node = marker.nextSibling;
          while (node && !isSectionBreak(node)) node = node.nextSibling;
          if (node) node.before(meta);
          else marker.parentNode.append(meta);
        }
      }

      if (marker) {
        if (i === 0) marker.remove();
        else marker.removeAttribute(MARKER_ATTR);
      }
    }
  }
}
