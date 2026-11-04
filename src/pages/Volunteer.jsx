import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';
import VolunteerForm from '../components/VolunteerForm';

export default function Volunteer() {
  return (
    <>
      <PageHeader title="Serve With Us" />
      <section className="my-11 bg-cover bg-fixed bg-center py-16"
        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), url('/img/volunteer.jpg')" }}>
        <div className="container-page grid items-center gap-10 lg:grid-cols-[7fr_5fr]">
          <div>
            <SectionHeader center={false} kicker="Become a Volunteer" title="Use your gifts to serve others" />
            <p className="text-white">There is a place for everyone on our team. Tell us where you would like to help and we will get in touch.</p>
          </div>
          <VolunteerForm />
        </div>
      </section>
    </>
  );
}
