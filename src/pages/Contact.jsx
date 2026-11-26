import { useState } from 'react';
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaExternalLinkAlt } from 'react-icons/fa';
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
  const ministryLocations = Array.isArray(activeSite.locations) ? activeSite.locations.filter(location => location.name && location.mapQuery) : [];
  const [selectedLocation, setSelectedLocation] = useState(0);
  const currentLocation = ministryLocations[selectedLocation] || ministryLocations[0];
  const info = [
    [FaMapMarkerAlt, 'Address', activeSite.address],
    [FaPhoneAlt, 'Phone', activeSite.phone],
    [FaEnvelope, 'Email', activeSite.email],
  ].filter(([, , value]) => typeof value === 'string' && value.trim());

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
              {activeSite.serviceTimes?.trim() && <p><strong className="text-navy">Service times:</strong> {activeSite.serviceTimes}</p>}
              <img src="/img/contact.jpg" alt="" className="mt-6 w-full" loading="lazy" />
            </div>
            <ContactForm />
          </div>

          {ministryLocations.length > 0 && <section className="mt-16" aria-labelledby="locations-heading">
            <SectionHeader kicker="Find Us" title="Our Locations" />
            <p className="mx-auto mb-8 max-w-2xl text-center text-gray-600">
              Select a location to view it on the map and get directions.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {ministryLocations.map((location, index) => (
                <button
                  key={location.name}
                  type="button"
                  onClick={() => setSelectedLocation(index)}
                  aria-pressed={selectedLocation === index}
                  className={`group flex h-full items-start gap-4 rounded-lg border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 ${
                    selectedLocation === index
                      ? 'border-gold bg-gold/10 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gold/60'
                  }`}
                >
                  <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-lg text-white transition-colors group-hover:bg-gold">
                    <FaMapMarkerAlt />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold text-navy">{location.name}</span>
                    <span className="mt-1 block text-sm text-gray-600">{location.plusCode}</span>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gold">
                      {selectedLocation === index ? 'Showing on map' : 'View on map'}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold">Selected location</p>
                  <h3 className="mt-1 text-lg font-semibold text-navy">{currentLocation.name}</h3>
                  <p className="text-sm text-gray-600">{currentLocation.plusCode}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentLocation.mapQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 self-start rounded bg-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gold sm:self-center"
                >
                  Get Directions <FaExternalLinkAlt className="text-xs" />
                </a>
              </div>
              <iframe
                key={currentLocation.mapQuery}
                title={`Map showing ${currentLocation.name}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(currentLocation.mapQuery)}&output=embed`}
                className="h-[360px] w-full border-0 sm:h-[440px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </section>}

          <div className="mt-12"><AppointmentForm /></div>
        </div>
      </section>
    </>
  );
}
