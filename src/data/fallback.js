// Shown only when Supabase is not configured yet (or a request fails), so the site never looks empty.
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString();

export const fallback = {
  outreach: [
    { id: '1', title: 'Community Food Pantry', summary: 'Weekly groceries for families in our neighbourhood.', image_url: '/img/causes-1.jpg', goal_amount: 5000, raised_amount: 3200 },
    { id: '2', title: 'Clean Water Project', summary: 'Helping communities gain access to safe drinking water.', image_url: '/img/causes-2.jpg', goal_amount: 8000, raised_amount: 4100 },
    { id: '3', title: 'Back-to-School Support', summary: 'Uniforms, books and fees for children in need.', image_url: '/img/causes-3.jpg', goal_amount: 4000, raised_amount: 1800 },
    { id: '4', title: 'Medical Outreach', summary: 'Free health checks and basic care days.', image_url: '/img/causes-4.jpg', goal_amount: 6000, raised_amount: 2500 },
  ],
  events: [
    { id: '1', title: 'Sunday Worship Service', description: 'Join us for worship, the Word and fellowship.', image_url: '/img/event-1.jpg', location: 'Main Sanctuary', starts_at: inDays(7) },
    { id: '2', title: 'Community Prayer Night', description: 'An evening of prayer for our city and families.', image_url: '/img/event-2.jpg', location: 'Fellowship Hall', starts_at: inDays(14) },
  ],
  posts: [
    { id: '1', slug: 'welcome-to-tidori-ministries', title: 'Welcome to Tidori Ministries', excerpt: 'A word of welcome from our church family.', body: 'We are glad you are here.\n\nReplace this with your own message.', image_url: '/img/blog-1.jpg', author: 'Tidori Ministries', published_at: inDays(-3) },
    { id: '2', slug: 'walking-in-faith', title: 'Walking in Faith', excerpt: 'A short devotional for the week.', body: 'Replace this devotional with your own writing.', image_url: '/img/blog-2.jpg', author: 'Tidori Ministries', published_at: inDays(-10) },
    { id: '3', slug: 'serving-our-community', title: 'Serving Our Community', excerpt: 'How we are meeting needs near us.', body: 'Replace this with an update from your outreach team.', image_url: '/img/blog-3.jpg', author: 'Tidori Ministries', published_at: inDays(-17) },
  ],
  team: [
    { id: '1', name: 'Pastor Name', role: 'Senior Pastor', photo_url: '/img/team-1.jpg' },
    { id: '2', name: 'Leader Name', role: 'Worship Leader', photo_url: '/img/team-2.jpg' },
    { id: '3', name: 'Leader Name', role: 'Youth Pastor', photo_url: '/img/team-3.jpg' },
    { id: '4', name: 'Leader Name', role: 'Outreach Coordinator', photo_url: '/img/team-4.jpg' },
  ],
};
