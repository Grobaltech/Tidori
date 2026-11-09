import { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';

const CARD_RATIO = 85.6 / 53.98;
let openCvPromise;
async function loadOpenCv() {
  if (!openCvPromise) openCvPromise = import('@techstark/opencv-js').then(async mod => {
    const candidate = mod.default || mod;
    return candidate instanceof Promise ? await candidate : candidate;
  });
  return openCvPromise;
}
function sortCorners(points) {
  const sums = points.map(p => p.x + p.y);
  const diffs = points.map(p => p.x - p.y);
  return [points[sums.indexOf(Math.min(...sums))], points[diffs.indexOf(Math.max(...diffs))], points[sums.indexOf(Math.max(...sums))], points[diffs.indexOf(Math.min(...diffs))]];
}
async function inspectCardImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d', {willReadFrequently:true}).drawImage(bitmap,0,0,canvas.width,canvas.height);
  bitmap.close?.();
  const cv = await loadOpenCv();
  let src, gray, blur, edges, contours, hierarchy, lap, mean, deviation, hsv, glare;
  let detected = false, brightness = 0, sharpness = 0, glarePercent = 0, boundaryScore = 0;
  let resultFile = file;
  try {
    src=cv.imread(canvas); gray=new cv.Mat(); blur=new cv.Mat(); edges=new cv.Mat();
    contours=new cv.MatVector(); hierarchy=new cv.Mat();
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray,blur,new cv.Size(5,5),0);
    cv.Canny(blur,edges,55,150);
    cv.findContours(edges,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
    let best=null;
    for(let i=0;i<contours.size();i++){
      const contour=contours.get(i), approx=new cv.Mat();
      cv.approxPolyDP(contour,approx,0.02*cv.arcLength(contour,true),true);
      if(approx.rows===4){
        const area=Math.abs(cv.contourArea(approx)), pts=[];
        for(let j=0;j<4;j++) pts.push({x:approx.data32S[j*2],y:approx.data32S[j*2+1]});
        const corners=sortCorners(pts);
        const width=(Math.hypot(corners[1].x-corners[0].x,corners[1].y-corners[0].y)+Math.hypot(corners[2].x-corners[3].x,corners[2].y-corners[3].y))/2;
        const height=(Math.hypot(corners[3].x-corners[0].x,corners[3].y-corners[0].y)+Math.hypot(corners[2].x-corners[1].x,corners[2].y-corners[1].y))/2;
        const ratio=Math.max(width,height)/Math.max(1,Math.min(width,height));
        if(area>canvas.width*canvas.height*0.12 && area<canvas.width*canvas.height*0.96 && ratio>1.25 && ratio<1.95 && (!best||area>best.area)) best={area,corners};
      }
      approx.delete(); contour.delete();
    }
    if(best){
      detected=true; boundaryScore=Math.min(100,Math.round(best.area/(canvas.width*canvas.height)*150));
      const c=best.corners;
      const outW=Math.round(Math.max(Math.hypot(c[1].x-c[0].x,c[1].y-c[0].y),Math.hypot(c[2].x-c[3].x,c[2].y-c[3].y)));
      const outH=Math.round(Math.max(Math.hypot(c[3].x-c[0].x,c[3].y-c[0].y),Math.hypot(c[2].x-c[1].x,c[2].y-c[1].y)));
      const from=cv.matFromArray(4,1,cv.CV_32FC2,c.flatMap(q=>[q.x,q.y]));
      const to=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,outW-1,0,outW-1,outH-1,0,outH-1]);
      const transform=cv.getPerspectiveTransform(from,to), warped=new cv.Mat();
      cv.warpPerspective(src,warped,transform,new cv.Size(outW,outH));
      const corrected=document.createElement('canvas'); corrected.width=outW; corrected.height=outH; cv.imshow(corrected,warped);
      const blob=await new Promise(resolve=>corrected.toBlob(resolve,'image/jpeg',0.94));
      if(blob) resultFile=new File([blob],'tidori-id-corrected.jpg',{type:'image/jpeg'});
      from.delete(); to.delete(); transform.delete(); warped.delete();
    }
    brightness=cv.mean(gray)[0];
    lap=new cv.Mat(); mean=new cv.Mat(); deviation=new cv.Mat();
    cv.Laplacian(gray,lap,cv.CV_64F); cv.meanStdDev(lap,mean,deviation);
    sharpness=Math.pow(deviation.data64F[0]||0,2);
    hsv=new cv.Mat(); glare=new cv.Mat();
    cv.cvtColor(src,hsv,cv.COLOR_RGBA2RGB); cv.cvtColor(hsv,hsv,cv.COLOR_RGB2HSV);
    cv.inRange(hsv,new cv.Scalar(0,0,245,0),new cv.Scalar(180,65,255,255),glare);
    glarePercent=cv.countNonZero(glare)/(canvas.width*canvas.height)*100;
  } finally {
    [src,gray,blur,edges,contours,hierarchy,lap,mean,deviation,hsv,glare].forEach(x=>x?.delete());
  }
  const warnings=[];
  if(!detected) warnings.push('Card outline not confidently detected. Keep the full card visible against a contrasting background.');
  if(brightness<65) warnings.push('Image may be too dark.');
  if(brightness>215) warnings.push('Image may be overexposed.');
  if(sharpness<80) warnings.push('Image may be out of focus; hold the camera steadily.');
  if(glarePercent>8) warnings.push('Bright reflections may hide details; tilt the card slightly and retake.');
  return {file:resultFile,quality:{detected,boundaryScore,brightness:Math.round(brightness),sharpness:Math.round(sharpness),glarePercent:Math.round(glarePercent*10)/10,warnings}};
}

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
  const [quality, setQuality] = useState(null);
  const [captureType, setCaptureType] = useState('front');
  const [securityEvidence, setSecurityEvidence] = useState({});
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
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1920 / Math.max(frameWidth, frameHeight));
    canvas.width = Math.round(frameWidth * scale);
    canvas.height = Math.round(frameHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Could not prepare the camera image. Please try again.');
      return;
    }
    ctx.drawImage(video, 0, 0, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) {
        setCameraError('Could not capture the image. Please try again.');
        return;
      }
      const labels = { front:'Front of card', tiltLeft:'Hologram / MLI tilted left', tiltRight:'Hologram / MLI tilted right', microprint:'Microprint close-up' };
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setSecurityEvidence(previous => ({ ...previous, [captureType]: dataUrl }));
      if (captureType === 'front') {
        setFile(new File([blob], 'tidori-id-front.jpg', { type: 'image/jpeg' }));
        setText(''); setFoundNin(''); setFoundCard(''); setError(''); setQuality(null);
      }
      setNotice(labels[captureType] + ' captured on this device. Keep the camera open and capture the other views.');

    }, 'image/jpeg', 0.92);
  };

  const choose = e => {
    const next = e.target.files?.[0] || null;
    setError(''); setNotice(''); setText(''); setFoundNin(''); setFoundCard(''); setQuality(null);
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
    setBusy(true); setError(''); setNotice(''); setQuality(null);
    let worker;
    try {
      let inspected;
      try {
        inspected = await inspectCardImage(file);
      } catch (analysisError) {
        console.warn('OpenCV quality analysis unavailable; continuing with local OCR:', analysisError);
        inspected = { file, quality: { detected:false, boundaryScore:0, brightness:0, sharpness:0, glarePercent:0, warnings:['Automatic boundary and quality analysis was unavailable in this browser. OCR can still be attempted; please review the image manually.'] } };
      }
      setQuality(inspected.quality);
      worker = await createWorker('eng');
      const result = await worker.recognize(inspected.file);
      const scanned = result?.data?.text || '';
      setText(scanned);
      setFoundNin(labelled(scanned, ['NATIONAL IDENTIFICATION NUMBER', 'NATIONAL ID NUMBER', 'NIN']));
      setFoundCard(labelled(scanned, ['CARD NUMBER', 'CARD NO', 'CARD SERIAL NUMBER', 'SERIAL NUMBER']));
      setNotice(scanned.trim() ? 'Scan complete. OCR may misread letters and numbers; review the results.' : 'No text was detected. Try again with the card flat, in focus and well lit.');
    } catch (err) {
      console.error('Local identity image analysis failed:', err);
      setError('Image analysis could not finish in this browser. Try a smaller, clear JPG/PNG photo or retry. No verification decision has been made.');
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
      <p className="mt-1 text-xs text-gray-600">Capture the front, then two angled views of the hologram/MLI, and finally a close-up of the microtext. For the close-up, move the phone closer while keeping the lettering in focus. These images stay in this page only.</p>
      {cameraBusy && <div className="relative mt-3 overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} playsInline muted className="block max-h-[420px] w-full object-contain" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-dashed border-yellow-300" style={{ aspectRatio: String(CARD_RATIO), boxShadow: '0 0 0 9999px rgba(0,0,0,.24)' }} />
      </div>}
      {cameraBusy && <p className="mt-2 text-xs text-gray-500">Keep the full card and a little background visible in the preview.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!cameraBusy ? <button type="button" onClick={startCamera} className="btn-custom">Open camera</button> : <>
          <label className="block text-sm font-medium text-navy">Capture view<select value={captureType} onChange={e=>setCaptureType(e.target.value)} className="field mt-1"><option value="front">Front of card (for OCR)</option><option value="tiltLeft">Hologram / MLI — tilt left</option><option value="tiltRight">Hologram / MLI — tilt right</option><option value="microprint">Microprint close-up</option></select></label>
          <button type="button" onClick={capture} className="btn-custom self-end">Capture selected view</button>
          <button type="button" onClick={stopCamera} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Cancel camera</button>
        </>}
      </div>
      {cameraError && <p role="alert" className="mt-2 text-sm text-amber-800">{cameraError}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{key:'front',label:'Front'},{key:'tiltLeft',label:'Hologram left'},{key:'tiltRight',label:'Hologram right'},{key:'microprint',label:'Microprint close-up'}].map(item=><div key={item.key} className="rounded border border-gray-200 bg-white p-2"><p className="text-xs font-semibold text-navy">{item.label}</p>{securityEvidence[item.key] ? <img src={securityEvidence[item.key]} alt={item.label+' evidence'} className="mt-1 aspect-video w-full rounded object-contain" /> : <p className="mt-2 text-xs text-gray-400">Not captured</p>}</div>)}</div>
      {Object.keys(securityEvidence).length>0 && <button type="button" onClick={()=>{setSecurityEvidence({});setFile(null);setNotice('Local security-feature captures cleared.');}} className="mt-2 text-xs font-semibold text-red-700">Clear all local captures</button>}
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
    {quality && <div className="mt-4 rounded-lg border border-gray-200 bg-mist p-4">
      <h3 className="font-semibold text-navy">Capture quality assessment</h3>
      <p className="mt-1 text-sm">{quality.detected ? 'Likely four-sided card outline detected.' : 'Card outline not confidently detected.'}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-3">
        <span>Brightness: {quality.brightness}/255</span><span>Sharpness: {quality.sharpness}</span><span>Possible glare: {quality.glarePercent}%</span>
      </div>
      {quality.warnings.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">{quality.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul> : <p className="mt-2 text-sm text-green-800">No major image-quality warning detected. Review the OCR text carefully.</p>}
      <p className="mt-2 text-xs text-gray-500">These are approximate capture-quality signals, not an authenticity score.</p>
    </div>}
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
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><h3 className="font-semibold">Security-feature inspection guide</h3><ul className="mt-2 list-disc space-y-1 pl-5"><li><strong>Hologram / MLI:</strong> capture the same marked area at two different angles. Look for a genuine-looking image or pattern change, not just a bright reflection.</li><li><strong>Microprint:</strong> capture the printed microtext close-up in sharp focus. On applicable upgraded Ugandan IDs, NIRA describes microtext reading “REPUBLIC OF UGANDA”.</li><li><strong>Manual review:</strong> if the detail is unreadable, absent or looks like a flat printed copy, refer it for authorised review rather than automatically rejecting the member.</li></ul><p className="mt-2 text-xs">The app collects visual evidence only. It does not compare a hologram or microprint against a secure issuer template and cannot authenticate either feature.</p></div>
    <p className="mt-4 text-xs leading-relaxed text-gray-500">Privacy: the image and recognised text stay in this page's memory and are not saved to your profile. Your browser may download the OCR engine and English language model. OpenCV checks card-like boundaries, perspective, focus, brightness and possible glare only. It cannot verify genuine holograms or microprint, prove an ID is unaltered, or confirm NIRA records. This is not official identity verification.</p>
  </section>;
}
