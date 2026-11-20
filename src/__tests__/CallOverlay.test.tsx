import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockEmit = vi.fn();
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
vi.mock('../socket', () => ({
  getSocket: () => ({ emit: mockEmit, on: mockSocketOn, off: mockSocketOff }),
}));

vi.mock('../i18n', () => ({
  t: (key: string) => key,
}));

const mockClearCall = vi.fn();
const mockSetCallActive = vi.fn();

let storeState: Record<string, any> = {};

vi.mock('../store/useStore', () => ({
  useStore: vi.fn((selector?: (s: any) => any) =>
    selector ? selector(storeState) : storeState
  ),
}));

// Stub getUserMedia
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  configurable: true,
});

// Stub RTCPeerConnection
const mockGetSenders = vi.fn(() => []);
const mockPC = {
  addTrack: vi.fn(),
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  getSenders: mockGetSenders,
  close: vi.fn(),
  onicecandidate: null as any,
  ontrack: null as any,
  onconnectionstatechange: null as any,
  remoteDescription: null as any,
  connectionState: 'new',
};
vi.stubGlobal('RTCPeerConnection', vi.fn(() => mockPC));
vi.stubGlobal('RTCSessionDescription', vi.fn((d: any) => d));
vi.stubGlobal('RTCIceCandidate', vi.fn((c: any) => c));

// Stub AudioContext (used for ringtone)
const mockAudioContextResume = vi.fn().mockResolvedValue(undefined);
const mockAudioContextClose = vi.fn().mockResolvedValue(undefined);
vi.stubGlobal('AudioContext', vi.fn(() => ({
  resume: mockAudioContextResume,
  close: mockAudioContextClose,
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => ({ connect: vi.fn(), frequency: { value: 0 }, type: 'sine', start: vi.fn(), stop: vi.fn() })),
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } })),
})));

import CallOverlay from '../components/CallOverlay';

const baseUser = {
  id: 'user-1', name: 'Alice', email: 'a@a.com',
  avatar: 0, status: 'approved' as const, isAdmin: false, online: true,
};
const peerUser = {
  id: 'user-2', name: 'Bob', email: 'b@b.com',
  avatar: 1, status: 'approved' as const, isAdmin: false, online: true,
};

function makeStore(overrides: Partial<typeof storeState>) {
  storeState = {
    callStatus: 'incoming',
    callPeerId: 'user-2',
    callType: 'audio',
    callOffer: { type: 'offer', sdp: 'sdp' },
    callAnswer: null,
    callCandidates: [],
    users: [baseUser, peerUser],
    currentUser: baseUser,
    _clearCall: mockClearCall,
    _setCallActive: mockSetCallActive,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserMedia.mockResolvedValue({
    getTracks: () => [{ stop: vi.fn(), enabled: true }],
    getAudioTracks: () => [{ stop: vi.fn(), enabled: true }],
    getVideoTracks: () => [],
  });
  mockPC.remoteDescription = null;
  mockPC.connectionState = 'new';
  makeStore({});
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CallOverlay – incoming call', () => {
  it('shows the peer name and incoming label', () => {
    makeStore({ callStatus: 'incoming' });
    render(<CallOverlay />);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('callIncoming')).toBeInTheDocument();
  });

  it('renders Decline and Accept buttons', () => {
    makeStore({ callStatus: 'incoming' });
    render(<CallOverlay />);
    expect(screen.getByLabelText('callDecline')).toBeInTheDocument();
    expect(screen.getByLabelText('callAccept')).toBeInTheDocument();
  });

  it('emits call:end and clears store when Decline is clicked', async () => {
    makeStore({ callStatus: 'incoming' });
    render(<CallOverlay />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('callDecline'));
    });
    expect(mockEmit).toHaveBeenCalledWith('call:end', { to: 'user-2' });
    expect(mockClearCall).toHaveBeenCalled();
  });

  it('calls getUserMedia and emits call:answer when Accept is clicked', async () => {
    makeStore({ callStatus: 'incoming' });
    render(<CallOverlay />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('callAccept'));
    });
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(mockEmit).toHaveBeenCalledWith(
      'call:answer',
      expect.objectContaining({ to: 'user-2' })
    );
  });
});

describe('CallOverlay – outgoing call', () => {
  it('shows the peer name and outgoing label', async () => {
    makeStore({ callStatus: 'outgoing', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('callOutgoing')).toBeInTheDocument();
  });

  it('creates an offer and emits call:offer on mount', async () => {
    makeStore({ callStatus: 'outgoing', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(mockEmit).toHaveBeenCalledWith(
      'call:offer',
      expect.objectContaining({ to: 'user-2', callType: 'audio' })
    );
  });

  it('renders mute and hang-up buttons', async () => {
    makeStore({ callStatus: 'outgoing', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    expect(screen.getByLabelText('callMute')).toBeInTheDocument();
    expect(screen.getByLabelText('callEnd')).toBeInTheDocument();
  });

  it('emits call:end when End call is clicked', async () => {
    makeStore({ callStatus: 'outgoing', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('callEnd'));
    });
    expect(mockEmit).toHaveBeenCalledWith('call:end', { to: 'user-2' });
    expect(mockClearCall).toHaveBeenCalled();
  });
});

describe('CallOverlay – active call', () => {
  it('shows the camera-off button for video calls', async () => {
    makeStore({ callStatus: 'active', callType: 'video', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    expect(screen.getByLabelText('callCameraOff')).toBeInTheDocument();
  });

  it('does not show the camera button for audio calls', async () => {
    makeStore({ callStatus: 'active', callType: 'audio', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    expect(screen.queryByLabelText('callCameraOff')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('callCameraOn')).not.toBeInTheDocument();
  });

  it('shows the media error message when getUserMedia fails', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
    makeStore({ callStatus: 'outgoing', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    expect(screen.getByText('callNoMedia')).toBeInTheDocument();
  });

  it('always mounts a video element for the remote stream (audio calls need it for sound)', async () => {
    // Bug fix: audio calls had no element to play remote audio through
    makeStore({ callStatus: 'incoming', callType: 'audio' });
    const { container } = render(<CallOverlay />);
    // At least one video element must exist (the remote stream receiver)
    expect(container.querySelectorAll('video').length).toBeGreaterThanOrEqual(1);
  });

  it('PiP video has pointer event handlers for dragging', async () => {
    makeStore({ callStatus: 'active', callType: 'video', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    // The PiP video should exist and have a grab cursor
    const videos = document.querySelectorAll('video');
    const pip = Array.from(videos).find(v => (v as HTMLElement).style.cursor === 'grab');
    expect(pip).toBeDefined();
  });
});

describe('CallOverlay – new video controls', () => {
  it('shows Switch Camera and Swap View buttons for video calls', async () => {
    makeStore({ callStatus: 'active', callType: 'video', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    expect(screen.getByLabelText('callSwitchCamera')).toBeInTheDocument();
    expect(screen.getByLabelText('callSwapVideo')).toBeInTheDocument();
    expect(screen.queryByLabelText('callEffect')).not.toBeInTheDocument();
  });

  it('does not show video-only buttons for audio calls', async () => {
    makeStore({ callStatus: 'active', callType: 'audio', callOffer: null });
    await act(async () => { render(<CallOverlay />); });
    expect(screen.queryByLabelText('callSwitchCamera')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('callSwapVideo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('callEffect')).not.toBeInTheDocument();
  });

  it('switchCamera calls getUserMedia with the opposite facingMode', async () => {
    makeStore({ callStatus: 'active', callType: 'video', callOffer: null });
    const mockVideoTrack = { kind: 'video', stop: vi.fn(), enabled: true };
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [mockVideoTrack],
      getAudioTracks: () => [],
      getVideoTracks: () => [mockVideoTrack],
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    });
    await act(async () => { render(<CallOverlay />); });
    await act(async () => { fireEvent.click(screen.getByLabelText('callSwitchCamera')); });
    // Should have been called again with 'environment' facingMode
    const calls = mockGetUserMedia.mock.calls;
    const switchCall = calls.find(c => c[0]?.video?.facingMode === 'environment');
    expect(switchCall).toBeDefined();
  });
});
