/* eslint-disable */
/* global WebImporter */

import heroVideoParser from './parsers/hero-video.js';
import cardsStatsParser from './parsers/cards-stats.js';
import carouselCardsParser from './parsers/carousel-cards.js';
import columnsGalleryParser from './parsers/columns-gallery.js';
import columnsMediaTextParser from './parsers/columns-media-text.js';
import cardsTeaserParser from './parsers/cards-teaser.js';
import audiCleanupTransformer from './transformers/audi-cleanup.js';
import audiSectionsTransformer from './transformers/audi-sections.js';
import audiDamAssetsTransformer from './transformers/audi-dam-assets.js';

const PAGE_TEMPLATE = {
  "name": "neuwagen-model",
  "urls": [
    "https://www.audi.de/de/neuwagen/a3/a3-limousine/",
    "https://www.audi.de/de/neuwagen/a3/a3-allstreet/",
    "https://www.audi.de/de/neuwagen/a3/a3-sportback-e-hybrid/",
    "https://www.audi.de/de/neuwagen/a3/a3-sportback/",
    "https://www.audi.de/de/neuwagen/a2-e-tron/a2-e-tron/",
    "https://www.audi.de/de/neuwagen/q5/q5-suv/",
    "https://www.audi.de/de/neuwagen/q5/q5-suv-e-hybrid/",
    "https://www.audi.de/de/neuwagen/q5/q5-sportback/",
    "https://www.audi.de/de/neuwagen/q5/q5-sportback-e-hybrid/"
  ],
  "representativeUrl": "https://www.audi.de/de/neuwagen/a3/a3-limousine/",
  "description": "Audi car model page (e.g. A3 Limousine)",
  "blocks": [
    {
      "name": "hero-video",
      "instances": [
        "[class*='StageContainer__StageContainerWrap']"
      ]
    },
    {
      "name": "cards-stats",
      "instances": [
        "[class*='EditorialColumns-style__EditorialColumnsContainer']:has([class*='NumbersMode-style'])"
      ]
    },
    {
      "name": "carousel-cards",
      "instances": [
        ".faCarousel"
      ]
    },
    {
      "name": "columns-gallery",
      "instances": [
        "[class*='StyledEditorialMediaContainer']"
      ]
    },
    {
      "name": "columns-media-text",
      "instances": [
        "[class*='BasicTeaser__StyledContainer']"
      ]
    },
    {
      "name": "cards-teaser",
      "instances": [
        "feature-app:has([class*='EditorialTeaserContainer'])",
        "[class*='EditorialTeaserContainer']"
      ]
    }
  ],
  "urlPattern": "/de/neuwagen/*/*/",
  "sections": [
    {
      "id": "section-1",
      "name": "Stage / Hero mit Video",
      "selector": [
        "feature-app[id^='5d9c657e']"
      ],
      "style": null,
      "blocks": [
        "hero-video"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2",
      "name": "Produktbild",
      "selector": [
        "feature-app[id^='737220be']"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        "feature-app[id^='737220be'] img"
      ]
    },
    {
      "id": "section-3",
      "name": "Key Facts",
      "selector": [
        "feature-app[id^='55e1dd15']"
      ],
      "style": null,
      "blocks": [
        "cards-stats"
      ],
      "defaultContent": [
        "feature-app[id^='92c3930b'] a"
      ]
    },
    {
      "id": "section-4",
      "name": "Fakten, die begeistern",
      "selector": [
        "feature-app[data-heading-for='3f189a36']",
        "feature-app[id^='3f189a36']"
      ],
      "style": null,
      "blocks": [
        "carousel-cards"
      ],
      "defaultContent": [
        "feature-app[data-heading-for='3f189a36'] h2",
        "feature-app[data-heading-for='3f189a36'] p",
        "feature-app[id^='92c3930b'] a"
      ]
    },
    {
      "id": "section-5",
      "name": "Design-Galerie",
      "selector": [
        "feature-app[id^='42bb6519']"
      ],
      "style": null,
      "blocks": [
        "columns-gallery"
      ],
      "defaultContent": [
        "feature-app[id^='42bb6519'] img"
      ]
    },
    {
      "id": "section-6",
      "name": "Konfigurator-Teaser",
      "selector": [
        "feature-app[id^='4017639b']"
      ],
      "style": null,
      "blocks": [
        "columns-media-text"
      ],
      "defaultContent": []
    },
    {
      "id": "section-6b",
      "name": "Händlerbestand (Vehicle Stock Teaser)",
      "selector": [
        "feature-app[id^='fa9786fe']"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        "feature-app[id^='fa9786fe'] img",
        "feature-app[id^='fa9786fe'] h2",
        "feature-app[id^='fa9786fe'] a"
      ]
    },
    {
      "id": "section-7",
      "name": "Ähnliche Modelle im Vergleich",
      "selector": [
        "feature-app[data-heading-for='a68d1551']",
        "feature-app[id^='a68d1551']"
      ],
      "style": null,
      "blocks": [
        "cards-teaser"
      ],
      "defaultContent": [
        "feature-app[data-heading-for='a68d1551'] h2"
      ]
    },
    {
      "id": "section-8",
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
  'hero-video': heroVideoParser,
  'cards-stats': cardsStatsParser,
  'carousel-cards': carouselCardsParser,
  'columns-gallery': columnsGalleryParser,
  'columns-media-text': columnsMediaTextParser,
  'cards-teaser': cardsTeaserParser,
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
