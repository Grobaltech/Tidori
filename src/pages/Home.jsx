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
  const tabs = [['about', 'About'], ['mission', 'Mission'], ['vision', 'Vision']];
  return (
    <section className="py-11">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2">
        <div className="h-[420px] bg-cover bg-center lg:h-[560px]" style={{ backgroundImage: "url('/img/about.jpg')" }} role="img" aria-label="Church community" />
        <div>
          <SectionHeader center={false} kicker="Learn About Us" title="A church family serving with love" />
          <div className="flex">
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex-1 border-b-2 px-4 py-3 text-lg font-semibold ${tab === k ? 'border-gold bg-gold text-ink' : 'border-gray-200 text-navy hover:text-gold'}`}>
                {l}
              </button>
            ))}
          </div>
          <p className="pt-5 leading-7">{activeSite.about[tab]}</p>
          <Link to="/about" className="btn-custom mt-5">Read More</Link>
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
    <section className="my-11 flex min-h-[400px] items-center bg-black/50 bg-cover bg-fixed bg-center bg-blend-overlay"
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
