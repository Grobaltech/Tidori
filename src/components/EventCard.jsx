import { formatDate } from '../lib/format';

export default function EventCard({ event }) {
  return (
    <article className="overflow-hidden rounded bg-white shadow">
      <img src={event.image_url || '/img/event-1.jpg'} alt="" className="h-48 w-full object-cover" />
      <div className="p-5">
        <p className="mb-1 text-sm text-gold">{formatDate(event.starts_at)}</p>
        <h3 className="mb-2 text-xl font-bold text-navy">{event.title}</h3>
        <p className="mb-2 text-sm">{event.location}</p>
        <p className="line-clamp-3 text-sm">{event.description}</p>
      </div>
    </article>
  );
}
