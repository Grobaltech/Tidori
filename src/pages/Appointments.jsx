import PageHeader from '../components/PageHeader';
import AppointmentForm from '../components/AppointmentForm';
import { useDocTitle } from '../hooks/hooks';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Appointments() {
  useDocTitle('Request an Appointment');
  const [params] = useSearchParams();
  const [paymentNotice, setPaymentNotice] = useState('');
  useEffect(() => {\n    const reference = params.get('reference');\n    const status = params.get('payment');\n    if (!reference || !status) return;\n    let active = true;\n    fetch('/api/payments/status?reference=' + encodeURIComponent(reference), { cache: 'no-store' })\n      .then(response => response.json())\n      .then(data => { if (!active) return; const value = data.payment_status || data.status || status; setPaymentNotice(value === 'paid' ? 'Payment verified successfully. Your appointment request has been received and is awaiting confirmation by the church team.' : value === 'cancelled' ? 'Checkout was cancelled. Your appointment request remains unpaid; contact the church office if you still wish to proceed.' : 'Your payment is being verified. Please wait a moment; the appointment will update automatically when Pesapal confirms it.'); })\n      .catch(() => { if (active) setPaymentNotice('Your appointment request has been received. Payment verification may still be processing.'); });\n    return () => { active = false; };\n  }, [params]);
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
