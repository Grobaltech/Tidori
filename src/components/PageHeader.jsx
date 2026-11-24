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
  appointments: 'Appointment',
  appointment: 'Appointments',
  community: 'Tidori Connect',
  profile: 'Profiles',
  members: 'Members',
  notifications: 'Notifications',
  login: 'Login',
  register: 'Register',
};

export default function PageHeader({ title }) {
  const { pathname } = useLocation();
  useDocTitle(pathname === '/members' || pathname === '/members/' ? 'Tidori Connect' : title);
  const segments = pathname.split('/').filter(Boolean);
  const isMemberProfile = /^\\/members\\/profiles\\/[^/]+\\/?$/.test(pathname);
  const isProfileIndex = pathname === '/members/profiles' || pathname === '/members/profiles/';
  const isOwnProfile = pathname === '/profile' || pathname === '/profile/';
  const isMembersHome = pathname === '/members' || pathname === '/members/';
  const hideLargeTitle = pathname === '/members' || pathname.startsWith('/members/') || isOwnProfile;
  const crumbs = [];

  if (isMembersHome) {
    crumbs.push(
      { label: 'Members', to: '/members', current: false, link: true },
      { label: 'Tidori Connect', current: true, link: false },
    );
  } else if (isMemberProfile || isOwnProfile) {
    crumbs.push(
      { label: 'Members', to: '/members', current: false, link: true },
      { label: 'Profiles', to: '/members/profiles', current: false, link: true },
      { label: title || 'My Profile', current: true, link: false },
    );
  } else if (isProfileIndex) {
    crumbs.push(
      { label: 'Members', to: '/members', current: false, link: true },
      { label: 'Profiles', current: true, link: false },
    );
  } else if (segments.length) {
    let path = '';
    segments.forEach((segment, index) => {
      path += `/${segment}`;
      const isLast = index === segments.length - 1;
      const label = isLast
        ? title
        : (routeLabels[segment] || segment.replace(/-/g, ' ').replace(/\\b\\w/g, char => char.toUpperCase()));
      if (isLast || routeLabels[segment] || !/^\\d+$/.test(segment)) {
        crumbs.push({ to: path, label, current: isLast, link: true });
      }
    });
  }

  return (
    <section className={`page-header-bg mb-11 px-4 text-center ${hideLargeTitle ? 'pb-16 pt-20 md:pt-24' : 'pb-20 pt-24 md:pt-32'}`}>
      {!hideLargeTitle && (
        <h2 className="relative mb-5 inline-block pb-2 text-[40px] font-bold !text-gold sm:text-[60px] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-24 after:-translate-x-1/2 after:bg-gold">
          {title}
        </h2>
      )}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-center gap-2 text-base font-semibold sm:text-lg">
        <Link to="/" className="text-white/85 transition-colors hover:text-gold">Home</Link>
        {crumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${crumb.to || 'current'}`} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="text-gold/80">/</span>
            {crumb.current ? (
              <span aria-current="page" className="rounded-sm bg-gold/15 px-2 py-1 text-gold">{crumb.label}</span>
            ) : crumb.link ? (
              <Link to={crumb.to} className="text-white/85 transition-colors hover:text-gold">{crumb.label}</Link>
            ) : (
              <span className="text-white/85">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
    </section>
  );
}
