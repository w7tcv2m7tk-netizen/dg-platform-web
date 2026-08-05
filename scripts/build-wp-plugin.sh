#!/usr/bin/env bash
# Build dg-platform WordPress plugin zip for upload to roerealty.com.au etc.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PLUGIN_DIR="$ROOT/dg-platform"
OUT="$ROOT/dg-platform-build-latest.zip"

if [[ ! -f "$PLUGIN_DIR/dg-platform.php" ]]; then
  echo "Expected plugin at $PLUGIN_DIR/dg-platform.php"
  exit 1
fi

rm -f "$OUT"
cd "$PLUGIN_DIR"
zip -r "$OUT" . \
  -x "*.DS_Store" \
  -x "*/.git/*" \
  -x "*/node_modules/*" \
  -x "*/marketing/pages/*.py" \
  > /dev/null

echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
echo ""
echo "Deploy:"
echo "  1. WordPress → Plugins → Add New → Upload Plugin"
echo "  2. Choose $OUT"
echo "  3. Activate DG Platform on roerealty.com.au"
echo "  4. Verify GET {site}/wp-json/digitalgate/v1/site/health"
