/* eslint-disable */
/* global WebImporter */

import modelFilterParser from './parsers/model-filter.js';
import modelFilterFragmentParser from './parsers/model-filter-fragment.js';
import cardsCarlineParser, { carlinePageName } from './parsers/cards-carline.js';
import cardsModelParser from './parsers/cards-model.js';
import audiCleanupTransformer from './transformers/audi-cleanup.js';
import audiSectionsTransformer from './transformers/audi-sections.js';
import audiDamAssetsTransformer from './transformers/audi-dam-assets.js';

const PAGE_TEMPLATE = {
  "name": "neuwagen-finder",
  "urls": [
    "https://www.audi.de/de/neuwagen/",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=a2etron",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=a3",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=a5",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=a6",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=a6etron",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=q3",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=q4",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=q5",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=q6",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=q7",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=q8",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=q9",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=etrongt",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=nuvolari",
    "https://www.audi.de/de/neuwagen/?bycarlinegroup=f1"
  ],
  "representativeUrl": "https://www.audi.de/de/neuwagen/",
  "description": "Audi model finder: overview of model lines and one filtered page per model line (bycarlinegroup); shared static filter rail fragment",
  "urlPattern": "/de/neuwagen/",
  "blocks": [
    {
      "name": "fragment",
      "instances": [
        "[class*='FeatureApp__FilterWrapperDesktop']"
      ]
    },
    {
      "name": "cards-carline",
      "instances": [
        "[class*='Results__GroupCardGrid']"
      ]
    },
    {
      "name": "cards-model",
      "instances": [
        "[class*='CardList__CardListWrapper']"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Modellfinder (Filterleiste + Ergebnisse)",
      "selector": [
        "feature-app[base-url*='fa-model-selector']",
        "#main-content"
      ],
      "style": "filter-rail",
      "blocks": [
        "fragment",
        "cards-carline",
        "cards-model"
      ],
      "defaultContent": [
        "[class*='ResultCountHeader__CountWrapper']",
        "[class*='Disclaimer__StyledDisclaimer']"
      ]
    },
    {
      "id": "section-2",
      "name": "Fußnoten",
      "selector": [
        ".audi-footnote-engine",
        "feature-app:has(.audi-footnote-engine)"
      ],
      "style": "dark",
      "blocks": [],
      "defaultContent": [
        ".audi-footnote-engine ul"
      ]
    }
  ],
  "carlineGroups": {
    "Audi A2 e-tron": "a2etron",
    "Audi A3": "a3",
    "Audi A5": "a5",
    "Audi A6": "a6",
    "Audi A6 e-tron": "a6etron",
    "Audi Q3": "q3",
    "Audi Q4 e-tron": "q4",
    "Audi Q5": "q5",
    "Audi Q6 e-tron": "q6",
    "Audi Q7": "q7",
    "Audi Q8": "q8",
    "Audi Q9": "q9",
    "Audi e-tron GT": "etrongt",
    "Audi Nuvolari": "nuvolari",
    "Audi F1": "f1"
  }
};

// The rail is a shared fragment: on normal pages it becomes a Fragment block reference.
const parsers = {
  fragment: modelFilterFragmentParser,
  'cards-carline': cardsCarlineParser,
  'cards-model': cardsModelParser,
};

/**
 * Fragment mode: importing https://www.audi.de/de/neuwagen/?excat-fragment=model-filter
 * (with the overview snapshot) writes ONLY the model-filter block to the shared fragment page.
 */
const FRAGMENT_PARAM = 'excat-fragment';
const FRAGMENT_PATH = '/language-masters/de/neuwagen/fragments/model-filter';
const FINDER_PATH = '/language-masters/de/neuwagen';

const transformers = [audiCleanupTransformer, audiSectionsTransformer];

/**
 * Configurator pages are out of scope (audi-de-migration-instructions.md).
 * They are filtered from the URL list before import; this guard is a safety net.
 */
const CONFIGURATOR_PATH_RE = /(konfigurator|configurator|configure)/i;
const CONFIGURATOR_HOST_RE = /^(configurator|konfigurator)\./i;

function isConfiguratorUrl(href) {
  try {
    const u = new URL(href);
    return CONFIGURATOR_PATH_RE.test(u.pathname) || CONFIGURATOR_HOST_RE.test(u.hostname);
  } catch (e) {
    return false;
  }
}

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    if (isConfiguratorUrl(params.originalURL)) {
      throw new Error(`Skipped: configurator (${params.originalURL})`);
    }

    const source = new URL(params.originalURL);
    const fragmentMode = source.searchParams.get(FRAGMENT_PARAM) === 'model-filter';

    executeTransformers('beforeTransform', main, payload);

    if (fragmentMode) {
      const rail = document.querySelector(PAGE_TEMPLATE.blocks.find((b) => b.name === 'fragment').instances[0]);
      if (!rail) throw new Error('filter rail not found');
      const holder = document.createElement('div');
      rail.replaceWith(holder);
      holder.append(rail);
      modelFilterParser(rail, { document, url, params });
      main.replaceChildren(...holder.childNodes);
      executeTransformers('afterTransform', main, payload);
      return [{
        element: main,
        path: FRAGMENT_PATH,
        report: { title: 'model-filter fragment', template: PAGE_TEMPLATE.name, blocks: ['model-filter'], livechatWidgetsRemoved: 0, damAssets: '{}' },
      }];
    }

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    // links to migrated (AEM) pages must not end with "/" (finder pages): the cleanup emits
    // them as https://www.audi.de/language-masters/...; post-import-dam.mjs restores the root path
    main.querySelectorAll('a[href^="https://www.audi.de/language-masters/"]').forEach((a) => {
      const href = a.getAttribute('href');
      const [path, rest = ''] = href.split(/(?=[?#])/);
      if (path.length > 'https://www.audi.de/'.length && path.endsWith('/')) a.setAttribute('href', path.replace(/\/+$/, '') + rest);
    });

    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    // Audi DAM images/videos -> project DAM folder (must run after adjustImageUrls)
    try { audiDamAssetsTransformer('afterTransform', main, { ...payload, template: PAGE_TEMPLATE }); }
    catch (e) { console.error('DAM asset transformer failed:', e); }

    // overview -> /language-masters/de/neuwagen; ?bycarlinegroup=<v> -> /language-masters/de/neuwagen/<page name of v>
    const group = (source.searchParams.get('bycarlinegroup') || '').replace(/[^a-z0-9-]/gi, '').toLowerCase();
    const path = WebImporter.FileUtils.sanitizePath(group ? `${FINDER_PATH}/${carlinePageName(group)}` : FINDER_PATH);

    const cleanupReport = document.excatCleanupReport || {};
    const livechatWidgetsRemoved = cleanupReport.livechatWidgetsRemoved
      ?? (params && params.livechatWidgetsRemoved) ?? 0;

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: [...new Set(pageBlocks.map((b) => b.name))],
        livechatWidgetsRemoved,
        damAssets: JSON.stringify(cleanupReport.damAssets || {}),
      },
    }];
  },
};
