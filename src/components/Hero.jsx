import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { site } from '../config/site';
import VideoModal from './VideoModal';
import { useAsync } from '../hooks/hooks';
import { getHomepageSlides, getSiteContent } from '../lib/api';

export default function Hero() {
  const ref = useRef(null);
  const [video, setVideo] = useState(false);
  const { data: remoteSlides, loading: slidesLoading } = useAsync(getHomepageSlides);
  const { data: remoteSite } = useAsync(getSiteContent);
  const slides = remoteSlides || [];
  const activeSite = remoteSite || site;

  useEffect(() => {
    if (slidesLoading) return;
    const jq = window.jQuery;
    if (!jq || !jq.fn.owlCarousel || !ref.current) return;
    const carousel = jq(ref.current);
    carousel.owlCarousel({
      autoplay: true, autoplayTimeout: 5500, autoplayHoverPause: true,
      animateOut: 'fadeOut', animateIn: 'fadeIn', items: 1,
      smartSpeed: 700, dots: false, loop: slides.length > 1, nav: true,
      navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>']
    });
    return () => {
      if (carousel.hasClass('owl-loaded')) carousel.trigger('destroy.owl.carousel');
    };
  }, [slides, slidesLoading]);

  if (!slides.length) return null;

  return (
    <>
      <section className="carousel">
        <div className="container-fluid">
          <div className="owl-carousel" ref={ref}>
            {slides.map((slide, index) => (
              <div className="carousel-item" key={slide.id || slide.title || index}>
                <div className="carousel-img">
                  <img src={slide.image_url || slide.img} alt={slide.image_alt || 'Tidori Ministries'} />
                </div>
                <div className="carousel-text">
                  <h1>{slide.title}</h1>
                  <p>{slide.description || slide.text}</p>
                  <div className="carousel-btn">
                    <Link className="btn btn-custom" to={slide.button_url || '/give'}>{slide.button_label || 'Give Now'}</Link>
                    {activeSite.videoUrl
                      ? <button className="btn btn-custom btn-play" type="button" onClick={() => setVideo(true)}>Watch Video</button>
                      : <Link className="btn btn-custom" to="/about">Learn More</Link>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {video && <VideoModal src={activeSite.videoUrl} onClose={() => setVideo(false)} />}
    </>
  );
}
