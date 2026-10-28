#!/usr/bin/env bash
# Downloads the 17 new images of the home page (/language-masters/de) straight from
# Audi's DAM onto your machine, using the file names the migrated page expects
# (see audidemo-home-assets.csv). The model slider's car images are not included:
# they reuse the existing files in /content/dam/audidemo/cards.
#
# Usage (macOS / Linux, in the folder where you saved this script and the CSV):
#   bash download-home-assets.sh
# Result: an ./audidemo folder. In AEM Assets, open the audidemo folder and upload the
# files from it, so they end up directly in /content/dam/audidemo.
set -euo pipefail
CSV="${1:-audidemo-home-assets.csv}"
mkdir -p audidemo
tail -n +2 "$CSV" | tr -d '\r' | while IFS=, read -r file aem_path type size_kb pages url; do
  if [ -s "audidemo/$file" ]; then echo "= $file"; continue; fi
  curl -fsSL -o "audidemo/$file" "$url" && echo "+ $file" || echo "x $file (failed: $url)"
done
echo "Done: $(ls audidemo | wc -l | tr -d ' ') of 17 files in ./audidemo"
