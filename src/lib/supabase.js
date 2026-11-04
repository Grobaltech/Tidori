import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && anonKey && !url.includes('YOUR-PROJECT'));

// The anon key is safe to expose in the browser; Row Level Security (supabase/schema.sql) protects the data.
export const supabase = supabaseReady ? createClient(url, anonKey) : null;
