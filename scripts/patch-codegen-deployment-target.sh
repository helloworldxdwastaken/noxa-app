#!/bin/bash
# Patch generated podspecs to use iOS 15.0 instead of 15.1

GENERATED_DIR="ios/build/generated/ios"

if [ -d "$GENERATED_DIR" ]; then
  echo "Patching deployment targets in generated podspecs..."
  
  find "$GENERATED_DIR" -name "*.podspec" -type f | while read -r podspec; do
    if grep -q "s.platforms.*=.*{ :ios => \"15.1\" }" "$podspec"; then
      sed -i.bak "s/{ :ios => \"15.1\" }/{ :ios => \"15.0\" }/g" "$podspec"
      echo "  ✓ Patched $(basename "$podspec")"
      rm "${podspec}.bak"
    fi
  done
  
  echo "Deployment target patching complete."
else
  echo "Generated directory not found. Skipping patch."
fi

