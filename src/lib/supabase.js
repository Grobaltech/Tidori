import { createClient } from '@supabase/supabase-js';

// Supabase now issues sb_publishable_ keys. Keep the anon-key variable as a
// backwards-compatible fallback for existing Cloudflare deployments.
const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

let configError = '';
try {
  if (!url || !publishableKey) {
    configError = 'Supabase is not configured in this deployment. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or the legacy VITE_SUPABASE_ANON_KEY) to the Cloudflare build environment, then trigger a new deployment.';
  } else {
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol) || parsedUrl.hostname.includes('YOUR-PROJECT')) {
      configError = 'The Supabase project URL is invalid. Check VITE_SUPABASE_URL in the Cloudflare build environment.';
    }
  }
} catch {
  configError = 'The Supabase project URL is invalid. Check VITE_SUPABASE_URL in the Cloudflare build environment.';
}

export const supabaseReady = !configError;
export const supabaseConfigError = configError;

// Publishable/anon keys are intended for browser use. Never place a
// Supabase secret or service_role key in a VITE_ variable.
export const supabase = supabaseReady
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
