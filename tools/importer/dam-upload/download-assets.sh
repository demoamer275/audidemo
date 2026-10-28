#!/usr/bin/env bash
# Downloads the 144 audidemo DAM assets straight from Audi's DAM onto your machine,
# using the file names the migrated pages expect (see audidemo-dam-assets.csv).
#
# Usage (macOS / Linux, in the folder where you saved this script and the CSV):
#   bash download-assets.sh
# Result: an ./audidemo folder you can drag into AEM Assets -> audidemo.
set -euo pipefail
CSV="${1:-audidemo-dam-assets.csv}"
mkdir -p audidemo
tail -n +2 "$CSV" | while IFS=, read -r file aem_path type size_kb pages url; do
  if [ -s "audidemo/$file" ]; then echo "= $file"; continue; fi
  mkdir -p "audidemo/$(dirname "$file")"
  curl -fsSL -o "audidemo/$file" "$url" && echo "+ $file" || echo "x $file (failed: $url)"
done
echo "Done: $(ls audidemo | wc -l | tr -d ' ') files in ./audidemo"
