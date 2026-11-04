-- Optional starter content. Replace with your real ministry information.
insert into public.outreach_projects (title, summary, image_url, goal_amount, raised_amount, sort_order) values
 ('Community Food Pantry', 'Weekly groceries for families in our neighbourhood.', '/img/causes-1.jpg', 5000, 3200, 1),
 ('Clean Water Project', 'Helping communities gain access to safe drinking water.', '/img/causes-2.jpg', 8000, 4100, 2),
 ('Back-to-School Support', 'Uniforms, books and fees for children in need.', '/img/causes-3.jpg', 4000, 1800, 3),
 ('Medical Outreach', 'Free health checks and basic care days.', '/img/causes-4.jpg', 6000, 2500, 4);

insert into public.events (title, description, image_url, location, starts_at) values
 ('Sunday Worship Service', 'Join us for worship, the Word and fellowship.', '/img/event-1.jpg', 'Main Sanctuary', now() + interval '7 days'),
 ('Community Prayer Night', 'An evening of prayer for our city and families.', '/img/event-2.jpg', 'Fellowship Hall', now() + interval '14 days');

insert into public.posts (slug, title, excerpt, body, image_url, author) values
 ('welcome-to-tidori-ministries', 'Welcome to Tidori Ministries', 'A word of welcome from our church family.', E'We are glad you are here.\n\nReplace this with your own message.', '/img/blog-1.jpg', 'Tidori Ministries'),
 ('walking-in-faith', 'Walking in Faith', E'Replace this devotional with your own writing.', '/img/blog-2.jpg', 'Tidori Ministries'),
 ('serving-our-community', 'Serving Our Community', 'How we are meeting needs near us.', E'Replace this with an update from your outreach team.', '/img/blog-3.jpg', 'Tidori Ministries');

insert into public.team_members (name, role, photo_url, sort_order) values
 ('Pastor Name', 'Senior Pastor', '/img/team-1.jpg', 1),
 ('Leader Name', 'Worship Leader', '/img/team-2.jpg', 2),
 ('Leader Name', 'Youth Pastor', '/img/team-3.jpg', 3),
 ('Leader Name', 'Outreach Coordinator', '/img/team-4.jpg', 4);
