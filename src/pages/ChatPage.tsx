import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import OnboardingModal, { hasSeenOnboarding } from '../components/OnboardingModal';
import PhotosTooltip, { hasSeenPhotosHighlight } from '../components/PhotosTooltip';
import SakuraTooltip, { isSakuraSeason, hasSeenSakuraTooltip } from '../components/SakuraTooltip';

export default function ChatPage() {
  const { currentUser, activeChat, loadPendingUsers } = useStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPhotosHighlight, setShowPhotosHighlight] = useState(false);
  const [showSakuraTooltip, setShowSakuraTooltip] = useState(false);

  // Show onboarding once for non-admin users, then feature tooltips in sequence
  useEffect(() => {
    if (!currentUser) return;
    if (!currentUser.isAdmin && !hasSeenOnboarding()) {
      setShowOnboarding(true);
    } else if (!hasSeenPhotosHighlight()) {
      setShowPhotosHighlight(true);
    } else if (isSakuraSeason() && !hasSeenSakuraTooltip()) {
      setShowSakuraTooltip(true);
    }
  }, [currentUser?.id]);

  // Poll for pending users every 30 s so the badge stays up-to-date
  useEffect(() => {
    if (!currentUser?.isAdmin) return;
    loadPendingUsers();
    const id = setInterval(loadPendingUsers, 30_000);
    return () => clearInterval(id);
  }, [currentUser?.isAdmin]);

  if (!currentUser) return null;

  return (
    <div className="h-dvh flex flex-col bg-gray-100/60 overflow-hidden safe-top">
      {showOnboarding && <OnboardingModal onDone={() => {
        setShowOnboarding(false);
        if (!hasSeenPhotosHighlight()) setShowPhotosHighlight(true);
        else if (isSakuraSeason() && !hasSeenSakuraTooltip()) setShowSakuraTooltip(true);
      }} />}
      {!showOnboarding && showPhotosHighlight && <PhotosTooltip onDone={() => {
        setShowPhotosHighlight(false);
        if (isSakuraSeason() && !hasSeenSakuraTooltip()) setShowSakuraTooltip(true);
      }} />}
      {!showOnboarding && !showPhotosHighlight && showSakuraTooltip && (
        <SakuraTooltip onDone={() => setShowSakuraTooltip(false)} />
      )}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile: show sidebar OR chat, not both */}
        <div className={`${activeChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-auto`}>
          <Sidebar />
        </div>

        <div className={`${activeChat ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0`}>
          <ChatWindow />
        </div>
      </div>
    </div>
  );
}
