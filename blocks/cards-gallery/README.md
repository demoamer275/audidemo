# cards-gallery

Custom **cards** block. Purpose: Media grid of image and video tiles from an audi.com model gallery (images gallery, videos gallery); each tile links to its audi.com detail or video page.

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: one row per gallery item. cell 1: image (+ alt), a photo or the video poster; cell 2: richtext with the category label paragraph (Photos, Illustrations, Sketches, Footage, Animation, Trailer) and a paragraph with the title link to the audi.com detail page (/en/images/detail/...) or video page (/en/videos/video/...). Every part optional..

## Supported variations

No variations.

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- A separate `-item` model defines one repeated item.
