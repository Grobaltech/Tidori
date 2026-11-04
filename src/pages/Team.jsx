import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import Loading from '../components/Loading';
import { useAsync } from '../hooks/hooks';
import { getTeam } from '../lib/api';

export default function Team() {
  const { data, loading } = useAsync(getTeam);
  return (
    <>
      <PageHeader title="Our Leaders" />
      <section className="py-11">
        <div className="container-page">
          <SectionHeader kicker="Our Team" title="Meet the people who serve you" />
          {loading ? <Loading /> : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {data.map((m) => (
                <div key={m.id} className="overflow-hidden bg-mist text-center">
                  <img src={m.photo_url} alt={m.name} className="w-full" loading="lazy" />
                  <div className="p-5">
                    <h3 className="text-xl">{m.name}</h3>
                    <p>{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
