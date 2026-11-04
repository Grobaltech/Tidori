import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa';
import { site } from '../config/site';
import VideoModal from './VideoModal';

const slides = [
  { img: '/img/carousel-1.jpg', title: 'Welcome to Tidori Ministries', text: 'A community of faith, hope and service. Come as you are and grow with us.' },
  { img: '/img/carousel-2.jpg', title: 'Get involved with a helping hand', text: 'Serve alongside our church family as we love our neighbours in practical ways.' },
  { img: '/img/carousel-3.jpg', title: 'Bringing hope to our community', text: 'Your giving and prayers help us reach families in need.' },
];

export default function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [video, setVideo] = useState(false);
  const go = (d) => setI((x) => (x + d + slides.length) % slides.length);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section className="relative h-[520px] overflow-hidden bg-ink sm:h-[600px] lg:h-[700px]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, idx) => (
        <div key={s.title} className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <img src={s.img} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="max-w-[700px] text-center">
              <h1 className="mb-5 text-4xl font-bold !text-white sm:text-5xl lg:text-6xl">{s.title}</h1>
              <p className="mb-6 text-lg text-white sm:text-xl">{s.text}</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/give" className="btn-custom btn-light">Give Now</Link>
                {site.videoUrl ? (
                  <button className="btn-custom btn-light" onClick={() => setVideo(true)}>Watch Video</button>
                ) : (
                  <Link to="/about" className="btn-custom btn-light">Learn More</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {[[-1, FaAngleLeft, 'left-0', 'Previous'], [1, FaAngleRight, 'right-0', 'Next']].map(([d, Icon, pos, label]) => (
        <button key={label} aria-label={label} onClick={() => go(d)}
          className={`absolute ${pos} top-1/2 z-10 flex h-14 w-12 -translate-y-1/2 items-center justify-center bg-black/40 text-3xl text-white hover:bg-gold hover:text-ink`}>
          <Icon />
        </button>
      ))}
      {video && <VideoModal src={site.videoUrl} onClose={() => setVideo(false)} />}
    </section>
  );
}
