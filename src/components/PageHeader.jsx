import { Link, useLocation } from 'react-router-dom';
import { useDocTitle } from '../hooks/hooks';

const aboutSections = {
  about: 'About Tidori Ministries',
  mission: 'Our Mission',
  vision: 'Our Vision',
  purpose: 'Our Purpose',
  objectives: 'Our Objectives',
  'focus-areas': 'Our Areas of Focus',
  values: 'Our Guiding Values',
  commitment: 'Our Commitment to Communities',
  partnerships: 'Our Partnerships',
};

export default function PageHeader({ title }) {
  useDocTitle(title);
  const { pathname } = useLocation();
  const aboutDetail = pathname.match(/^\/about\/([^/]+)\/?$/);
  const isAboutPage = pathname === '/about' || Boolean(aboutDetail);

  return (
    <section className="page-header-bg mb-11 px-4 pb-20 pt-24 text-center md:pt-32">
      <h2 className="relative mb-5 inline-block pb-2 text-[40px] font-bold !text-gold sm:text-[60px] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-24 after:-translate-x-1/2 after:bg-gold">
        {title}
      </h2>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-center gap-2 text-xl text-white">
        <Link to="/" className="hover:text-gold">Home</Link>
        {isAboutPage && (
          <>
            <span aria-hidden="true" className="text-gold">/</span>
            {aboutDetail ? (
              <Link to="/about" className="hover:text-gold">About Us</Link>
            ) : (
              <span aria-current="page" className="text-gold">About Us</span>
            )}
          </>
        )}
        {aboutDetail && (
          <>
            <span aria-hidden="true" className="text-gold">/</span>
            <span aria-current="page" className="text-gold">{aboutSections[aboutDetail[1]] || title}</span>
          </>
        )}
        {!isAboutPage && (
          <>
            <span aria-hidden="true" className="text-gold">/</span>
            <span aria-current="page" className="text-gold">{title}</span>
          </>
        )}
      </nav>
    </section>
  );
}
