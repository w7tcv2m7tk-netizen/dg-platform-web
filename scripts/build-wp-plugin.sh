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
  > /dev/null

echo "Built $OUT"
echo "Deploy: WordPress → Plugins → Upload → Activate on roerealty.com.au"
