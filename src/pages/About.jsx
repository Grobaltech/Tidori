import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import { Facts } from './Home';
import { site } from '../config/site';
import { useAsync } from '../hooks/hooks';
import { getSiteContent } from '../lib/api';

export default function About() {
  const { data: cmsSite } = useAsync(getSiteContent);
  const activeSite = cmsSite || site;
  return (
    <>
      <PageHeader title="About Us" />
      <section className="py-11">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <img src={activeSite.about?.imageUrl || "/img/about.jpg"} alt="Tidori Ministries community" className="w-full" />
          <div>
            <SectionHeader center={false} kicker="Learn About Us" title="Who we are" />
            <h3 className="mb-2 text-xl">Our Story</h3>
            <p className="mb-5 leading-7">{activeSite.about.about}</p>
            <h3 className="mb-2 text-xl">Our Mission</h3>
            <p className="mb-5 leading-7">{activeSite.about.mission}</p>
            <h3 className="mb-2 text-xl">Our Vision</h3>
            <p className="mb-5 leading-7">{activeSite.about.vision}</p>
            {activeSite.about.history && <><h3 className="mb-2 text-xl">Our History</h3><p className="mb-5 leading-7">{activeSite.about.history}</p></>}
            {activeSite.about.beliefs && <><h3 className="mb-2 text-xl">What We Believe</h3><p className="mb-5 leading-7">{activeSite.about.beliefs}</p></>}
            {activeSite.about.objectives && <><h3 className="mb-2 text-xl">Our Aims & Objectives</h3><p className="mb-5 leading-7">{activeSite.about.objectives}</p></>}
            {activeSite.about.values && <><h3 className="mb-2 text-xl">Our Core Values</h3><p className="mb-5 leading-7">{activeSite.about.values}</p></>}
            {activeSite.motto && <p className="mb-5"><strong className="text-navy">Our motto:</strong> {activeSite.motto}</p>}
            {activeSite.registrationNumber && <p className="mb-5"><strong className="text-navy">Registration:</strong> {activeSite.registrationNumber}</p>}
            <p className="mb-5"><strong className="text-navy">Service times:</strong> {activeSite.serviceTimes}</p>
            <Link to="/contact" className="btn-custom">Plan a Visit</Link>
          </div>
        </div>
      </section>
      <Facts />
    </>
  );
}
