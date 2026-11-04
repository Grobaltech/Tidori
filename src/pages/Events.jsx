import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import EventCard from '../components/EventCard';
import Loading from '../components/Loading';
import { useAsync } from '../hooks/hooks';
import { getEvents } from '../lib/api';

export default function Events() {
  const { data, loading } = useAsync(getEvents);
  return (
    <>
      <PageHeader title="Events" />
      <section className="py-11">
        <div className="container-page">
          <SectionHeader kicker="Upcoming Events" title="Join us at our next gathering" />
          {loading ? <Loading /> : (
            <div className="grid gap-8 lg:grid-cols-2">
              {data.map((ev) => <EventCard key={ev.id} ev={ev} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
