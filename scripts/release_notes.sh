#!/usr/bin/env bash
# Extracts one version's section from CHANGELOG.md as release notes.
# Usage: release_notes.sh <output-file> <version>   (version without a leading "v")
set -euo pipefail

output_file="$1"
version="$2"
changelog="$(dirname "$0")/../CHANGELOG.md"

heading="## [${version}]"

if ! grep -qF "$heading" "$changelog"; then
  echo "error: CHANGELOG.md has no '${heading}' section - add one before tagging v${version}." >&2
  exit 1
fi

awk -v heading="$heading" '
  $0 == heading { found = 1; next }
  found && /^## \[/ { exit }
  found { print }
' "$changelog" > "$output_file"

if [ ! -s "$output_file" ]; then
  echo "error: the '${heading}' section in CHANGELOG.md is empty." >&2
  exit 1
fi

echo "Release notes written to $output_file"
