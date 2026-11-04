import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import OutreachCard from '../components/OutreachCard';
import Loading from '../components/Loading';
import { useAsync } from '../hooks/hooks';
import { getOutreach } from '../lib/api';

export default function Outreach() {
  const { data, loading } = useAsync(getOutreach);
  return (
    <>
      <PageHeader title="Outreach" />
      <section className="py-11">
        <div className="container-page">
          <SectionHeader kicker="Outreach" title="Projects your giving makes possible" />
          {loading ? <Loading /> : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {data.map((it) => <OutreachCard key={it.id} item={it} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
