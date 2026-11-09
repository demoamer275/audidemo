/* eslint-disable */
/* global WebImporter */

import carouselCardsParser from './parsers/carousel-cards.js';
import cardsListParser from './parsers/cards-list.js';
import cardsGalleryParser from './parsers/cards-gallery.js';
import tableDatasheetParser from './parsers/table-datasheet.js';
import columnsPanelsParser from './parsers/columns-panels.js';
import audicomCleanupTransformer from './transformers/audicom-cleanup.js';
import audiSectionsTransformer from './transformers/audi-sections.js';
import audiDamAssetsTransformer from './transformers/audi-dam-assets.js';
import audicomPageLinksTransformer from './transformers/audicom-page-links.js';

const PAGE_TEMPLATE = {
  "name": "audicom-model",
  "urls": [
    "https://www.audi.com/en/audi-q5-suv-12871",
    "https://www.audi.com/en/audi-q5-sportback-13207",
    "https://www.audi.com/en/audi-q5-suv-e-hybrid-quattro-16677",
    "https://www.audi.com/en/audi-q5-sportback-e-hybrid-quattro-16678",
    "https://www.audi.com/en/audi-sq5-suv-11326",
    "https://www.audi.com/en/audi-sq5-sportback-13378"
  ],
  "representativeUrl": "https://www.audi.com/en/audi-q5-suv-12871",
  "description": "audi.com model detail page (EN): headline, key visual, intro, media releases, image and video galleries, technical details, registration and media contacts",
  "blocks": [
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
      "name": "cards-gallery",
      "instances": [
        ".page-item--gallery .gallery-panel--content"
      ]
    },
    {
      "name": "table-datasheet",
      "instances": [
        ".page-item--technical-details .motorization-summary",
        ".page-item--technical-details .motorization--table"
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
      "name": "Intro (H1, key visual, lead text, Media contacts button)",
      "selector": [
        ".main-content > .page-row:has(.page-item--headline .-h1)",
        ".main-content > .page-row:has(.page-item--headline)"
      ],
      "style": "centered",
      "blocks": [],
      "defaultContent": [
        ".page-item--headline h1",
        ".page-item--image",
        ".page-item--intro",
        ".page-item--markup .action-bar a"
      ]
    },
    {
      "id": "section-2",
      "name": "Media releases (slider, or image-left lists on e-hybrid pages)",
      "selector": [
        ".main-content > .page-row:has(.page-item--page-list)"
      ],
      "style": null,
      "blocks": [
        "carousel-cards",
        "cards-list"
      ],
      "defaultContent": [
        ".page-list > .page-list--title"
      ]
    },
    {
      "id": "section-3",
      "name": "Images gallery",
      "selector": [
        ".main-content > .page-row:has(.page-item--headline):has(+ .page-row .page-item--gallery)",
        ".main-content > .page-row:has(.page-item--gallery)"
      ],
      "style": "centered",
      "blocks": [
        "cards-gallery"
      ],
      "defaultContent": [
        ".page-item--headline h2",
        ".gallery-panel--meta",
        "a.gallery-panel--button"
      ]
    },
    {
      "id": "section-4",
      "name": "Videos gallery",
      "selector": [
        ".main-content > .page-row:has(.page-item--headline):has(+ .page-row .page-item--gallery) ~ .page-row:has(.page-item--headline):has(+ .page-row .page-item--gallery)",
        ".main-content > .page-row:has(.page-item--gallery) ~ .page-row:has(.page-item--gallery)"
      ],
      "style": "centered",
      "blocks": [
        "cards-gallery"
      ],
      "defaultContent": [
        ".page-item--headline h2",
        ".gallery-panel--meta"
      ]
    },
    {
      "id": "section-5",
      "name": "Technical details (grey full-width band)",
      "selector": [
        ".main-content > .page-row:has(.full-width-section.is-gray .page-item--technical-details)"
      ],
      "style": "grey",
      "blocks": [
        "table-datasheet"
      ],
      "defaultContent": [
        ".technical-details--heading",
        ".motorization--heading",
        ".motorization--downloads",
        ".technical-details--country-prices a"
      ]
    },
    {
      "id": "section-5-plain",
      "name": "Technical details without grey band (e-hybrid pages; only one of section-5 / section-5-plain matches a page)",
      "selector": [
        ".main-content > .page-row:has(> .container .page-item--technical-details)"
      ],
      "style": null,
      "blocks": [
        "table-datasheet"
      ],
      "defaultContent": [
        ".technical-details--heading",
        ".motorization--heading",
        ".motorization--downloads",
        ".technical-details--country-prices a"
      ]
    },
    {
      "id": "section-6",
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
      "id": "section-7",
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

// images (2880px) and video posters of the Q5 model pages go to /content/dam/audidemo/q5,
// shared with the Q5 overview (user decisions: audi-com-model-pages-decisions)
const DAM_FOLDER = 'q5';

const parsers = {
  'carousel-cards': carouselCardsParser,
  'cards-list': cardsListParser,
  'cards-gallery': cardsGalleryParser,
  'table-datasheet': tableDatasheetParser,
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
    // model pages are sub-pages of the Q5 overview: /master/en/audi-q5-59/<source slug>
    const localPath = audicomPageLinksTransformer.localPagePath(params.originalURL);
    const path = WebImporter.FileUtils.sanitizePath(localPath || `/master${rawPath === '' ? '/index' : rawPath}`);

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
