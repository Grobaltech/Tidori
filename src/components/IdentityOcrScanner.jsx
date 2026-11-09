import { useState } from 'react';
import { createWorker } from 'tesseract.js';

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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
      setNotice(scanned.trim() ? 'Scan complete. OCR may misread letters and numbers; review the results.' : 'No text was detected. Try a clearer, well-lit photograph.');
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
    <p className="mt-2 text-sm text-gray-600">Uganda National ID: enter the details printed on your card, then scan its front. OCR runs in this browser on your device. The photograph is not uploaded to Tidori.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-navy">NIN (enter manually)
        <input className="field mt-2" autoComplete="off" spellCheck="false" maxLength={24} value={nin} onChange={e => setNin(e.target.value)} placeholder="Enter your NIN" />
      </label>
      <label className="block text-sm font-semibold text-navy">Card number (enter manually)
        <input className="field mt-2" autoComplete="off" spellCheck="false" maxLength={24} value={cardNo} onChange={e => setCardNo(e.target.value)} placeholder="Enter card number" />
      </label>
    </div>
    <label className="mt-4 block text-sm font-semibold text-navy">Photograph the front of your National ID
      <input className="field mt-2 block w-full" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choose} />
      <span className="mt-1 block text-xs font-normal text-gray-500">Clear, uncropped image; maximum 10 MB.</span>
    </label>
    {file && <p className="mt-2 break-all text-xs text-gray-500">Selected: {file.name}</p>}
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
    <p className="mt-4 text-xs leading-relaxed text-gray-500">Privacy: the image and recognised text stay in this page's memory and are not saved to your profile. Your browser may download the OCR engine and English language model. OCR cannot authenticate a card or confirm that its details exist in NIRA records.</p>
  </section>;
}
