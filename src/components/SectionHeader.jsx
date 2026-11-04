export default function SectionHeader({ title, subtitle, center }) {
  return (
    <div className={center ? 'text-center mb-10' : 'mb-10'}>
      {subtitle && <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gold">{subtitle}</p>}
      <h2 className="text-3xl md:text-4xl">{title}</h2>
    </div>
  );
}
