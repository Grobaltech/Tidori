const PESAPAL_BASE = "https://pay.pesapal.com/v3";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

const clean = (value, max = 160) => String(value ?? "").trim().slice(0, max);

function requiredEnv(env) {
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PESAPAL_CONSUMER_KEY", "PESAPAL_CONSUMER_SECRET"]
    .filter((key) => !env[key]);
  return missing;
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

async function verifyPayment(env, trackingId, merchantReference) {
  const token = await pesapalToken(env);
  const url = new URL(`${PESAPAL_BASE}/api/Transactions/GetTransactionStatus`);
  url.searchParams.set("orderTrackingId", trackingId);
  const response = await fetch(url, { headers: { accept: "application/json", authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok || data.error || String(data.merchant_reference || "") !== merchantReference) {
    throw new Error(data.error?.message || "Could not verify the Pesapal transaction reference.");
  }

  const status = String(data.payment_status_description || "").toUpperCase();
  const paymentStatus = status === "COMPLETED" || Number(data.status_code) === 1
    ? "paid"
    : status === "FAILED" || Number(data.status_code) === 2
      ? "failed"
      : status === "REVERSED" || Number(data.status_code) === 3
        ? "reversed"
        : "pending";

  await supabaseRequest(env,
    `donation_pledges?merchant_reference=eq.${encodeURIComponent(merchantReference)}&pesapal_order_tracking_id=eq.${encodeURIComponent(trackingId)}`,
    {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        status: paymentStatus,
        payment_method: clean(data.payment_method, 80) || null,
        confirmation_code: clean(data.confirmation_code, 120) || null,
        paid_at: paymentStatus === "paid" ? (data.created_date || new Date().toISOString()) : null,
      }),
    }
  );
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
    if (!env.PESAPAL_IPN_ID) throw new Error("Pesapal IPN is not registered yet. Complete the IPN setup first.");
    const token = await pesapalToken(env);
    const origin = new URL(request.url).origin;
    const order = await pesapalCall(env, "/api/Transactions/SubmitOrderRequest", token, {
      id: merchantReference,
      currency,
      amount: Number(amount.toFixed(2)),
      description: "Donation to Tidori Ministries",
      callback_url: `${origin}/api/payments/pesapal/callback`,
      cancellation_url: `${origin}/give?payment=cancelled&reference=${encodeURIComponent(merchantReference)}`,
      notification_id: env.PESAPAL_IPN_ID,
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

async function registerIpn(request, env) {
  if (!env.PESAPAL_SETUP_TOKEN) return json({ error: "IPN setup is not enabled." }, 503);
  if (request.headers.get("authorization") !== `Bearer ${env.PESAPAL_SETUP_TOKEN}`) return json({ error: "Unauthorized." }, 401);
  if (env.PESAPAL_IPN_ID) return json({ ipn_id: env.PESAPAL_IPN_ID, already_registered: true });
  const missing = requiredEnv(env);
  if (missing.length) return json({ error: `Cloudflare is missing: ${missing.join(", ")}` }, 503);
  const token = await pesapalToken(env);
  const origin = new URL(request.url).origin;
  const result = await pesapalCall(env, "/api/URLSetup/RegisterIPN", token, {
    url: `${origin}/api/payments/pesapal/ipn`,
    ipn_notification_type: "GET",
  });
  if (!result.ipn_id) throw new Error("Pesapal did not return an IPN ID.");
  return json({ ipn_id: result.ipn_id, url: result.url, status: result.ipn_status_description || result.status });
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/payments/pesapal/create" && request.method === "POST") {
        return await createPayment(request, env);
      }
      if (url.pathname === "/api/payments/pesapal/register-ipn" && request.method === "POST") {
        return await registerIpn(request, env);
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
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("Tidori Worker request failed:", error);
      return json({ error: "The request could not be completed. Please try again." }, 500);
    }
  },
};
