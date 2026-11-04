export default function PageHeader({ title, crumbs }) {
  return (
    <div
      className="relative bg-cover bg-center py-20 text-white"
      style={{ backgroundImage: "url('/img/page-header.jpg')" }}
    >
      <div className="absolute inset-0 bg-ink/70" />
      <div className="container-page relative z-10 text-center">
        <h1 className="mb-3 text-4xl md:text-5xl text-white">{title}</h1>
        {crumbs && (
          <p className="text-sm text-white/80">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-2">/</span>}
                {c}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
