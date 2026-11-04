import { Link } from 'react-router-dom';
import { FaUser, FaCalendarAlt } from 'react-icons/fa';
import { dateLong } from '../lib/format';

export default function PostCard({ post }) {
  return (
    <article className="h-full overflow-hidden bg-mist">
      <Link to={`/blog/${post.slug}`} className="block overflow-hidden">
        <img src={post.image_url} alt={post.title} className="w-full transition-transform duration-300 hover:scale-110" loading="lazy" />
      </Link>
      <div className="p-6">
        <h3 className="mb-3 text-2xl"><Link to={`/blog/${post.slug}`} className="hover:text-gold">{post.title}</Link></h3>
        <div className="mb-3 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center"><FaUser className="mr-1.5 text-gold" /> {post.author}</span>
          <span className="flex items-center"><FaCalendarAlt className="mr-1.5 text-gold" /> {dateLong(post.published_at)}</span>
        </div>
        <p className="mb-4">{post.excerpt}</p>
        <Link to={`/blog/${post.slug}`} className="btn-custom">Read More</Link>
      </div>
    </article>
  );
}
