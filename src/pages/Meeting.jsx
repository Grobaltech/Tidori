import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaDesktop, FaVolumeUp, FaVolumeMute, FaSignal } from 'react-icons/fa';
import { useDocTitle } from '../hooks/hooks';
import { Capacitor } from '@capacitor/core';

const VIDEO_API_ORIGIN = 'https://tidori-ministries.grobaltechtechnologies.workers.dev';

const VIDEO_FILTERS = [
  { id: 'none', label: 'Original', css: 'none' },
  { id: 'natural', label: 'Natural', css: 'saturate(1.12) contrast(1.03)' },
  { id: 'warm', label: 'Warm', css: 'sepia(.18) saturate(1.22) contrast(1.04)' },
  { id: 'cool', label: 'Cool', css: 'saturate(.92) hue-rotate(9deg) contrast(1.05)' },
  { id: 'vivid', label: 'Vivid', css: 'saturate(1.55) contrast(1.1)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(.38) saturate(.82) contrast(.92)' },
  { id: 'mono', label: 'Black & white', css: 'grayscale(1) contrast(1.08)' }
];

const labelForError = (error, stage) => {
  const detail = error?.name ? ` [${error.name} during ${stage}]` : '';
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError' || error?.name === 'SecurityError') {
    const device = stage === 'microphone' ? 'Microphone' : stage === 'camera' ? 'Camera' : 'Media';
    return `${device} access was blocked by Android or the browser.${detail} Check Android Settings → Apps → Tidori Ministries → Permissions, and also allow this site to use the device in the browser/WebView. Origin: ${window.location.origin}`;
  }
  if (error?.name === 'NotFoundError') return `No ${stage === 'microphone' ? 'microphone' : stage === 'camera' ? 'camera' : 'camera or microphone'} was found.${detail}`;
  if (error?.name === 'NotReadableError') return `The ${stage} is busy or could not be opened by Android.${detail} Close other apps using it and try again.`;
  return `${error?.message || 'Could not start the meeting.'}${detail}`;
};

export default function Meeting() {
  const nativeApp = Capacitor.isNativePlatform();
  const { roomCode = '' } = useParams();
  const accessKey = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('key') || '';
  useDocTitle('Tidori Video Meeting');
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const rawCameraTrackRef = useRef(null);
  const canvasStreamRef = useRef(null);
  const filterFrameRef = useRef(null);
  const filterRef = useRef('none');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const displayStreamRef = useRef(null);
  const pendingIceRef = useRef([]);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState('Ready to join');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [peerPresent, setPeerPresent] = useState(false);
  const [participantRole, setParticipantRole] = useState('guest');
  const [guestWaiting, setGuestWaiting] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [turnConfigured, setTurnConfigured] = useState(false);
  const [audioOnly, setAudioOnly] = useState(new URLSearchParams(window.location.search).get('mode') === 'audio');
  const [networkQuality, setNetworkQuality] = useState({ level: 'unknown', label: 'Checking network', detail: 'Network quality is not available yet.' });

  // Estimate call quality from browser network hints and live WebRTC statistics.
  // Browsers expose effectiveType (usually 4g/3g/2g), not the actual 5G radio type.
  useEffect(() => {
    if (!joined) {
      setNetworkQuality({ level: 'unknown', label: 'Checking network', detail: 'Join the call to measure connection quality.' });
      return undefined;
    }
    let active = true;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const measure = async () => {
      let downlink = Number(connection?.downlink) || 0;
      let rtt = Number(connection?.rtt) || 0;
      let effectiveType = connection?.effectiveType || '';
      let lossRatio = 0;
      try {
        const peer = peerRef.current;
        if (peer) {
          const stats = await peer.getStats();
          let received = 0;
          let lost = 0;
          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) {
              if (report.currentRoundTripTime != null) rtt = report.currentRoundTripTime * 1000;
              if (report.availableOutgoingBitrate != null) downlink = Math.max(downlink, report.availableOutgoingBitrate / 1000000);
            }
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              received += Number(report.packetsReceived) || 0;
              lost += Number(report.packetsLost) || 0;
            }
          });
          if (received + lost > 0) lossRatio = lost / (received + lost);
        }
      } catch { /* Network API hints remain a useful fallback. */ }
      if (!active) return;
      const weakType = ['2g', 'slow-2g'].includes(effectiveType);
      const mediumType = ['3g', '4g'].includes(effectiveType);
      const poor = weakType || (rtt > 500) || lossRatio > 0.10 || (downlink > 0 && downlink < 0.5);
      const strong = !poor && ((downlink >= 10 && (!rtt || rtt <= 150)) || (effectiveType === '5g' && (!rtt || rtt <= 150))) && lossRatio < 0.03;
      if (poor) setNetworkQuality({ level: 'poor', label: 'Poor connection', detail: 'Weak network, high delay or packet loss. Try moving closer to a stronger signal.' });
      else if (strong) setNetworkQuality({ level: 'good', label: 'Good connection', detail: 'Strong connection (5G+ quality tier).' });
      else if (mediumType || downlink > 0 || rtt > 0) setNetworkQuality({ level: 'medium', label: 'Medium connection', detail: 'Moderate connection (4G/3G quality tier).' });
      else setNetworkQuality({ level: 'unknown', label: 'Quality unavailable', detail: 'This browser does not expose enough network information to rate the connection.' });
    };
    measure();
    const timer = window.setInterval(measure, 4000);
    connection?.addEventListener?.('change', measure);
    return () => { active = false; window.clearInterval(timer); connection?.removeEventListener?.('change', measure); };
  }, [joined]);

  const send = packet => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(packet));
  };

  const stopMedia = () => {
    try { socketRef.current?.close(); } catch {}
    socketRef.current = null;
    try { peerRef.current?.close(); } catch {}
    peerRef.current = null;
    if (filterFrameRef.current) cancelAnimationFrame(filterFrameRef.current);
    filterFrameRef.current = null;
    canvasStreamRef.current?.getTracks().forEach(track => track.stop());
    canvasStreamRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    displayStreamRef.current?.getTracks().forEach(track => track.stop());
    displayStreamRef.current = null;
    localStreamRef.current = null;
    cameraTrackRef.current = null;
    rawCameraTrackRef.current = null;
    pendingIceRef.current = [];
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
  };

  const joinMeeting = async () => {
    if (!/^[0-9a-f-]{36}$/i.test(roomCode) || !/^[0-9a-f]{64}$/i.test(accessKey)) {
      setError('This meeting link is not valid.');
      return;
    }
    setJoining(true); setError(''); setStatus(audioOnly ? 'Requesting microphone access…' : 'Checking microphone and camera access…');
    let mediaStage = 'meeting setup';
    const capturedStreams = [];
    try {
      const iceResponse = await fetch(`${VIDEO_API_ORIGIN}/api/video/rooms/${roomCode}/ice?key=${encodeURIComponent(accessKey)}`);
      const iceConfig = await iceResponse.json().catch(() => ({}));
      if (!iceResponse.ok) throw new Error(iceConfig.error || 'This meeting invitation is invalid or has expired.');
      setTurnConfigured(Boolean(iceConfig.turnConfigured));
      const isAudioOnly = iceConfig.meetingMode === 'audio';
      setAudioOnly(isAudioOnly);
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This device browser does not support microphone calling. Update Android System WebView or use the latest Chrome browser.');
      // Request devices separately so Android/WebView failures identify the
      // exact permission that failed instead of reporting a misleading combined error.
      mediaStage = 'microphone';
      setStatus('Requesting microphone access…');
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      capturedStreams.push(audioStream);
      let stream = audioStream;

      if (!isAudioOnly) {
        mediaStage = 'camera';
        setStatus('Requesting camera access…');
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        capturedStreams.push(videoStream);
        stream = new MediaStream([
          ...audioStream.getAudioTracks(),
          ...videoStream.getVideoTracks()
        ]);
      }

      localStreamRef.current = stream;
      rawCameraTrackRef.current = stream.getVideoTracks()[0] || null;
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
        await localVideo.current.play().catch(() => {});
      }

      // Canvas processing applies the effect to the outgoing stream as well
      // as the local preview, so the other participant sees the selected filter.
      let outgoingVideoTrack = rawCameraTrackRef.current;
      if (!isAudioOnly && localVideo.current && rawCameraTrackRef.current &&
          typeof HTMLCanvasElement !== 'undefined' &&
          HTMLCanvasElement.prototype.captureStream) {
        const canvas = document.createElement('canvas');
        const video = localVideo.current;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const context = canvas.getContext('2d');
        if (context) {
          const canvasStream = canvas.captureStream(24);
          canvasStreamRef.current = canvasStream;
          outgoingVideoTrack = canvasStream.getVideoTracks()[0] || rawCameraTrackRef.current;
          const drawFilteredFrame = () => {
            if (rawCameraTrackRef.current?.readyState !== 'live') return;
            const activeFilter = VIDEO_FILTERS.find(item => item.id === filterRef.current) || VIDEO_FILTERS[0];
            context.filter = activeFilter.css === 'none' ? 'none' : activeFilter.css;
            try { context.drawImage(video, 0, 0, canvas.width, canvas.height); } catch {}
            filterFrameRef.current = requestAnimationFrame(drawFilteredFrame);
          };
          drawFilteredFrame();
        }
      }
      cameraTrackRef.current = outgoingVideoTrack;

      const peer = new RTCPeerConnection({ iceServers: iceConfig.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerRef.current = peer;
      stream.getAudioTracks().forEach(track => peer.addTrack(track, stream));
      if (outgoingVideoTrack) peer.addTrack(outgoingVideoTrack, new MediaStream([outgoingVideoTrack]));
      peer.ontrack = event => {
        const incoming = event.streams?.[0];
        if (incoming && remoteVideo.current) {
          remoteVideo.current.srcObject = incoming;
          setPeerPresent(true);
          setStatus('Connected');
        }
      };
      peer.onicecandidate = event => {
        if (event.candidate) send({ type: 'ice', candidate: event.candidate });
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') setStatus('Connected');
        if (peer.connectionState === 'disconnected') setStatus('Connection interrupted…');
        if (peer.connectionState === 'failed') setStatus('Connection failed. Check your internet connection and try again.');
      };

      const socket = new WebSocket(`wss://${new URL(VIDEO_API_ORIGIN).host}/api/video/rooms/${roomCode}/signal?key=${encodeURIComponent(accessKey)}`);
      socketRef.current = socket;
      socket.onopen = () => { setJoined(true); setStatus('Connected to the secure meeting room…'); };
      socket.onerror = () => setError('The meeting connection could not be established. The room may not be deployed yet or the link may have expired.');
      socket.onclose = event => {
        if (event.code === 1008 || event.code === 1006) setStatus('Meeting connection closed.');
      };
      socket.onmessage = async event => {
        let packet;
        try { packet = JSON.parse(event.data); } catch { return; }
        try {
          if (packet.type === 'room-state') {
            setParticipantRole(packet.role || 'guest');
            setAdmitted(packet.admitted === true);
            setStatus(packet.role === 'host' ? 'You are the pastor / meeting host.' : 'You are in the visitor waiting room.');
          } else if (packet.type === 'guest-waiting') {
            setGuestWaiting(true); setStatus('A visitor is waiting for your admission.');
          } else if (packet.type === 'waiting-for-host') {
            setStatus('Please wait. The pastor will admit you shortly.');
          } else if (packet.type === 'admitted') {
            setAdmitted(true); setPeerPresent(true); setStatus('You have been admitted. Connecting…');
          } else if (packet.type === 'guest-removed') {
            setError('The host has removed you from this meeting.'); stopMedia(); setJoined(false); setAdmitted(false);
          } else if (packet.type === 'room-ended') {
            setStatus('The host has ended this meeting.'); stopMedia(); setJoined(false); setAdmitted(false);
          } else if (packet.type === 'peer-joined') {
            setPeerPresent(true);
          } else if (packet.type === 'offer') {
            await peer.setRemoteDescription(packet.description);
            for (const candidate of pendingIceRef.current) await peer.addIceCandidate(candidate);
            pendingIceRef.current = [];
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            send({ type: 'answer', description: peer.localDescription });
          } else if (packet.type === 'answer') {
            await peer.setRemoteDescription(packet.description);
            for (const candidate of pendingIceRef.current) await peer.addIceCandidate(candidate);
            pendingIceRef.current = [];
          } else if (packet.type === 'ice' && packet.candidate) {
            if (peer.remoteDescription) await peer.addIceCandidate(packet.candidate);
            else pendingIceRef.current.push(packet.candidate);
          } else if (packet.type === 'peer-left') {
            setPeerPresent(false);
            setStatus('The other participant left the meeting.');
            if (remoteVideo.current) remoteVideo.current.srcObject = null;
          }
        } catch (signalError) {
          setError(signalError.message || 'The meeting could not establish a connection.');
        }
      };
    } catch (joinError) {
      capturedStreams.forEach(media => media.getTracks().forEach(track => track.stop()));
      stopMedia();
      setError(labelForError(joinError, mediaStage));
      setStatus('Unable to join');
    } finally {
      setJoining(false);
    }
  };

  const leaveMeeting = () => {
    send({ type: participantRole === 'host' ? 'end-room' : 'hangup' });
    stopMedia();
    setJoined(false); setPeerPresent(false); setSharing(false);
    setMuted(false); setCameraOff(false);
    setStatus('You have left the meeting');
  };

  const admitGuest = async () => {
    if (participantRole !== 'host' || !guestWaiting || !peerRef.current) return;
    send({ type: 'admit-guest' }); setGuestWaiting(false); setAdmitted(true); setPeerPresent(true);
    setStatus('Visitor admitted. Establishing the call…');
    try {
      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);
      send({ type: 'offer', description: peerRef.current.localDescription });
    } catch (err) { setError(err.message || 'Could not start the video connection.'); }
  };

  const removeGuest = () => {
    if (participantRole !== 'host') return;
    send({ type: 'remove-guest' }); setGuestWaiting(false); setPeerPresent(false);
    setStatus('Visitor removed from the meeting.');
  };

  const endCallForEveryone = () => {
    if (participantRole !== 'host') return;
    send({ type: 'end-room' }); stopMedia(); setJoined(false); setAdmitted(false); setGuestWaiting(false);
    setStatus('Meeting ended for everyone.');
  };

  const toggleMic = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = !next; });
    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    cameraTrackRef.current && (cameraTrackRef.current.enabled = !next);
    rawCameraTrackRef.current && (rawCameraTrackRef.current.enabled = !next);
    setCameraOff(next);
  };

  const chooseFilter = filterId => {
    filterRef.current = filterId;
    setSelectedFilter(filterId);
  };

  const toggleSpeaker = () => {
    const next = !speakerOff;
    if (remoteVideo.current) remoteVideo.current.muted = next;
    setSpeakerOff(next);
  };

  const toggleScreenShare = async () => {
    if (!peerRef.current) return;
    try {
      if (!sharing) {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        displayStreamRef.current = display;
        const displayTrack = display.getVideoTracks()[0];
        const sender = peerRef.current.getSenders().find(item => item.track?.kind === 'video');
        if (sender && displayTrack) await sender.replaceTrack(displayTrack);
        displayTrack.onended = async () => {
          if (sender && cameraTrackRef.current) await sender.replaceTrack(cameraTrackRef.current);
          displayStreamRef.current = null;
          setSharing(false);
          send({ type: 'screen-share-stopped' });
        };
        setSharing(true);
        send({ type: 'screen-share-started' });
      } else {
        const sender = peerRef.current.getSenders().find(item => item.track?.kind === 'video');
        if (sender && cameraTrackRef.current) await sender.replaceTrack(cameraTrackRef.current);
        displayStreamRef.current?.getTracks().forEach(track => track.stop());
        displayStreamRef.current = null;
        setSharing(false);
        send({ type: 'screen-share-stopped' });
      }
    } catch (shareError) {
      setError(shareError.message || 'Screen sharing was cancelled or is unavailable.');
    }
  };

  useEffect(() => () => stopMedia(), []);

  return <main className="min-h-[75vh] bg-[#101722] px-4 py-8 text-white sm:px-6">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#fdbe33]">Tidori Ministries</p><h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{audioOnly ? 'Audio call' : 'Video meeting'}</h1><p className="mt-1 text-sm text-slate-300">{status}</p></div>
        <div className="flex items-center gap-3">
          {joined && <span title={networkQuality.detail} aria-label={networkQuality.label} className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs text-slate-200">
            <FaSignal className={networkQuality.level === 'good' ? 'text-emerald-400' : networkQuality.level === 'medium' ? 'text-orange-400' : networkQuality.level === 'poor' ? 'text-red-500' : 'text-slate-400'} />
            <span>{networkQuality.label}</span>
          </span>}
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">Private room</span>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {audioOnly ? <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-[#202b3a] p-8 text-center"><FaMicrophone className="mb-4 text-5xl text-[#fdbe33]" /><h2 className="text-xl font-semibold">Tidori audio call</h2><p className="mt-2 max-w-md text-sm text-slate-300">This call uses your microphone and speaker only. Your camera is not requested or activated.</p><video ref={remoteVideo} autoPlay playsInline muted={speakerOff} className="hidden" /><video ref={localVideo} autoPlay playsInline muted className="hidden" /></div> : <div className="grid min-h-[320px] gap-3 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-[#202b3a]">
            <video ref={remoteVideo} autoPlay playsInline muted={speakerOff} className="h-full min-h-[260px] w-full object-cover" />
            {!peerPresent && <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-slate-300">Waiting for the pastor or visitor to join…</div>}
            <span className="absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 text-xs">Other participant</span>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-[#202b3a]">
            <video ref={localVideo} autoPlay playsInline muted style={{ filter: VIDEO_FILTERS.find(item => item.id === selectedFilter)?.css || 'none' }} className="h-full min-h-[260px] w-full scale-x-[-1] object-cover" />
            {!joined && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">Your camera preview will appear here</div>}
            <span className="absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 text-xs">You</span>
          </div>
        </div>}
        <aside className="rounded-2xl border border-white/10 bg-[#182230] p-5">
          <h2 className="text-base font-bold text-white">Meeting controls</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{audioOnly ? 'Allow microphone access when prompted. This audio-only call never requests your camera. Visitors wait until the pastor admits them.' : 'Allow camera and microphone access when prompted. Visitors wait until the pastor admits them.'} Tidori relays connection signals; media is peer-to-peer where the network permits. {nativeApp ? 'You are using the Tidori mobile app.' : 'Screen sharing is available on supported desktop browsers.'}</p>
          {!joined ? <button type="button" onClick={joinMeeting} disabled={joining} className="mt-5 w-full rounded-lg bg-[#fdbe33] px-4 py-3 text-sm font-bold text-[#191c24] disabled:opacity-60">{joining ? 'Joining…' : 'Join meeting'}</button> : <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={toggleMic} className="rounded-lg bg-white/10 p-3 text-sm">{muted ? <FaMicrophoneSlash className="mx-auto mb-1" /> : <FaMicrophone className="mx-auto mb-1" />}{muted ? 'Unmute' : 'Mute'}</button>
            {!audioOnly && <button type="button" onClick={toggleCamera} className="rounded-lg bg-white/10 p-3 text-sm">{cameraOff ? <FaVideoSlash className="mx-auto mb-1" /> : <FaVideo className="mx-auto mb-1" />}{cameraOff ? 'Camera on' : 'Camera off'}</button>}
            <button type="button" onClick={toggleSpeaker} className="rounded-lg bg-white/10 p-3 text-sm">{speakerOff ? <FaVolumeMute className="mx-auto mb-1" /> : <FaVolumeUp className="mx-auto mb-1" />}{speakerOff ? 'Sound on' : 'Mute sound'}</button>
            {!nativeApp && !audioOnly && <button type="button" onClick={toggleScreenShare} className="rounded-lg bg-white/10 p-3 text-sm"><FaDesktop className="mx-auto mb-1" />{sharing ? 'Stop sharing' : 'Share screen'}</button>}
            <button type="button" onClick={leaveMeeting} className="col-span-2 rounded-lg bg-red-600 p-3 text-sm font-bold"><FaPhoneSlash className="mr-2 inline" />Leave meeting</button>
          </div>}
          {joined && !audioOnly && <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Video filters</h3>
              <button type="button" onClick={() => chooseFilter('none')} className="text-xs font-semibold text-[#fdbe33]">Reset</button>
            </div>
            <p className="mb-3 text-xs text-slate-400">Choose an effect. The other participant will see it too.</p>
            <div className="grid grid-cols-2 gap-2">
              {VIDEO_FILTERS.map(filter => <button key={filter.id} type="button" onClick={() => chooseFilter(filter.id)} aria-pressed={selectedFilter === filter.id} className={'rounded-lg border px-3 py-2 text-left text-xs transition ' + (selectedFilter === filter.id ? 'border-[#fdbe33] bg-[#fdbe33]/15 text-[#ffcf68]' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10')}>
                <span className="mb-1 block h-7 rounded bg-gradient-to-r from-amber-200 via-rose-300 to-sky-300" style={{ filter: filter.css }} />
                {filter.label}{selectedFilter === filter.id ? ' ✓' : ''}
              </button>)}
            </div>
          </div>}
          {joined && participantRole === 'host' && guestWaiting && <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-950/40 p-3"><p className="text-sm font-semibold text-amber-100">A visitor is waiting to join.</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={admitGuest} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold">Admit visitor</button><button type="button" onClick={removeGuest} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold">Decline</button></div></div>}
          {joined && participantRole === 'host' && admitted && <button type="button" onClick={endCallForEveryone} className="mt-3 w-full rounded-lg bg-red-800 px-3 py-2 text-sm font-semibold">End meeting for everyone</button>}
          <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">Your role: <strong>{participantRole === 'host' ? 'Pastor / host' : 'Visitor'}</strong><br />Room ID: <span className="break-all font-mono">{roomCode}</span><br />For a successful two-way call, both participants should use a modern browser and allow {audioOnly ? 'microphone' : 'camera and microphone'} access. {turnConfigured ? 'Relay connectivity is configured.' : 'TURN relay is not configured yet; some networks may not connect.'}</div>
        </aside>
      </div>
    </div>
  </main>;
}
