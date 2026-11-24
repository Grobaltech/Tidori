import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SectionHeader from '../components/SectionHeader';

const pages = {
  about: {
    title: 'About Tidori Ministries',
    kicker: 'Who We Are',
    heading: 'Faith in action. Transforming lives. Building communities.',
    intro: 'Tidori Ministries (U) Limited is a Christian organisation established to advance the Gospel of Jesus Christ and contribute to the spiritual, social and economic transformation of individuals, families and communities.',
    paragraphs: [
      'Our approach brings together Christian faith, fellowship, compassionate support and practical community development. We believe that serving God also calls us to serve people with dignity, love, integrity and responsibility.',
      'Our registered objectives provide the foundation for a broad range of ministry and community-development activities. Specific programmes and services are developed and communicated as they become available.'
    ]
  },
  mission: {
    title: 'Our Mission',
    kicker: 'Why We Exist',
    heading: 'Proclaiming the Gospel and serving people with compassion',
    intro: 'To proclaim and advance the Gospel of Jesus Christ, nurture Christian faith and fellowship, provide spiritual guidance and compassionate support, and promote the social and economic empowerment of individuals and communities.',
    paragraphs: [
      'We pursue this mission through evangelism, worship, teaching, prayer, counselling, fellowship and outreach. We also seek to respond to practical needs through charitable service, education, skills development and initiatives that strengthen families and communities.',
      'Our mission calls us to combine the message of hope with a life of service—working respectfully with people, churches and partners toward lasting transformation.'
    ]
  },
  vision: {
    title: 'Our Vision',
    kicker: 'The Future We Seek',
    heading: 'Spiritually transformed lives and empowered communities',
    intro: 'To see spiritually transformed individuals, strengthened families and empowered communities living with dignity, purpose and sustainable opportunities, guided by the teachings of Jesus Christ.',
    paragraphs: [
      'We envision communities where people can grow in faith, families receive encouragement, young people and women can develop their abilities, and people facing hardship are met with compassion and practical support.',
      'This vision is pursued through faithful ministry, responsible partnerships and sustainable approaches that recognise both spiritual and practical needs.'
    ]
  },
  purpose: {
    title: 'Our Purpose',
    kicker: 'Our Reason for Serving',
    heading: 'Serving God and humanity through holistic transformation',
    intro: 'Tidori Ministries exists to bring together spiritual ministry, compassionate service and practical community development.',
    paragraphs: [
      'We seek to share the hope of the Gospel, encourage Christian fellowship and provide spiritual guidance. We also recognise the importance of responding to social and economic challenges that affect individuals, families and communities.',
      'Our purpose includes encouraging people to discover and develop their abilities, strengthening family and community life, supporting people in need and creating opportunities for sustainable progress.',
      'We approach this work with humility and accountability. Our stated purpose describes the direction of the ministry; individual programmes are introduced as resources, partnerships and appropriate approvals allow.'
    ]
  },
  objectives: {
    title: 'Our Objectives',
    kicker: 'Our Registered Foundation',
    heading: 'The objectives that guide our work',
    intro: 'The following themes reflect the objectives set out in the organisation’s Memorandum of Association.',
    bullets: [
      'Provide evangelical and fellowship services and promote Christian values.',
      'Establish and support charity centres, orphanage and daycare initiatives, medical camps and counselling centres, subject to the necessary approvals and capacity.',
      'Promote worship, spiritual warfare, Christian teaching and the preaching of the Gospel.',
      'Provide counselling and guidance services.',
      'Organise crusades, open-air meetings, conferences and seminars.',
      'Contribute to poverty reduction and social transformation.',
      'Establish churches, altars and fellowship activities in East Africa.',
      'Promote entrepreneurial and management skills among young people and women.',
      'Support education and practical skills-development initiatives.',
      'Build partnerships with recognised government institutions and non-governmental organisations.',
      'Mobilise and distribute resources to people in need.',
      'Organise socioeconomic forums and related community-development activities.',
      'Promote agriculture, organic farming, agro-based sales and the mobilisation of smallholder farmers.',
      'Undertake other lawful activities that support the organisation’s development objectives.'
    ],
    note: 'These are registered organisational objectives. They should not be read as confirmation that every listed service or facility is currently operating.'
  },
  focus: {
    title: 'Our Areas of Focus',
    kicker: 'How We Seek to Serve',
    heading: 'A holistic approach to spiritual and community wellbeing',
    intro: 'Our objectives translate into interconnected areas of focus. The specific activities offered in each area depend on programme readiness, resources, partnerships and applicable approvals.',
    groups: [
      { title: 'Evangelism and spiritual ministry', text: 'Gospel preaching, worship, prayer, Christian teaching, fellowship, crusades and faith-building gatherings.' },
      { title: 'Pastoral care and counselling', text: 'Spiritual guidance, compassionate listening, counselling support and referrals where specialised professional care is required.' },
      { title: 'Family and community support', text: 'Initiatives that encourage stronger families, care for vulnerable people and respond to community needs.' },
      { title: 'Education and skills development', text: 'Learning opportunities, practical skills and entrepreneurial or management development.' },
      { title: 'Youth and women’s empowerment', text: 'Encouraging young people and women to build skills, confidence and opportunities for meaningful participation in community life.' },
      { title: 'Agriculture and livelihoods', text: 'Agricultural development, organic farming, agro-based activities and support for smallholder farmer mobilisation.' },
      { title: 'Partnership and resource mobilisation', text: 'Working with recognised institutions and aligned partners to coordinate resources and community-development efforts.' }
    ]
  },
  values: {
    title: 'Our Guiding Values',
    kicker: 'What Shapes Our Service',
    heading: 'Principles that guide how we serve',
    intro: 'Our values shape our ministry, our relationships with people and the way we steward the resources entrusted to us.',
    groups: [
      { title: 'Faith', text: 'We place Jesus Christ and the teachings of the Gospel at the centre of our identity and service.' },
      { title: 'Compassion', text: 'We treat people with kindness, empathy and respect, especially when they are facing hardship.' },
      { title: 'Integrity', text: 'We seek to act honestly, communicate truthfully and handle responsibilities with accountability.' },
      { title: 'Service', text: 'We understand leadership as an opportunity to serve others with humility and commitment.' },
      { title: 'Empowerment', text: 'We encourage people to develop their abilities, make informed choices and contribute to their communities.' },
      { title: 'Unity', text: 'We value fellowship, cooperation and respectful relationships across families and communities.' },
      { title: 'Responsibility', text: 'We aim to use time, resources and opportunities carefully and transparently.' },
      { title: 'Sustainability', text: 'We favour thoughtful approaches that can support lasting spiritual, social and economic progress.' }
    ]
  },
  commitment: {
    title: 'Our Commitment to Communities',
    kicker: 'Faith Expressed Through Service',
    heading: 'Serving people with dignity, care and accountability',
    intro: 'We are committed to listening to communities and responding with compassion, respect and a holistic understanding of people’s needs.',
    paragraphs: [
      'We recognise that spiritual wellbeing, family stability, education, social support and economic opportunity are connected. Our approach therefore seeks to encourage faith while also supporting practical steps that strengthen individuals and communities.',
      'We aim to treat every person with dignity, respect differences, protect the trust placed in us and be responsible in the use of resources. Where a need falls outside our competence or authority, we seek appropriate referrals or partnerships rather than promising a service we cannot safely provide.',
      'We are committed to learning from the communities we serve and improving our work through responsible feedback, collaboration and accountability.'
    ]
  },
  partnerships: {
    title: 'Our Partnerships',
    kicker: 'Working Together',
    heading: 'Collaboration for greater and lasting impact',
    intro: 'We welcome collaboration with churches, community organisations, public institutions, recognised non-governmental organisations, development partners and individuals whose objectives align with our mission.',
    paragraphs: [
      'Partnerships can strengthen outreach by bringing together complementary skills, knowledge, networks and resources. We value relationships built on shared purpose, mutual respect, transparency and clear responsibilities.',
      'We are open to appropriate cooperation in evangelism, community care, education, skills development, youth and women’s empowerment, agriculture and other areas connected to our registered objectives.',
      'We encourage prospective partners to contact us to discuss shared goals, the needs being addressed, the roles of each party and practical next steps.'
    ]
  }
};

export default function AboutDetail() {
  const { section } = useParams();
  const page = pages[section];

  if (!page) {
    return (
      <>
        <PageHeader title="About Tidori Ministries" />
        <section className="container-page py-12 text-center">
          <h2 className="mb-4 text-2xl font-semibold text-navy">This page is not available</h2>
          <Link to="/about" className="btn-custom">Explore About Us</Link>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader title={page.title} />
      <section className="py-11">
        <div className="container-page mx-auto max-w-5xl">
          <SectionHeader center={false} kicker={page.kicker} title={page.heading} />
          <div className="space-y-5 leading-8">
            <p className="text-lg">{page.intro}</p>
            {page.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          {page.bullets && (
            <div className="mt-8">
              <h3 className="mb-4 text-2xl font-semibold text-navy">Our registered objectives include</h3>
              <ol className="list-decimal space-y-3 pl-6 leading-7">
                {page.bullets.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </div>
          )}

          {page.groups && (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {page.groups.map((item) => (
                <article key={item.title} className="border-l-2 border-gold bg-gray-50 p-5">
                  <h3 className="mb-2 text-xl font-semibold text-navy">{item.title}</h3>
                  <p className="leading-7">{item.text}</p>
                </article>
              ))}
            </div>
          )}

          {page.note && <p className="mt-8 border-l-2 border-gold bg-amber-50 p-4 text-sm leading-6">{page.note}</p>}

          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/about" className="btn-custom">About Tidori</Link>
            <Link to="/contact" className="btn-custom">Contact Us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
