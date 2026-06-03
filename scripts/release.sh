#!/bin/bash
set -e

VERSION=$(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
TAG="v${VERSION}"

echo "Releasing ${TAG} ..."
git tag "$TAG"
git push origin "$TAG"
echo "Done. GitHub Actions will build and publish the release."
