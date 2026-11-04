import { FaCalendarAlt, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { dateLong, timeShort } from '../lib/format';

export default function EventCard({ ev }) {
  return (
    <div className="flex flex-col overflow-hidden bg-mist sm:flex-row">
      <img src={ev.image_url} alt={ev.title} className="h-56 w-full object-cover sm:h-auto sm:w-2/5" loading="lazy" />
      <div className="flex flex-1 flex-col justify-center p-6">
        <h3 className="mb-3 text-2xl">{ev.title}</h3>
        <p className="mb-1 flex items-center"><FaCalendarAlt className="mr-2 text-gold" /> {dateLong(ev.starts_at)}</p>
        <p className="mb-1 flex items-center"><FaClock className="mr-2 text-gold" /> {timeShort(ev.starts_at)}</p>
        {ev.location && <p className="mb-3 flex items-center"><FaMapMarkerAlt className="mr-2 text-gold" /> {ev.location}</p>}
        <p>{ev.description}</p>
      </div>
    </div>
  );
}
