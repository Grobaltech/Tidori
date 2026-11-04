import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import PostCard from '../components/PostCard';
import Loading from '../components/Loading';
import { useAsync } from '../hooks/hooks';
import { getPosts } from '../lib/api';

export default function Blog() {
  const { data, loading } = useAsync(getPosts);
  return (
    <>
      <PageHeader title="Blog" />
      <section className="py-11">
        <div className="container-page">
          <SectionHeader kicker="Latest Posts" title="Devotionals and church news" />
          {loading ? <Loading /> : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {data.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
