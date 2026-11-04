export default function SectionHeader({ kicker, title, center = true }) {
  return (
    <div className={`section-header ${center ? 'text-center' : 'mx-0'}`}>
      <p>{kicker}</p>
      <h2>{title}</h2>
    </div>
  );
}
