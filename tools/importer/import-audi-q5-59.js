/* eslint-disable */
/* global WebImporter */

import cardsModelParser from './parsers/cards-model.js';
import carouselCardsParser from './parsers/carousel-cards.js';
import cardsListParser from './parsers/cards-list.js';
import columnsPanelsParser from './parsers/columns-panels.js';
import audicomCleanupTransformer from './transformers/audicom-cleanup.js';
import audiSectionsTransformer from './transformers/audi-sections.js';
import audiDamAssetsTransformer from './transformers/audi-dam-assets.js';
import audicomPageLinksTransformer from './transformers/audicom-page-links.js';

const PAGE_TEMPLATE = {
  "name": "audi-q5-59",
  "urls": [
    "https://www.audi.com/en/audi-q5-59"
  ],
  "representativeUrl": "https://www.audi.com/en/audi-q5-59",
  "description": "audi.com model page (EN, dark): H1 intro, model line-up tiles, external teaser panel, media-release slider, related article and media-set lists, registration panel, media contacts",
  "blocks": [
    {
      "name": "cards-model",
      "instances": [
        ".page-item--cars-overview .cars-overview-list"
      ]
    },
    {
      "name": "carousel-cards",
      "instances": [
        ".page-list.-teaser > .page-list--items"
      ]
    },
    {
      "name": "cards-list",
      "instances": [
        ".page-list.-detailed > .page-list--items"
      ]
    },
    {
      "name": "columns-panels",
      "instances": [
        ".page-item--contacts .media-contacts"
      ]
    }
  ],
  "urlPattern": "/en/*",
  "sections": [
    {
      "id": "section-1",
      "name": "Intro (H1 + lead paragraph)",
      "selector": [
        ".main-content > .page-row:has(.page-item--headline)"
      ],
      "style": "centered",
      "blocks": [],
      "defaultContent": [
        ".page-item--headline h1",
        ".page-item--intro"
      ]
    },
    {
      "id": "section-2",
      "name": "Model line-up (6 car tiles)",
      "selector": [
        ".main-content > .page-row:has(.full-width-section.is-gray)"
      ],
      "style": "grey",
      "blocks": [
        "cards-model"
      ],
      "defaultContent": []
    },
    {
      "id": "section-3",
      "name": "Audi models worldwide teaser",
      "selector": [
        ".main-content > .page-row:has(.full-width-section.is-card)"
      ],
      "style": "grey-panel",
      "blocks": [],
      "defaultContent": [
        ".page-item--external-page"
      ]
    },
    {
      "id": "section-4",
      "name": "Media releases carousel",
      "selector": [
        ".main-content > .page-row:has(.page-list.-teaser)"
      ],
      "style": null,
      "blocks": [
        "carousel-cards"
      ],
      "defaultContent": [
        ".page-list.-teaser > .page-list--title"
      ]
    },
    {
      "id": "section-5",
      "name": "You might also be interested in",
      "selector": [
        ".main-content > .page-row:has(.page-list.-detailed)"
      ],
      "style": null,
      "blocks": [
        "cards-list"
      ],
      "defaultContent": [
        ".page-list.-detailed > .page-list--title"
      ]
    },
    {
      "id": "section-6",
      "name": "Media set",
      "selector": [
        ".main-content > .page-row:has(.page-list.-detailed) ~ .page-row:has(.page-list.-detailed)"
      ],
      "style": null,
      "blocks": [
        "cards-list"
      ],
      "defaultContent": [
        ".page-list.-detailed > .page-list--title"
      ]
    },
    {
      "id": "section-7",
      "name": "Newsletter / accreditation registration",
      "selector": [
        ".bottom-content > .page-row:has(.page-item--registration)"
      ],
      "style": "grey-panel",
      "blocks": [],
      "defaultContent": [
        ".page-item--registration"
      ]
    },
    {
      "id": "section-8",
      "name": "Media contacts / customer service",
      "selector": [
        ".bottom-content > .page-row:has(.page-item--contacts)"
      ],
      "style": null,
      "blocks": [
        "columns-panels"
      ],
      "defaultContent": []
    }
  ]
};

// images/videos of this page go to /content/dam/audidemo/q5 (user request)
const DAM_FOLDER = 'q5';

const parsers = {
  'cards-model': cardsModelParser,
  'carousel-cards': carouselCardsParser,
  'cards-list': cardsListParser,
  'columns-panels': columnsPanelsParser,
};

// audi.com markup: audicom-cleanup replaces audi-cleanup (which rewrites links for audi.de)
const transformers = [audicomCleanupTransformer, audiSectionsTransformer, audicomPageLinksTransformer];

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

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    // images/videos -> project DAM folder (must run after adjustImageUrls)
    try {
      audiDamAssetsTransformer('afterTransform', main, {
        ...payload, template: PAGE_TEMPLATE, damFolder: DAM_FOLDER,
      });
    } catch (e) { console.error('DAM asset transformer failed:', e); }

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    // audi.com pages live under the AEM master root: /content/audidemo/master/<source path>
    const path = WebImporter.FileUtils.sanitizePath(`/master${rawPath === '' ? '/index' : rawPath}`);

    const cleanupReport = document.excatCleanupReport || {};

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: [...new Set(pageBlocks.map((b) => b.name))],
        audicomChromeRemoved: cleanupReport.audicomChromeRemoved || 0,
        audicomPageLinks: cleanupReport.audicomPageLinks || 0,
        damAssets: JSON.stringify(cleanupReport.damAssets || {}),
      },
    }];
  },
};
