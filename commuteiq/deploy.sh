#!/bin/bash
set -e

echo "🚀 CommuteIQ — Automated Deployment Script"
echo "==========================================="

# ---------------------------------------------------------------------------
# Step 1: Ensure the Vercel CLI is available.
# ---------------------------------------------------------------------------
if ! command -v vercel &> /dev/null; then
  echo "📦 Installing Vercel CLI..."
  npm install -g vercel
fi

# ---------------------------------------------------------------------------
# Step 2: Install project dependencies.
# ---------------------------------------------------------------------------
echo "📦 Installing project dependencies..."
npm install

# ---------------------------------------------------------------------------
# Step 3: Authenticate with Vercel (opens a browser window).
# ---------------------------------------------------------------------------
echo "🔐 Logging into Vercel (a browser window may open)..."
vercel login

# ---------------------------------------------------------------------------
# Step 4: Link (or create) the Vercel project.
# ---------------------------------------------------------------------------
echo "🔗 Linking project to Vercel..."
vercel link --yes

# ---------------------------------------------------------------------------
# Step 5: Provision Vercel KV (Redis) storage.
#   The connection env vars (KV_REST_API_URL / KV_REST_API_TOKEN) are
#   injected into the project automatically by Vercel once the store is
#   created and linked — the user never copies a connection string.
# ---------------------------------------------------------------------------
echo "🗄️  Provisioning Vercel KV storage..."
vercel kv create commute-tracker-kv --yes || echo "ℹ️  KV store may already exist — continuing."
vercel kv connect commute-tracker-kv --yes || echo "ℹ️  KV may already be connected — continuing."

# ---------------------------------------------------------------------------
# Step 6: Inject the Google Maps API key as a production environment variable.
#   The non-technical user never sees an API console or billing page.
# ---------------------------------------------------------------------------
echo "🔑 Injecting Google Maps API key..."
# Provide your own key via the environment before running, e.g.:
#   GMAPS_API_KEY=your_key_here bash deploy.sh
GMAPS_API_KEY="${GMAPS_API_KEY:-YOUR_GOOGLE_MAPS_API_KEY_HERE}"
printf "%s" "$GMAPS_API_KEY" | vercel env add GMAPS_API_KEY production --force || \
  echo "ℹ️  GMAPS_API_KEY may already be set — continuing."

# ---------------------------------------------------------------------------
# Step 7: Deploy to production.
# ---------------------------------------------------------------------------
echo "🌍 Deploying to Vercel production..."
vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app is live. Open the URL printed above in your browser."
echo "📋 Next step: Open Settings in the app and enter your commute route."
