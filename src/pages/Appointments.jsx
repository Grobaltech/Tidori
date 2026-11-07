import PageHeader from '../components/PageHeader';
import AppointmentForm from '../components/AppointmentForm';
import { useDocTitle } from '../hooks/hooks';

export default function Appointments() {
  useDocTitle('Request an Appointment');
  return (
    <>
      <PageHeader title="Request an Appointment" />
      <section className="py-11">
        <div className="container-page">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <p className="mb-2 font-semibold uppercase tracking-wider text-gold">We are here for you</p>
            <h2 className="text-3xl sm:text-4xl">Book time with our ministry team</h2>
            <p className="mt-3 leading-7 text-gray-600">
              Request a meeting with the pastor for prayer, counselling, spiritual guidance or another ministry matter.
              Choose a preferred date and time and our team will contact you to confirm your appointment.
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <AppointmentForm />
          </div>
        </div>
      </section>
    </>
  );
}
