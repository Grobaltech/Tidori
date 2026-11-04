import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import GiveForm from '../components/GiveForm';

export default function Give() {
  const [params] = useSearchParams();
  return (
    <>
      <PageHeader title="Give" />
      <section className="my-11 bg-cover bg-fixed bg-center py-16"
        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), url('/img/donate.jpg')" }}>
        <div className="container-page grid items-center gap-10 lg:grid-cols-[7fr_5fr]">
          <div>
            <SectionHeader center={false} kicker="Give" title="Your generosity changes lives" />
            <p className="text-white">Your gifts support worship, outreach and care for families in need. Thank you for partnering with Tidori Ministries.</p>
          </div>
          <GiveForm dark projectId={params.get('project')} />
        </div>
      </section>
    </>
  );
}
