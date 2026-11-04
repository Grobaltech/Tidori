import { Link } from 'react-router-dom';
import { useDocTitle } from '../hooks/hooks';

export default function PageHeader({ title }) {
  useDocTitle(title);
  return (
    <section className="page-header-bg mb-11 px-4 pb-20 pt-24 text-center md:pt-32">
      <h2 className="relative mb-5 inline-block pb-2 text-[40px] font-bold !text-gold sm:text-[60px] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-24 after:-translate-x-1/2 after:bg-gold">
        {title}
      </h2>
      <div className="text-xl text-white">
        <Link to="/" className="px-3 hover:text-gold">Home</Link>
        <span className="px-3 text-gold">{title}</span>
      </div>
    </section>
  );
}
