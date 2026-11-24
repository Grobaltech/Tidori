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
            <h3 id="about" className="mb-2 text-xl">Our Story</h3>
            <p className="mb-5 leading-7">{activeSite.about.about}</p>
            <h3 id="mission" className="mb-2 text-xl">Our Mission</h3>
            <p className="mb-5 leading-7">{activeSite.about.mission}</p>
            <h3 id="vision" className="mb-2 text-xl">Our Vision</h3>
            <p className="mb-5 leading-7">{activeSite.about.vision}</p>
            <div id="purpose" className="mb-6 scroll-mt-24">
              <h3 className="mb-2 text-xl">Our Purpose</h3>
              <p className="leading-7">We exist to serve God and humanity by bringing together spiritual ministry, compassionate service and practical community development. We seek to encourage faith, support people facing challenges, equip individuals with useful skills and strengthen communities.</p>
            </div>
            <div id="objectives" className="mb-6 scroll-mt-24">
              <h3 className="mb-2 text-xl">Our Objectives</h3>
              <p className="leading-7">Our registered objectives cover evangelical and fellowship services, Christian values and teaching, charity and counselling support, worship and Gospel preaching, poverty reduction, church and fellowship development, education, entrepreneurship, institutional partnerships, resource mobilisation, socioeconomic empowerment and agricultural development.</p>
            </div>
            <div id="focus-areas" className="mb-6 scroll-mt-24">
              <h3 className="mb-2 text-xl">Our Areas of Focus</h3>
              <p className="leading-7">Our areas of focus include evangelism and spiritual ministry; pastoral care and counselling; charity and community care; education and skills development; youth, women and family empowerment; economic and agricultural development; and institutional partnerships.</p>
            </div>
            <div id="values" className="mb-6 scroll-mt-24">
              <h3 className="mb-2 text-xl">Our Guiding Values</h3>
              <p className="leading-7">Our work is guided by faith, compassion, integrity, service, empowerment, unity, responsibility and sustainability. These principles shape how we serve people, manage resources and collaborate with others.</p>
            </div>
            <div id="commitment" className="mb-6 scroll-mt-24">
              <h3 className="mb-2 text-xl">Our Commitment to Communities</h3>
              <p className="leading-7">We are committed to serving communities with compassion and accountability, recognising that spiritual wellbeing, family stability, education, social support and economic opportunity are interconnected.</p>
            </div>
            <div id="partnerships" className="mb-6 scroll-mt-24">
              <h3 className="mb-2 text-xl">Our Partnerships</h3>
              <p className="leading-7">We welcome collaboration with churches, community organisations, government and non-government institutions, development partners, educational institutions, businesses and individuals whose objectives are compatible with our mission.</p>
            </div>
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
