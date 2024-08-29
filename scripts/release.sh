#!/bin/bash

set -e

# Restore all git changes
git restore -s@ -SW  -- packages

# Build
pnpm build

# Update token
if [[ ! -z ${NPM_AUTH_TOKEN} ]] ; then
  echo "//registry.npmjs.org/:_authToken=${NPM_AUTH_TOKEN}" >> ~/.npmrc
  echo "registry=https://registry.npmjs.org/" >> ~/.npmrc
  echo "always-auth=true" >> ~/.npmrc
  npm whoami
fi

# Release packages
for PKG in packages/* ; do
  if [[ -d $PKG ]]; then
    if [[ $PKG == packages/svelte-template-explorer || $PKG == packages/jsx-explorer || $PKG == packages/playground || $PKG == pakcages/shared ]]; then
      continue
    fi
    pushd $PKG
    TAG="latest"
    echo "⚡ Publishing $PKG with tag $TAG"
    # pnpm publish --access public --no-git-checks --tag $TAG --dry-run
    popd > /dev/null
  fi
done