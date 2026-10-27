/* eslint-disable */
/* global WebImporter */

import cardsTeaserParser from './parsers/cards-teaser.js';
import columnsMediaTextParser from './parsers/columns-media-text.js';
import cardsImageOverlayParser from './parsers/cards-image-overlay.js';
import audiCleanupTransformer from './transformers/audi-cleanup.js';
import audiSectionsTransformer from './transformers/audi-sections.js';
import audiDamAssetsTransformer from './transformers/audi-dam-assets.js';

const PAGE_TEMPLATE = {
  "name": "elektromobilitaet",
  "urls": [
    "https://www.audi.de/de/elektromobilitaet/"
  ],
  "representativeUrl": "https://www.audi.de/de/elektromobilitaet/",
  "description": "Audi E-Mobility landing page: centered intro heading, editorial teaser grid, media-text consultation teaser, tool tiles and footnotes",
  "urlPattern": "/de/*",
  "blocks": [
    {
      "name": "cards-teaser",
      "instances": [
        "feature-app:has([class*='EditorialTeaserContainer'])",
        "[class*='EditorialTeaserContainer']"
      ]
    },
    {
      "name": "columns-media-text",
      "instances": [
        "[class*='BasicTeaser__StyledContainer']"
      ]
    },
    {
      "name": "cards-image-overlay",
      "instances": [
        "feature-app:has([class*='StyledContentTileContainer'])",
        "[class*='styles__Container']:has(> [class*='StyledContentTileContainer'])"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Intro / Seitenüberschrift",
      "selector": [
        "feature-app[id=\"676fd0de-2275-40ef-8a91-60515ad4a12d-1\"]",
        "feature-app:has([class*='style__Wrapper'] h2)"
      ],
      "style": "centered",
      "blocks": [],
      "defaultContent": [
        "feature-app[id=\"676fd0de-2275-40ef-8a91-60515ad4a12d-1\"] h2"
      ]
    },
    {
      "id": "section-2",
      "name": "Themen-Teaser",
      "selector": [
        "feature-app:has([class*='EditorialTeaserContainer'])"
      ],
      "style": null,
      "blocks": [
        "cards-teaser"
      ],
      "defaultContent": []
    },
    {
      "id": "section-3",
      "name": "Elektromobilitätsberatung",
      "selector": [
        "feature-app:has([class*='BasicTeaser__StyledContainer'])"
      ],
      "style": null,
      "blocks": [
        "columns-media-text"
      ],
      "defaultContent": []
    },
    {
      "id": "section-4",
      "name": "Testen Sie es selbst",
      "selector": [
        "feature-app[id=\"e7de798a-209d-4527-bcca-b57f07f02436-1\"]",
        "feature-app:has([class*='StyledContentTileContainer'])"
      ],
      "style": null,
      "blocks": [
        "cards-image-overlay"
      ],
      "defaultContent": [
        "feature-app[id=\"e7de798a-209d-4527-bcca-b57f07f02436-1\"] h2"
      ]
    },
    {
      "id": "section-5",
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
  ]
};

const parsers = {
  'cards-teaser': cardsTeaserParser,
  'columns-media-text': columnsMediaTextParser,
  'cards-image-overlay': cardsImageOverlayParser,
};

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
    // Audi DAM images/videos -> project DAM folder (must run after adjustImageUrls)
    try { audiDamAssetsTransformer('afterTransform', main, { ...payload, template: PAGE_TEMPLATE }); }
    catch (e) { console.error('DAM asset transformer failed:', e); }

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

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
