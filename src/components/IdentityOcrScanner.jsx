import { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';

const CARD_RATIO = 85.6 / 53.98;
const clean = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function labelled(text, labels) {
  const lines = text.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const upper = lines[i].toUpperCase();
    const label = labels.find(v => upper.includes(v));
    if (!label) continue;
    const tail = lines[i].slice(upper.indexOf(label) + label.length);
    const value = tail.match(/[A-Z0-9][A-Z0-9\s/-]{7,24}/i)?.[0]?.trim()
      || lines[i + 1]?.match(/[A-Z0-9][A-Z0-9\s/-]{7,24}/i)?.[0]?.trim();
    if (value) return value;
  }
  return '';
}

export default function IdentityOcrScanner() {
  const [nin, setNin] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [foundNin, setFoundNin] = useState('');
  const [foundCard, setFoundCard] = useState('');
  const [busy, setBusy] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraBusy(false);
  };

  useEffect(() => {
    if (cameraBusy && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.warn('Camera preview could not start:', err));
    }
  }, [cameraBusy]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera capture is unavailable in this browser. Use the photo upload fallback below.');
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      setCameraBusy(true);
    } catch (err) {
      console.warn('Unable to start identity camera:', err);
      setCameraError('Camera permission was denied or the camera is unavailable. Allow camera access or use the photo upload fallback.');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is still starting. Please wait a moment and try again.');
      return;
    }
    const frameWidth = video.videoWidth;
    const frameHeight = video.videoHeight;
    let cropWidth = frameWidth * 0.85;
    let cropHeight = cropWidth / CARD_RATIO;
    if (cropHeight > frameHeight * 0.85) {
      cropHeight = frameHeight * 0.85;
      cropWidth = cropHeight * CARD_RATIO;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cropWidth);
    canvas.height = Math.round(cropHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Could not prepare the camera image. Please try again.');
      return;
    }
    ctx.drawImage(video, (frameWidth - cropWidth) / 2, (frameHeight - cropHeight) / 2, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) {
        setCameraError('Could not capture the image. Please try again.');
        return;
      }
      setFile(new File([blob], 'tidori-id-capture.jpg', { type: 'image/jpeg' }));
      setText(''); setFoundNin(''); setFoundCard(''); setError(''); setNotice('Card photo captured on this device. Review the details, then scan.');
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const choose = e => {
    const next = e.target.files?.[0] || null;
    setError(''); setNotice(''); setText(''); setFoundNin(''); setFoundCard('');
    if (next && !['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setFile(null); setError('Choose a JPG, PNG or WebP image.'); return;
    }
    if (next && next.size > 10 * 1024 * 1024) {
      setFile(null); setError('The image must be 10 MB or smaller.'); return;
    }
    setFile(next);
  };

  const scan = async () => {
    if (!file) return;
    setBusy(true); setError(''); setNotice('');
    let worker;
    try {
      worker = await createWorker('eng');
      const result = await worker.recognize(file);
      const scanned = result?.data?.text || '';
      setText(scanned);
      setFoundNin(labelled(scanned, ['NATIONAL IDENTIFICATION NUMBER', 'NATIONAL ID NUMBER', 'NIN']));
      setFoundCard(labelled(scanned, ['CARD NUMBER', 'CARD NO', 'CARD SERIAL NUMBER', 'SERIAL NUMBER']));
      setNotice(scanned.trim() ? 'Scan complete. OCR may misread letters and numbers; review the results.' : 'No text was detected. Try again with the card flat, in focus and well lit.');
    } catch (err) {
      console.error('Local identity OCR failed:', err);
      setError('Could not read this image. Keep the card flat, in focus and well lit, then try again.');
    } finally {
      if (worker) await worker.terminate().catch(() => {});
      setBusy(false);
    }
  };

  const ninMatch = Boolean(nin.trim() && foundNin && clean(nin) === clean(foundNin));
  const cardMatch = Boolean(cardNo.trim() && foundCard && clean(cardNo) === clean(foundCard));

  return <section className="mt-8 rounded-xl border border-gold/50 bg-white p-5 sm:p-6">
    <h2 className="text-xl font-semibold text-navy">National ID document scan</h2>
    <p className="mt-2 text-sm text-gray-600">Uganda National ID: enter the details printed on your card, then capture its front using your camera. Image processing and OCR run on this device; the photo is not uploaded to Tidori.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-navy">NIN (enter manually)
        <input className="field mt-2" autoComplete="off" spellCheck="false" maxLength={24} value={nin} onChange={e => setNin(e.target.value)} placeholder="Enter your NIN" />
      </label>
      <label className="block text-sm font-semibold text-navy">Card number (enter manually)
        <input className="field mt-2" autoComplete="off" spellCheck="false" maxLength={24} value={cardNo} onChange={e => setCardNo(e.target.value)} placeholder="Enter card number" />
      </label>
    </div>
    <div className="mt-5 rounded-lg bg-mist p-4">
      <h3 className="font-semibold text-navy">Live card capture</h3>
      <p className="mt-1 text-xs text-gray-600">Allow camera access, place the card inside the guide and keep it flat and in focus. The guide uses the standard ID-1 card proportions; perspective can still affect the photographed shape.</p>
      {cameraBusy && <div className="relative mt-3 overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} playsInline muted className="block max-h-[420px] w-full object-contain" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-dashed border-yellow-300" style={{ aspectRatio: String(CARD_RATIO), boxShadow: '0 0 0 9999px rgba(0,0,0,.24)' }} />
      </div>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!cameraBusy ? <button type="button" onClick={startCamera} className="btn-custom">Open camera</button> : <>
          <button type="button" onClick={capture} className="btn-custom">Capture card</button>
          <button type="button" onClick={stopCamera} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Cancel camera</button>
        </>}
      </div>
      {cameraError && <p role="alert" className="mt-2 text-sm text-amber-800">{cameraError}</p>}
    </div>
    <div className="mt-4">
      <label className="block text-sm font-semibold text-navy">Or choose an existing photo (fallback)
        <input className="field mt-2 block w-full" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choose} />
        <span className="mt-1 block text-xs font-normal text-gray-500">Clear, uncropped image; maximum 10 MB. Live camera capture is preferred.</span>
      </label>
    </div>
    {file && <p className="mt-2 break-all text-xs text-gray-500">Image ready: {file.name}</p>}
    <button type="button" onClick={scan} disabled={busy || !file} className="btn-custom mt-4 disabled:opacity-50">{busy ? 'Reading ID on this device…' : 'Scan ID card'}</button>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-3 text-sm text-gray-700">{notice}</p>}
    {text && <div className="mt-5 space-y-3 rounded-lg bg-mist p-4">
      <h3 className="font-semibold text-navy">Extracted text — review carefully</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><p className="text-xs font-semibold uppercase text-gray-500">NIN read from card</p><p className="mt-1 break-all font-mono text-sm">{foundNin || 'Not detected'}</p></div>
        <div><p className="text-xs font-semibold uppercase text-gray-500">Card number read from card</p><p className="mt-1 break-all font-mono text-sm">{foundCard || 'Not detected'}</p></div>
      </div>
      {nin.trim() && foundNin && <p className="text-sm">{ninMatch ? '✓ NIN matches the OCR result.' : '✕ NIN does not match the OCR result.'}</p>}
      {cardNo.trim() && foundCard && <p className="text-sm">{cardMatch ? '✓ Card number matches the OCR result.' : '✕ Card number does not match the OCR result.'}</p>}
      {ninMatch && cardMatch && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Document details matched by OCR. This is not an official NIRA verification and does not prove the card is genuine or valid.</p>}
      <details><summary className="cursor-pointer text-sm font-semibold text-navy">Show all recognised text</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-700">{text}</pre></details>
    </div>}
    <p className="mt-4 text-xs leading-relaxed text-gray-500">Privacy: the image and recognised text stay in this page's memory and are not saved to your profile. Your browser may download the OCR engine and English language model. Shape, reflection, colour and OCR checks are not reliable proof of authenticity; this scanner cannot confirm NIRA records or authenticate a National ID.</p>
  </section>;
}
