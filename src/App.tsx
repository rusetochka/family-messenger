import DemoBar from './components/DemoBar';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store/useStore";
import { useSocket } from "./socket";
import { registerSW, subscribeToPush, updateBadge } from "./pwa";
import { recordLatestPhotoTs } from "./components/PhotosTooltip";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import InvitePage from "./pages/InvitePage";
import PhotosPage from "./pages/PhotosPage";
import ConfettiBurst from "./components/ConfettiBurst";
import CallOverlay from "./components/CallOverlay";
import "./index.css";

function RequireAuth({ children }: { children: JSX.Element }) {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/" replace />;
  if (!currentUser.isAdmin) return <Navigate to="/chat" replace />;
  return children;
}

function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const currentUser = useStore((s) => s.currentUser);
  if (currentUser) return <Navigate to="/chat" replace />;
  return children;
}

/** Registers Socket.io event listeners while the user is logged in */
function SocketBridge() {
  const {
    _receiveMessage, _receiveReaction, _removeReaction, _receiveMessageDeleted, _receiveMessageEdited,
    _setUserOnline, chats, currentUser, loadPendingUsers,
    _receiveCallOffer, _receiveCallAnswer, _receiveIceCandidate, _receiveCallEnd,
  } = useStore();

  // In-app toast for messages arriving in non-active chats
  const [toast, setToast] = useState<{ name: string; preview: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Unlock Web Audio API on first user gesture (required by iOS Safari/PWA)
  // Without this, AudioContext.resume() silently fails on iOS when called outside a gesture.
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = new AudioContext();
        ctx.resume().then(() => ctx.close()).catch(() => {});
      } catch {}
    };
    document.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  // Keep home-screen badge in sync with total unread count
  useEffect(() => {
    const total = chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
    updateBadge(total);
  }, [chats]);

  // Subscribe to Web Push once SW is ready
  useEffect(() => {
    registerSW().then((reg) => {
      if (reg) subscribeToPush(reg);
    });
  }, []);

  useSocket((socket) => {
    // Remove any stale listeners before adding new ones (guards against reconnect stacking)
    socket.off("message:new");
    socket.off("reaction:updated");
    socket.off("reaction:removed");
    socket.off("message:deleted");
    socket.off("message:edited");
    socket.off("user:online");
    socket.off("admin:user_pending");
    socket.off("photo:new");
    socket.off("call:offer");
    socket.off("call:answer");
    socket.off("call:ice-candidate");
    socket.off("call:end");

    socket.on("message:new", (msg: any) => {
      _receiveMessage({
        id: msg.id, chatId: msg.chat_id, senderId: msg.sender_id,
        type: msg.type, text: msg.text ?? undefined,
        imageUrl: msg.image_url ?? undefined, emoji: msg.emoji ?? undefined,
        createdAt: msg.created_at, reactions: {} as Record<string, string[]>,
        replyToId: msg.reply_to_id ?? undefined,
      });
      // Show in-app toast when message arrives in a non-active chat
      const state = useStore.getState();
      const ac = state.activeChat;
      const allUsers: typeof state.users = state.users ?? [];
      if (msg.chat_id !== ac?.id && msg.sender_id !== currentUser?.id) {
        const sender = allUsers.find((u: any) => u.id === msg.sender_id);
        const preview =
          msg.type === 'image' ? '📷 Photo' :
          msg.type === 'emoji' ? (msg.emoji ?? '😊') :
          msg.type === 'call'  ? '📞 Call'  :
          (msg.text ?? '…').slice(0, 80);
        clearTimeout(toastTimerRef.current);
        setToast({ name: sender?.name ?? '…', preview });
        toastTimerRef.current = setTimeout(() => setToast(null), 4000);
      }
    });
    socket.on("reaction:updated", ({ messageId, userId, emoji, chatId }: any) => {
      _receiveReaction(messageId, chatId, userId, emoji);
    });
    socket.on("reaction:removed", ({ messageId, userId, chatId }: any) => {
      _removeReaction(messageId, chatId, userId);
    });
    socket.on("message:deleted", ({ messageId, chatId }: any) => {
      _receiveMessageDeleted(messageId, chatId);
    });
    socket.on("message:edited", ({ messageId, chatId, text }: any) => {
      _receiveMessageEdited(messageId, chatId, text);
    });
    socket.on("user:online", ({ userId, online, lastSeen }: any) => {
      _setUserOnline(userId, online, lastSeen);
    });
    // Admins get live updates when a new user registers
    if (currentUser?.isAdmin) {
      socket.on("admin:user_pending", () => {
        loadPendingUsers();
      });
    }
    socket.on("photo:new", (photo: { created_at: string }) => {
      recordLatestPhotoTs(photo.created_at);
    });
    socket.on("call:offer", ({ from, offer, callType }: { from: string; offer: RTCSessionDescriptionInit; callType: 'audio' | 'video' }) => {
      _receiveCallOffer(from, offer, callType);
    });
    socket.on("call:answer", ({ answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      _receiveCallAnswer(answer);
    });
    socket.on("call:ice-candidate", ({ candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      _receiveIceCandidate(candidate);
    });
    socket.on("call:end", () => {
      _receiveCallEnd();
    });
    return () => {
      socket.off("message:new");
      socket.off("reaction:updated");
      socket.off("reaction:removed");
      socket.off("message:deleted");
      socket.off("message:edited");
      socket.off("user:online");
      socket.off("admin:user_pending");
      socket.off("call:offer");
      socket.off("call:answer");
      socket.off("call:ice-candidate");
      socket.off("call:end");
    };
  });

  if (!toast) return null;
  return (
    <div className="fixed top-4 right-4 z-[60] flex items-start gap-3 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 w-72 max-w-xs pointer-events-auto">
      <span className="text-2xl leading-none pt-0.5">💬</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{toast.name}</p>
        <p className="text-sm text-gray-500 truncate">{toast.preview}</p>
      </div>
      <button
        onClick={() => { clearTimeout(toastTimerRef.current); setToast(null); }}
        className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export default function App() {
  const { rehydrate, currentUser } = useStore();
  const callStatus = useStore(s => s.callStatus);
  const [ready, setReady] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    rehydrate().finally(() => setReady(true));
  }, []);

  // Show confetti once per user after approval
  useEffect(() => {
    if (!currentUser || currentUser.isAdmin) return;
    const key = `celebrated_${currentUser.id}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      setShowConfetti(true);
    }
  }, [currentUser?.id]);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50">
      <div className="text-rose-600 text-lg font-semibold animate-pulse">KinCircle…</div>
    </div>
  );

  return (
    <BrowserRouter>
      <DemoBar />
      {currentUser && <SocketBridge />}
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
      {callStatus !== 'idle' && <CallOverlay />}
      <Routes>
        <Route path="/" element={<RedirectIfAuthed><AuthPage /></RedirectIfAuthed>} />
        <Route path="/register" element={<RedirectIfAuthed><AuthPage initialTab="register" /></RedirectIfAuthed>} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/photos" element={<RequireAuth><PhotosPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
