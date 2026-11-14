// Edit this file to update church details used across the whole site.
export const site = {
  name: 'Tidori Ministries',
  shortName: 'Tidori',
  tagline: 'A community of faith, hope and service',
  address: 'Your church address here',
  phone: '+000 000 000 000',
  email: 'info@tidoriministries.org',
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
  serviceTimes: 'Sundays - update service times here',
  // Placeholder numbers: replace with your real figures
  facts: [
    { icon: 'flaticon-home', value: 10, label: 'Years of Ministry' },
    { icon: 'flaticon-charity', value: 100, label: 'Volunteers' },
    { icon: 'flaticon-kindness', value: 500, label: 'Families Helped' },
    { icon: 'flaticon-donation', value: 20, label: 'Outreach Projects' },
  ],
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
        { to: '/comfort-bridge', label: 'The Comfort Bridge' },
        { to: '/volunteer', label: 'Serve With Us' },
      ],
    },
    { to: '/appointments', label: 'Appointments' },
    { to: '/contact', label: 'Contact' },
  ],
  ministries: [
    { icon: 'flaticon-diet', title: 'Food Pantry', text: 'Feeding families in need with weekly groceries and meals.' },
    { icon: 'flaticon-water', title: 'Clean Water', text: 'Helping communities gain access to safe drinking water.' },
    { icon: 'flaticon-healthcare', title: 'Health Outreach', text: 'Free health checks and care days for our neighbours.' },
    { icon: 'flaticon-education', title: 'Children & Education', text: 'Supporting children with school needs and Bible teaching.' },
    { icon: 'flaticon-home', title: 'Family Support', text: 'Practical help and prayer for families facing hardship.' },
    { icon: 'flaticon-social-care', title: 'Pastoral Care', text: 'Visiting, counselling and walking with people through life.' },
  ],
  about: {
    about: 'Tidori Ministries is a church family devoted to worshipping God, growing in the Word and serving our community with love. Replace this text with your church story.',
    mission: 'Our mission is to share the good news of Jesus Christ and to meet practical needs in His name. Replace this text with your mission statement.',
    vision: 'We envision lives and communities transformed by faith, hope and love. Replace this text with your vision statement.',
  },
};
