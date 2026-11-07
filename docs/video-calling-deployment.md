# Tidori video calling deployment and Android checklist

## 1. Database migration

Run `supabase/video_call_phase4_security_history.sql` in the SQL Editor of the **Tidori** Supabase project, after the existing `video_call_foundation.sql` migration. It adds hashed host/visitor invitation credentials and private call-session/event history. Do not run it against another Supabase project.

## 2. Cloudflare Worker

Deploy the latest `main` branch so the Worker has the `VIDEO_ROOMS` Durable Object binding and the updated signalling code.

For stronger connectivity across mobile networks, configure a TURN provider and add these Worker secrets/variables in Cloudflare:

- `TURN_URL`: TURN endpoint, for example `turn:your-provider-host:3478?transport=udp`. Multiple endpoints may be comma-separated.
- `TURN_USERNAME`: provider-issued username.
- `TURN_CREDENTIAL`: provider-issued credential.

Keep the credential in Cloudflare secrets; never put it in React source code or GitHub. Without TURN, calls may still work through STUN, but restrictive mobile, office and carrier networks can prevent peer-to-peer media.

## 3. Create and share meeting links

In Admin Dashboard → Pastor appointments:
1. Confirm an appointment and ensure its meeting mode is Video.
2. Select **Create room** or **Generate secure links**.
3. Copy the **pastor / host link** to the pastor only.
4. Copy the **visitor link** to the approved visitor only.

The two links contain separate random access keys. Generating new secure links rotates both keys and invalidates the old links. If the administrator refreshes the dashboard, the secret links are deliberately hidden; generate a new pair if they were not copied.

Visitors enter a waiting room. The pastor must admit them before media signalling is allowed. The host can decline a visitor or end the meeting for everyone.

## 4. Android application permissions

The repository currently contains the Capacitor app configuration, but does not contain a committed generated `android/` platform project. On the machine where the Android platform is generated, merge these permissions into `android/app/src/main/AndroidManifest.xml`, directly under the root `<manifest>` element:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.microphone" android:required="false" />
```

Then run:

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

Use a physical Android device for camera/microphone testing. Confirm the app requests and receives camera and microphone permissions. The video page uses HTTPS and browser WebRTC APIs; it does not need a separate video SDK.

If the Android platform has not yet been added, run `npx cap add android` once before `npx cap sync android`. Do not overwrite an existing Android project.

## 5. Acceptance test

Test with two different devices and separate links:
- Host link opens as Pastor / host.
- Visitor link opens in the waiting room.
- Host sees the waiting visitor and admits them.
- Audio/video connect both ways; mute and camera controls work.
- Host can remove the visitor and end the meeting.
- Screen sharing is tested on a browser/device that supports it.
- Admin Dashboard → Pastor appointments → Video call history records the session.

Call history stores timestamps and lifecycle events only. Tidori does not record or store audio/video in this implementation.
