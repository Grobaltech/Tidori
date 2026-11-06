import { supabase, supabaseReady } from './supabase';
import { fallback } from '../data/fallback';
import { site as defaultSite } from '../config/site';

// The database is authoritative once configured. Local sample content is used
// only before the Supabase connection has been configured.
async function read(query, fallbackRows = []) {
  if (!supabaseReady || !supabase) return fallbackRows;
  try {
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Supabase content read failed:', err.message);
    return [];
  }
}

export const getOutreach = () =>
  read(supabase?.from('outreach_projects').select('*').eq('published', true).order('sort_order'), fallback.outreach);

export const getEvents = () =>
  read(supabase?.from('events').select('*').eq('published', true).order('starts_at'), fallback.events);

export const getPosts = () =>
  read(supabase?.from('posts').select('*').eq('published', true).order('published_at', { ascending: false }), fallback.posts);

export const getPost = async (slug) => {
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug) || null;
};

export const getTeam = () =>
  read(supabase?.from('team_members').select('*').eq('published', true).order('sort_order'), fallback.team);

// ---------- Writes (insert-only; protected by RLS) ----------
async function insert(table, row) {
  if (!supabaseReady || !supabase) {
    throw new Error('The form is not connected yet. Please set your Supabase keys.');
  }
  const { error } = await supabase.from(table).insert(row);
  if (error) {
    if (error.code === '23505') return;
    throw new Error('Sorry, something went wrong. Please try again.');
  }
}

export const sendContact = (v) => insert('contact_messages', v);
export const sendVolunteer = (v) => insert('volunteers', v);
export const subscribe = (email) => insert('newsletter_subscribers', { email });
export const sendPledge = (v) => insert('donation_pledges', { ...v, status: 'pledged' });

// ---------- Published website CMS content ----------
export const getSiteContent = async () => {
  if (!supabaseReady || !supabase) return defaultSite;
  try {
    const { data, error } = await supabase.from('site_content')
      .select('content,published').eq('id', 'main').maybeSingle();
    if (error) throw error;
    if (!data?.published || !data.content) return defaultSite;
    return {
      ...defaultSite,
      ...data.content,
      social: { ...defaultSite.social, ...(data.content.social || {}) },
      about: { ...defaultSite.about, ...(data.content.about || {}) },
    };
  } catch (err) {
    console.error('Published site information could not be loaded:', err.message);
    return defaultSite;
  }
};

const publicRows = async (table, fallbackRows = []) => {
  if (!supabaseReady || !supabase) return fallbackRows;
  try {
    const { data, error } = await supabase.from(table).select('*')
      .eq('published', true).order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`Published ${table} could not be loaded:`, err.message);
    return [];
  }
};

export const getHomepageSlides = async () => {
  const rows = await publicRows('homepage_slides', [
    { id:'fallback-1', title:'Welcome to Tidori Ministries', description:'A community of faith, hope and service. Come as you are and grow with us.', image_url:'/img/carousel-1.jpg', button_label:'Learn More', button_url:'/about', sort_order:0 },
    { id:'fallback-2', title:'Get involved with a helping hand', description:'Serve alongside our church family as we love our neighbours in practical ways.', image_url:'/img/carousel-2.jpg', button_label:'Serve With Us', button_url:'/volunteer', sort_order:1 },
    { id:'fallback-3', title:'Bringing hope to our community', description:'Your giving and prayers help us reach families in need.', image_url:'/img/carousel-3.jpg', button_label:'Give Now', button_url:'/give', sort_order:2 },
  ]);
  const now = Date.now();
  return rows.filter(slide =>
    (!slide.starts_at || new Date(slide.starts_at).getTime() <= now) &&
    (!slide.ends_at || new Date(slide.ends_at).getTime() >= now)
  );
};

export const getMinistries = () => publicRows('site_ministries', defaultSite.ministries);
export const getSiteFacts = () => publicRows('site_facts', defaultSite.facts);
