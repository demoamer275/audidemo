# cards-image-overlay

Custom **cards** block. Purpose: Vollflächige, klickbare Bildkacheln mit Verlauf und zentriertem Titel, Verbrauchsangaben unter der Kachel.

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: cell 1: image (with alt); cell 2: heading + link (the whole tile becomes the link); cell 3: consumption/emission disclaimer (rich text).

## Supported variations

No variations.

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- A separate `-item` model defines one repeated item.
