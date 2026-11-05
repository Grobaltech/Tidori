import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import GiveForm from '../components/GiveForm';

function PaymentNotice({ status, reference }) {
  if (!status) return null;
  const messages = {
    paid: { title: 'Thank you — your donation was received.', detail: 'Pesapal has confirmed your payment.' },
    failed: { title: 'The payment was not completed.', detail: 'You can try again using the donation form below.' },
    pending: { title: 'Your payment is being processed.', detail: 'The payment status is not final yet. Please allow a moment for confirmation.' },
    processing: { title: 'Your payment is being verified.', detail: 'Tidori is checking the transaction status with Pesapal.' },
    cancelled: { title: 'Checkout was cancelled.', detail: 'No completed payment was confirmed. You can try again below.' },
    reversed: { title: 'This payment was reversed.', detail: 'Please contact Tidori Ministries if you need assistance.' },
  };
  const notice = messages[status];
  if (!notice) return null;
  const positive = status === 'paid';
  return (
    <div className={`mb-6 rounded-lg border p-4 ${positive ? 'border-green-300 bg-green-50 text-green-900' : 'border-white/30 bg-white/10 text-white'}`} role="status" aria-live="polite">
      <h3 className="font-semibold">{notice.title}</h3>
      <p className="mt-1 text-sm">{notice.detail}</p>
      {reference && <p className="mt-2 text-xs opacity-80">Reference: {reference}</p>}
    </div>
  );
}

export default function Give() {
  const [params] = useSearchParams();
  return (
    <>
      <PageHeader title="Give" />
      <section className="my-11 bg-cover bg-fixed bg-center py-16"
        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), url('/img/donate.jpg')" }}>
        <div className="container-page grid items-center gap-10 lg:grid-cols-[7fr_5fr]">
          <div>
            <SectionHeader center={false} kicker="Give" title="Your generosity changes lives" />
            <p className="text-white">Your gifts support worship, outreach and care for families in need. Thank you for partnering with Tidori Ministries.</p>
          </div>
          <div>
            <PaymentNotice status={params.get('payment')} reference={params.get('reference')} />
            <GiveForm dark projectId={params.get('project')} />
          </div>
        </div>
      </section>
    </>
  );
}
