import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import { Facts } from './Home';
import { site } from '../config/site';

export default function About() {
  return (
    <>
      <PageHeader title="About Us" />
      <section className="py-11">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <img src="/img/about.jpg" alt="Tidori Ministries community" className="w-full" />
          <div>
            <SectionHeader center={false} kicker="Learn About Us" title="Who we are" />
            <h3 className="mb-2 text-xl">Our Story</h3>
            <p className="mb-5 leading-7">{site.about.about}</p>
            <h3 className="mb-2 text-xl">Our Mission</h3>
            <p className="mb-5 leading-7">{site.about.mission}</p>
            <h3 className="mb-2 text-xl">Our Vision</h3>
            <p className="mb-5 leading-7">{site.about.vision}</p>
            <p className="mb-5"><strong className="text-navy">Service times:</strong> {site.serviceTimes}</p>
            <Link to="/contact" className="btn-custom">Plan a Visit</Link>
          </div>
        </div>
      </section>
      <Facts />
    </>
  );
}
