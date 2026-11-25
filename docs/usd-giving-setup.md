# USD giving and Pesapal UGX checkout

Tidori lets a donor enter a donation in UGX or USD. The Worker keeps the donor's original amount and currency in `donation_pledges.amount` and `donation_pledges.currency`, calculates the UGX checkout amount on the server, and always submits `currency: "UGX"` to Pesapal.

## Required setup

1. In Cloudflare, open the Tidori Worker and add a non-secret variable named `USD_TO_UGX_RATE`. Set it to the USD-to-UGX rate Tidori has approved (for example, a rate expressed as the number of UGX for 1 USD). The Worker rounds the configured rate to four decimal places and rounds the final UGX payment to a whole shilling.
2. Apply `supabase/payments.sql` to the Tidori Supabase database. It adds `pesapal_amount` and `exchange_rate_used` to `donation_pledges`.
3. Deploy the Worker and website together.

USD giving remains unavailable until the rate variable and database columns are configured. UGX giving continues to use UGX directly.

## Verification rules

- The browser may display an estimate, but the Worker calculates the final conversion using its own configured rate.
- Pesapal receives UGX for both UGX and USD donations.
- Verification compares Pesapal's reported UGX amount with the exact saved `pesapal_amount`, plus the exact Tidori merchant reference and tracking ID.
- The donor's original currency/amount and the conversion rate used are retained for reporting.
- Existing historical USD transactions without a saved `pesapal_amount` are not automatically approved by this new flow; they remain subject to manual review.
