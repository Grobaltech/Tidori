const PESAPAL_BASE = "https://pay.pesapal.com/v3";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

const clean = (value, max = 160) => String(value ?? "").trim().slice(0, max);

function requiredEnv(env) {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PESAPAL_CONSUMER_KEY", "PESAPAL_CONSUMER_SECRET"]
    .filter((key) => !env[key]);
}

function missingPesapalEnv(env) {
  return ["PESAPAL_CONSUMER_KEY", "PESAPAL_CONSUMER_SECRET"].filter((key) => !env[key]);
}

async function supabaseRequest(env, path, options = {}) {
  const response = await fetch(new URL(`/rest/v1/${path}`, env.SUPABASE_URL), {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

async function pesapalToken(env) {
  const response = await fetch(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      consumer_key: env.PESAPAL_CONSUMER_KEY,
      consumer_secret: env.PESAPAL_CONSUMER_SECRET,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.token) throw new Error(data.error?.message || data.message || "Pesapal authentication failed.");
  return data.token;
}

async function pesapalCall(env, path, token, body) {
  const response = await fetch(`${PESAPAL_BASE}${path}`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data.error || (data.status && data.status !== "200")) {
    throw new Error(data.error?.message || data.message || "Pesapal request failed.");
  }
  return data;
}

async function getPesapalIpnList(token) {
  const response = await fetch(`${PESAPAL_BASE}/api/URLSetup/GetIpnList`, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || "Could not check registered Pesapal IPNs.");
  return Array.isArray(data) ? data : Array.isArray(data.ipn_list) ? data.ipn_list : Array.isArray(data.data) ? data.data : [];
}

async function ensurePesapalIpn(env, token, origin) {
  const ipnUrl = `${origin}/api/payments/pesapal/ipn`;
  // Reuse an existing registration so retries/deployments never create duplicates.
  const registered = await getPesapalIpnList(token);
  const existing = registered.find((item) =>
    String(item.url || "").replace(/\/$/, "") === ipnUrl.replace(/\/$/, "")
    && String(item.ipn_status ?? 1) !== "0"
  );
  if (existing?.ipn_id) return existing;

  const created = await pesapalCall(env, "/api/URLSetup/RegisterIPN", token, {
    url: ipnUrl,
    ipn_notification_type: "GET",
  });
  if (!created.ipn_id) throw new Error("Pesapal did not return an IPN registration ID.");
  return created;
}

async function requireSuperAdmin(request, env) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return { error: json({ error: "Sign in as the Tidori super administrator." }, 401) };

  const authResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${accessToken}` },
  });
  if (!authResponse.ok) return { error: json({ error: "Your session is invalid or has expired. Please sign in again." }, 401) };
  const authUser = await authResponse.json();
  const profiles = await supabaseRequest(env, `profiles?select=role&id=eq.${encodeURIComponent(authUser.id)}&limit=1`);
  if (profiles?.[0]?.role !== "super_admin") return { error: json({ error: "Only the Tidori super administrator can manage Pesapal IPN settings." }, 403) };
  return { user: authUser };
}

async function adminPesapalIpn(request, env) {
  const missingSupabase = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !env[key]);
  if (missingSupabase.length) {
    return json({ code: "SUPABASE_WORKER_CONFIG_MISSING", missing: missingSupabase,
      error: "The Worker is missing its Supabase connection settings. Add the listed variables in Cloudflare before managing Pesapal." }, 503);
  }
  const access = await requireSuperAdmin(request, env);
  if (access.error) return access.error;

  const missing = missingPesapalEnv(env);
  if (missing.length) {
    return json({ code: "PESAPAL_CONFIG_MISSING", missing,
      error: "Pesapal API credentials have not been configured in this Cloudflare Worker. Add the missing secrets, deploy, then check again." }, 503);
  }

  try {
    const token = await pesapalToken(env);
    const origin = new URL(request.url).origin;
    const ipnUrl = `${origin}/api/payments/pesapal/ipn`;
    if (request.method === "POST") {
      const registration = await ensurePesapalIpn(env, token, origin);
      return json({ configured: true, registered: true, url: ipnUrl, ipn: registration, message: "Pesapal IPN is registered and ready." });
    }
    const registered = await getPesapalIpnList(token);
    const matching = registered.find(item => String(item.url || "").replace(/\/$/, "") === ipnUrl.replace(/\/$/, ""));
    return json({
      configured: true,
      registered: Boolean(matching?.ipn_id && String(matching.ipn_status ?? 1) !== "0"),
      url: ipnUrl,
      ipn: matching || null,
      message: matching?.ipn_id && String(matching.ipn_status ?? 1) !== "0" ? "An active IPN registration was found." : "No active registration was found for this website URL.",
    });
  } catch (error) {
    return json({ error: error.message || "Could not communicate with Pesapal." }, 502);
  }
}


async function authAdminRequest(env, path, method = "GET", body) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.msg || payload.message || payload.error_description || payload.error || `Supabase Auth returned HTTP ${response.status}.`);
  }
  return payload;
}

async function adminUsers(request, env) {
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !env[key]);
  if (missing.length) return json({ error: `Worker configuration missing: ${missing.join(", ")}`, missing }, 503);
  const access = await requireSuperAdmin(request, env);
  if (access.error) return access.error;
  const actorId = access.user.id;

  try {
    if (request.method === "GET") {
      const authUsers = [];
      for (let page = 1; page <= 10; page += 1) {
        const result = await authAdminRequest(env, `/admin/users?page=${page}&per_page=100`);
        const batch = Array.isArray(result.users) ? result.users : [];
        authUsers.push(...batch);
        if (batch.length < 100) break;
      }
      const profiles = await supabaseRequest(env, "profiles?select=id,full_name,email,phone,role,member_status,created_at");
      const byId = new Map((profiles || []).map((p) => [p.id, p]));
      const users = authUsers.map((authUser) => {
        const p = byId.get(authUser.id) || {};
        return {
          id: authUser.id,
          email: authUser.email || p.email || "",
          full_name: p.full_name || authUser.user_metadata?.full_name || "",
          phone: p.phone || authUser.phone || "",
          role: p.role || "member",
          member_status: p.member_status || "visitor",
          created_at: p.created_at || authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at || null,
          email_confirmed_at: authUser.email_confirmed_at || null,
          banned_until: authUser.banned_until || null,
          is_banned: Boolean(authUser.banned_until && new Date(authUser.banned_until) > new Date()),
          providers: (authUser.identities || []).map((identity) => identity.provider),
        };
      });
      return json({ users, total: users.length });
    }

    const input = await request.json().catch(() => null);
    if (!input || typeof input !== "object") return json({ error: "Invalid request body." }, 400);

    if (request.method === "PATCH") {
      const id = clean(input.user_id, 80);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "A valid user ID is required." }, 400);
      if (id === actorId && input.role && input.role !== "super_admin") {
        return json({ error: "You cannot remove your own super administrator access." }, 400);
      }
      const allowedRoles = ["member", "leader", "admin", "super_admin"];
      const allowedStatuses = ["visitor", "member", "leader"];
      if (input.role && !allowedRoles.includes(input.role)) return json({ error: "Invalid account role." }, 400);
      if (input.member_status && !allowedStatuses.includes(input.member_status)) return json({ error: "Invalid membership status." }, 400);

      const profilePatch = {};
      for (const field of ["full_name", "email", "phone", "role", "member_status"]) {
        if (Object.prototype.hasOwnProperty.call(input, field)) profilePatch[field] = field === "email" ? clean(input[field], 200).toLowerCase() : clean(input[field], field === "full_name" ? 120 : 80);
      }
      if (profilePatch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profilePatch.email)) return json({ error: "Enter a valid email address." }, 400);
      if (Object.keys(profilePatch).some((key) => ["email", "phone", "full_name"].includes(key))) {
        const currentResult = await authAdminRequest(env, `/admin/users/${encodeURIComponent(id)}`);
        const current = currentResult.user || currentResult;
        await authAdminRequest(env, `/admin/users/${encodeURIComponent(id)}`, "PUT", {
          ...(profilePatch.email ? { email: profilePatch.email } : {}),
          ...(profilePatch.phone !== undefined ? { phone: profilePatch.phone || null } : {}),
          ...(profilePatch.full_name !== undefined ? { user_metadata: { ...(current.user_metadata || {}), full_name: profilePatch.full_name } } : {}),
        });
      }
      if (Object.keys(profilePatch).length) {
        const updated = await supabaseRequest(env, `profiles?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify(profilePatch),
        });
        if (!updated?.length) return json({ error: "The profile was not updated. Check that this user has a profiles row." }, 404);
      }
      return json({ success: true, message: "User account updated." });
    }

    if (request.method === "POST") {
      const action = clean(input.action, 30);
      const id = clean(input.user_id, 80);
      if (action === "invite") {
        const email = clean(input.email, 200).toLowerCase();
        const fullName = clean(input.full_name, 120);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2) return json({ error: "Enter a valid email and full name." }, 400);
        const origin = new URL(request.url).origin;
        const invited = await authAdminRequest(env, `/invite?redirect_to=${encodeURIComponent(`${origin}/profile`)}`, "POST", {
          email,
          data: { full_name: fullName },
        });
        const invitedUser = invited.user || invited;
        if (invitedUser.id) {
          await supabaseRequest(env, "profiles?on_conflict=id", {
            method: "POST",
            headers: { prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify([{
              id: invitedUser.id,
              full_name: fullName,
              email,
              role: "member",
              member_status: "visitor",
            }]),
          });
        }
        return json({ success: true, message: "Invitation email sent.", user_id: invitedUser.id || null });
      }
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "A valid user ID is required." }, 400);
      if (id === actorId && ["suspend", "delete"].includes(action)) return json({ error: "You cannot suspend or delete your own signed-in account." }, 400);
      if (action === "suspend" || action === "unsuspend") {
        await authAdminRequest(env, `/admin/users/${encodeURIComponent(id)}`, "PUT", { ban_duration: action === "suspend" ? "876000h" : "none" });
        return json({ success: true, message: action === "suspend" ? "Account suspended." : "Account suspension lifted." });
      }
      if (action === "reset_password") {
        const targetResult = await authAdminRequest(env, `/admin/users/${encodeURIComponent(id)}`);
        const target = targetResult.user || targetResult;
        if (!target.email) return json({ error: "This account has no email address for password recovery." }, 400);
        const origin = new URL(request.url).origin;
        await authAdminRequest(env, `/recover?redirect_to=${encodeURIComponent(`${origin}/profile`)}`, "POST", { email: target.email });
        return json({ success: true, message: `Password reset email sent to ${target.email}.` });
      }
      if (action === "delete") {
        await authAdminRequest(env, `/admin/users/${encodeURIComponent(id)}`, "DELETE");
        return json({ success: true, message: "User account permanently deleted." });
      }
      return json({ error: "Unsupported user-management action." }, 400);
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    return json({ error: error.message || "User management request failed." }, 502);
  }
}


let fcmAccessTokenCache = null;

function base64Url(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function pemBytes(pem) {
  const body = String(pem).replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(body);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function getFcmAccessToken(serviceAccount) {
  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAt > Date.now() + 60000) return fcmAccessTokenCache.token;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8', pemBytes(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error(result.error_description || 'Could not authenticate with Firebase Cloud Messaging.');
  fcmAccessTokenCache = { token: result.access_token, expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000 };
  return result.access_token;
}

async function sendPushToAdmins(env, title, body, path = '/admin') {
  if (!env.FCM_SERVICE_ACCOUNT_JSON) {
    console.warn('FCM_SERVICE_ACCOUNT_JSON is not configured; push notification was not sent.');
    return { sent: 0, configured: false };
  }
  try {
    const serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON);
    const profiles = await supabaseRequest(env, "profiles?select=id&role=in.(admin,super_admin)");
    const ids = (profiles || []).map(row => row.id).filter(Boolean);
    if (!ids.length) return { sent: 0, configured: true };
    const filter = ids.map(id => `"${id}"`).join(',');
    const devices = await supabaseRequest(env, `push_devices?select=id,token&active=eq.true&user_id=in.(${encodeURIComponent(filter)})`);
    const accessToken = await getFcmAccessToken(serviceAccount);
    let sent = 0;
    for (const device of devices || []) {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(serviceAccount.project_id)}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: device.token,
            notification: { title, body },
            data: { path, type: 'tidori_alert' },
            android: { priority: 'HIGH', notification: { channel_id: 'tidori_alerts', sound: 'default' } },
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) sent += 1;
      else if (result.error?.details?.some(item => item.errorCode === 'UNREGISTERED')) {
        await supabaseRequest(env, `push_devices?id=eq.${encodeURIComponent(device.id)}`, {
          method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ active: false }),
        }).catch(() => {});
      } else {
        console.error('FCM send failed:', result.error?.message || response.status);
      }
    }
    return { sent, configured: true };
  } catch (error) {
    console.error('Tidori push delivery failed:', error);
    return { sent: 0, configured: true, error: error.message };
  }
}

async function authenticatePushUser(request, env) {
  const authorization = request.headers.get('authorization') || '';
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return { error: json({ error: 'Sign in to register this device for Tidori alerts.' }, 401) };
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return { error: json({ error: 'Your Tidori session has expired. Please sign in again.' }, 401) };
  return { user: await response.json() };
}

async function pushDevice(request, env) {
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(key => !env[key]);
  if (missing.length) return json({ error: `Worker configuration missing: ${missing.join(', ')}` }, 503);
  const auth = await authenticatePushUser(request, env);
  if (auth.error) return auth.error;
  const input = await request.json().catch(() => ({}));
  const token = clean(input.token, 4096);
  if (request.method === 'POST') {
    if (token.length < 40) return json({ error: 'A valid Firebase device token is required.' }, 400);
    const platform = ['android', 'ios', 'web'].includes(input.platform) ? input.platform : 'android';
    await supabaseRequest(env, 'push_devices?on_conflict=token', {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ user_id: auth.user.id, token, platform, active: true, updated_at: new Date().toISOString() }]),
    });
    return json({ success: true, message: 'This device is registered for Tidori notifications.' });
  }
  if (request.method === 'DELETE') {
    if (!token) return json({ error: 'The device token is required.' }, 400);
    await supabaseRequest(env, `push_devices?user_id=eq.${encodeURIComponent(auth.user.id)}&token=eq.${encodeURIComponent(token)}`, {
      method: 'DELETE', headers: { prefer: 'return=minimal' },
    });
    return json({ success: true });
  }
  return json({ error: 'Method not allowed.' }, 405);
}

async function databasePushEvent(request, env) {
  const expected = String(env.SUPABASE_WEBHOOK_SECRET || '');
  const supplied = request.headers.get('x-tidori-webhook-secret') || '';
  if (!expected || supplied !== expected) return json({ error: 'Unauthorised notification event.' }, 401);
  const payload = await request.json().catch(() => null);
  if (!payload) return json({ error: 'Invalid database event payload.' }, 400);
  const table = clean(payload.table, 80);
  const event = String(payload.type || payload.event || '').toUpperCase();
  const record = payload.record || payload.new || {};
  if (event !== 'INSERT' || !record.id || !['profiles', 'appointments'].includes(table)) {
    return json({ ignored: true, message: 'This database event does not create a Tidori alert.' });
  }
  const eventKey = `${table}:INSERT:${record.id}`;
  const receipts = await supabaseRequest(env, 'push_event_receipts?on_conflict=event_key', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify([{ event_key: eventKey, event_type: table }]),
  });
  if (!receipts?.length) return json({ duplicate: true, sent: 0 });
  let title;
  let message;
  if (table === 'profiles') {
    title = 'New Tidori user registered';
    message = 'A new user account has been registered.';
  } else {
    title = 'New appointment received';
    message = `A new ${clean(record.appointment_type || 'church', 80)} appointment request has been received.`;
  }
  const result = await sendPushToAdmins(env, title, message, table === 'profiles' ? '/admin' : '/admin');
  return json({ success: true, sent: result.sent, configured: result.configured });
}

async function verifyPayment(env, trackingId, merchantReference) {
  const token = await pesapalToken(env);
  const url = new URL(`${PESAPAL_BASE}/api/Transactions/GetTransactionStatus`);
  url.searchParams.set("orderTrackingId", trackingId);
  const response = await fetch(url, { headers: { accept: "application/json", authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok || data.error || String(data.merchant_reference || "") !== merchantReference) {
    throw new Error(data.error?.message || "Could not verify the Pesapal transaction reference.");
  }

  const records = await supabaseRequest(env,
    `donation_pledges?select=amount,currency&merchant_reference=eq.${encodeURIComponent(merchantReference)}&pesapal_order_tracking_id=eq.${encodeURIComponent(trackingId)}&limit=1`
  );
  const donation = records?.[0];
  if (!donation) throw new Error("No matching donation record exists for this Pesapal transaction.");
  if (String(data.currency || "").toUpperCase() !== String(donation.currency).toUpperCase()
      || Math.abs(Number(data.amount) - Number(donation.amount)) > 0.01) {
    throw new Error("The verified Pesapal amount or currency does not match the donation.");
  }

  const status = String(data.payment_status_description || "").toUpperCase();
  const paymentStatus = status === "COMPLETED" || Number(data.status_code) === 1
    ? "paid"
    : status === "FAILED" || Number(data.status_code) === 2
      ? "failed"
      : status === "REVERSED" || Number(data.status_code) === 3
        ? "reversed"
        : "pending";

  const updated = await supabaseRequest(env,
    `donation_pledges?merchant_reference=eq.${encodeURIComponent(merchantReference)}&pesapal_order_tracking_id=eq.${encodeURIComponent(trackingId)}${paymentStatus === "paid" ? "&status=neq.paid" : ""}`,
    {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        status: paymentStatus,
        payment_method: clean(data.payment_method, 80) || null,
        confirmation_code: clean(data.confirmation_code, 120) || null,
        paid_at: paymentStatus === "paid" ? (data.created_date || new Date().toISOString()) : null,
      }),
    }
  );
  // Notify only when the verified Pesapal status first transitions to paid.
  if (paymentStatus === "paid" && updated?.length) {
    await sendPushToAdmins(env, 'Successful Tidori payment', `${data.currency} ${Number(data.amount).toLocaleString()} donation received and verified.`, '/admin');
  }
  return { paymentStatus, amount: data.amount, currency: data.currency, paymentMethod: data.payment_method };
}

async function createPayment(request, env) {
  const missing = requiredEnv(env);
  if (missing.length) return json({ error: `Cloudflare is missing: ${missing.join(", ")}` }, 503);

  const input = await request.json().catch(() => null);
  if (!input) return json({ error: "Invalid request body." }, 400);
  const name = clean(input.name, 120);
  const email = clean(input.email, 200).toLowerCase();
  const phone = clean(input.phone, 40);
  const amount = Number(input.amount);
  const projectId = input.project_id && /^[0-9a-f-]{36}$/i.test(input.project_id) ? input.project_id : null;

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Enter your name and a valid email address." }, 400);
  }
  if (!Number.isFinite(amount) || amount < 1 || amount > 1000000) {
    return json({ error: "Enter a valid donation amount." }, 400);
  }

  const currency = clean(env.PESAPAL_CURRENCY || "USD", 3).toUpperCase();
  const merchantReference = `TIDORI-${crypto.randomUUID()}`;
  const [firstName, ...lastParts] = name.split(/\s+/);
  const lastName = lastParts.join(" ");

  const rows = await supabaseRequest(env, "donation_pledges", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify([{
      name, email, amount: Number(amount.toFixed(2)), project_id: projectId,
      status: "pending", currency, merchant_reference: merchantReference, phone: phone || null,
    }]),
  });
  if (!rows?.[0]?.id) throw new Error("Could not save your donation record.");

  try {
    const token = await pesapalToken(env);
    const origin = new URL(request.url).origin;
    const ipnRegistration = await ensurePesapalIpn(env, token, origin);
    const notificationId = ipnRegistration.ipn_id;
    const order = await pesapalCall(env, "/api/Transactions/SubmitOrderRequest", token, {
      id: merchantReference,
      currency,
      amount: Number(amount.toFixed(2)),
      description: "Donation to Tidori Ministries",
      callback_url: `${origin}/api/payments/pesapal/callback`,
      redirect_mode: "PARENT_WINDOW",
      cancellation_url: `${origin}/give?payment=cancelled&reference=${encodeURIComponent(merchantReference)}`,
      notification_id: notificationId,
      billing_address: {
        email_address: email,
        phone_number: phone || undefined,
        country_code: "UG",
        first_name: firstName,
        last_name: lastName,
      },
    });
    if (!order.redirect_url || !order.order_tracking_id) throw new Error("Pesapal did not return a checkout link.");
    await supabaseRequest(env,
      `donation_pledges?id=eq.${encodeURIComponent(rows[0].id)}`,
      {
        method: "PATCH",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({ pesapal_order_tracking_id: order.order_tracking_id }),
      }
    );
    return json({ redirect_url: order.redirect_url, reference: merchantReference });
  } catch (error) {
    await supabaseRequest(env,
      `donation_pledges?id=eq.${encodeURIComponent(rows[0].id)}`,
      { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: "failed" }) }
    ).catch(() => {});
    throw error;
  }
}


async function handleNotification(request, env, isCallback) {
  const url = new URL(request.url);
  let payload = Object.fromEntries(url.searchParams.entries());
  if (request.method === "POST") {
    const type = request.headers.get("content-type") || "";
    if (type.includes("application/json")) payload = { ...payload, ...(await request.json().catch(() => ({}))) };
    else if (type.includes("application/x-www-form-urlencoded")) payload = { ...payload, ...Object.fromEntries(new URLSearchParams(await request.text())) };
  }
  const trackingId = clean(payload.OrderTrackingId || payload.orderTrackingId, 100);
  const merchantReference = clean(payload.OrderMerchantReference || payload.orderMerchantReference, 100);
  let result = null;
  try {
    if (trackingId && merchantReference) result = await verifyPayment(env, trackingId, merchantReference);
  } catch (error) {
    if (!isCallback) return json({ orderNotificationType: "IPNCHANGE", orderTrackingId: trackingId, orderMerchantReference: merchantReference, status: 500 }, 500);
  }
  if (isCallback) {
    const status = result?.paymentStatus || "processing";
    return Response.redirect(`${url.origin}/give?payment=${encodeURIComponent(status)}&reference=${encodeURIComponent(merchantReference)}`, 302);
  }
  return json({
    orderNotificationType: payload.OrderNotificationType || "IPNCHANGE",
    orderTrackingId: trackingId,
    orderMerchantReference: merchantReference,
    status: result ? 200 : 500,
  }, result ? 200 : 500);
}

async function paymentStatus(request, env) {
  const reference = clean(new URL(request.url).searchParams.get("reference"), 100);
  if (!/^TIDORI-[0-9a-f-]{36}$/i.test(reference)) return json({ error: "Invalid reference." }, 400);
  const rows = await supabaseRequest(env,
    `donation_pledges?select=status,currency,amount,paid_at&merchant_reference=eq.${encodeURIComponent(reference)}&limit=1`
  );
  if (!rows?.length) return json({ error: "Donation not found." }, 404);
  return json(rows[0]);
}


/**
 * Two-person WebRTC signalling relay. Media travels peer-to-peer; this Durable
 * Object relays only SDP/ICE signalling and never records audio or video.
 * The unguessable room code is a bearer invitation and is checked against the
 * confirmed appointment before a socket is routed here.
 */
export class VideoRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required.", { status: 426 });
    }
    const peers = this.ctx.getWebSockets();
    if (peers.length >= 2) {
      return new Response("This meeting already has two connected participants.", { status: 409 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: crypto.randomUUID() });
    for (const peer of peers) {
      try { peer.send(JSON.stringify({ type: "peer-joined" })); } catch {}
    }
    server.send(JSON.stringify({ type: "room-state", peerCount: peers.length + 1 }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, message) {
    if (typeof message !== "string" || message.length > 65536) return;
    let packet;
    try { packet = JSON.parse(message); } catch { return; }
    if (!packet || !["offer", "answer", "ice", "hangup", "ready"].includes(packet.type)) return;
    const safe = JSON.stringify({
      type: packet.type,
      ...(packet.type === "offer" || packet.type === "answer" ? { description: packet.description } : {}),
      ...(packet.type === "ice" ? { candidate: packet.candidate } : {}),
    });
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === socket) continue;
      try { peer.send(safe); } catch {}
    }
  }

  webSocketClose(socket) {
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === socket) continue;
      try { peer.send(JSON.stringify({ type: "peer-left" })); } catch {}
    }
  }

  webSocketError(socket) {
    this.webSocketClose(socket);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      const videoSignalMatch = url.pathname.match(/^\/api\/video\/rooms\/([0-9a-f-]{36})\/signal$/i);
      if (videoSignalMatch && request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
        if (!env.VIDEO_ROOMS || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
          return json({ error: "Video calling is not configured on this Worker yet." }, 503);
        }
        const roomCode = videoSignalMatch[1];
        const rooms = await supabaseRequest(env,
          `video_call_rooms?select=id,status,appointment:appointments!inner(status,meeting_mode)&room_code=eq.${encodeURIComponent(roomCode)}&limit=1`
        );
        const room = rooms?.[0];
        if (!room || !["scheduled", "live"].includes(room.status)
          || room.appointment?.status !== "confirmed" || room.appointment?.meeting_mode !== "video") {
          return json({ error: "This meeting link is invalid, expired or not yet approved." }, 404);
        }
        const id = env.VIDEO_ROOMS.idFromName(roomCode);
        return env.VIDEO_ROOMS.get(id).fetch(request);
      }
      if (url.pathname === "/api/push/register" && ["POST", "DELETE"].includes(request.method)) {
        return await pushDevice(request, env);
      }
      if (url.pathname === "/api/notifications/database-event" && request.method === "POST") {
        return await databasePushEvent(request, env);
      }
      if (url.pathname === "/api/admin/users" && ["GET", "POST", "PATCH"].includes(request.method)) {
        return await adminUsers(request, env);
      }
      if (url.pathname === "/api/admin/pesapal/ipn" && ["GET", "POST"].includes(request.method)) {
        return await adminPesapalIpn(request, env);
      }
      if (url.pathname === "/api/payments/pesapal/create" && request.method === "POST") {
        return await createPayment(request, env);
      }
      if (url.pathname === "/api/payments/pesapal/ipn" && ["GET", "POST"].includes(request.method)) {
        return await handleNotification(request, env, false);
      }
      if (url.pathname === "/api/payments/pesapal/callback" && request.method === "GET") {
        return await handleNotification(request, env, true);
      }
      if (url.pathname === "/api/payments/status" && request.method === "GET") {
        return await paymentStatus(request, env);
      }
      if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);

      // Cloudflare's [assets] not_found_handling = "single-page-application"
      // serves index.html for React Router paths (including /admin).
      // Let the asset binding handle that fallback; avoid constructing a
      // second document request which can cause redirect loops.
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("Tidori Worker request failed:", error);
      return json({ error: "The request could not be completed. Please try again." }, 500);
    }
  },
};
