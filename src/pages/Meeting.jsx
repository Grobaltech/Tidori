import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaDesktop, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { useDocTitle } from '../hooks/hooks';

const labelForError = error => {
  if (error?.name === 'NotAllowedError') return 'Camera or microphone permission was denied. Allow access in your browser settings and try again.';
  if (error?.name === 'NotFoundError') return 'No camera or microphone was found on this device.';
  if (error?.name === 'NotReadableError') return 'Your camera or microphone is already being used by another application.';
  return error?.message || 'Could not start the meeting. Please try again.';
};

export default function Meeting() {
  const { roomCode = '' } = useParams();
  useDocTitle('Tidori Video Meeting');
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
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

  const send = packet => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(packet));
  };

  const stopMedia = () => {
    try { socketRef.current?.close(); } catch {}
    socketRef.current = null;
    try { peerRef.current?.close(); } catch {}
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    displayStreamRef.current?.getTracks().forEach(track => track.stop());
    displayStreamRef.current = null;
    localStreamRef.current = null;
    cameraTrackRef.current = null;
    pendingIceRef.current = [];
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
  };

  const joinMeeting = async () => {
    if (!/^[0-9a-f-]{36}$/i.test(roomCode)) {
      setError('This meeting link is not valid.');
      return;
    }
    setJoining(true); setError(''); setStatus('Requesting camera and microphone access…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0] || null;
      if (localVideo.current) localVideo.current.srcObject = stream;

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerRef.current = peer;
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
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

      const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${scheme}//${window.location.host}/api/video/rooms/${roomCode}/signal`);
      socketRef.current = socket;
      socket.onopen = () => { setJoined(true); setStatus('Waiting for the other participant…'); };
      socket.onerror = () => setError('The meeting connection could not be established. The room may not be deployed yet or the link may have expired.');
      socket.onclose = event => {
        if (event.code === 1008 || event.code === 1006) setStatus('Meeting connection closed.');
      };
      socket.onmessage = async event => {
        let packet;
        try { packet = JSON.parse(event.data); } catch { return; }
        try {
          if (packet.type === 'room-state') {
            setPeerPresent(packet.peerCount > 1);
          } else if (packet.type === 'peer-joined') {
            setPeerPresent(true);
            setStatus('Connecting to the other participant…');
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            send({ type: 'offer', description: peer.localDescription });
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
      stopMedia();
      setError(labelForError(joinError));
      setStatus('Unable to join');
    } finally {
      setJoining(false);
    }
  };

  const leaveMeeting = () => {
    send({ type: 'hangup' });
    stopMedia();
    setJoined(false); setPeerPresent(false); setSharing(false);
    setMuted(false); setCameraOff(false);
    setStatus('You have left the meeting');
  };

  const toggleMic = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = !next; });
    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    cameraTrackRef.current && (cameraTrackRef.current.enabled = !next);
    setCameraOff(next);
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
        };
        setSharing(true);
      } else {
        const sender = peerRef.current.getSenders().find(item => item.track?.kind === 'video');
        if (sender && cameraTrackRef.current) await sender.replaceTrack(cameraTrackRef.current);
        displayStreamRef.current?.getTracks().forEach(track => track.stop());
        displayStreamRef.current = null;
        setSharing(false);
      }
    } catch (shareError) {
      setError(shareError.message || 'Screen sharing was cancelled or is unavailable.');
    }
  };

  useEffect(() => () => stopMedia(), []);

  return <main className="min-h-[75vh] bg-[#101722] px-4 py-8 text-white sm:px-6">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#fdbe33]">Tidori Ministries</p><h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Video meeting</h1><p className="mt-1 text-sm text-slate-300">{status}</p></div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">Private room</span>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid min-h-[320px] gap-3 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-[#202b3a]">
            <video ref={remoteVideo} autoPlay playsInline muted={speakerOff} className="h-full min-h-[260px] w-full object-cover" />
            {!peerPresent && <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-slate-300">Waiting for the pastor or visitor to join…</div>}
            <span className="absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 text-xs">Other participant</span>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-[#202b3a]">
            <video ref={localVideo} autoPlay playsInline muted className="h-full min-h-[260px] w-full scale-x-[-1] object-cover" />
            {!joined && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">Your camera preview will appear here</div>}
            <span className="absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 text-xs">You</span>
          </div>
        </div>
        <aside className="rounded-2xl border border-white/10 bg-[#182230] p-5">
          <h2 className="text-base font-bold text-white">Meeting controls</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Allow camera and microphone access when prompted. Tidori relays connection signals; audio and video are sent directly between participants when the network allows.</p>
          {!joined ? <button type="button" onClick={joinMeeting} disabled={joining} className="mt-5 w-full rounded-lg bg-[#fdbe33] px-4 py-3 text-sm font-bold text-[#191c24] disabled:opacity-60">{joining ? 'Joining…' : 'Join meeting'}</button> : <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={toggleMic} className="rounded-lg bg-white/10 p-3 text-sm">{muted ? <FaMicrophoneSlash className="mx-auto mb-1" /> : <FaMicrophone className="mx-auto mb-1" />}{muted ? 'Unmute' : 'Mute'}</button>
            <button type="button" onClick={toggleCamera} className="rounded-lg bg-white/10 p-3 text-sm">{cameraOff ? <FaVideoSlash className="mx-auto mb-1" /> : <FaVideo className="mx-auto mb-1" />}{cameraOff ? 'Camera on' : 'Camera off'}</button>
            <button type="button" onClick={toggleSpeaker} className="rounded-lg bg-white/10 p-3 text-sm">{speakerOff ? <FaVolumeMute className="mx-auto mb-1" /> : <FaVolumeUp className="mx-auto mb-1" />}{speakerOff ? 'Sound on' : 'Mute sound'}</button>
            <button type="button" onClick={toggleScreenShare} className="rounded-lg bg-white/10 p-3 text-sm"><FaDesktop className="mx-auto mb-1" />{sharing ? 'Stop sharing' : 'Share screen'}</button>
            <button type="button" onClick={leaveMeeting} className="col-span-2 rounded-lg bg-red-600 p-3 text-sm font-bold"><FaPhoneSlash className="mr-2 inline" />Leave meeting</button>
          </div>}
          <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">Room ID: <span className="break-all font-mono">{roomCode}</span><br />For a successful two-way call, both participants should use a modern browser and allow camera/microphone access.</div>
        </aside>
      </div>
    </div>
  </main>;
}
