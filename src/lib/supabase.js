import { createClient } from '@supabase/supabase-js';

// These are public browser-side Supabase settings. The publishable key is
// designed to be exposed in client applications; database access must still
// be protected by Supabase Auth, grants, and Row Level Security (RLS).
// Cloudflare build variables can override these repository defaults.
const url = (
  import.meta.env.VITE_SUPABASE_URL ||
  'https://yrsywklfharhkllrfdun.supabase.co'
).trim();
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_hDiEMqPFt0NhanuNUO8seA_TcVHa4Rc'
).trim();

let configError = '';
try {
  if (!url || !publishableKey) {
    configError = 'Supabase is not configured in this deployment. Check the public Supabase project URL and publishable key.';
  } else {
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol) || parsedUrl.hostname.includes('YOUR-PROJECT')) {
      configError = 'The Supabase project URL is invalid. Check the Supabase project URL.';
    }
  }
} catch {
  configError = 'The Supabase project URL is invalid. Check the Supabase project URL.';
}

export const supabaseReady = !configError;
export const supabaseConfigError = configError;

// Never place a Supabase secret or service_role key in browser code or VITE_ variables.
export const supabase = supabaseReady
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
