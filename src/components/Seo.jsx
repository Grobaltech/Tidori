import { useEffect } from 'react';

const ORIGIN = 'https://tidoriministries.org';
const DEFAULT_IMAGE = `${ORIGIN}/img/grok_1793864104245.jpg`;

function setMeta(selector, attribute, key, content) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content || '');
}

export default function Seo({
  title = 'Tidori Ministries',
  description = 'Tidori Ministries is a community of faith, hope and service, committed to spiritual growth and compassionate community development.',
  path,
  image = DEFAULT_IMAGE,
  noindex = false,
}) {
  useEffect(() => {
    const canonicalUrl = new URL(path || window.location.pathname, ORIGIN).toString();
    const cleanTitle = title || 'Tidori Ministries';
    const cleanDescription = String(description || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    document.title = cleanTitle;

    setMeta('meta[name="description"]', 'name', 'description', cleanDescription);
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Tidori Ministries');
    setMeta('meta[property="og:title"]', 'property', 'og:title', cleanTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', cleanDescription);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:image"]', 'property', 'og:image', image || DEFAULT_IMAGE);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', cleanTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', cleanDescription);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image || DEFAULT_IMAGE);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [title, description, path, image, noindex]);

  return null;
}
