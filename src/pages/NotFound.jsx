import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page Not Found" />
      <div className="container-page py-11 text-center">
        <p className="mb-6">Sorry, that page doesn't exist.</p>
        <Link to="/" className="btn-custom">Back to Home</Link>
      </div>
    </>
  );
}
