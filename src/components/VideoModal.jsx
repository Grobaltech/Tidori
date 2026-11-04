export default function VideoModal({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <button aria-label="Close" onClick={onClose} className="absolute -right-2 -top-10 text-3xl text-white">&times;</button>
        <div className="aspect-video overflow-hidden rounded bg-black">
          <iframe title="Video" src={src} className="h-full w-full" allow="autoplay; encrypted-media" allowFullScreen />
        </div>
      </div>
    </div>
  );
}
