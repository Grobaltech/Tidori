import { useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import SectionHeader from '../components/SectionHeader';
import Counter from '../components/Counter';
import Slider from '../components/Slider';
import OutreachCard from '../components/OutreachCard';
import EventCard from '../components/EventCard';
import PostCard from '../components/PostCard';
import GiveForm from '../components/GiveForm';
import Loading from '../components/Loading';
import { site } from '../config/site';
import { useAsync, useDocTitle } from '../hooks/hooks';
import { getOutreach, getEvents, getPosts, getSiteContent, getMinistries as getPublishedMinistries, getSiteFacts } from '../lib/api';

function AboutTabs() {
  const [tab, setTab] = useState('about');
  const { data: cmsSite } = useAsync(getSiteContent);
  const activeSite = cmsSite || site;
  const sections = [
    { key: 'about', label: 'About', title: 'Who We Are', preview: 'Tidori Ministries (U) Limited is a Christian organisation committed to proclaiming the Gospel of Jesus Christ and contributing to the spiritual, social and economic transformation of individuals, families and communities.', more: 'Learn about our identity, Christian foundation and the work we are established to pursue.' },
    { key: 'mission', label: 'Mission', title: 'Our Mission', preview: 'To proclaim and advance the Gospel of Jesus Christ, nurture Christian faith and fellowship, provide spiritual guidance and compassionate support, and promote the social and economic empowerment of individuals and communities.', more: 'Discover how evangelism, worship, counselling, education, charitable service and sustainable development bring our mission to life.' },
    { key: 'vision', label: 'Vision', title: 'Our Vision', preview: 'To see spiritually transformed individuals, strengthened families and empowered communities living with dignity, purpose and sustainable opportunities, guided by the teachings of Jesus Christ.', more: 'Explore the future we seek to build through faith, service and community transformation.' },
    { key: 'purpose', label: 'Purpose', title: 'Our Purpose', preview: 'We exist to serve God and humanity by bringing together spiritual ministry, compassionate service and practical community development.', more: 'Read about the needs we seek to address and the difference we aim to make.' },
    { key: 'objectives', label: 'Objectives', title: 'Our Objectives', preview: 'Our registered objectives encompass evangelism, Christian fellowship, counselling, charity, education, youth and women’s empowerment, poverty reduction, agriculture and institutional partnerships.', more: 'Explore the objectives set out in our Memorandum of Association.' },
    { key: 'focus', label: 'Focus Areas', title: 'Our Areas of Focus', preview: 'Our work is expressed through spiritual ministry, pastoral care, community support, education and skills development, youth and women’s empowerment, agriculture and partnerships.', more: 'See the practical areas through which we seek to serve individuals and communities.' },
    { key: 'values', label: 'Values', title: 'Our Guiding Values', preview: 'Faith, compassion, integrity, service, empowerment, unity, responsibility and sustainability guide the way we serve and work with others.', more: 'Learn about the principles that shape our decisions, relationships and service.' },
    { key: 'commitment', label: 'Commitment', title: 'Our Commitment to Communities', preview: 'We are committed to serving communities with compassion, accountability and a holistic understanding of spiritual, family, social and economic needs.', more: 'Discover the commitments that guide our work with people and communities.' },
    { key: 'partnerships', label: 'Partnerships', title: 'Working Together', preview: 'We welcome collaboration with churches, community organisations, public institutions, non-governmental organisations, development partners and individuals whose objectives align with our mission.', more: 'Find out how partnership, shared knowledge and coordinated action can extend our impact.' },
  ];
  const selected = sections.find((item) => item.key === tab) || sections[0];
  const cmsPreview = activeSite.about?.[tab];
  const preview = typeof cmsPreview === 'string' && cmsPreview.trim() ? cmsPreview : selected.preview;
  return (
    <section className="py-11">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2">
        <div className="h-[420px] bg-cover bg-center lg:h-[560px]" style={{ backgroundImage: `url('${activeSite.about?.imageUrl || '/img/about.jpg'}')` }} role="img" aria-label="Tidori Ministries community" />
        <div>
          <SectionHeader center={false} kicker="Learn About Us" title="Faith in action. Transforming lives. Building communities." />
          <div className="flex flex-wrap border-b border-gray-200" role="tablist" aria-label="About Tidori Ministries">
            {sections.map((item) => (
              <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}
                className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors sm:px-4 sm:text-base ${tab === item.key ? 'border-gold bg-gold text-ink' : 'border-transparent text-navy hover:border-gold hover:text-gold'}`}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-5" role="tabpanel">
            <h3 className="mb-3 text-2xl font-semibold text-navy">{selected.title}</h3>
            <p className="leading-7">{preview}</p>
            <p className="mt-3 text-sm leading-6 text-gray-600">{selected.more}</p>
            <Link to={`/about#${selected.key}`} className="btn-custom mt-5 inline-flex">View More <span className="ml-2" aria-hidden="true">→</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Ministries() {
  const { data: ministries } = useAsync(getPublishedMinistries);
  const items = ministries?.length ? ministries : site.ministries;
  return (
    <section className="py-11">
      <div className="container-page">
        <SectionHeader kicker="What We Do" title="We believe we can change lives together with you" />
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <div key={m.title} className="flex">
              <i className={`${m.icon} block w-[60px] shrink-0 text-[60px] leading-[60px] text-gold`} />
              <div className="relative ml-5 border-l border-black/10 pl-5">
                <h3 className="mb-2 text-xl">{m.title}</h3>
                <p>{m.description || m.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Facts() {
  const { data: cmsFacts } = useAsync(getSiteFacts);
  const facts = cmsFacts?.length ? cmsFacts : site.facts;
  return (
    <section className="facts my-11 flex min-h-[400px] items-center bg-black/50 bg-cover bg-fixed bg-center bg-blend-overlay"
      style={{ backgroundImage: "url('/img/facts.jpg')" }}>
      <div className="container-page grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="flex items-center">
            <i className={`${f.icon} text-[60px] leading-[60px] text-gold`} />
            <div className="pl-5">
              <h3 className="text-[45px] font-bold leading-none !text-white"><Counter value={f.value} suffix="+" /></h3>
              <p className="text-white">{f.label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  useDocTitle('');
  const outreach = useAsync(getOutreach);
  const events = useAsync(getEvents);
  const posts = useAsync(getPosts);

  return (
    <>
      <Hero />
      <AboutTabs />
      <Ministries />
      <Facts />

      <section className="py-11">
        <div className="container-page">
          <SectionHeader kicker="Outreach" title="Projects your giving makes possible" />
          {outreach.loading ? <Loading /> : <Slider items={outreach.data} render={(it) => <OutreachCard item={it} />} />}
        </div>
      </section>

      <section className="my-11 bg-cover bg-fixed bg-center py-16"
        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), url('/img/donate.jpg')" }}>
        <div className="container-page grid items-center gap-10 lg:grid-cols-[7fr_5fr]">
          <div>
            <SectionHeader center={false} kicker="Give" title="Partner with us to bless those in need" />
            <p className="text-white">Every gift, large or small, helps us feed families, support children and share hope. Thank you for your generosity.</p>
          </div>
          <GiveForm dark />
        </div>
      </section>

      <section className="py-11">
        <div className="container-page">
          <SectionHeader kicker="Upcoming Events" title="Be ready for our upcoming gatherings" />
          {events.loading ? <Loading /> : (
            <div className="grid gap-8 lg:grid-cols-2">
              {events.data.slice(0, 2).map((ev) => <EventCard key={ev.id} ev={ev} />)}
            </div>
          )}
        </div>
      </section>

      <section className="py-11">
        <div className="container-page">
          <SectionHeader kicker="Latest Posts" title="Devotionals and church news" />
          {posts.loading ? <Loading /> : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.data.slice(0, 3).map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
