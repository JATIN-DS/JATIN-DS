# 🧭 CommuteIQ — Intelligent Daily Commute Tracker & Optimizer

CommuteIQ automatically checks the traffic on your daily commute at a fixed
cadence, builds a history of how long the trip takes at different departure
times, and visualizes **the best and worst times to leave** — backed entirely by
your own collected data.

It tracks **multiple routes**, both directions (**A → B** and **B → A**), and
runs a real serverless scheduler that quietly collects data in the background.

> **Live demo:** https://commuteiq-blr.vercel.app

---

## ✨ What it does

- **Multiple routes** — the home screen lists every commute as a card; click one
  to open its dedicated dashboard.
- **Smart location search** — start (**A**) / end (**B**) fields use Google
  **Places Autocomplete**, so you pick real addresses as you type.
- **Configurable schedule** — choose tracked days, a morning window, and a check
  cadence (every 15 / 30 / 60 minutes). Optionally enable a separate return
  (**B → A**) window.
- **Automatic background collection** — an external scheduler (Upstash QStash)
  pings a serverless endpoint every 15 minutes; the handler checks Google traffic
  during each route's window and logs every result to Vercel KV.
- **Stacked direction graphs** — the dashboard shows two charts one below the
  other: **A → B** first, then **B → A**. Each point is the average travel time
  for a departure slot, snapped to a clean 15-minute grid (9:00, 9:15, 9:30 …).
- **Day filtering** — view the combined **All days** average, or focus on a
  single weekday.
- **Best / worst at a glance** — per-direction chips call out the fastest and
  slowest departure slots for the current selection.
- **Commute-time threshold** — set a target (default **45 min**); every departure
  slot at or under it is highlighted with a green ring on the chart.
- **Live "Check traffic now"** — fetches the current travel time for both
  directions on demand and shows it inline. This is a *live readout only* — it is
  **not** written to the graphs, which reflect scheduler-collected history only.

---

## 🧱 Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · Vercel KV
(Upstash Redis) · Upstash QStash (scheduler) · Google Maps Platform · deployed on
Vercel.

---

## 🚀 Deploy

A helper script automates the Vercel setup:

```bash
GMAPS_API_KEY=your_google_maps_key bash deploy.sh
```

The script installs the Vercel CLI + dependencies, links the project, provisions
Vercel KV, injects your Google Maps key, and deploys to production.

Because Vercel's Hobby cron is limited to once per day, the 15-minute cadence is
driven by an external **Upstash QStash** schedule that calls
`/api/cron/check-traffic` (secured with `CRON_SECRET`). Set these in your Vercel
project environment:

| Variable             | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `GMAPS_API_KEY`      | Google Maps key (server-side only)                   |
| `KV_REST_API_URL`    | Vercel KV / Upstash Redis REST URL (auto-injected)   |
| `KV_REST_API_TOKEN`  | Vercel KV / Upstash Redis REST token (auto-injected) |
| `CRON_SECRET`        | Shared secret the scheduler sends to the cron route  |

---

## 🧑‍💻 Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Without Vercel KV configured, CommuteIQ runs in **local mode** (data lives in the
browser's `localStorage`). To exercise the real Google Maps call locally, copy
`.env.local.example` to `.env.local` and set `GMAPS_API_KEY`.

---

## 🗂️ Project structure

```
app/
  page.tsx                        # Home — list of route cards
  settings/page.tsx               # Create / edit a route (mode, schedule, A/B)
  route/[id]/page.tsx             # Route dashboard (stacked A→B / B→A charts)
  route/[id]/log/page.tsx         # Raw data table + CSV export
  api/
    health/route.ts               # Reports whether Vercel KV is available
    routes/route.ts               # CRUD for routes
    logs/route.ts                 # GET + DELETE log entries
    logs/seed/route.ts            # (internal) sample-data seeding endpoint
    places/autocomplete/route.ts  # Proxied Google Places autocomplete
    check-now/route.ts            # Manual "check traffic now" (live readout)
    cron/check-traffic/route.ts   # Scheduler handler (called by QStash, /15 min)
components/
  TimeSeriesChart.tsx             # Departure-time scatter/line + green threshold ring
  ChartDaySelector.tsx            # All-days / single-day selector
  LocationAutocomplete.tsx        # Focus-gated Places autocomplete input
  DaySelector.tsx                 # Day-of-week picker (settings)
  RouteCard.tsx, NavBar.tsx, ...  # UI building blocks
lib/
  store.ts                        # Client data layer (KV API ↔ localStorage)
  localStore.ts                   # Browser localStorage fallback
  kv.ts                           # Server-side Vercel KV wrapper
  gmaps.ts                        # Google Routes + Places wrappers
  scheduler.ts                    # Schedule-evaluation logic (window + cadence)
  recommendation.ts               # Optimal-departure analytics helpers
  regression.ts                   # Linear regression + 15-min time helpers
  timezone.ts                     # Timezone-aware day/time helpers
  sampleData.ts                   # Synthetic data generator (dev/preview)
types/index.ts                    # Shared TypeScript contracts
vercel.json                       # Vercel project config
deploy.sh                         # One-command deployment helper
```

---

## ⚙️ How the scheduler works

The QStash schedule fires `/api/cron/check-traffic` every 15 minutes. On each run
the handler iterates every saved route and, for each direction (outbound **A→B**
and, when enabled, return **B→A**):

1. Reads routes from Vercel KV.
2. Checks: is the scheduler active? Is today a selected day? Is the current time
   (in **your** timezone) inside that direction's window? Has the route's cadence
   elapsed since the last check (with a small grace window so 15-min routes don't
   skip a tick)?
3. If **all** pass, it calls the Google **Routes API**, stores a log entry, and
   records the last-checked timestamp. Otherwise it skips that direction.

This keeps usage to **one API call per cadence interval per direction**, and the
last-checked timestamp makes runs idempotent.

### Google APIs used

- **Routes API** (`directions/v2:computeRoutes`) — traffic-aware travel time +
  distance, with native `TWO_WHEELER` support.
- **Places API (New)** (`places:autocomplete`) — location autocomplete.

If Google is unreachable, the app degrades gracefully: traffic falls back to a
realistic simulated value and autocomplete falls back to a small curated list.

---

## 🔐 Security & data

- The Google Maps API key is **server-side only** — it never reaches the browser
  bundle. All map calls are proxied through serverless functions.
- The cron endpoint is protected by `CRON_SECRET` (sent by QStash as a bearer
  token / query param).
- No accounts or passwords — CommuteIQ is single-user by design.
- Vercel KV is the source of truth; data older than **90 days** is pruned
  automatically.
- **No secrets are committed** to this repo. Provide your own keys via
  environment variables.
