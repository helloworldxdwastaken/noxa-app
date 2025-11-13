#!/bin/bash
# Patch generated podspecs to use iOS 15.0 instead of 15.1

GENERATED_DIR="ios/build/generated/ios"

echo "Looking for generated podspecs in $GENERATED_DIR..."

if [ -d "$GENERATED_DIR" ]; then
  echo "Patching deployment targets in generated podspecs..."
  
  find "$GENERATED_DIR" -name "*.podspec" -type f | while read -r podspec; do
    echo "  Checking $(basename "$podspec")..."
    
    # Check if the file contains 15.1
    if grep -q "15\.1" "$podspec"; then
      # Use perl for cross-platform sed compatibility
      perl -i -pe 's/"15\.1"/"15.0"/g' "$podspec"
      perl -i -pe "s/'15\.1'/'15.0'/g" "$podspec"
      echo "  ✓ Patched $(basename "$podspec")"
    else
      echo "  - No 15.1 found in $(basename "$podspec")"
    fi
  done
  
  echo "Deployment target patching complete."
else
  echo "⚠️  Generated directory not found: $GENERATED_DIR"
  echo "Codegen may not have run yet. This is expected if pod install generates it."
fi

