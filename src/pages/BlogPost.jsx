import { Link, useParams } from 'react-router-dom';
import { FaUser, FaCalendarAlt } from 'react-icons/fa';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import { useAsync } from '../hooks/hooks';
import { getPost } from '../lib/api';
import { dateLong } from '../lib/format';

export default function BlogPost() {
  const { slug } = useParams();
  const { data: post, loading } = useAsync(() => getPost(slug), [slug]);

  if (loading) return <><PageHeader title="Blog" /><Loading /></>;
  if (!post) {
    return (
      <>
        <PageHeader title="Post not found" />
        <div className="container-page py-11 text-center">
          <p className="mb-6">We couldn't find that post.</p>
          <Link to="/blog" className="btn-custom">Back to Blog</Link>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeader title={post.title} />
      <article className="container-page max-w-3xl py-11">
        {post.image_url && <img src={post.image_url} alt={post.title} className="mb-6 w-full" />}
        <div className="mb-6 flex flex-wrap gap-5 text-sm">
          <span className="flex items-center"><FaUser className="mr-2 text-gold" /> {post.author}</span>
          <span className="flex items-center"><FaCalendarAlt className="mr-2 text-gold" /> {dateLong(post.published_at)}</span>
        </div>
        {/* body is rendered as plain text paragraphs (safe - no HTML injection) */}
        {post.body.split(/\n{2,}/).map((para, i) => <p key={i} className="mb-5 text-lg leading-8">{para}</p>)}
        <Link to="/blog" className="btn-custom mt-4">Back to Blog</Link>
      </article>
    </>
  );
}
