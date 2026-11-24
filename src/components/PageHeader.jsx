import { Link, useLocation } from 'react-router-dom';
import { useDocTitle } from '../hooks/hooks';

const routeLabels = {
  about: 'About Us',
  mission: 'Our Mission',
  vision: 'Our Vision',
  purpose: 'Our Purpose',
  objectives: 'Our Objectives',
  'focus-areas': 'Our Areas of Focus',
  values: 'Our Guiding Values',
  commitment: 'Our Commitment to Communities',
  partnerships: 'Our Partnerships',
  outreach: 'Outreach',
  events: 'Events',
  blog: 'Blog',
  ministries: 'Our Ministries',
  team: 'Our Leaders',
  give: 'Give',
  bursaries: 'Bursaries',
  volunteer: 'Volunteer',
  contact: 'Contact Us',
  appointments: 'Appointments',
  community: 'Tidori Connect',
  profile: 'My Profile',
  notifications: 'Notifications',
  login: 'Login',
  register: 'Register',
};

export default function PageHeader({ title }) {
  useDocTitle(title);
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const isBlogArticle = segments[0] === 'blog' && segments.length > 1;
  const crumbs = [];

  if (segments.length) {
    let path = '';
    segments.forEach((segment, index) => {
      path += `/${segment}`;
      const isLast = index === segments.length - 1;
      const label = isLast
        ? title
        : (routeLabels[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()));
      // Dynamic article slugs are represented by the supplied page title, not a raw URL slug.
      if (isLast || routeLabels[segment] || !/^\d+$/.test(segment)) {
        crumbs.push({ to: path, label, current: isLast });
      }
    });
  }

  return (
    <section className="page-header-bg mb-11 px-4 pb-20 pt-24 text-center md:pt-32">
      <h2 className="relative mb-5 inline-block pb-2 text-[40px] font-bold !text-gold sm:text-[60px] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-24 after:-translate-x-1/2 after:bg-gold">
        {title}
      </h2>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-center gap-2 text-base font-semibold sm:text-lg">
        <Link to="/" className="text-white/85 transition-colors hover:text-gold">Home</Link>
        {crumbs.map((crumb, index) => (
          <span key={crumb.to} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="text-gold/80">/</span>
            {crumb.current ? (
              <span aria-current="page" className="rounded-sm bg-gold/15 px-2 py-1 text-gold">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="text-white/85 transition-colors hover:text-gold">{crumb.label}</Link>
            )}
          </span>
        ))}
      </nav>
    </section>
  );
}
