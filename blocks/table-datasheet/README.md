# table-datasheet

Custom **table** block. Purpose: Two-column technical data table: one row per motorization with bold name, WLTP consumption text and a PDF data-sheet Download link, or a label/value spec table.

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: one row per table row, two cells: label (richtext) and value (richtext). Layout A (summary): header option on, first row '' | 'Data sheet', then per motorization: <strong>name</strong> + consumption paragraph | 'Download' link to the PDF. Layout B (single motorization): no header option, rows spec label | value. The header row is set only by the 'header' option, never inferred from the content..

## Supported variations

| Variation | Option class |
| --- | --- |
| Header row | `header` |

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- `classes` select for options: Header row.
- A separate `-item` model defines one repeated item.
