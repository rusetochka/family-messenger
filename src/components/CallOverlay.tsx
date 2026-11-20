import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { getSocket } from '../socket';
import Avatar from './Avatar';
import { t } from '../i18n';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const PIP_W = 112; // w-28 = 7rem ≈ 112 px
const PIP_H = 160; // h-40 = 10rem ≈ 160 px

const CALL_REACTIONS = ['🌸', '❤️', '😂', '🔥', '💫'] as const;

export default function CallOverlay() {
  const {
    callStatus, callPeerId, callType, callOffer, callAnswer, callCandidates,
    users, _setCallActive, _clearCall,
  } = useStore();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // mainVidRef = full-screen video, pipVidRef = draggable small PiP
  const mainVidRef = useRef<HTMLVideoElement>(null);
  const pipVidRef = useRef<HTMLVideoElement>(null);

  const processedCandidatesRef = useRef(0);
  const callPeerIdRef = useRef(callPeerId);
  useEffect(() => { callPeerIdRef.current = callPeerId; }, [callPeerId]);

  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  // swapped: false = remote is main + local is PiP (default)
  //          true  = local is main + remote is PiP
  const [swapped, setSwapped] = useState(false);
  const swappedRef = useRef(false);

  // PiP drag state — null means CSS default bottom-right position
  const [pipPos, setPipPos] = useState<{ left: number; top: number } | null>(null);
  const pipDragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  // Floating emoji reactions — isLocal=true means clicked by this user (shown on own video)
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: string; emoji: string; isLocal: boolean }>>([]);
  // Ringtone for incoming calls
  const ringtoneCtxRef = useRef<AudioContext | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const peer = users.find(u => u.id === callPeerId);

  // ── Sync video srcObjects to correct elements ─────────────────────────────
  // Uses only refs so it's safe to call from WebRTC callbacks.

  const syncVideoElements = useCallback((swapState: boolean) => {
    const local = localStreamRef.current;
    const remote = remoteStreamRef.current;
    const main = mainVidRef.current;
    const pip = pipVidRef.current;
    if (main) {
      if (swapState) { main.srcObject = local;  main.muted = true;  }
      else           { main.srcObject = remote; main.muted = false; }
    }
    if (pip) {
      if (swapState) { pip.srcObject = remote; pip.muted = false; }
      else           { pip.srcObject = local;  pip.muted = true;  }
    }
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function getMedia(facing: 'user' | 'environment' = facingMode): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video' ? { facingMode: facing } : false,
    });
    localStreamRef.current = stream;
    return stream;
  }

  function createPC(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate && callPeerIdRef.current) {
        getSocket()?.emit('call:ice-candidate', {
          to: callPeerIdRef.current,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      syncVideoElements(swappedRef.current);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        _setCallActive();
      } else if (pc.connectionState === 'failed') {
        // P2P connection truly dead — emit call:end so server saves the call message
        if (callPeerIdRef.current) getSocket()?.emit('call:end', { to: callPeerIdRef.current });
        endCallCleanup();
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        endCallCleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }

  function flushCandidates(pc: RTCPeerConnection) {
    const newOnes = callCandidates.slice(processedCandidatesRef.current);
    for (const c of newOnes) {
      pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    processedCandidatesRef.current = callCandidates.length;
  }

  function endCallCleanup() {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    processedCandidatesRef.current = 0;
    setDuration(0);
    setMuted(false);
    setCameraOff(false);
    setMediaError(false);
    setSwapped(false);
    swappedRef.current = false;
    setPipPos(null);
    _clearCall();
  }

  function hangUp() {
    if (callPeerIdRef.current) {
      getSocket()?.emit('call:end', { to: callPeerIdRef.current });
    }
    endCallCleanup();
  }

  // ── Outgoing call: create offer ───────────────────────────────────────────

  useEffect(() => {
    if (callStatus !== 'outgoing') return;
    let cancelled = false;

    async function initiate() {
      try {
        const stream = await getMedia();
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        const pc = createPC();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        syncVideoElements(swappedRef.current);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        getSocket()?.emit('call:offer', {
          to: callPeerIdRef.current,
          offer: pc.localDescription,
          callType,
        });
      } catch {
        if (!cancelled) { setMediaError(true); }
      }
    }

    initiate();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Caller: apply received answer ────────────────────────────────────────

  useEffect(() => {
    const pc = pcRef.current;
    if (!callAnswer || !pc) return;
    pc.setRemoteDescription(new RTCSessionDescription(callAnswer))
      .then(() => flushCandidates(pc))
      .catch(() => {});
  }, [callAnswer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add newly arrived ICE candidates ─────────────────────────────────────

  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    flushCandidates(pc);
  }, [callCandidates.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Call duration timer ───────────────────────────────────────────────────

  useEffect(() => {
    if (callStatus !== 'active') return;
    const id = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(id);
  }, [callStatus]);

  // ── Re-sync video elements when call becomes active (callee path) ──────────

  useEffect(() => {
    // Clean up any in-progress outgoing call when we switch to incoming
    // (simultaneous call: we have higher ID so we become callee)
    if (callStatus === 'incoming' && pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (callStatus === 'active') syncVideoElements(swappedRef.current);
  }, [callStatus, syncVideoElements]);

  // ── Receive floating reactions from peer ─────────────────────────────────

  useEffect(() => {
    if (callStatus !== 'active') return;
    const socket = getSocket();
    if (!socket) return;
    const onReaction = ({ emoji }: { emoji: string }) => {
      const id = Math.random().toString(36).slice(2);
      setFloatingReactions(prev => [...prev, { id, emoji, isLocal: false }]);
      setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 3000);
    };
    socket.on('call:reaction', onReaction);
    return () => { socket.off('call:reaction', onReaction); };
  }, [callStatus]);

  // ── Ringtone for incoming calls ────────────────────────────────────────────

  useEffect(() => {
    if (callStatus !== 'incoming') {
      clearTimeout(ringTimeoutRef.current);
      ringtoneCtxRef.current?.close().catch(() => {});
      ringtoneCtxRef.current = null;
      return;
    }
    let ctx: AudioContext;
    let active = true;
    try {
      ctx = new AudioContext();
      ringtoneCtxRef.current = ctx;
    } catch { return; }

    function playRing() {
      if (!active) return;
      const t = ctx.currentTime;
      [480, 440].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
        gain.gain.setValueAtTime(0.2, t + 1.9);
        gain.gain.linearRampToValueAtTime(0, t + 2.0);
        osc.start(t);
        osc.stop(t + 2.0);
      });
      ringTimeoutRef.current = setTimeout(() => { if (active) playRing(); }, 3500);
    }

    ctx.resume().then(playRing).catch(() => {});
    return () => {
      active = false;
      clearTimeout(ringTimeoutRef.current);
      ctx.close().catch(() => {});
      ringtoneCtxRef.current = null;
    };
  }, [callStatus]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Callee: accept the incoming call ─────────────────────────────────────

  async function acceptCall() {
    if (!callOffer || !callPeerIdRef.current) return;
    try {
      const stream = await getMedia();
      const pc = createPC();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(callOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      getSocket()?.emit('call:answer', { to: callPeerIdRef.current, answer: pc.localDescription });
      flushCandidates(pc);
      syncVideoElements(swappedRef.current);
      _setCallActive();
    } catch {
      setMediaError(true);
    }
  }

  // ── Controls ──────────────────────────────────────────────────────────────

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  }

  function toggleCamera() {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = cameraOff; });
    setCameraOff(c => !c);
  }

  async function switchCamera() {
    const newFacing: 'user' | 'environment' = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;
      localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => localStreamRef.current!.removeTrack(t));
        localStreamRef.current.addTrack(newVideoTrack);
      }
      // syncVideoElements updates rawLocalVidRef → the canvas loop picks up the new camera automatically
      syncVideoElements(swappedRef.current);
      const pc = pcRef.current;
      if (pc) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newVideoTrack);
      }
      setFacingMode(newFacing);
    } catch {
      // Desktop may have no environment camera — silently ignore
    }
  }

  function swapView() {
    const next = !swappedRef.current;
    swappedRef.current = next;
    setSwapped(next);
    syncVideoElements(next);
    // Keep PiP at its current position — don't reset to the default corner
  }

  function sendReaction(emoji: string) {
    if (callPeerIdRef.current) {
      getSocket()?.emit('call:reaction', { to: callPeerIdRef.current, emoji });
    }
    const id = Math.random().toString(36).slice(2);
    setFloatingReactions(prev => [...prev, { id, emoji, isLocal: true }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 3000);
  }

  // ── PiP drag — clamped to screen bounds ──────────────────────────────────

  function onPipPointerDown(e: React.PointerEvent<HTMLVideoElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    pipDragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };
    setPipPos({ left: rect.left, top: rect.top });
  }

  function onPipPointerMove(e: React.PointerEvent<HTMLVideoElement>) {
    const drag = pipDragRef.current;
    if (!drag) return;
    const left = Math.max(0, Math.min(window.innerWidth  - PIP_W, drag.startLeft + (e.clientX - drag.startX)));
    const top  = Math.max(0, Math.min(window.innerHeight - PIP_H, drag.startTop  + (e.clientY - drag.startY)));
    setPipPos({ left, top });
  }

  function onPipPointerUp() {
    pipDragRef.current = null;
  }

  function formatDuration(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  // ── Derived display values ────────────────────────────────────────────────

  const showVideoUI = callType === 'video' && callStatus !== 'incoming' && !mediaError;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">

      {/* Main video — full-screen. Always in DOM so audio plays for audio-only calls. */}
      <video
        ref={mainVidRef}
        autoPlay
        playsInline
        className={callType === 'video' ? 'absolute inset-0 w-full h-full object-cover' : 'hidden'}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-white text-center">
        {/* Avatar + name + status */}
        <div className="flex flex-col items-center gap-3">
          <Avatar index={peer?.avatar ?? 0} name={peer?.name ?? ''} size={96} photoUrl={peer?.photoUrl} />
          <p className="text-2xl font-semibold drop-shadow">{peer?.name ?? '…'}</p>
          <p className="text-sm text-white/70">
            {mediaError
              ? t('callNoMedia')
              : callStatus === 'incoming'
              ? t('callIncoming')
              : callStatus === 'outgoing'
              ? t('callOutgoing')
              : formatDuration(duration)}
          </p>
        </div>

        {/* Buttons */}
        {callStatus === 'incoming' ? (
          <div className="flex gap-12 mt-4">
            <CallBtn onClick={hangUp} color="red" label={t('callDecline')}>
              <PhoneOffIcon />
            </CallBtn>
            <CallBtn onClick={acceptCall} color="green" label={t('callAccept')}>
              <PhoneIcon />
            </CallBtn>
          </div>
        ) : (
          <>
          <div className="flex flex-wrap justify-center gap-4 mt-4 max-w-xs">
            <CallBtn
              onClick={toggleMute}
              color={muted ? 'dimActive' : 'dim'}
              label={muted ? t('callUnmute') : t('callMute')}
            >
              {muted ? <MicOffIcon /> : <MicIcon />}
            </CallBtn>

            {callType === 'video' && (
              <CallBtn
                onClick={toggleCamera}
                color={cameraOff ? 'dimActive' : 'dim'}
                label={cameraOff ? t('callCameraOn') : t('callCameraOff')}
              >
                {cameraOff ? <VideoOffIcon /> : <VideoIcon />}
              </CallBtn>
            )}

            {/* Switch camera — video calls only */}
            {callType === 'video' && (
              <CallBtn onClick={switchCamera} color="dim" label={t('callSwitchCamera')}>
                <FlipCameraIcon />
              </CallBtn>
            )}

            <CallBtn onClick={hangUp} color="red" label={t('callEnd')}>
              <PhoneOffIcon />
            </CallBtn>
          </div>

          {/* Quick emoji reactions — only when connected */}
          {callStatus === 'active' && (
            <div className="flex gap-4 mt-2">
              {CALL_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-2xl hover:scale-125 active:scale-110 transition-transform leading-none"
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          </>
        )}
      </div>

      {/* Draggable PiP — clamped to screen bounds, with camera-flip button overlay */}
      {showVideoUI && (
        <div
          className="absolute z-20 w-28 h-40 touch-none select-none overflow-visible"
          style={pipPos ? { left: pipPos.left, top: pipPos.top } : { right: 16, bottom: 160 }}
        >
          {/* Reactions for whichever user's video is in PiP — top-right corner */}
          {floatingReactions.filter(r => swapped ? !r.isLocal : r.isLocal).map(r => (
            <div
              key={r.id}
              className="absolute top-1 right-1 pointer-events-none z-30 text-2xl select-none"
              style={{ animation: 'floatUp 3s ease-out forwards' }}
            >
              {r.emoji}
            </div>
          ))}
          <video
            ref={pipVidRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-2xl border-2 border-white/40 shadow-lg"
            style={{ cursor: pipDragRef.current ? 'grabbing' : 'grab' }}
            onPointerDown={onPipPointerDown}
            onPointerMove={onPipPointerMove}
            onPointerUp={onPipPointerUp}
          />
          {/* Swap view — PiP corner button (replaces the old camera-flip button) */}
          {callStatus === 'active' && (
            <button
              onClick={swapView}
              className="absolute bottom-1 right-1 bg-black/50 hover:bg-black/70 rounded-full p-1.5 transition-colors"
              aria-label={t('callSwapVideo')}
            >
              <SwapIcon small />
            </button>
          )}
        </div>
      )}

      {/* Reactions for whichever user's video is on the main tile — top-right corner */}
      {floatingReactions.filter(r => swapped ? r.isLocal : !r.isLocal).map(r => (
        <div
          key={r.id}
          className="absolute top-4 right-4 pointer-events-none z-30 text-4xl select-none"
          style={{ animation: 'floatUp 3s ease-out forwards' }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

type BtnColor = 'red' | 'green' | 'dim' | 'dimActive';

function CallBtn({
  onClick, color, label, children,
}: {
  onClick: () => void;
  color: BtnColor;
  label: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<BtnColor, string> = {
    red: 'bg-red-500 hover:bg-red-600',
    green: 'bg-green-500 hover:bg-green-600',
    dim: 'bg-white/15 hover:bg-white/25',
    dimActive: 'bg-white/30 hover:bg-white/40',
  };
  return (
    <button
      onClick={onClick}
      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${colorMap[color]}`}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.41 2 2 0 0 1 3.57 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.76a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function PhoneOffIcon() {
  // Rotated filled phone — universal "end call" symbol
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ transform: 'rotate(135deg)' }}>
      <path
        fill="white"
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function VideoOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function FlipCameraIcon() {
  // Material "flip camera" — camera body with bidirectional swap arrows
  return (
    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
      <path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-5 11.5V14H9v2.5L5.5 13 9 9.5V12h6V9.5l3.5 3.5-3.5 3.5z" />
    </svg>
  );
}

function SwapIcon({ small }: { small?: boolean }) {
  // Material "swap horiz" — two arrows pointing opposite directions
  return (
    <svg viewBox="0 0 24 24" fill="white" className={small ? 'w-4 h-4' : 'w-6 h-6'}>
      <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
    </svg>
  );
}
