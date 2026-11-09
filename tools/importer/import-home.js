/* eslint-disable */
/* global WebImporter */

import heroVideoParser from './parsers/hero-video.js';
import carlineSliderParser from './parsers/carline-slider.js';
import carouselCardsParser from './parsers/carousel-cards.js';
import cardsImageOverlayParser from './parsers/cards-image-overlay.js';
import cardsTeaserParser from './parsers/cards-teaser.js';
import audiCleanupTransformer from './transformers/audi-cleanup.js';
import audiSectionsTransformer from './transformers/audi-sections.js';
import audiDamAssetsTransformer from './transformers/audi-dam-assets.js';

const PAGE_TEMPLATE = {
  "name": "home",
  "urls": [
    "https://www.audi.de/de/"
  ],
  "representativeUrl": "https://www.audi.de/de/",
  "description": "Audi Germany home page (/de/): stages, model line slider, offers carousel, content tiles, stock teaser, topic teasers",
  "blocks": [
    {
      "name": "hero-video",
      "instances": [
        "[class*='StageContainer__StageContainerWrap']"
      ]
    },
    {
      "name": "carline-slider",
      "instances": [
        "feature-app[id^='a23eb832']"
      ]
    },
    {
      "name": "carousel-cards",
      "instances": [
        ".faCarousel"
      ]
    },
    {
      "name": "cards-image-overlay",
      "instances": [
        "feature-app:has([class*='StyledContentTileContainer'])",
        "[class*='styles__Container']:has(> [class*='StyledContentTileContainer'])"
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
  "sections": [
    {
      "id": "section-1",
      "name": "Stage Leasingangebote",
      "selector": [
        "feature-app[id='5d9c657e-4f06-4861-829e-752bfd4d9b7f-1']"
      ],
      "style": null,
      "blocks": [
        "hero-video"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2",
      "name": "Modellreihen (Carline Slider)",
      "selector": [
        "feature-app[id^='a23eb832']"
      ],
      "style": null,
      "blocks": [
        "carline-slider"
      ],
      "defaultContent": [
        "[class*='ExploreCompareButtons__ButtonWrapper'] a"
      ]
    },
    {
      "id": "section-3",
      "name": "Neueste Modelle und Angebote",
      "selector": [
        "feature-app[id^='3f189a36']"
      ],
      "style": null,
      "blocks": [
        "carousel-cards"
      ],
      "defaultContent": []
    },
    {
      "id": "section-4",
      "name": "Jetzt kaufen oder leasen",
      "selector": [
        "feature-app[data-heading-for='27fb1208']",
        "feature-app[id^='27fb1208']"
      ],
      "style": "centered",
      "blocks": [
        "cards-image-overlay"
      ],
      "defaultContent": [
        "feature-app[data-heading-for='27fb1208'] h2"
      ]
    },
    {
      "id": "section-5",
      "name": "Stage A6 allroad",
      "selector": [
        "feature-app[id='5d9c657e-4f06-4861-829e-752bfd4d9b7f-2']"
      ],
      "style": null,
      "blocks": [
        "hero-video"
      ],
      "defaultContent": []
    },
    {
      "id": "section-6",
      "name": "Direkt verfügbare Fahrzeuge (Vehicle Stock Teaser)",
      "selector": [
        "feature-app[id^='fa9786fe']"
      ],
      "style": "split",
      "blocks": [],
      "defaultContent": [
        "feature-app[id^='fa9786fe'] img",
        "feature-app[id^='fa9786fe'] h2",
        "feature-app[id^='fa9786fe'] a"
      ]
    },
    {
      "id": "section-7",
      "name": "Aktuelle Themen",
      "selector": [
        "feature-app[data-heading-for='a68d1551']",
        "feature-app[id^='a68d1551']"
      ],
      "style": "centered",
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
  'carline-slider': carlineSliderParser,
  'carousel-cards': carouselCardsParser,
  'cards-image-overlay': cardsImageOverlayParser,
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
    // pages live under the AEM language root: /content/audidemo/language-masters/<source path>
    const path = WebImporter.FileUtils.sanitizePath(`/language-masters${rawPath === '' ? '/index' : rawPath}`);

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
