import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaArrowLeft, FaArrowRight, FaUser, FaCalendarAlt, FaClock,
  FaWhatsapp, FaFacebookF, FaLink, FaQuoteLeft, FaBookOpen,
} from 'react-icons/fa';
import Loading from '../components/Loading';
import PostCard from '../components/PostCard';
import { useAsync } from '../hooks/hooks';
import { getPost, getPosts } from '../lib/api';
import { dateLong } from '../lib/format';

const allowedArticleTags = new Set(['P','H1','H2','H3','H4','UL','OL','LI','STRONG','B','EM','I','U','BLOCKQUOTE','A','IMG','BR','HR','SPAN','DIV']);
function safeArticleHtml(html = '') {
  if (typeof window === 'undefined') return '';
  const source = /<\\/?[a-z][\\s\\S]*>/i.test(html) ? html : html.split(/\\n{2,}/).map(part => `<p>${part.split('\\n').map(line => line.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')).join('<br>')}</p>`).join('');
  const parsed = new DOMParser().parseFromString(source, 'text/html');
  const cleanNode = (node) => [...node.childNodes].forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) return;
    if (child.nodeType !== Node.ELEMENT_NODE) { child.remove(); return; }
    if (!allowedArticleTags.has(child.tagName)) { child.replaceWith(...child.childNodes); return; }
    [...child.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (child.tagName === 'A' && name === 'href') { if (!(/^(https?:|mailto:|tel:)/i.test(attr.value) || attr.value.startsWith('/'))) child.removeAttribute(attr.name); }
      else if (child.tagName === 'IMG' && name === 'src') { if (!/^https?:\/\//i.test(attr.value)) child.removeAttribute(attr.name); }
      else if (name === 'style') { const safe = attr.value.split(';').map(rule=>rule.trim()).filter(rule=>/^(color|background-color|text-align):\s*[#(),.%\w -]+$/i.test(rule)).join(';'); if(safe) child.setAttribute('style',safe); else child.removeAttribute('style'); }
      else if (!(child.tagName === 'A' && ['target','rel','title'].includes(name)) && !(child.tagName === 'IMG' && ['alt','title','width'].includes(name))) child.removeAttribute(attr.name);
    });
    if(child.tagName==='A'){child.setAttribute('rel','noopener noreferrer');child.setAttribute('target','_blank');}
    if(child.tagName==='IMG') child.setAttribute('loading','lazy');
    cleanNode(child);
  });
  cleanNode(parsed.body);
  return parsed.body.innerHTML;
}

function estimateReadingTime(body = '') {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function BlogPost() {
  const { slug } = useParams();
  const { data: post, loading } = useAsync(() => getPost(slug), [slug]);
  const { data: posts = [] } = useAsync(getPosts);
  const [copied, setCopied] = useState(false);

  const paragraphs = useMemo(
    () => (post?.body || '').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean),
    [post?.body]
  );
  const relatedPosts = useMemo(
    () => (posts || []).filter((item) => item.id !== post?.id && item.slug !== slug).slice(0, 3),
    [posts, post?.id, slug]
  );

  const presentation = post?.presentation || {};
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = post ? `${post.title} — Tidori Ministries` : 'Tidori Ministries';

  const shareWhatsApp = () => window.open(
    `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    '_blank',
    'noopener,noreferrer'
  );
  const shareFacebook = () => window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    '_blank',
    'noopener,noreferrer'
  );
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copy this article link:', shareUrl);
    }
  };

  if (loading) return <div className="container-page py-20"><Loading /></div>;
  if (!post) {
    return (
      <section className="container-page py-20 text-center">
        <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-2xl text-gold"><FaBookOpen /></span>
        <h1 className="mb-3 text-3xl">Article not found</h1>
        <p className="mb-7 text-[#777]">We couldn't find the article you were looking for.</p>
        <Link to="/blog" className="btn-custom"><FaArrowLeft className="mr-2 inline" /> Back to the blog</Link>
      </section>
    );
  }

  return (
    <main className="pb-16">
      <section className={`relative isolate flex items-end overflow-hidden bg-[#142c35] ${presentation.hero_style === 'minimal' ? 'min-h-[250px]' : presentation.hero_style === 'compact' ? 'min-h-[320px]' : 'min-h-[390px] sm:min-h-[500px]'}`}>
        {post.image_url && presentation.show_featured_image !== false && presentation.hero_style !== 'minimal' && (
          <img
            src={post.image_url}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            fetchPriority="high"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#081a20]/95 via-[#081a20]/55 to-[#081a20]/20" />
        <div className="container-page relative z-10 w-full pb-12 pt-28 sm:pb-16">
          <Link to="/blog" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/85 transition hover:text-gold">
            <FaArrowLeft /> All articles
          </Link>
          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[.18em] text-gold">
            <span className="rounded-full border border-gold/60 bg-black/20 px-4 py-2">{presentation.category || 'Tidori Journal'}</span>
            <span className="h-1 w-1 rounded-full bg-gold" />
            <span>Faith · Community · News</span>
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.08] !text-white sm:text-5xl md:text-6xl">
            {post.title}
          </h1>
          {post.excerpt && presentation.show_excerpt !== false && <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">{post.excerpt}</p>}
          {(presentation.show_author !== false || presentation.show_date !== false || presentation.show_read_time !== false) && <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
            {presentation.show_author !== false && <span className="inline-flex items-center gap-2"><FaUser className="text-gold" /> {post.author || 'Tidori Ministries'}</span>}
            {presentation.show_date !== false && <span className="inline-flex items-center gap-2"><FaCalendarAlt className="text-gold" /> {dateLong(post.published_at)}</span>}
            {presentation.show_read_time !== false && <span className="inline-flex items-center gap-2"><FaClock className="text-gold" /> {estimateReadingTime(post.body)} min read</span>}
          </div>}
        </div>
      </section>

      <div className={`container-page mt-10 grid grid-cols-1 gap-10 lg:mt-14 ${presentation.show_sidebar === false ? '' : 'lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-14'}`}>
        <article className="min-w-0">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-gold">{presentation.category || 'From Tidori Ministries'}</p>
              <p className="mt-1 text-sm text-[#888]">A message to inform, encourage and build community.</p>
            </div>
            <div className="flex items-center gap-2" aria-label="Share this article">
              {presentation.show_whatsapp !== false && <button type="button" onClick={shareWhatsApp} aria-label="Share on WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf7f0] text-[#168b48] transition hover:-translate-y-1 hover:bg-[#168b48] hover:text-white"><FaWhatsapp /></button>}
              {presentation.show_facebook !== false && <button type="button" onClick={shareFacebook} aria-label="Share on Facebook" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf1fa] text-[#315da8] transition hover:-translate-y-1 hover:bg-[#315da8] hover:text-white"><FaFacebookF /></button>}
              {presentation.show_copy_link !== false && <button type="button" onClick={copyLink} aria-label="Copy article link" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:-translate-y-1 hover:bg-navy hover:text-white"><FaLink /></button>}
              <span className="sr-only" aria-live="polite">{copied ? 'Article link copied' : ''}</span>
            </div>
          </div>

          <div className={`blog-article-content ${presentation.content_width === 'narrow' ? 'max-w-[620px]' : presentation.content_width === 'wide' ? 'max-w-[980px]' : 'max-w-[760px]'}`} dangerouslySetInnerHTML={{__html:safeArticleHtml(post.body || '')}} />

          {presentation.show_whatsapp !== false && <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-y border-gray-200 py-6">
            <p className="text-sm font-semibold text-navy">Was this article helpful? Share it with someone.</p>
            <button type="button" onClick={shareWhatsApp} className="inline-flex items-center gap-2 font-semibold text-[#168b48] transition hover:gap-3">
              Share this article <FaArrowRight />
            </button>
          </div>}
          <Link to="/blog" className="mt-8 inline-flex items-center gap-2 font-semibold text-navy transition hover:text-gold">
            <FaArrowLeft /> Back to all articles
          </Link>
        </article>

        {presentation.show_sidebar !== false && <aside className="space-y-6">
          <div className="border-t-4 border-gold bg-[#f6f7f5] p-7">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-lg text-gold"><FaQuoteLeft /></span>
            <h2 className="mb-3 text-xl">{presentation.sidebar_title || 'Growing together'}</h2>
            <p className="mb-5 text-sm leading-7 text-[#777]">{presentation.sidebar_text || 'Explore stories, updates and reflections from the Tidori Ministries community.'}</p>
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-navy hover:text-gold">Explore the journal <FaArrowRight /></Link>
          </div>
          <div className="rounded-sm bg-[#142c35] p-7 text-white">
            <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-gold">Stay connected</p>
            <h2 className="mb-3 text-2xl !text-white">Be part of the community</h2>
            <p className="mb-5 text-sm leading-7 text-white/75">Discover our ministries, upcoming events and ways to serve.</p>
            <Link to="/about" className="inline-flex items-center gap-2 border-b border-gold pb-1 text-sm font-semibold text-gold hover:text-white">Discover Tidori <FaArrowRight /></Link>
          </div>
        </aside>}
      </div>

      {presentation.show_related !== false && relatedPosts.length > 0 && (
        <section className="mt-16 bg-[#f6f7f5] py-14 sm:mt-20 sm:py-16">
          <div className="container-page">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-[.2em] text-gold">Keep reading</p>
                <h2 className="text-3xl sm:text-4xl">{presentation.related_title || 'More from Tidori'}</h2>
              </div>
              <Link to="/blog" className="inline-flex items-center gap-2 font-semibold text-navy hover:text-gold">View all articles <FaArrowRight /></Link>
            </div>
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((item) => <PostCard key={item.id} post={item} />)}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
