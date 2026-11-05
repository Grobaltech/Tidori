# Tidori Android app and push notifications

## Android package

The Android app ID is `com.grobaltech.tidori`. It opens the live Tidori website at:

`https://tidori-ministries.grobaltechtechnologies.workers.dev`

The app therefore receives the same website sections and published updates as the website. The native wrapper adds Android push notifications and pull-to-refresh; it does not maintain a separate copy of the site.

## Firebase setup (required for Android push)

1. Open Firebase Console and create/select the Tidori Ministries Firebase project.
2. Add an Android app with package name exactly `com.grobaltech.tidori`.
3. Download that app's `google-services.json`.
4. In GitHub repository Settings → Secrets and variables → Actions, create repository secret `GOOGLE_SERVICES_JSON` and paste the complete JSON file contents.
5. In Firebase Project settings → Service accounts, generate a private service-account JSON key with Firebase Cloud Messaging permissions.
6. In Cloudflare Worker `tidori-ministries` → Settings → Variables and Secrets, add secret `FCM_SERVICE_ACCOUNT_JSON` containing the complete service-account JSON. Never put this key in website JavaScript or GitHub source.

The Android build workflow is `.github/workflows/android-apk.yml`. Run it from GitHub Actions → Build Tidori Android APK → Run workflow. On success, download the `Tidori-Ministries-Android-APK` artifact. A new build is also triggered by relevant Android wrapper changes on `main`.

## Database setup

Apply `supabase/mobile_push.sql` in the active Tidori Supabase project after the existing core schema. It creates:
- `push_devices`: private FCM device-token registry.
- `appointments`: private appointment requests, with public insert-only access. The Contact page now includes a Request an Appointment form.
- `push_event_receipts`: duplicate-event protection.

## Supabase database webhooks

In Cloudflare Worker secrets, create `SUPABASE_WEBHOOK_SECRET` with a long random value.

Expose the new tables `push_devices`, `push_event_receipts`, and `appointments` in Supabase Project Settings → Data API (alongside the already exposed `profiles` table).\n\nIn the active Supabase project, create two Database Webhooks. Both use method POST, URL:

`https://tidori-ministries.grobaltechtechnologies.workers.dev/api/notifications/database-event`

Add header `x-tidori-webhook-secret` with the exact same secret value.

Webhook A:
- Table: `public.profiles`
- Event: INSERT

Webhook B:
- Table: `public.appointments`
- Event: INSERT

Only INSERT events are accepted. The Worker sends these alerts to registered devices belonging to profiles whose role is `admin` or `super_admin`.

## Payment alerts

The existing Pesapal IPN flow remains authoritative. After the Worker verifies the transaction status, amount, currency and merchant reference with Pesapal, it sends a notification only when the donation first transitions to `paid`. Repeated IPN/callback events do not generate duplicate successful-payment alerts. Pending, failed, cancelled and reversed transactions do not send a success notification.

## Device registration

The app asks the signed-in user for notification permission, registers its FCM token with the Worker using the user's Supabase access token, and stores the token server-side. Only administrator devices receive the three alert types. Users must sign in on the app at least once to register their device.

## Important

The repository can build the Android shell, but Firebase credentials and the Supabase webhooks are external project settings. Until those are configured, the app can still load the live website and refresh, but push delivery and the final Firebase-enabled APK build are not ready.
