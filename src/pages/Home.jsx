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

function AboutTabs({ section = {} }) {
  const [tab, setTab] = useState('about');
  const { data: cmsSite } = useAsync(getSiteContent);
  const activeSite = cmsSite || site;
  const sections = [
    { key: 'about', label: 'About', title: 'Who We Are', preview: 'Tidori Ministries (U) Limited is a Christian organisation committed to proclaiming the Gospel of Jesus Christ and contributing to the spiritual, social and economic transformation of individuals, families and communities.', more: 'Learn about our identity, Christian foundation and the work we are established to pursue.' },
    { key: 'mission', label: 'Mission', title: 'Our Mission', preview: 'To proclaim and advance the Gospel of Jesus Christ, nurture Christian faith and fellowship, provide spiritual guidance and compassionate support, and promote the social and economic empowerment of individuals and communities.', more: 'Discover how evangelism, worship, counselling, education, charitable service and sustainable development bring our mission to life.' },
    { key: 'vision', label: 'Vision', title: 'Our Vision', preview: 'To see spiritually transformed individuals, strengthened families and empowered communities living with dignity, purpose and sustainable opportunities, guided by the teachings of Jesus Christ.', more: 'Explore the future we seek to build through faith, service and community transformation.' },
    { key: 'purpose', label: 'Purpose', title: 'Our Purpose', preview: 'We exist to serve God and humanity by bringing together spiritual ministry, compassionate service and practical community development.', more: 'Read about the needs we seek to address and the difference we aim to make.' },
    { key: 'objectives', label: 'Objectives', title: 'Our Objectives', preview: 'Our registered objectives encompass evangelism, Christian fellowship, counselling, charity, education, youth and women’s empowerment, poverty reduction, agriculture and institutional partnerships.', more: 'Explore the objectives set out in our Memorandum of Association.' },
    { key: 'focus-areas', label: 'Focus Areas', title: 'Our Areas of Focus', preview: 'Our work is expressed through spiritual ministry, pastoral care, community support, education and skills development, youth and women’s empowerment, agriculture and partnerships.', more: 'See the practical areas through which we seek to serve individuals and communities.' },
    { key: 'values', label: 'Values', title: 'Our Guiding Values', preview: 'Faith, compassion, integrity, service, empowerment, unity, responsibility and sustainability guide the way we serve and work with others.', more: 'Learn about the principles that shape our decisions, relationships and service.' },
    { key: 'commitment', label: 'Commitment', title: 'Our Commitment to Communities', preview: 'We are committed to serving communities with compassion, accountability and a holistic understanding of spiritual, family, social and economic needs.', more: 'Discover the commitments that guide our work with people and communities.' },
    { key: 'partnerships', label: 'Partnerships', title: 'Working Together', preview: 'We welcome collaboration with churches, community organisations, public institutions, non-governmental organisations, development partners and individuals whose objectives align with our mission.', more: 'Find out how partnership, shared knowledge and coordinated action can extend our impact.' },
  ];
  const selected = sections.find((item) => item.key === tab) || sections[0];
  const cmsPreview = activeSite.about?.[tab];
  const preview = typeof cmsPreview === 'string' && cmsPreview.trim() ? cmsPreview : 'Information about this area of Tidori Ministries is being prepared. Please check back soon.';
  return (
    <section className="py-11">
      <div className="container-page grid min-w-0 items-center gap-10 lg:grid-cols-2">
        <div className="h-[420px] bg-cover bg-center lg:h-[560px]" style={{ backgroundImage: `url('${activeSite.about?.imageUrl || '/img/about.jpg'}')` }} role="img" aria-label="Tidori Ministries community" />
        <div className="min-w-0 w-full">
          <SectionHeader center={false} kicker={section.kicker || "Learn About Us"} title={section.title || "Faith in action. Transforming lives. Building communities."} />
          {section.description && <p className="mb-4 leading-7">{section.description}</p>}
          <div className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-gray-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="About Tidori Ministries">
            <div className="flex w-max min-w-full flex-nowrap gap-1">
            {sections.map((item) => (
              <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors sm:px-4 sm:text-base ${tab === item.key ? 'border-gold bg-gold text-ink' : 'border-transparent text-navy hover:border-gold hover:text-gold'}`}>
                {item.label}
              </button>
            ))}
            </div>
          </div>
          <div className="min-w-0 pt-5" role="tabpanel">
            <h3 className="mb-3 text-2xl font-semibold text-navy">{selected.title}</h3>
            <p className="leading-7">{preview}</p>
            
            <Link to={`/about/${selected.key}`} className="btn-custom mt-5 inline-flex">View More <span className="ml-2" aria-hidden="true">→</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Ministries({ section = {} }) {
  const { data: ministries } = useAsync(getPublishedMinistries);
  const items = ministries || [];
  if (!items.length) return null;
  return (
    <section className="py-11">
      <div className="container-page">
        <SectionHeader kicker={section.kicker || "What We Do"} title={section.title || "We believe we can change lives together with you"} />
        {section.description && <p className="mx-auto mb-8 max-w-3xl text-center leading-7">{section.description}</p>}
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

export function Facts({ section = {} }) {
  const { data: cmsFacts } = useAsync(getSiteFacts);
  const facts = cmsFacts || [];
  if (!facts.length) return null;
  return (
    <section className="facts my-11 flex min-h-[300px] items-center bg-black/50 bg-cover bg-fixed bg-center bg-blend-overlay"
      style={{ backgroundImage: "url('/img/facts.jpg')" }}>
      <div className="container-page w-full py-10">
        {(section.kicker || section.title || section.description) && <div className="mb-8 text-center">
          {section.kicker && <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gold">{section.kicker}</p>}
          {section.title && <h2 className="text-3xl font-bold text-white">{section.title}</h2>}
          {section.description && <p className="mx-auto mt-3 max-w-3xl text-white/90">{section.description}</p>}
        </div>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.id || f.label} className="flex items-center">
              <i className={`${f.icon || 'flaticon-home'} text-[60px] leading-[60px] text-gold`} />
              <div className="pl-5">
                <h3 className="text-[45px] font-bold leading-none !text-white"><Counter value={f.value} suffix={f.suffix || '+'} /></h3>
                <p className="text-white">{f.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useDocTitle('');
  const outreach = useAsync(getOutreach);
  const events = useAsync(getEvents);
  const posts = useAsync(getPosts);
  const { data: cmsSite } = useAsync(getSiteContent);
  const defaults = site.homepage.sections;
  const configured = cmsSite?.homepage?.sections || {};
  const sections = Object.entries(defaults).map(([key, value]) => [key, { ...value, ...(configured[key] || {}) }])
    .sort((a, b) => Number(a[1].order ?? 999) - Number(b[1].order ?? 999));
  const renderSection = (key, section) => {
    if (section.enabled === false) return null;
    switch (key) {
      case 'hero': return <Hero />;
      case 'about': return <AboutTabs section={section} />;
      case 'ministries': return <Ministries section={section} />;
      case 'facts': return <Facts section={section} />;
      case 'outreach': return <section className="py-11"><div className="container-page">
        <SectionHeader kicker={section.kicker || 'Outreach'} title={section.title || 'Projects your giving makes possible'} />
        {section.description && <p className="mx-auto mb-8 max-w-3xl text-center leading-7">{section.description}</p>}
        {outreach.loading ? <Loading /> : outreach.data.length ? <Slider items={outreach.data} render={(it) => <OutreachCard item={it} />} /> : <p className="py-6 text-center text-gray-600">Outreach projects will be published here soon.</p>}
      </div></section>;
      case 'giving': return <section className="my-11 bg-cover bg-fixed bg-center py-16" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), url('/img/donate.jpg')" }}>
        <div className="container-page grid items-center gap-10 lg:grid-cols-[7fr_5fr]">
          <div><SectionHeader center={false} kicker={section.kicker || 'Give'} title={section.title || 'Partner with us to bless those in need'} /><p className="text-white">{section.description || 'Every gift, large or small, helps us serve people and communities. Thank you for your generosity.'}</p></div>
          <GiveForm dark />
        </div>
      </section>;
      case 'events': return <section className="py-11"><div className="container-page">
        <SectionHeader kicker={section.kicker || 'Upcoming Events'} title={section.title || 'Be ready for our upcoming gatherings'} />
        {section.description && <p className="mx-auto mb-8 max-w-3xl text-center leading-7">{section.description}</p>}
        {events.loading ? <Loading /> : events.data.length ? <div className="grid gap-8 lg:grid-cols-2">{events.data.filter(ev => !ev.ends_at || new Date(ev.ends_at) >= new Date()).slice(0, 2).map(ev => <EventCard key={ev.id} ev={ev} />)}</div> : <p className="py-6 text-center text-gray-600">New events will be announced here. Please check back soon.</p>}
      </div></section>;
      case 'blog': return <section className="py-11"><div className="container-page">
        <SectionHeader kicker={section.kicker || 'Latest Posts'} title={section.title || 'Devotionals and church news'} />
        {section.description && <p className="mx-auto mb-8 max-w-3xl text-center leading-7">{section.description}</p>}
        {posts.loading ? <Loading /> : posts.data.length ? <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">{posts.data.slice(0, 3).map(p => <PostCard key={p.id} post={p} />)}</div> : <p className="py-6 text-center text-gray-600">News and reflections will be published here soon.</p>}
      </div></section>;
      default: return null;
    }
  };
  return <>{sections.map(([key, section]) => <div key={key}>{renderSection(key, section)}</div>)}</>;
}
