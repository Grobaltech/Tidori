import PageHeader from '../components/PageHeader';
import { Link } from 'react-router-dom';
import AppointmentForm from '../components/AppointmentForm';
import { useDocTitle } from '../hooks/hooks';

export default function AppointmentBooking() {
  useDocTitle('Book an Appointment');
  return <>
    <PageHeader title="Book an Appointment" />
    <section className="py-11">
      <div className="container-page">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <p className="mb-2 font-semibold uppercase tracking-wider text-gold">We are here for you</p>
          <h2 className="text-3xl sm:text-4xl">Book time with our ministry team</h2>
          <p className="mt-3 leading-7 text-gray-600">Request a meeting with the pastor for prayer, counselling, spiritual guidance or another ministry matter. Choose a preferred date and time and our team will contact you to confirm your appointment.</p>
        </div>
        <div className="mx-auto max-w-4xl"><p className="mb-4 rounded-xl border border-[#e8dfc5] bg-[#fbf8ef] p-4 text-sm text-[#66552a]">Sign in before booking to have this request saved to your appointment history. <Link className="font-bold underline" to="/login?next=%2Fappointments%2Fbook">Sign in to Tidori</Link>.</p><AppointmentForm /></div>
      </div>
    </section>
  </>;
}
