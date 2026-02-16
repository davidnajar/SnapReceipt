#!/bin/bash
# Validate Supabase Edge Functions locally
# This script mimics what the GitHub Action does

set -e

echo "🔍 Validating Supabase Edge Functions..."
echo ""

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    echo "❌ Deno is not installed!"
    echo "Install it from: https://deno.land/#installation"
    echo ""
    echo "Quick install: curl -fsSL https://deno.land/x/install/install.sh | sh"
    exit 1
fi

echo "✅ Deno found: $(deno --version | head -n 1)"
echo ""

# Find all Edge Function index files
FUNCTIONS=$(find supabase/functions -name "index.ts" -type f 2>/dev/null || true)

if [ -z "$FUNCTIONS" ]; then
    echo "❌ No Edge Functions found in supabase/functions/"
    echo ""
    echo "Expected structure:"
    echo "  supabase/"
    echo "  └── functions/"
    echo "      ├── function-name/"
    echo "      │   └── index.ts"
    echo "      └── another-function/"
    echo "          └── index.ts"
    exit 1
fi

echo "📋 Found Edge Functions:"
echo "$FUNCTIONS" | sed 's|supabase/functions/||g' | sed 's|/index.ts||g' | sed 's/^/  - /'
echo ""

# Validate each function
EXIT_CODE=0
for func in $FUNCTIONS; do
    FUNC_NAME=$(dirname "$func" | xargs basename)
    echo "Validating $FUNC_NAME..."
    
    # Check TypeScript syntax
    if deno check "$func" 2>&1; then
        echo "✅ $FUNC_NAME: Syntax OK"
    else
        echo "❌ $FUNC_NAME: Syntax errors found"
        EXIT_CODE=1
    fi
    echo ""
done

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All Edge Functions validated successfully!"
    echo ""
    echo "You can now:"
    echo "  1. Commit and push your changes"
    echo "  2. GitHub Actions will automatically validate and deploy"
    exit 0
else
    echo "❌ Some Edge Functions have errors"
    echo ""
    echo "Please fix the errors above before committing."
    exit 1
fi
