#!/usr/bin/env bash
# This pure Dart harness intentionally runs outside the Flutter package so it
# also works on machines with only the standalone Dart SDK.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
check_dir=$(mktemp -d)
trap 'rm -rf "$check_dir"' EXIT
mkdir -p "$check_dir/lib/core/services" "$check_dir/tests"
cp "$root/lib/core/services/scanner_ocr_normalizer.dart" "$check_dir/lib/core/services/"
cp "$root/tests/native_ocr_regression.dart" "$check_dir/tests/"
cd "$check_dir"
"${DART_BIN:-dart}" tests/native_ocr_regression.dart
