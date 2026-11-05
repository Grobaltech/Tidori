import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import { site } from '../config/site';
import { useAsync } from '../hooks/hooks';
import { getMinistries } from '../lib/api';

export default function Ministries() {
  const { data: cmsMinistries } = useAsync(getMinistries);
  const ministries = cmsMinistries?.length ? cmsMinistries : site.ministries;
  return (
    <>
      <PageHeader title="Our Ministries" />
      <section className="py-11">
        <div className="container-page">
          <SectionHeader kicker="What We Do" title="Serving God by serving people" />
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {ministries.map((m) => (
              <div key={m.title} className="flex">
                <i className={`${m.icon} block w-[60px] shrink-0 text-[60px] leading-[60px] text-gold`} />
                <div className="ml-5 border-l border-black/10 pl-5">
                  <h3 className="mb-2 text-xl">{m.title}</h3>
                  <p>{m.description || m.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center"><Link to="/volunteer" className="btn-custom">Serve With Us</Link></div>
        </div>
      </section>
    </>
  );
}
