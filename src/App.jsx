import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
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
import Login from './pages/Login';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/AdminDashboard';
import MobileAppBridge from './components/MobileAppBridge';
import Meeting from './pages/Meeting';
import Community from './pages/Community';
import Notifications from './pages/Notifications';
import Bursaries from './pages/Bursaries';

export default function App() {
  return (
    <>
    <MobileAppBridge />
    <Routes>
      <Route path="/admin/*" element={<AdminDashboard />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
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
        <Route path="/meeting/:roomCode" element={<Meeting />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/community" element={<Community />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  );
}
