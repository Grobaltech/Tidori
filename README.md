# Tidori Ministries Website
React + Vite + Tailwind CSS front end, Supabase database, hosted on Cloudflare Pages.
Built from the HELPZ free charity template (design, colours, images and icon font kept).

## 1. Run locally
```bash
npm install
cp .env.example .env     # then fill in your Supabase values
npm run dev
```
The site works without Supabase (it shows sample content); forms need Supabase.

## 2. Set up Supabase
1. Create a project at supabase.com.
2. SQL Editor > run `supabase/schema.sql` (public content + visitor submissions).
3. Optional: run `supabase/seed.sql` for starter content.
4. Settings > API Keys: copy the **Project URL** and **Publishable key** into `.env`.
   The legacy anon public key is also accepted. Never put a Supabase secret/service_role key in this frontend project.

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
| `VITE_SUPABASE_URL` | Your Tidori Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Tidori Supabase Publishable key |

Existing deployments using `VITE_SUPABASE_ANON_KEY` continue to work. After changing build variables, trigger a **new deployment** so Vite embeds them in the frontend bundle.

For the Worker runtime, keep any Supabase secret/service_role key separate and server-side only. Never prefix it with `VITE_` or expose it in browser code.

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

## Giving / payments
The Give form records a giving intent and uses the configured payment provider. Set `VITE_GIVE_URL` only if using an external payment page.

## Licence note
The template's CC BY 4.0 licence requires keeping the "Designed by HTML Codex"
link in the footer (see `LICENSE-TEMPLATE.txt`). Removing it needs their credit-removal licence.
