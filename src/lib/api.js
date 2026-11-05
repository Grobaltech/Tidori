import { supabase, supabaseReady } from './supabase';
import { fallback } from '../data/fallback';
import { site as defaultSite } from '../config/site';

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


// ---------- Published website CMS content ----------
export const getSiteContent = async () => {
  if (!supabaseReady || !supabase) return defaultSite;
  const { data, error } = await supabase.from('site_content').select('content,published').eq('id','main').maybeSingle();
  if (error || !data?.published || !data.content) return defaultSite;
  return {
    ...defaultSite,
    ...data.content,
    social: { ...defaultSite.social, ...(data.content.social || {}) },
    about: { ...defaultSite.about, ...(data.content.about || {}) },
  };
};

const publicRows = async (table, fallbackRows) => {
  if (!supabaseReady || !supabase) return fallbackRows;
  const { data, error } = await supabase.from(table).select('*').eq('published', true).order('sort_order', { ascending: true });
  if (error) {
    console.warn('Published website content could not be loaded:', error.message);
    return fallbackRows;
  }
  return data?.length ? data : fallbackRows;
};

export const getHomepageSlides = () => publicRows('homepage_slides', [
  { id:'fallback-1', title:'Welcome to Tidori Ministries', description:'A community of faith, hope and service. Come as you are and grow with us.', image_url:'/img/carousel-1.jpg', button_label:'Learn More', button_url:'/about', sort_order:0 },
  { id:'fallback-2', title:'Get involved with a helping hand', description:'Serve alongside our church family as we love our neighbours in practical ways.', image_url:'/img/carousel-2.jpg', button_label:'Serve With Us', button_url:'/volunteer', sort_order:1 },
  { id:'fallback-3', title:'Bringing hope to our community', description:'Your giving and prayers help us reach families in need.', image_url:'/img/carousel-3.jpg', button_label:'Give Now', button_url:'/give', sort_order:2 },
]);
export const getMinistries = () => publicRows('site_ministries', defaultSite.ministries);
export const getSiteFacts = () => publicRows('site_facts', defaultSite.facts);
