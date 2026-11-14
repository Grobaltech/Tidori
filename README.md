# Tidori Ministries Website
React + Vite + Tailwind CSS front end, Supabase database, hosted on Cloudflare Pages/Workers.
Built from the HELPZ free charity template (design, colours, images and icon font kept).

## 1. Run locally
```bash
npm install
cp .env.example .env     # then fill in your Supabase values
npm run dev
```
The site works without Supabase (it shows sample content); forms need Supabase.

## 2. Set up Supabase
1. In Supabase, open the Tidori project.
2. SQL Editor > run `supabase/schema.sql` for public content and visitor submissions.
3. Optional: run `supabase/seed.sql` for starter content.
4. Settings > API Keys: copy the **Project URL** and **Publishable key** into `.env`.
   The legacy anon public key is also accepted. Never put a Supabase secret/service_role key in frontend code.

Visitors can read published content and insert form submissions
(contact, volunteer, newsletter, giving pledges). View submissions and edit
content in the Supabase **Table Editor**.

## 3. Publish to GitHub
```bash
git init && git add . && git commit -m "Tidori Ministries site"
git branch -M main
git remote add origin https://github.com/YOUR-USER/tidori-ministries.git
git push -u origin main
```

## 4. Deploy on Cloudflare
Workers & Pages > select the Tidori project > Settings > Variables and Secrets.
Add these as **build-time variables** (not only Worker runtime secrets):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Tidori Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Tidori Supabase Publishable key |

Existing deployments using `VITE_SUPABASE_ANON_KEY` continue to work. After changing build variables, trigger a **new deployment** so Vite embeds them in the frontend bundle.

For the Worker runtime, keep the following server-side secrets/variables separate from the Vite build variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (secret; never expose in browser code)
- `PESAPAL_CONSUMER_KEY` (secret)
- `PESAPAL_CONSUMER_SECRET` (secret)
- `PESAPAL_CURRENCY` (optional; defaults to USD)

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |

`public/_redirects` makes page refreshes and deep links work (single-page app).
Add your custom domain under the project's Custom domains tab.

## 5. Make it yours
- `src/config/site.js`: church address, phone, email, social links, service times, About/Mission/Vision text, ministries, counters.
- `src/components/Hero.jsx`: homepage slide text.
- Images: replace files in `public/img/` (keep the names, or update the paths).
- Content (events, blog, outreach, leaders): edit rows in Supabase.

## Giving / Pesapal payments
The Cloudflare Worker in `worker/index.js` handles Pesapal checkout, callback and IPN verification. Keep the existing Pesapal credentials and registered IPN configuration intact when changing deployment settings. Do not remove or rename the payment routes.

## Licence note
The template's CC BY 4.0 licence requires keeping the "Designed by HTML Codex"
link in the footer (see `LICENSE-TEMPLATE.txt`). Removing it needs their credit-removal licence.


## The Comfort Bridge / Grace Pool

The public programme page is available at `/comfort-bridge`. It uses the existing Pesapal donation endpoint and tags verified contributions with `programme=comfort_bridge`. Confidential beneficiary requests, sponsorship allocations, Prayer Altar assignments and pastoral sessions are managed in the administrator portal under **Comfort Bridge**.

Before using the module against the live Supabase project, run `supabase/comfort_bridge.sql` once in the connected project's SQL Editor. The migration adds the programme metadata, private application and ministry operations tables, RLS policies, public aggregate-only impact function, and an administrator-only allocation function. Do not expose beneficiary records or donor details publicly.

The programme page and administration UI are part of the normal Vite build. Existing Pesapal credentials, IPN configuration and payment routes are retained.
