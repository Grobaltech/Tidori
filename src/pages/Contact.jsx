import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import ContactForm from '../components/ContactForm';
import AppointmentForm from '../components/AppointmentForm';
import { site } from '../config/site';
import { useAsync } from '../hooks/hooks';
import { getSiteContent } from '../lib/api';

export default function Contact() {
  const { data: cmsSite } = useAsync(getSiteContent);
  const activeSite = cmsSite || site;
  const info = [
    [FaMapMarkerAlt, 'Address', activeSite.address],
    [FaPhoneAlt, 'Phone', activeSite.phone],
    [FaEnvelope, 'Email', activeSite.email],
  ];
  return (
    <>
      <PageHeader title="Contact Us" />
      <section className="py-11">
        <div className="container-page">
          <SectionHeader kicker="Get In Touch" title="We would love to hear from you" />
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              {info.map(([Icon, label, val]) => (
                <div key={label} className="mb-6 flex items-start">
                  <Icon className="mr-4 mt-1 text-2xl text-gold" />
                  <div><h3 className="text-xl">{label}</h3><p>{val}</p></div>
                </div>
              ))}
              <p><strong className="text-navy">Service times:</strong> {activeSite.serviceTimes}</p>
              <img src="/img/contact.jpg" alt="" className="mt-6 w-full" loading="lazy" />
            </div>
            <ContactForm />
          </div>
          <div className="mt-12"><AppointmentForm /></div>
        </div>
      </section>
    </>
  );
}
