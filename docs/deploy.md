# Free deployment — Turso + GitHub + Render

This is the actually-free path. About 20 minutes end-to-end, no credit card
required. Permanent free tier on all three services.

## What you'll have at the end

- A live URL like `https://pints-du-soleil.onrender.com`
- Auto-deploy on every `git push` to main
- A free Turso database with the 38 real Portes du Soleil bars seeded
- Zero monthly cost

## Honest caveats

- **Cold starts.** The Render free tier sleeps after 15 minutes of inactivity.
  First visit after a quiet period takes 30–60 seconds while the service wakes
  up. After that, fast. To eliminate cold starts: upgrade to the $7/month
  Starter plan.
- **Photo uploads disabled by default.** The submit-a-price photo proof needs
  S3-compatible storage. Without it, admins can still approve submissions —
  they just won't have a photo to look at. Cloudflare R2 has a free 10GB
  tier if you want it later; happy to wire that up.
- **Lift status.** Scrapes onthesnow.co.uk in real time; if their HTML
  changes or the site is offline, the dashboard shows "—" instead of
  current counts. Falls back gracefully.

---

## Step 1. Turso — the database (free, no card)

Stores all bars, drinks, deals, submissions, reports.

1. Sign up at <https://turso.tech> with your GitHub account. **No card
   required.**
2. Install the Turso CLI on your laptop:

   **macOS:**
   ```bash
   brew install tursodatabase/tap/turso
   ```

   **Linux / WSL:**
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

   **Windows:** use WSL with the Linux command above.

3. Log in and create the database:
   ```bash
   turso auth login
   turso db create pints-du-soleil
   ```

4. Grab the two values you'll need. Keep this terminal open or save them
   in a notes app:

   ```bash
   turso db show pints-du-soleil --url
   # → libsql://pints-du-soleil-<your-name>.turso.io
   # This is DATABASE_URL

   turso db tokens create pints-du-soleil
   # → eyJhbGciOiJFZERTQSI…
   # This is DATABASE_AUTH_TOKEN
   ```

---

## Step 2. GitHub — the repo (free)

1. Make a new empty repo at <https://github.com/new>. Pick any name. Don't
   tick "Add a README" — the project already has files.

2. From the unzipped project folder on your laptop:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

3. Refresh the GitHub page — you should see all the project files.

---

## Step 3. Render — the host (free, no card)

1. Sign up at <https://render.com> with your GitHub account. **No card
   required for the free tier.**

2. Authorise Render to read your GitHub repos when it asks. You can scope
   the permission to just this one repo.

3. In the Render dashboard, click **New +** → **Blueprint**.

4. Pick the repo you just created. Render reads the `render.yaml` file
   from the repo and shows what it'll create: one web service called
   `pints-du-soleil` on the free plan.

5. Click **Apply**. Render starts building.

6. While it builds (takes a few minutes), click into the service and go to
   the **Environment** tab. Add these values:
   - `DATABASE_URL` = your `libsql://…` URL from step 1
   - `DATABASE_AUTH_TOKEN` = your `eyJ…` token from step 1
   - `ADMIN_PIN` = a 6-digit PIN of your choosing (e.g. `847291`).
     **Pick something unguessable** — this opens the admin section.
     If you don't set this, it defaults to `160127`.

   Save. Render will redeploy automatically.

7. When the build is done, you'll see a green "Live" badge and a URL like
   `https://pints-du-soleil.onrender.com`. Open it. The app loads but the
   bar list is empty — that's expected, the database hasn't been seeded yet.

---

## Step 4. Seed the database (one time only)

The Turso database is empty until you run the migration and seed.
Easiest path: run these from your laptop, pointing at the live Turso
database.

1. Create a local `.env` in the project folder with the same secrets:
   ```bash
   cd <unzipped-project-folder>
   cat > .env <<EOF
   DATABASE_URL=libsql://your-database.turso.io
   DATABASE_AUTH_TOKEN=eyJ...
   EOF
   ```
   (Use your actual values, not the placeholders.)

2. Install dependencies and run the migration + seed:
   ```bash
   yarn install
   yarn db:push    # creates the tables in Turso
   yarn db:seed    # loads the 38 real bars and drinks
   ```

3. Refresh your Render URL. You should now see the real Portes du Soleil
   bars.

---

## Step 5. Auto-deploy is already on

Render's free tier auto-deploys on every push to `main`. No extra setup
needed — that's what `autoDeploy: true` does in `render.yaml`.

When you make a change, just:

```bash
git add .
git commit -m "describe the change"
git push
```

Render rebuilds and ships the change. Watch the deploy progress in the
Render dashboard.

---

## Reference — testing the live app

- **App URL:** `https://<your-name>.onrender.com`
- **Admin entry:** tap the small `VOL.01` text in the ticker bar at the
  top of any page
- **Admin PIN:** whatever you set as `ADMIN_PIN` in step 3 (defaults to
  `160127` if not set). Validated server-side, never in the client bundle.
- **Health check:** `https://<your-name>.onrender.com/healthz`
  → returns `{"status":"ok","ts":…}` when the server is up.
- **Search visibility:** the app ships with `robots.txt` blocking all
  crawlers. When you're ready to be indexed, edit
  `client/public/robots.txt` (change `Disallow: /` to `Allow: /`) and
  push — Render will redeploy.
- **Rate limits:** anonymous users can submit 5 price changes and 10
  bar reports per hour per IP. Tweak in `server/routers/bars.ts`.

---

## Troubleshooting

### "Application failed to respond"
The free service is asleep. Wait 30–60 seconds and refresh. To stop this
happening: upgrade to the $7/month Starter plan, or set up an external
keep-warm pinger (UptimeRobot has a free 5-minute pinger).

### "yarn db:push" fails with auth error
Double-check `DATABASE_URL` starts with `libsql://` (not `https://`) and
that the auth token has no extra whitespace. If still stuck:
```bash
turso db tokens create pints-du-soleil  # generate a fresh one
```

### Render build fails
Read the build log in the dashboard. Two common causes:
1. Yarn install fails → check `package.json` is committed
2. Build runs out of memory → unlikely on this project, but if it happens,
   you'd need the Starter plan ($7/mo) which has more build memory

### Bars page shows nothing
You haven't run the seed yet. Re-do step 4.

### Map shows but no pins
Check the browser console. The most common cause is your Turso database
URL or token being wrong in Render. Fix in the **Environment** tab and
trigger a manual redeploy.

### "Photo upload returns 500"
Expected — `STORAGE_*` env vars aren't set. The rest of the app works.
Admins can approve submissions without photos.

---

## When you'd want to upgrade

You don't need to. But if you do:

- **Always-on (no cold starts):** Render Starter $7/month
- **Photo uploads working:** Cloudflare R2 free tier 10GB, add `STORAGE_*`
  env vars to Render
- **More than 100GB/month bandwidth:** Render Starter
- **Faster builds:** Render Starter has more build memory and CPU

For a personal demo or low-traffic site, the free tier is genuinely enough.
