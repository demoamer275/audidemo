#!/usr/bin/env bash
# Downloads the 61 card images of the model finder pages (Alle Modelle and the
# model-line pages) straight from Audi's media service onto your machine, using the
# file names the migrated pages expect (see audidemo-cards-assets.csv).
#
# Usage (macOS / Linux, in the folder where you saved this script and the CSV):
#   bash download-cards-assets.sh
# Result: a ./cards folder. In AEM Assets, open the audidemo folder and drag the
# whole cards folder in, so the files end up in /content/dam/audidemo/cards.
set -euo pipefail
CSV="${1:-audidemo-cards-assets.csv}"
mkdir -p cards
tail -n +2 "$CSV" | tr -d '\r' | while IFS=, read -r file aem_path type size_kb pages url; do
  if [ -s "cards/$file" ]; then echo "= $file"; continue; fi
  curl -fsSL -o "cards/$file" "$url" && echo "+ $file" || echo "x $file (failed: $url)"
done
echo "Done: $(ls cards | wc -l | tr -d ' ') of 61 files in ./cards"
