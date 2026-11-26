// Edit this file to update church details used across the whole site.
export const site = {
  name: 'Tidori Ministries',
  shortName: 'Tidori',
  tagline: 'A community of faith, hope and service',
  address: '',
  locations: [],
  phone: '',
  email: '',
  // Leave '' to hide a social icon
  social: {
    facebook: '',
    twitter: '',
    youtube: '',
    instagram: '',
    linkedin: '',
  },
  giveUrl: import.meta.env.VITE_GIVE_URL || '',
  videoUrl: import.meta.env.VITE_VIDEO_URL || '',
  serviceTimes: '',
  // Placeholder numbers: replace with your real figures
  // Impact figures are intentionally empty until verified figures are published in the CMS.
  facts: [],
  homepage: {
    sections: {
      hero: { enabled: true, order: 0, kicker: '', title: '', description: '' },
      about: { enabled: true, order: 1, kicker: 'Learn About Us', title: 'Faith in action. Transforming lives. Building communities.', description: '' },
      ministries: { enabled: true, order: 2, kicker: 'What We Do', title: 'We believe we can change lives together with you', description: '' },
      facts: { enabled: true, order: 3, kicker: '', title: '', description: '' },
      outreach: { enabled: true, order: 4, kicker: 'Outreach', title: 'Projects your giving makes possible', description: '' },
      giving: { enabled: true, order: 5, kicker: 'Give', title: 'Partner with us to bless those in need', description: 'Every gift, large or small, helps us feed families, support children and share hope. Thank you for your generosity.' },
      events: { enabled: true, order: 6, kicker: 'Upcoming Events', title: 'Be ready for our upcoming gatherings', description: '' },
      blog: { enabled: true, order: 7, kicker: 'Latest Posts', title: 'Devotionals and church news', description: '' },
    },
  },
  nav: [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/outreach', label: 'Outreach' },
    { to: '/events', label: 'Events' },
    { to: '/blog', label: 'Blog' },
    {
      label: 'More',
      children: [
        { to: '/ministries', label: 'Our Ministries' },
        { to: '/team', label: 'Meet Our Leaders' },
        { to: '/give', label: 'Give' },
        { to: '/volunteer', label: 'Serve With Us' },
      ],
    },
    { to: '/appointments', label: 'Appointments' },
    { to: '/contact', label: 'Contact' },
  ],
  // Ministry cards are managed in the Website CMS; no sample programmes are shown by default.
  ministries: [],
  about: { about: '', history: '', mission: '', vision: '', beliefs: '', objectives: '', values: '' },
};
