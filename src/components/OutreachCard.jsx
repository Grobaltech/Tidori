import { Link } from 'react-router-dom';
import { money, pct } from '../lib/format';
import { useInView } from '../hooks/hooks';

export default function OutreachCard({ item }) {
  const [ref, seen] = useInView();
  const p = pct(item.raised_amount, item.goal_amount);
  return (
    <div className="h-full overflow-hidden bg-mist">
      <div className="overflow-hidden">
        <img src={item.image_url} alt={item.title} className="w-full transition-transform duration-300 hover:scale-110" loading="lazy" />
      </div>
      <div ref={ref} className="px-7 pb-4 pt-12">
        <div className="relative h-2.5 bg-gray-300">
          <div className="relative h-full bg-gold transition-all duration-[2000ms]" style={{ width: seen ? `${p}%` : '0%' }}>
            <span className="absolute -top-8 right-0 bg-gold px-1.5 py-0.5 text-sm font-semibold text-navy">{p}%</span>
          </div>
        </div>
        <div className="mt-4 flex justify-between text-sm">
          <p><strong className="text-navy">Raised:</strong> {money(item.raised_amount)}</p>
          <p><strong className="text-navy">Goal:</strong> {money(item.goal_amount)}</p>
        </div>
      </div>
      <div className="px-7 pb-2 text-center">
        <h3 className="mb-2 text-2xl">{item.title}</h3>
        <p>{item.summary}</p>
      </div>
      <div className="flex justify-center gap-3 px-7 pb-8 pt-4">
        <Link to="/contact" className="btn-custom">Learn More</Link>
        <Link to={`/give?project=${item.id}`} className="btn-custom">Give</Link>
      </div>
    </div>
  );
}
