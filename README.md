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
2. SQL Editor > run `supabase/schema.sql` (tables + security rules).
3. Optional: run `supabase/seed.sql` for starter content.
4. Settings > API: copy **Project URL** and **anon public key** into `.env`.
   Never put the `service_role` key in this project.

Visitors can only read published content and insert form submissions
(contact, volunteer, newsletter, giving pledges). View submissions and edit
content in the Supabase **Table Editor**.

## 3. Publish to GitHub
```bash
git init && git add . && git commit -m "Tidori Ministries site"
git branch -M main
git remote add origin https://github.com/YOUR-USER/tidori-ministries.git
git push -u origin main
```

## 4. Deploy on Cloudflare Pages
Workers & Pages > Create > Pages > Connect to Git > pick the repo.

| Setting | Value |
|---|---|
| Framework preset | None (or Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (+ optional `VITE_GIVE_URL`, `VITE_VIDEO_URL`) |

`public/_redirects` makes page refreshes and deep links work (single-page app).
Add your custom domain under the project's Custom domains tab.

## 5. Make it yours
- `src/config/site.js`: church address, phone, email, social links, service times, About/Mission/Vision text, ministries, counters.
- `src/components/Hero.jsx`: homepage slide text.
- Images: replace files in `public/img/` (keep the names, or update the paths).
- Content (events, blog, outreach, leaders): edit rows in Supabase.

## Giving / payments
The Give form records a **pledge** in Supabase; it does not process cards.
Set `VITE_GIVE_URL` to your payment page (Paystack, Stripe Payment Link, PayPal, etc.)
and it opens after each pledge.

## Licence note
The template's CC BY 4.0 licence requires keeping the "Designed by HTML Codex"
link in the footer (see `LICENSE-TEMPLATE.txt`). Removing it needs their credit-removal licence.
