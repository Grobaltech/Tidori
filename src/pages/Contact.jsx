import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import ContactForm from '../components/ContactForm';
import { site } from '../config/site';

export default function Contact() {
  const info = [
    [FaMapMarkerAlt, 'Address', site.address],
    [FaPhoneAlt, 'Phone', site.phone],
    [FaEnvelope, 'Email', site.email],
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
              <p><strong className="text-navy">Service times:</strong> {site.serviceTimes}</p>
              <img src="/img/contact.jpg" alt="" className="mt-6 w-full" loading="lazy" />
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
