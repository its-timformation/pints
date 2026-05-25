# Pints du Soleil — v2 redesign notes

This second pass rebuilds the app from the slide brief: an editorial poster
aesthetic on Anton + DM Sans + JetBrains Mono, real bar data scraped across the
Portes du Soleil network, and a full admin surface.

## What's new in this build

**Design system**
- Editorial brutalist palette (ink/paper/vermillion/sun/frost), clamped Anton
  display, monospaced eyebrows, paper-cream for callouts.
- Mobile-first: 44px minimum tap targets, 16px input font (no iOS zoom),
  bottom-sheet modals, reduced-motion respect.
- Bottom navigation: DASHBOARD / MAP / BARS with icons + labels and vermillion
  underline on the active tab.

**Real data**
- 38 real bars seeded across Avoriaz, Morzine, Les Gets, Châtel, Champéry,
  Montriond, and Morgins. Sources: the resort tourism boards
  (avoriaz.com, seemorzine.com, lesgets.com), portesdusoleil.com, and several
  trade publications (skiweekends, igluski, alikats, miggins.ch, etc).
- Per-area price multipliers + per-drink jitter so the data doesn't look
  uniform.
- 18-drink staples library (Kronenbourg 1664, Stella, Guinness, Vin Chaud,
  Génépi, etc) seeded against each bar with size and currency.

**Currency**
- GBP £ is now the default (was EUR €).
- New `resort.fxRates` endpoint pulls live EUR-base rates from Frankfurter
  (no key, no rate limit). The client falls back to a static table on failure.

**Resort conditions**
- `resort.getCondition` scrapes onthesnow's Avoriaz page and projects the open
  count onto the 196-lift Portes du Soleil total. Open-meteo for weather.
- Both calls degrade to safe placeholders if either fails.

**Submissions**
- New + Update flows, optional name, optional photo with "no faces" reminder.
- BarDetail's drink rows include a `↑` link that opens SubmitPrice in update
  mode pre-filled with the existing drink name.

**Admin (PIN 160127)**
- Hidden entry: tap "VOL.01" in the ticker band on any page.
- 6-digit PIN sentry, auto-unlocks on the 6th digit, shakes on wrong,
  30-second lockout after 3 failed attempts.
- Five sections: Submissions Queue, Bars Directory, Drinks Catalogue,
  Deals & Events, User Reports.
- Submissions Queue exposes all three actions on every row regardless of
  whether a photo was attached: REJECT / APPROVE / APPROVE + VERIFY.
- Drinks Catalogue lists every drink with a toggle to flip verification
  ad-hoc; tracks "verified · stale" entries older than 60 days.
- User Reports queue handles bar reports (closed, wrong info, drink not
  served, other).
- Admin session lives in `sessionStorage` for 30 minutes.

**Guinness banner (option three: type-only)**
- Dashboard banner reads "PERFECT TIME FOR A GUINNESS" with an up-chevron.
- Tapping it slides up a bottom sheet titled "WORTH THE WALK" showing the
  nearest Guinness-pouring bars sorted by GPS distance, each with the local
  Guinness price.

**Easter egg**
- 7 taps on the PINTS·DU·SOLEIL wordmark within 10 seconds switches the
  app into STOUTS·DU·SOLEIL mode for 60 minutes. Wordmark text changes,
  hero headline says "BEST STOUT". Silent revert.

## What you need to do to run it

```bash
yarn
# .env should already exist with DATABASE_URL and DATABASE_AUTH_TOKEN
yarn db:push          # apply new schema (adds verifiedAt, submitterName, kind,
                      # previousPrice, drinkSize, servesGuinness, barReports,
                      # pushSubscriptions)
yarn tsx seed.ts      # wipe old data and seed the 38 real bars
yarn dev              # http://localhost:5173
```

## What is stubbed for a follow-up pass

These were called out as second-pass scope so first-pass shipping wasn't
blocked. None of them prevent the app from running.

- **Push notifications.** Schema is ready (`pushSubscriptions` table) but the
  service-worker, VAPID key generation, and the notification scheduler are
  not wired up. Skeleton: register `/sw.js`, POST the subscription to a new
  `push.subscribe` tRPC mutation, then trigger sends on `deals.create` and
  every approved submission. No login flow needed — the device token is the
  identity, per the brief.
- **EN/FR i18n.** Copy is currently English-only. The hooks structure is
  ready (a `lang` field can sit in the existing zustand store) but no
  translation files exist yet. `react-i18next` is the lightest add.
- **Live lift counts via Digisnow.** I fall back to onthesnow.co.uk scraping
  with a projection from Avoriaz's 35 lifts to the network's 196. The
  network operator doesn't publish a unified open-lift count. Long term:
  scrape each of the 12 resort pages individually and sum.
- **OpenWeather upgrade.** Currently open-meteo (no key, no rate limit).
  If you want OpenWeather One Call you'll need to swap the URL and add
  `OPENWEATHER_KEY` to `.env`.
- **Bar Reports admin surface** is implemented; the bar-side report submission
  is implemented. What's not done: an in-app notification or email back to
  the reporter when their report is resolved.

## Files touched

```
shared/schema.ts                       schema extensions
seed.ts                                38 real bars + drinks library
server/routers/bars.ts                 +getAllWithDetails, +report, +getReports
server/routers/admin.ts                +setDrinkVerification, +setDealActive,
                                        +resolveReport, +verifiedAt logic
server/routers/resort.ts               digisnow fallback, +fxRates
client/src/index.css                   new design tokens
client/src/lib/store.ts                GBP default, isOpenNow, isVerifiedStale,
                                        distanceKm, stouts mode
client/src/lib/loadingMessages.ts      themed loading copy
client/src/components/LoadingMessage   shared themed loading state
client/src/components/PinSentry        admin gate
client/src/components/GuinnessSheet    type-only banner + bottom sheet
client/src/components/BarsManager      admin chrome + servesGuinness toggle
client/src/App.tsx                     ticker band, easter egg, bottom nav
client/src/pages/*.tsx                 every page rewritten
client/src/admin/SubmissionsQueue      three-action review
client/src/admin/DrinksCatalogue       verify toggles
client/src/admin/DealsManager          CRUD
client/src/admin/ReportsManager        flag triage
```
