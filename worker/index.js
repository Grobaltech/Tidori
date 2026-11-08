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

async function sendPushToUsers(env, userIds, title, body, path = '/notifications') {
  if (!env.FCM_SERVICE_ACCOUNT_JSON) {
    console.warn('FCM_SERVICE_ACCOUNT_JSON is not configured; push notification was not sent.');
    return { sent: 0, configured: false };
  }
  try {
    const ids = [...new Set((userIds || []).filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))];
    if (!ids.length) return { sent: 0, configured: true };
    const serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON);
    const filter = ids.map(id => `"${id}"`).join(',');
    const devices = await supabaseRequest(env, `push_devices?select=id,token&active=eq.true&user_id=in.(${encodeURIComponent(filter)})`);
    const accessToken = await getFcmAccessToken(serviceAccount);
    let sent = 0;
    for (const device of devices || []) {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(serviceAccount.project_id)}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ message: {
          token: device.token,
          notification: { title, body },
          data: { path: typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/notifications', type: 'tidori_alert' },
          android: { priority: 'HIGH', notification: { channel_id: 'tidori_alerts', sound: 'default' } },
        } }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) sent += 1;
      else if (result.error?.details?.some(item => item.errorCode === 'UNREGISTERED')) {
        await supabaseRequest(env, `push_devices?id=eq.${encodeURIComponent(device.id)}`, {
          method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ active: false }),
        }).catch(() => {});
      } else console.error('FCM send failed:', result.error?.message || response.status);
    }
    return { sent, configured: true };
  } catch (error) {
    console.error('Tidori push delivery failed:', error);
    return { sent: 0, configured: true, error: error.message };
  }
}

async function sendPushToAdmins(env, title, body, path = '/admin') {
  try {
    const profiles = await supabaseRequest(env, "profiles?select=id&role=in.(admin,super_admin)");
    return await sendPushToUsers(env, (profiles || []).map(row => row.id), title, body, path);
  } catch (error) {
    console.error('Tidori administrator push lookup failed:', error);
    return { sent: 0, configured: Boolean(env.FCM_SERVICE_ACCOUNT_JSON), error: error.message };
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
  if (event !== 'INSERT' || !record.id || !['profiles', 'notifications'].includes(table)) {
    return json({ ignored: true, message: 'This database event does not create a Tidori alert.' });
  }
  const eventKey = `${table}:INSERT:${record.id}`;
  const receipts = await supabaseRequest(env, 'push_event_receipts?on_conflict=event_key', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify([{ event_key: eventKey, event_type: table }]),
  });
  if (!receipts?.length) return json({ duplicate: true, sent: 0 });
  if (table === 'notifications') {
    const result = await sendPushToUsers(env, [record.user_id], clean(record.title || 'Tidori notification', 160),
      clean(record.body || 'You have a new update.', 1000),
      typeof record.action_path === 'string' ? record.action_path : '/notifications');
    return json({ success: true, sent: result.sent, configured: result.configured });
  }
  const title = table === 'profiles' ? 'New Tidori user registered' : 'New appointment received';
  const message = table === 'profiles'
    ? 'A new user account has been registered.'
    : `A new ${clean(record.appointment_type || 'church', 80)} appointment request has been received.`;
  const result = await sendPushToAdmins(env, title, message, '/admin');
  return json({ success: true, sent: result.sent, configured: result.configured });
}


async function appointmentFees(request, env) {
  const rows = await supabaseRequest(env, "appointment_fee_rules?select=id,appointment_type,meeting_mode,amount,currency&is_active=eq.true&order=appointment_type.asc");
  return json({ rules: rows || [] });
}

async function createAppointmentRequest(request, env) {
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(key => !env[key]);
  if (missing.length) return json({ error: "Appointment service is not configured.", missing }, 503);
  const input = await request.json().catch(() => null);
  if (!input) return json({ error: "Invalid appointment request." }, 400);
  const fullName = clean(input.full_name, 120);
  const email = clean(input.email, 200).toLowerCase();
  const phone = clean(input.phone, 40);
  const appointmentType = clean(input.appointment_type, 120);
  const meetingMode = clean(input.meeting_mode, 20);
  const requestedAt = new Date(input.requested_at);
  if (fullName.length < 2 || phone.length < 6 || !appointmentType
      || !["in_person", "phone", "audio", "video"].includes(meetingMode)
      || !Number.isFinite(requestedAt.getTime()) || requestedAt.getTime() < Date.now() - 60000) {
    return json({ error: "Complete your name, phone, appointment details and choose a future date and time." }, 400);
  }

  let userId = null;
  const accessToken = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (accessToken) {
    const authResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${accessToken}` },
    });
    if (!authResponse.ok) return json({ error: "Your sign-in session has expired. Sign in again." }, 401);
    const authUser = await authResponse.json();
    userId = authUser.id;
  }

  const rules = await supabaseRequest(env,
    `appointment_fee_rules?select=id,amount,currency&appointment_type=eq.${encodeURIComponent(appointmentType)}&meeting_mode=eq.${encodeURIComponent(meetingMode)}&is_active=eq.true&limit=1`
  );
  const rule = rules?.[0];
  if (!rule) return json({ error: "This appointment type and meeting method is not currently configured. Please contact the church office." }, 409);
  const amount = Number(rule.amount);
  const currency = String(rule.currency || "UGX").toUpperCase();
  if (amount > 0 && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return json({ error: "A valid email address is required for secure online payment." }, 400);
  }

  const merchantReference = amount > 0 ? `TIDORI-APPT-${crypto.randomUUID()}` : null;
  const rows = await supabaseRequest(env, "appointments", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify([{
      user_id: userId, full_name: fullName, email: email || null, phone,
      appointment_type: appointmentType, meeting_mode: meetingMode,
      requested_at: requestedAt.toISOString(), notes: clean(input.notes, 2000) || null,
      status: "requested", payment_status: "unpaid", fee_amount: amount,
      currency, fee_rule_id: rule.id, pesapal_merchant_reference: merchantReference,
    }]),
  });
  const appointment = rows?.[0];
  if (!appointment?.id) throw new Error("The appointment request could not be saved.");

  if (amount === 0) return json({ success: true, appointment_id: appointment.id, fee_amount: 0, currency, free: true });

  try {
    const token = await pesapalToken(env);
    const origin = new URL(request.url).origin;
    const ipnRegistration = await ensurePesapalIpn(env, token, origin);
    const [firstName, ...lastParts] = fullName.split(/\s+/);
    const order = await pesapalCall(env, "/api/Transactions/SubmitOrderRequest", token, {
      id: merchantReference, currency, amount: Number(amount.toFixed(2)),
      description: `Tidori appointment: ${appointmentType}`,
      callback_url: `${origin}/api/payments/pesapal/callback`,
      redirect_mode: "PARENT_WINDOW",
      cancellation_url: `${origin}/appointments?payment=cancelled&reference=${encodeURIComponent(merchantReference)}`,
      notification_id: ipnRegistration.ipn_id,
      billing_address: {
        email_address: email, phone_number: phone || undefined, country_code: "UG",
        first_name: firstName, last_name: lastParts.join(" "),
      },
    });
    if (!order.redirect_url || !order.order_tracking_id) throw new Error("Pesapal did not return a checkout link.");
    await supabaseRequest(env, `appointments?id=eq.${encodeURIComponent(appointment.id)}`, {
      method: "PATCH", headers: { prefer: "return=minimal" },
      body: JSON.stringify({ pesapal_order_tracking_id: order.order_tracking_id }),
    });
    return json({ success: true, appointment_id: appointment.id, redirect_url: order.redirect_url, reference: merchantReference, fee_amount: amount, currency });
  } catch (error) {
    console.error("Appointment checkout creation failed:", error);
    return json({ error: "Your appointment request was saved, but payment checkout could not start. Please contact the church office with your name and phone number." }, 502);
  }
}

async function requireApplicant(request, env) {
  const token = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: json({ error: "Sign in to your Tidori account before applying." }, 401) };
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { error: json({ error: "Your session has expired. Please sign in again." }, 401) };
  return { user: await response.json() };
}

async function createBursaryPayment(request, env) {
  const missing = requiredEnv(env);
  if (missing.length) return json({ error: `Cloudflare is missing: ${missing.join(", ")}` }, 503);
  const access = await requireApplicant(request, env);
  if (access.error) return access.error;
  const user = access.user;
  const input = await request.json().catch(() => ({}));
  const name = clean(input.name, 120);
  const email = clean(input.email || user.email, 200).toLowerCase();
  const phone = clean(input.phone, 40);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter the applicant's full name and a valid email." }, 400);
  const existingPending = await supabaseRequest(env, `bursary_applications?select=merchant_reference&applicant_id=eq.${encodeURIComponent(user.id)}&payment_status=eq.pending&application_status=eq.awaiting_payment&limit=1`);
  if (existingPending?.length) return json({ error: "You already have a bursary payment awaiting Pesapal confirmation. Please refresh your application status instead of paying again.", reference: existingPending[0].merchant_reference }, 409);
  const reference = `TIDORI-BURSARY-${crypto.randomUUID()}`;
  const rows = await supabaseRequest(env, "bursary_applications", {
    method: "POST", headers: { prefer: "return=representation" },
    body: JSON.stringify([{ applicant_id: user.id, applicant_name: name, applicant_email: email, applicant_phone: phone || null,
      application_fee: 11000, currency: "UGX", payment_status: "pending", application_status: "awaiting_payment", merchant_reference: reference }]),
  });
  const row = rows?.[0];
  if (!row?.id) throw new Error("Could not create the bursary payment record.");
  try {
    const token = await pesapalToken(env);
    const origin = new URL(request.url).origin;
    const ipn = await ensurePesapalIpn(env, token, origin);
    const [firstName, ...last] = name.split(/\s+/);
    const order = await pesapalCall(env, "/api/Transactions/SubmitOrderRequest", token, {
      id: reference, currency: "UGX", amount: 11000, description: "Tidori Bursary and Scholarship Application Fee",
      callback_url: `${origin}/api/payments/pesapal/callback`, redirect_mode: "PARENT_WINDOW",
      cancellation_url: `${origin}/bursaries?payment=cancelled&reference=${encodeURIComponent(reference)}`,
      notification_id: ipn.ipn_id,
      billing_address: { email_address: email, phone_number: phone || undefined, country_code: "UG", first_name: firstName, last_name: last.join(" ") },
    });
    if (!order.redirect_url || !order.order_tracking_id) throw new Error("Pesapal did not return a checkout link.");
    await supabaseRequest(env, `bursary_applications?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ pesapal_order_tracking_id: order.order_tracking_id }),
    });
    return json({ redirect_url: order.redirect_url, reference });
  } catch (error) {
    await supabaseRequest(env, `bursary_applications?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ payment_status: "failed" }),
    }).catch(() => {});
    throw error;
  }
}

async function bursaryApplicantApi(request, env) {
  const access = await requireApplicant(request, env);
  if (access.error) return access.error;
  const user = access.user;
  if (request.method === "GET") {
    let rows = await supabaseRequest(env, `bursary_applications?select=*&applicant_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`);
    // TEMPORARY ACCESS MODE: make the application form available while Pesapal
    // verification is being repaired. Drafts remain payment_status=pending so
    // they are never mistaken for verified/paid applications.
    const hasOpenApplication = (rows || []).some((row) =>
      row.payment_status === "paid" || row.application_status === "draft" || row.application_status === "submitted"
    );
    if (!hasOpenApplication) {
      const draftReference = `TIDORI-BURSARY-DRAFT-${crypto.randomUUID()}`;
      const created = await supabaseRequest(env, "bursary_applications", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify([{
          applicant_id: user.id,
          applicant_name: clean(user.user_metadata?.full_name || user.email || "Applicant"),
          applicant_email: clean(user.email || "", 254),
          application_fee: 11000,
          currency: "UGX",
          payment_status: "pending",
          application_status: "draft",
          merchant_reference: draftReference,
        }]),
      });
      if (created?.[0]) rows = [created[0], ...(rows || [])];
    }
    return json({ applications: rows || [], temporary_access: true });
  }
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") return json({ error: "Invalid application data." }, 400);
  const id = clean(input.application_id, 50);
  const rows = await supabaseRequest(env, `bursary_applications?select=id,payment_status,application_status& id=eq.${encodeURIComponent(id)}&applicant_id=eq.${encodeURIComponent(user.id)}&limit=1`.replace("& id=", "&id="));
  const application = rows?.[0];
  if (!application) return json({ error: "Application not found." }, 404);
  const temporaryDraftAccess = application.application_status === "draft";
  if (application.payment_status !== "paid" && !temporaryDraftAccess) {
    return json({ error: "This application is not eligible for submission." }, 402);
  }
  const required = ["applicant_name","class_applied_for","level_applied_for","guardian_name","guardian_contact","region","district","county","subcounty","parish","village","former_school","stipulated_results","first_choice","option_one","option_two","national_id_number","national_id_document_path","passport_photo_path"];
  for (const field of required) if (!clean(input[field], 500)) return json({ error: `Please complete ${field.replaceAll("_", " ")}.` }, 400);
  const nationalId = clean(input.national_id_number, 20).toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z0-9]{8,20}$/.test(nationalId)) return json({ error: "Enter a valid National Identification Number." }, 400);
  const patch = {};
  for (const field of required) patch[field] = field === "national_id_number" ? nationalId : clean(input[field], field === "stipulated_results" ? 3000 : 500);
  for (const field of ["guardian_email","applicant_photo_url","national_id_document_path","passport_photo_path"]) if (input[field] !== undefined) patch[field] = clean(input[field], 500) || null;
  patch.application_status = "submitted";
  patch.submitted_at = new Date().toISOString();
  const paymentFilter = temporaryDraftAccess ? "application_status=eq.draft" : "payment_status=eq.paid";
  const updated = await supabaseRequest(env, `bursary_applications?id=eq.${encodeURIComponent(id)}&applicant_id=eq.${encodeURIComponent(user.id)}&${paymentFilter}`, {
    method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(patch),
  });
  return json({ success: Boolean(updated?.length), application: updated?.[0] || null });
}

async function verifyPayment(env, trackingId, merchantReference) {
  const token = await pesapalToken(env);
  const url = new URL(`${PESAPAL_BASE}/api/Transactions/GetTransactionStatus`);
  url.searchParams.set("orderTrackingId", trackingId);
  const response = await fetch(url, { headers: { accept: "application/json", authorization: `Bearer ${token}` } });
  const data = await response.json();
  // Pesapal's documented successful response may still contain an
  // "error" object whose fields are all null. Only treat it as an error
  // when it actually contains an error code/type/message.
  const apiError = data?.error && (
    data.error.message || data.error.code || data.error.error_type || data.error.type
  );
  if (!response.ok || apiError || String(data.merchant_reference || "") !== merchantReference) {
    const reason = apiError
      ? String(data.error.message || data.error.code || data.error.error_type || data.error.type)
      : !response.ok
        ? `Pesapal status request failed with HTTP ${response.status}.`
        : "Pesapal returned a different merchant reference.";
    console.error("Pesapal status verification rejected:", {
      trackingId,
      merchantReference,
      httpStatus: response.status,
      returnedMerchantReference: data?.merchant_reference || null,
      apiError: apiError || null,
      reason,
    });
    throw new Error(reason);
  }

  const status = String(data.payment_status_description || "").toUpperCase();
  const paymentStatus = status === "COMPLETED" || Number(data.status_code) === 1
    ? "paid"
    : status === "FAILED" || Number(data.status_code) === 2
      ? "failed"
      : status === "REVERSED" || Number(data.status_code) === 3
        ? "reversed"
        : "pending";

  if (merchantReference.startsWith("TIDORI-BURSARY-")) {
    const records = await supabaseRequest(env, `bursary_applications?select=id,application_fee,currency,payment_status&merchant_reference=eq.${encodeURIComponent(merchantReference)}&pesapal_order_tracking_id=eq.${encodeURIComponent(trackingId)}&limit=1`);
    const application = records?.[0];
    if (!application) throw new Error("No matching bursary application payment exists.");
    if (String(data.currency || "").toUpperCase() !== "UGX" || Math.abs(Number(data.amount) - 11000) > 0.01
        || Number(application.application_fee) !== 11000 || String(application.currency).toUpperCase() !== "UGX") {
      throw new Error("The verified Pesapal amount or currency does not match the UGX 11,000 bursary application fee.");
    }
    const updated = await supabaseRequest(env, `bursary_applications?id=eq.${encodeURIComponent(application.id)}&pesapal_order_tracking_id=eq.${encodeURIComponent(trackingId)}`, {
      method: "PATCH", headers: { prefer: "return=representation" },
      body: JSON.stringify({ payment_status: paymentStatus, ...(paymentStatus === "paid" ? {
        paid_at: data.created_date || new Date().toISOString(),
        application_serial: `TMB-${new Date().getFullYear()}-${application.id.slice(0,8).toUpperCase()}`,
      } : {}) }),
    });
    return { paymentStatus, amount: data.amount, currency: data.currency, bursary: true, updated: Boolean(updated?.length) };
  }

  if (merchantReference.startsWith("TIDORI-APPT-")) {
    const records = await supabaseRequest(env,
      `appointments?select=id,fee_amount,currency,payment_status&pesapal_merchant_reference=eq.${encodeURIComponent(merchantReference)}&pesapal_order_tracking_id=eq.${encodeURIComponent(trackingId)}&limit=1`
    );
    const appointment = records?.[0];
    if (!appointment) throw new Error("No matching appointment payment record exists.");
    if (String(data.currency || "").toUpperCase() !== String(appointment.currency || "UGX").toUpperCase()
        || Math.abs(Number(data.amount) - Number(appointment.fee_amount)) > 0.01) {
      throw new Error("The verified Pesapal amount or currency does not match this appointment.");
    }
    const updated = await supabaseRequest(env,
      `appointments?id=eq.${encodeURIComponent(appointment.id)}&pesapal_order_tracking_id=eq.${encodeURIComponent(trackingId)}`,
      { method: "PATCH", headers: { prefer: "return=representation" },
        body: JSON.stringify({
          ...(paymentStatus === "paid" ? { payment_status: "paid", paid_at: data.created_date || new Date().toISOString() } : {}),
          ...(data.payment_method ? { payment_method: clean(data.payment_method, 80) } : {}),
          ...(data.confirmation_code ? { payment_reference: clean(data.confirmation_code, 120) } : {}),
        }) }
    );
    return { paymentStatus, amount: data.amount, currency: data.currency, paymentMethod: data.payment_method, appointment: true, updated: Boolean(updated?.length) };
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

  const allowedCurrencies = new Set(["UGX","USD","EUR","GBP","KES","TZS","RWF","MWK","ZMW"]);
  const currency = clean(input.currency || "UGX", 3).toUpperCase();
  if (!allowedCurrencies.has(currency)) return json({ error: "Please select a supported giving currency." }, 400);
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
    // Keep the callback response user-friendly, but never hide the reason a
    // payment could not be reconciled. Do not log donor names, email or phone.
    console.error("Pesapal payment verification failed:", {
      source: isCallback ? "callback" : "ipn",
      trackingId,
      merchantReference,
      error: error?.message || String(error),
    });
    if (!isCallback) return json({ orderNotificationType: "IPNCHANGE", orderTrackingId: trackingId, orderMerchantReference: merchantReference, status: 500 }, 500);
  }
  if (isCallback) {
    const status = result?.paymentStatus || "processing";
    const destination = merchantReference.startsWith("TIDORI-APPT-") ? "/appointments" : merchantReference.startsWith("TIDORI-BURSARY-") ? "/bursaries" : "/give";
    return Response.redirect(`${url.origin}${destination}?payment=${encodeURIComponent(status)}&reference=${encodeURIComponent(merchantReference)}`, 302);
  }
  return json({
    orderNotificationType: payload.OrderNotificationType || "IPNCHANGE",
    orderTrackingId: trackingId,
    orderMerchantReference: merchantReference,
    status: result ? 200 : 500,
  }, result ? 200 : 500);
}


async function reconcilePesapalPayment(request, env) {
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PESAPAL_CONSUMER_KEY", "PESAPAL_CONSUMER_SECRET"].filter(key => !env[key]);
  if (missing.length) return json({ error: "Payment verification is not configured.", missing }, 503);
  const access = await requireSuperAdmin(request, env);
  if (access.error) return access.error;
  const input = await request.json().catch(() => ({}));
  const reference = clean(input.reference, 120);
  if (!/^TIDORI-(?:APPT-)?[0-9a-f-]{36}$/i.test(reference)) return json({ error: "Invalid Tidori payment reference." }, 400);
  try {
    let trackingId = "";
    if (reference.startsWith("TIDORI-APPT-")) {
      const rows = await supabaseRequest(env, `appointments?select=pesapal_order_tracking_id&pesapal_merchant_reference=eq.${encodeURIComponent(reference)}&limit=1`);
      trackingId = rows?.[0]?.pesapal_order_tracking_id || "";
    } else {
      const rows = await supabaseRequest(env, `donation_pledges?select=pesapal_order_tracking_id&merchant_reference=eq.${encodeURIComponent(reference)}&limit=1`);
      trackingId = rows?.[0]?.pesapal_order_tracking_id || "";
    }
    if (!trackingId) return json({ error: "No Pesapal tracking ID is saved for this payment. It cannot yet be reconciled automatically." }, 404);
    const result = await verifyPayment(env, trackingId, reference);
    return json({ success: true, reference, ...result });
  } catch (error) {
    console.error("Admin Pesapal reconciliation failed:", reference, error);
    return json({ error: error.message || "Pesapal could not verify this payment." }, 502);
  }
}

async function paymentStatus(request, env) {
  const reference = clean(new URL(request.url).searchParams.get("reference"), 120);
  if (reference.startsWith("TIDORI-APPT-")) {
    const rows = await supabaseRequest(env,
      `appointments?select=payment_status,currency,fee_amount,paid_at,status&pesapal_merchant_reference=eq.${encodeURIComponent(reference)}&limit=1`
    );
    if (!rows?.length) return json({ error: "Appointment payment not found." }, 404);
    return json({ status: rows[0].payment_status, ...rows[0] });
  }
  if (!/^TIDORI-[0-9a-f-]{36}$/i.test(reference)) return json({ error: "Invalid reference." }, 400);
  const rows = await supabaseRequest(env,
    `donation_pledges?select=status,currency,amount,paid_at,merchant_reference,pesapal_order_tracking_id&merchant_reference=eq.${encodeURIComponent(reference)}&limit=1`
  );
  if (!rows?.length) return json({ error: "Donation not found." }, 404);
  const donation = rows[0];
  // A donor may return before the Pesapal IPN has arrived. Re-check the
  // transaction directly with Pesapal so the page can safely reconcile it.
  if (donation.status !== "paid" && donation.pesapal_order_tracking_id) {
    try {
      const verified = await verifyPayment(env, donation.pesapal_order_tracking_id, reference);
      const refreshed = await supabaseRequest(env,
        `donation_pledges?select=status,currency,amount,paid_at&merchant_reference=eq.${encodeURIComponent(reference)}&limit=1`
      );
      return json({ ...(refreshed?.[0] || donation), verification: verified.paymentStatus });
    } catch (error) {
      console.error("Donor payment status refresh failed:", reference, error);
      return json({ status: donation.status, currency: donation.currency, amount: donation.amount, paid_at: donation.paid_at, verification: "pending" });
    }
  }
  return json({ status: donation.status, currency: donation.currency, amount: donation.amount, paid_at: donation.paid_at });
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

  async roomRecord(roomCode) {
    const rows = await supabaseRequest(this.env, `video_call_rooms?select=id,room_code,status&room_code=eq.${encodeURIComponent(roomCode)}&limit=1`);
    return rows?.[0] || null;
  }

  async updateParticipant(roomCode, role, status) {
    try {
      const room = await this.roomRecord(roomCode);
      if (!room) return;
      const now = new Date().toISOString();
      await supabaseRequest(this.env, `video_call_participants?room_id=eq.${room.id}&participant_role=eq.${role}`, {
        method: "PATCH", headers: { prefer: "return=minimal" },
        body: JSON.stringify({
          status,
          ...(status === "joined" ? { joined_at: now, left_at: null } : { left_at: now }),
        }),
      });
    } catch (error) { console.error("Could not update video participant status:", error); }
  }

  async logEvent(roomCode, eventType, actorRole = "system", details = {}) {
    try {
      const room = await this.roomRecord(roomCode);
      if (!room) return;
      const sessionId = await this.ctx.storage.get("sessionId");
      await supabaseRequest(this.env, "video_call_events", {
        method: "POST",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify([{ room_id: room.id, session_id: sessionId || null, event_type: eventType, actor_role: actorRole, details }]),
      });
    } catch (error) { console.error("Video meeting history event failed:", error); }
  }

  async startSession(roomCode) {
    if (await this.ctx.storage.get("sessionId")) return;
    const room = await this.roomRecord(roomCode);
    if (!room) return;
    const rows = await supabaseRequest(this.env, "video_call_sessions", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify([{ room_id: room.id }]),
    });
    const sessionId = rows?.[0]?.id;
    if (sessionId) await this.ctx.storage.put("sessionId", sessionId);
    await supabaseRequest(this.env, `video_call_participants?room_id=eq.${room.id}`, {
      method: "PATCH", headers: { prefer: "return=minimal" },
      body: JSON.stringify({ status: "joined", joined_at: new Date().toISOString(), left_at: null }),
    }).catch(error => console.error("Could not mark video participants joined:", error));
    await supabaseRequest(this.env, `video_call_rooms?id=eq.${room.id}`, {
      method: "PATCH", headers: { prefer: "return=minimal" },
      body: JSON.stringify({ status: "live", started_at: new Date().toISOString(), ended_at: null, ended_reason: null }),
    });
    await this.logEvent(roomCode, "call_started", "system");
  }

  async endSession(roomCode, reason = "host_ended") {
    const room = await this.roomRecord(roomCode);
    const sessionId = await this.ctx.storage.get("sessionId");
    if (!sessionId && room?.status === "ended") return;
    const now = new Date().toISOString();
    if (sessionId) {
      await supabaseRequest(this.env, `video_call_sessions?id=eq.${sessionId}`, {
        method: "PATCH", headers: { prefer: "return=minimal" },
        body: JSON.stringify({ ended_at: now, ended_reason: reason }),
      }).catch(error => console.error("Could not close video session:", error));
    }
    if (room) {
      await supabaseRequest(this.env, `video_call_rooms?id=eq.${room.id}`, {
        method: "PATCH", headers: { prefer: "return=minimal" },
        body: JSON.stringify({ status: "ended", ended_at: now, ended_reason: reason }),
      }).catch(error => console.error("Could not close video room:", error));
    }
    await this.logEvent(roomCode, "call_ended", "system", { reason });
    await this.ctx.storage.delete("sessionId");
  }

  async fetch(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required.", { status: 426 });
    }
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const roomCode = url.pathname.match(/\/api\/video\/rooms\/([0-9a-f-]{36})\/signal/i)?.[1];
    if (!["host", "guest"].includes(role) || !roomCode) return new Response("Invalid meeting role.", { status: 403 });
    const peers = this.ctx.getWebSockets();
    const sameRole = peers.some(peer => peer.deserializeAttachment()?.role === role);
    if (peers.length >= 2 || sameRole) return new Response("This meeting role is already connected or the room is full.", { status: 409 });
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role, roomCode, admitted: role === "host" });
    server.send(JSON.stringify({ type: "room-state", role, admitted: role === "host", peerCount: peers.length + 1 }));
    if (role === "host") {
      await this.logEvent(roomCode, "host_joined", "host");
      for (const peer of peers) {
        if (peer.deserializeAttachment()?.role === "guest") {
          try { peer.send(JSON.stringify({ type: "waiting-for-host" })); } catch {}
          server.send(JSON.stringify({ type: "guest-waiting" }));
        }
      }
    } else {
      await this.logEvent(roomCode, "guest_waiting", "guest");
      const host = peers.find(peer => peer.deserializeAttachment()?.role === "host");
      if (host) {
        try { host.send(JSON.stringify({ type: "guest-waiting" })); } catch {}
      }
      server.send(JSON.stringify({ type: "waiting-for-host" }));
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket, message) {
    if (typeof message !== "string" || message.length > 65536) return;
    let packet;
    try { packet = JSON.parse(message); } catch { return; }
    const attachment = socket.deserializeAttachment() || {};
    const { role, roomCode } = attachment;
    if (packet?.type === "admit-guest" && role === "host") {
      const guest = this.ctx.getWebSockets().find(peer => peer.deserializeAttachment()?.role === "guest");
      if (!guest) return;
      const guestAttachment = guest.deserializeAttachment() || {};
      guestAttachment.admitted = true;
      guest.serializeAttachment(guestAttachment);
      await this.startSession(roomCode);
      await this.logEvent(roomCode, "guest_admitted", "host");
      try { guest.send(JSON.stringify({ type: "admitted" })); } catch {}
      return;
    }
    if (packet?.type === "remove-guest" && role === "host") {
      const guest = this.ctx.getWebSockets().find(peer => peer.deserializeAttachment()?.role === "guest");
      if (guest) {
        try { guest.send(JSON.stringify({ type: "guest-removed" })); guest.close(4001, "Removed by host"); } catch {}
      }
      const room = await this.roomRecord(roomCode);
      if (room) {
        await supabaseRequest(this.env, `video_call_rooms?id=eq.${room.id}`, {
          method: "PATCH", headers: { prefer: "return=minimal" },
          body: JSON.stringify({ guest_token_hash: null }),
        }).catch(error => console.error("Could not revoke removed visitor link:", error));
      }
      await this.updateParticipant(roomCode, "guest", "removed");
      await this.logEvent(roomCode, "guest_removed", "host");
      return;
    }
    if (packet?.type === "end-room" && role === "host") {
      for (const peer of this.ctx.getWebSockets()) {
        try { peer.send(JSON.stringify({ type: "room-ended" })); peer.close(4002, "Meeting ended by host"); } catch {}
      }
      await this.endSession(roomCode, "host_ended");
      return;
    }
    if (packet?.type === "hangup") {
      try { socket.close(1000, "Participant left"); } catch {}
      return;
    }
    if (packet?.type === "screen-share-started" || packet?.type === "screen-share-stopped") {
      await this.logEvent(roomCode, packet.type === "screen-share-started" ? "screen_share_started" : "screen_share_stopped", role);
      return;
    }
    if (!["offer", "answer", "ice"].includes(packet?.type)) return;
    const peers = this.ctx.getWebSockets();
    const other = peers.find(peer => peer !== socket);
    if (!other) return;
    const otherAttachment = other.deserializeAttachment() || {};
    const permitted = role === "host"
      ? otherAttachment.role === "guest" && otherAttachment.admitted
      : role === "guest" && attachment.admitted && otherAttachment.role === "host";
    if (!permitted) return;
    const safe = JSON.stringify({
      type: packet.type,
      ...(packet.type === "offer" || packet.type === "answer" ? { description: packet.description } : {}),
      ...(packet.type === "ice" ? { candidate: packet.candidate } : {}),
    });
    try { other.send(safe); } catch {}
  }

  async webSocketClose(socket) {
    const attachment = socket.deserializeAttachment() || {};
    const remaining = this.ctx.getWebSockets();
    for (const peer of remaining) {
      try {
        if (attachment.role === "guest") peer.send(JSON.stringify({ type: "peer-left" }));
        else peer.send(JSON.stringify({ type: "room-ended" }));
      } catch {}
    }
    if (attachment.role === "guest") {
      await this.updateParticipant(attachment.roomCode, "guest", "left");
      await this.logEvent(attachment.roomCode, "participant_left", "guest");
    }
    if (attachment.role === "host") await this.updateParticipant(attachment.roomCode, "host", "left");
    if (attachment.role === "host") {
      for (const peer of remaining) { try { peer.close(4002, "Host disconnected"); } catch {} }
      await this.endSession(attachment.roomCode, "host_disconnected");
    } else if (remaining.length === 0) {
      await this.endSession(attachment.roomCode, "participants_left");
    }
  }

  async webSocketError(socket) {
    await this.webSocketClose(socket);
  }
}

async function cloudflareTurnIceServers(env) {
  const keyId = String(env.CLOUDFLARE_TURN_KEY_ID || "").trim();
  const keyToken = String(env.CLOUDFLARE_TURN_KEY_TOKEN || "").trim();
  if (!keyId || !keyToken) return null;

  if (!/^[a-f0-9]{32}$/i.test(keyId) || !/^[a-f0-9]{64}$/i.test(keyToken)) {
    throw new Error("Cloudflare TURN key configuration is invalid. Check the TURN key ID and token secrets.");
  }

  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${keyToken}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ ttl: 86400 }),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.iceServers) || payload.iceServers.length === 0) {
    console.error("Cloudflare TURN credential generation failed:", response.status, payload.errors || payload);
    throw new Error("Cloudflare could not generate temporary TURN credentials. Check the TURN key ID and secret in Worker settings.");
  }
  return payload.iceServers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      const videoIceMatch = url.pathname.match(/^\/api\/video\/rooms\/([0-9a-f-]{36})\/ice$/i);
      if (videoIceMatch && request.method === "GET") {
        if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Video calling is not configured." }, 503);
        const roomCode = videoIceMatch[1];
        const accessKey = url.searchParams.get("key") || "";
        if (!/^[0-9a-f]{64}$/i.test(accessKey)) return json({ error: "Invalid meeting invitation." }, 401);
        const rooms = await supabaseRequest(env,
          `video_call_rooms?select=id,status,host_token_hash,guest_token_hash,is_test,owner_user_id,call_mode,appointment:appointments(status,meeting_mode)&room_code=eq.${encodeURIComponent(roomCode)}&limit=1`
        );
        const room = rooms?.[0];
        const approvedAppointment = room?.appointment?.status === "confirmed" && ["video", "audio"].includes(room?.appointment?.meeting_mode);
        const validTestRoom = room?.is_test === true && Boolean(room?.owner_user_id);
        if (!room || !["scheduled", "live"].includes(room.status) || (!approvedAppointment && !validTestRoom)) {
          return json({ error: "This meeting link is invalid, expired or not yet approved." }, 404);
        }
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessKey));
        const keyHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        if (keyHash !== room.host_token_hash && keyHash !== room.guest_token_hash) return json({ error: "This invitation has expired." }, 403);
        const cloudflareIceServers = await cloudflareTurnIceServers(env);
        const iceServers = cloudflareIceServers || [{ urls: ["stun:stun.cloudflare.com:3478"] }];
        const turnConfigured = Boolean(cloudflareIceServers?.some(server =>
          (Array.isArray(server.urls) ? server.urls : [server.urls]).some(value => String(value).startsWith("turn"))
        ));
        return json({ iceServers, turnConfigured, meetingMode: room?.call_mode || room?.appointment?.meeting_mode || "video" });
      }
      const videoSignalMatch = url.pathname.match(/^\/api\/video\/rooms\/([0-9a-f-]{36})\/signal$/i);
      if (videoSignalMatch && request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
        if (!env.VIDEO_ROOMS || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
          return json({ error: "Video calling is not configured on this Worker yet." }, 503);
        }
        const roomCode = videoSignalMatch[1];
        const accessKey = url.searchParams.get("key") || "";
        if (!/^[0-9a-f]{64}$/i.test(accessKey)) return json({ error: "Invalid meeting invitation." }, 401);
        const rooms = await supabaseRequest(env,
          `video_call_rooms?select=id,status,host_token_hash,guest_token_hash,is_test,owner_user_id,call_mode,appointment:appointments(status,meeting_mode)&room_code=eq.${encodeURIComponent(roomCode)}&limit=1`
        );
        const room = rooms?.[0];
        const approvedAppointment = room?.appointment?.status === "confirmed" && ["video", "audio"].includes(room?.appointment?.meeting_mode);
        const validTestRoom = room?.is_test === true && Boolean(room?.owner_user_id);
        if (!room || !["scheduled", "live"].includes(room.status) || (!approvedAppointment && !validTestRoom)) {
          return json({ error: "This meeting link is invalid, expired or not yet approved." }, 404);
        }
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessKey));
        const keyHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        const role = keyHash === room.host_token_hash ? "host" : keyHash === room.guest_token_hash ? "guest" : null;
        if (!role) return json({ error: "This invitation has expired or is not valid." }, 403);
        url.searchParams.set("role", role);
        url.searchParams.set("roomId", room.id);
        const id = env.VIDEO_ROOMS.idFromName(roomCode);
        return env.VIDEO_ROOMS.get(id).fetch(new Request(url.toString(), request));
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
      if (url.pathname === "/api/appointments/fees" && request.method === "GET") {
        return await appointmentFees(request, env);
      }
      if (url.pathname === "/api/appointments/request" && request.method === "POST") {
        return await createAppointmentRequest(request, env);
      }
      if (url.pathname === "/api/bursary/payment" && request.method === "POST") return await createBursaryPayment(request, env);
      if (url.pathname === "/api/bursary/applications" && ["GET", "POST"].includes(request.method)) return await bursaryApplicantApi(request, env);
      if (url.pathname === "/api/payments/pesapal/create" && request.method === "POST") {
        return await createPayment(request, env);
      }
      if (url.pathname === "/api/payments/pesapal/ipn" && ["GET", "POST"].includes(request.method)) {
        return await handleNotification(request, env, false);
      }
      if (url.pathname === "/api/payments/pesapal/callback" && request.method === "GET") {
        return await handleNotification(request, env, true);
      }
      if (url.pathname === "/api/admin/payments/reconcile" && request.method === "POST") {
        return await reconcilePesapalPayment(request, env);
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
