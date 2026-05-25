# Project Brief: ski-bar-beer-price-tracker

Perfect — zero friction for users, but submissions are anchored to real proof. That's a smart trust mechanic and feeds nicely into the verified badge system (admin reviews the receipt/menu image and marks the price as verified).

I have enough to write the full spec now. Here it is:

---

## Executive Summary
A mobile-first web app called **Pints du Soleil** that helps skiers and snowboarders find the best value drinks across the Portes du Soleil ski region. Users can browse bars on a map or list view, compare beer prices, filter by location and cost, and submit price updates with photo proof. Launching with Avoriaz as the anchor resort.

---

## Target Users
- Skiers and snowboarders visiting Portes du Soleil (primarily Avoriaz at launch)
- Age 18–40, price-conscious, social, mobile-first
- Currently frustrated by surprise expensive drinks with no way to compare before committing to a bar
- Want to maximise their après-ski budget without missing out

---

## Proposed Solution
A community-powered price tracker seeded with real bar data, kept fresh through user submissions with photo proof. An admin portal lets the owner quickly verify submissions, add new bars, and update prices. A verified badge system signals trustworthy, recently-confirmed prices.

---

## Core Features (MVP)

- **Map view:** Interactive map of Avoriaz with pins for every bar. Pins show bar name and cheapest beer price. Tap a pin for full details.
- **List view:** Scrollable list of all bars, sortable by price (low to high) and filterable by area within Avoriaz.
- **Bar detail page:** Bar name, location, opening hours, drink menu with prices, verified badges, last updated timestamp, and photo of menu/bar.
- **Filters:** Filter by price range, area/neighbourhood, and establishment type (bar, restaurant-bar, slope-side, club).
- **Currency toggle:** Switch between EUR and GBP (and CHF given proximity to Swiss resorts). Conversion based on a live or daily-refreshed rate.
- **Price submission:** Any user can submit a price update by uploading a photo of a receipt or menu. Simple form — bar name, drink, price, photo upload.
- **Verified badge:** Admin-reviewed and confirmed prices show a verified badge with a timestamp. Unverified community submissions show a "community reported" label.
- **Pre-loaded Avoriaz data:** All known bars in Avoriaz seeded at launch with names, map locations, and available pricing info.
- **Admin portal:** Separate password-protected interface to add/edit bars, manage drink prices, review and approve user submissions, and mark prices as verified.

---

## Out of Scope for MVP

- Web scraping / automated price updates
- User accounts or profiles
- Ratings or reviews beyond price data
- Expansion to other Portes du Soleil resorts (Les Gets, Morzine, Champéry etc.)
- Push notifications
- Deals or happy hour alerts
- Native mobile app (PWA is sufficient for v1)

---

## Pages / Screens

- **Home / Map view:** Full-screen interactive map with bar pins. Filter bar at top. Toggle to switch to list view. Currency switcher.
- **List view:** Card-based list of bars showing name, cheapest beer price, verified status, and distance/area. Sortable and filterable.
- **Bar detail page:** Full bar profile — name, type, location, hours, full drink price list with verified badges, photo gallery, "Submit a price" CTA.
- **Submit a price page:** Simple form — select bar, drink type, price, currency, photo upload (receipt or menu). Thank you confirmation screen.
- **Admin portal — Dashboard:** Overview of pending submissions, recently updated bars, quick stats.
- **Admin portal — Bar management:** Add, edit, or archive bars. Set location on map. Upload photos.
- **Admin portal — Submissions queue:** Review user-submitted prices with photo proof. Approve (marks as verified) or reject.
- **Admin portal — Drink price editor:** Manage drink menu and prices per bar.

---

## Design Direction

- **Vibe:** Bold, playful, festival-meets-ski-resort. High energy, irreverent — "après-ski at 4pm" energy.
- **Typography:** Chunky, bold display fonts for headings. Clean readable sans-serif for body.
- **Colour palette:** Bright punchy primaries — think electric blues, sunshine yellows, and warm oranges as accents. Dark enough backgrounds to pop on a bright snowy day.
- **Iconography:** Fun, slightly cheeky — beer mugs, mountain icons, sun motifs. Emoji-friendly tone.
- **Map style:** Custom styled map tiles to match the brand palette rather than default Google Maps grey.
- **Mobile-first:** Designed for one-handed use on a phone, large tap targets, bottom navigation.

---

## Technical Notes

- **Auth:** Admin portal only — simple password-protected login. No user accounts.
- **Database:** SQLite with tables for bars, drinks, prices, submissions, and currency rates.
- **Currency conversion:** Daily-refreshed exchange rates via a free API (e.g. Open Exchange Rates or similar). EUR as base currency.
- **Map:** Mapbox or Leaflet.js with OpenStreetMap tiles — avoids Google Maps costs and allows custom styling.
- **Photo uploads:** User submission photos stored server-side for admin review.
- **Data seeding:** Avoriaz bars pre-loaded via a seed script — names, coordinates, establishment type, and any publicly available pricing.
- **PWA:** Configured as a Progressive Web App so users can "add to home screen" on mobile.
- **Web scraping:** Architecture should support adding scrapers later — prices flagged with a `source` field (manual / community / scraped).

---

Does this capture what you have in mind? Anything you'd change?