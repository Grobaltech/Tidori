import { supabase, supabaseReady } from './supabase';
import { fallback } from '../data/fallback';

// ---------- Reads (fall back to local sample content if Supabase is not set up) ----------
async function read(query, fallbackRows) {
  if (!supabaseReady) return fallbackRows;
  try {
    const { data, error } = await query;
    if (error) throw error;
    return data?.length ? data : fallbackRows;
  } catch (err) {
    console.warn('Supabase read failed, using fallback content:', err.message);
    return fallbackRows;
  }
}

export const getOutreach = () =>
  read(supabase?.from('outreach_projects').select('*').order('sort_order'), fallback.outreach);

export const getEvents = () =>
  read(supabase?.from('events').select('*').order('starts_at'), fallback.events);

export const getPosts = () =>
  read(supabase?.from('posts').select('*').order('published_at', { ascending: false }), fallback.posts);

export const getPost = async (slug) => {
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug) || null;
};

export const getTeam = () =>
  read(supabase?.from('team_members').select('*').order('sort_order'), fallback.team);

// ---------- Writes (insert-only; protected by RLS) ----------
async function insert(table, row) {
  if (!supabaseReady) {
    throw new Error('The form is not connected yet. Please set your Supabase keys.');
  }
  const { error } = await supabase.from(table).insert(row);
  if (error) {
    if (error.code === '23505') return; // duplicate (e.g. already subscribed) - treat as success
    throw new Error('Sorry, something went wrong. Please try again.');
  }
}

export const sendContact = (v) => insert('contact_messages', v);
export const sendVolunteer = (v) => insert('volunteers', v);
export const subscribe = (email) => insert('newsletter_subscribers', { email });
export const sendPledge = (v) => insert('donation_pledges', { ...v, status: 'pledged' });
