import { Link } from 'react-router-dom';
import { formatDate } from '../lib/format';

export default function PostCard({ post }) {
  return (
    <article className="overflow-hidden rounded bg-white shadow">
      <Link to={`/blog/${post.slug}`}>
        <img src={post.image_url || '/img/blog-1.jpg'} alt="" className="h-48 w-full object-cover" />
      </Link>
      <div className="p-5">
        <p className="mb-1 text-sm text-gold">{formatDate(post.published_at)}</p>
        <h3 className="mb-2 text-xl font-bold text-navy">
          <Link to={`/blog/${post.slug}`} className="hover:text-gold">{post.title}</Link>
        </h3>
        <p className="line-clamp-3 text-sm">{post.excerpt}</p>
      </div>
    </article>
  );
}
