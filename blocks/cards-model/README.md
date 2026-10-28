# cards-model

Custom **cards** block. Purpose: Modell-Kacheln: Badges, Fahrzeugbild, Modellname, Preis, Konfigurieren (primär), Entdecken (sekundär), Börsen-Links, Verbrauchsangaben.

## Authoring (Document Authoring)

Model: `collection`

Repeating rows — one row per item. Each item: cell 1: image (+ alt); cell 2: richtext ul badges, h2 name, price p with <sup>, **Konfigurieren** link, *Entdecken* link, plain stock links; cell 3: consumption richtext. Every part optional..

## Supported variations

No variations.

## Universal Editor fields

- Content fields derived from the block's decorate contract.
- A separate `-item` model defines one repeated item.
