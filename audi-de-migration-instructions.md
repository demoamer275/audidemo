# Migration Instructions: www.audi.de to AEM Crosswalk

## Overview

Migrate content from `https://www.audi.de/` to **AEM Crosswalk** (AEM Edge Delivery Services authored in AEM as a Cloud Service with the Universal Editor). The migration starts with the E-Mobility section and expands from there.

- **Source site:** https://www.audi.de/
- **Starting point:** https://www.audi.de/de/elektromobilitaet/
- **Language / locale:** German (`de`)
- **Target:** AEM Crosswalk. Authors edit pages in the Universal Editor. Content is stored in the AEM author JCR, assets in the AEM DAM, and pages are delivered through Edge Delivery Services.

## Scope

### Starting URL

Begin at `https://www.audi.de/de/elektromobilitaet/`.


## Special Instructions

### 1. Skip configurator pages

Do not migrate any configurator pages. This covers the page itself and anything beneath it.

- Skip any URL whose path contains `konfigurator`, `configurator`, or `configure` (case-insensitive).
- Skip any URL on a configurator subdomain or application host (for example `configurator.*` or `konfigurator.*`).
- Skip pages that embed the Audi car configurator as their main content.
- Do not rewrite links that point to configurator pages. Leave them as absolute links to the original `https://www.audi.de/...` URL so they keep working after migration.
- Do not count skipped pages as migration failures. List them in the migration report as "Skipped: configurator".

### 2. Exclude the live chat widget

Do not migrate any `<div>` element with the class `acquire-livechat-widget`.

- Remove the element and all of its children from the page before content conversion.
- Do not create a component, block, placeholder, or fragment for it.
- Apply the rule on every page, regardless of where the element appears (body, footer, or injected overlay).
- Match on the class name as a whole token. An element matches if `acquire-livechat-widget` appears anywhere in its `class` attribute.

## Crosswalk Requirements

### Authoring model

- Every migrated block must be authorable in the Universal Editor. Each block needs a matching entry in the project's component definition, component model, and component filter files (`component-definition.json`, `component-models.json`, `component-filters.json`).
- Reuse existing blocks and models in the target project first. If a source pattern has no match, create a new block with its own Universal Editor model, and list it in the report as "New block".
- Design block fields so authors can edit all visible content (text, images, links, and options) in the editor. Do not hard-code authorable content in block JavaScript or CSS.
- Use the block's field types as the project defines them (for example text, rich text, reference for images, and aem-content for links). Follow the project's naming conventions.
- Allow only the intended blocks in each section by updating the section filter.

### Content storage

- Create migrated pages as AEM pages in the author instance under the site's content path (for example `/content/audidemo/language-masters/de/elektromobilitaet/...`). Confirm the exact root path with the project owner.
- Mirror the source URL structure in the AEM page hierarchy, so migrated paths match source paths.
- Import images and other binary assets into the AEM DAM, in a folder structure that mirrors the page structure. Reference them from the page. Do not hotlink to `audi.de`.
- Store page metadata (title, description, canonical URL, Open Graph image, language) in the page properties and the metadata block, as the project defines.
- Put shared content such as header and footer in the project's navigation and footer fragments. Do not repeat them on each page.
- Use the project's section model for section styles and layout options. Do not create ad hoc CSS classes in content.

### Publishing

- Migrated pages are created on author and previewed through Edge Delivery Services. Do not publish automatically. Leave publishing to the content team after review.
- Verify each page renders in the Universal Editor and in the Edge Delivery preview.

## Content Handling

- Migrate the visible, authorable content: headings, body copy, images, videos, CTAs, cards, teasers, and accordions.
- Map repeating patterns (hero, teaser, card grid, media text, accordion, tabs, carousel, table) to the matching blocks. Use default content (headings, paragraphs, lists, images) for plain content.
- Preserve the heading hierarchy (one H1 per page).
- Keep image alt text.
- Preserve internal link targets. Convert links between migrated pages to relative paths. Keep links to non-migrated pages (such as configurator pages) as absolute links to the source.
- Keep all text in German. Do not translate.
- Omit cookie banners, consent dialogs, tracking scripts, and other third-party widgets that are not authored content.

## Output

- One AEM page per source URL, preserving the source path structure.
- A migration report that lists:
  - pages migrated, with the source URL and the AEM path
  - pages skipped (configurator)
  - pages that failed, with the reason
  - new blocks created, and blocks reused
  - assets imported into the DAM
  - the count of `acquire-livechat-widget` elements removed

## Notes

- The configurator URL patterns above are heuristics. Review the skipped list after the first crawl and add any further configurator URL patterns that turn up.
- Some Audi pages load content with JavaScript. Render the page before extraction so dynamically loaded content is captured.
- Confirm the AEM content root, DAM root, and the existing block library before the first run.
