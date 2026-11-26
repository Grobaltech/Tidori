import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAsync } from './hooks/hooks';
import { getSiteContent } from './lib/api';
import Layout from './components/Layout';
import Seo from './components/Seo';
import Home from './pages/Home';
import About from './pages/About';
import AboutDetail from './pages/AboutDetail';
import Outreach from './pages/Outreach';
import Events from './pages/Events';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Ministries from './pages/Ministries';
import Team from './pages/Team';
import Give from './pages/Give';
import Volunteer from './pages/Volunteer';
import Contact from './pages/Contact';
import Appointments from './pages/Appointments';
import AppointmentBooking from './pages/AppointmentBooking';
import Login from './pages/Login';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/AdminDashboard';
import MobileAppBridge from './components/MobileAppBridge';
import Meeting from './pages/Meeting';
import Community from './pages/Community';
import Notifications from './pages/Notifications';
import Bursaries from './pages/Bursaries';

const pageSeo = {
  '/': ['Tidori Ministries | Faith, Hope & Service', 'Tidori Ministries brings people together through faith, compassionate service, community development and opportunities to make a difference.'],
  '/about': ['About Tidori Ministries | Our Mission & Vision', 'Learn about Tidori Ministries, our Christian mission, vision, values and commitment to serving communities.'],
  '/outreach': ['Community Outreach | Tidori Ministries', 'Discover Tidori Ministries outreach initiatives and our work supporting individuals, families and communities.'],
  '/events': ['Church Events & Gatherings | Tidori Ministries', 'Explore upcoming Tidori Ministries gatherings, church events and opportunities to connect with our community.'],
  '/blog': ['Blog & News | Tidori Ministries', 'Read devotionals, ministry updates, community stories and news from Tidori Ministries.'],
  '/ministries': ['Our Ministries | Tidori Ministries', 'Explore the ministries of Tidori Ministries and find ways to grow in faith, serve and connect.'],
  '/team': ['Our Team | Tidori Ministries', 'Meet the people serving through Tidori Ministries and supporting our mission and community work.'],
  '/give': ['Give & Support Our Work | Tidori Ministries', 'Support the work of Tidori Ministries and help strengthen faith, compassion and community development.'],
  '/bursaries': ['Bursaries & Education Support | Tidori Ministries', 'Learn about Tidori Ministries bursary opportunities and education support initiatives.'],
  '/volunteer': ['Volunteer With Us | Tidori Ministries', 'Offer your time and skills to support the mission and community initiatives of Tidori Ministries.'],
  '/contact': ['Contact Tidori Ministries', 'Get in touch with Tidori Ministries for enquiries, prayer, partnerships and ways to get involved.'],
  '/appointments': ['Appointments | Tidori Ministries', 'Connect with Tidori Ministries through an appointment request.'],
};

function RouteSeo() {
  const { pathname } = useLocation();
  const { data: cmsSite } = useAsync(getSiteContent);
  const seoDefaults = cmsSite?.seo || {};
  if (/^\/blog\/[^/]+\/?$/.test(pathname)) return null;
  const privateRoute = /^\/(admin|login|register|profile|members|notifications|meeting)(\/|$)/.test(pathname)
    || pathname === '/appointments/book';
  const sectionMatch = pathname.match(/^\/about\/([^/]+)\/?$/);
  const [routeTitle, routeDescription] = sectionMatch
    ? [`${sectionMatch[1].replace(/-/g, ' ')} | About Tidori Ministries`, 'Learn more about the mission, work and values of Tidori Ministries.']
    : (pageSeo[pathname.replace(/\/$/, '')] || ['Page Not Found | Tidori Ministries', 'Explore Tidori Ministries and discover our faith, community and service initiatives.']);
  const title = pathname === '/' && seoDefaults.title ? seoDefaults.title : routeTitle;
  const description = pathname === '/' ? (seoDefaults.description || routeDescription) : routeDescription;
  return <Seo title={title} description={description} image={seoDefaults.imageUrl} path={pathname} noindex={privateRoute || seoDefaults.allowIndexing === false || !pageSeo[pathname.replace(/\/$/, '')] && !sectionMatch} />;
}

export default function App() {
  return (
    <>
    <MobileAppBridge />
    <RouteSeo />
    <Routes>
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/about/:section" element={<AboutDetail />} />
        <Route path="/outreach" element={<Outreach />} />
        <Route path="/events" element={<Events />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/ministries" element={<Ministries />} />
        <Route path="/team" element={<Team />} />
        <Route path="/give" element={<Give />} />
        <Route path="/bursaries" element={<Bursaries />} />
        <Route path="/volunteer" element={<Volunteer />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/appointments/book" element={<AppointmentBooking />} />
        <Route path="/meeting/:roomCode" element={<Meeting />} />
        <Route path="/login" element={<Login />} />
        <Route path="/members/register" element={<Login />} />
        <Route path="/register" element={<Navigate to="/members/register" replace />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/members" element={<Community />} />
        <Route path="/members/profiles" element={<Profile />} />
        <Route path="/members/profiles/:username" element={<Profile />} />
        <Route path="/community" element={<Navigate to="/members" replace />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  );
}
