export default function Loading() {
  return (
    <div className="flex justify-center py-16" role="status" aria-label="Loading">
      <div className="h-11 w-11 rounded-full border-4 border-gold border-t-navy" style={{ animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
