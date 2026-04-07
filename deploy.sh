#!/bin/bash
# Deploy to Vercel production
# Usage: ./deploy.sh "commit message"

set -e

MSG="${1:-update}"
export PATH="/Users/arnaudtrilles/.npm-global/bin:$PATH"

echo "→ Building..."
pnpm run build

echo "→ Committing..."
git add -A
git commit -m "$MSG" || echo "Nothing to commit"
git push origin main

echo "→ Deploying to Vercel..."
vercel deploy --prod --yes

echo "✓ Done!"
