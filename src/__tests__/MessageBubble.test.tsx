import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageBubble from '../components/MessageBubble';
import type { Message, User } from '../store/useStore';

// jsdom has 'ontouchstart' in window which makes isTouchDevice = true, hiding
// the hover action strip. Remove it so desktop hover behaviour is tested.
beforeAll(() => { delete (window as any).ontouchstart; });

// Mock the store so MessageBubble doesn't need a real Zustand provider
vi.mock('../store/useStore', () => ({
  useStore: vi.fn(() => ({
    currentUser: { id: 'user-me', name: 'Me', isAdmin: false },
    addReaction: vi.fn(),
    chats: [],
    chatUsers: {},
    users: [],
  })),
}));

// Mock i18n helpers to avoid navigator.language reliance in jsdom
vi.mock('../i18n', () => ({
  t: (key: string) => key,
  formatMessageTime: () => '12:00',
}));

const baseMsg: Message = {
  id: 'msg-1',
  chatId: 'chat-1',
  senderId: 'user-other',
  type: 'text',
  text: 'Hello world',
  createdAt: new Date().toISOString(),
  reactions: {},
};

const otherUser: User = {
  id: 'user-other', name: 'Alice', email: 'a@a.com',
  avatar: 0, status: 'approved', isAdmin: false, online: true,
};

describe('MessageBubble', () => {
  it('renders the message text', () => {
    render(
      <MessageBubble
        message={baseMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows the timestamp', () => {
    render(
      <MessageBubble
        message={baseMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('shows sender name when showSender is true', () => {
    render(
      <MessageBubble
        message={baseMsg}
        sender={otherUser}
        isOwn={false}
        showSender={true}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('does not show sender name when showSender is false', () => {
    render(
      <MessageBubble
        message={baseMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('renders reaction counts when reactions are present', () => {
    const msgWithReactions: Message = {
      ...baseMsg,
      reactions: { '👍': ['user-other', 'user-me'] },
    };
    render(
      <MessageBubble
        message={msgWithReactions}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    expect(screen.getByText('👍')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders an emoji-only message', () => {
    const emojiMsg: Message = {
      ...baseMsg,
      id: 'msg-emoji',
      type: 'emoji',
      text: undefined,
      emoji: '🎉',
    };
    render(
      <MessageBubble
        message={emojiMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    expect(screen.getByText('🎉')).toBeInTheDocument();
  });

  it('applies own-message layout for messages sent by current user', () => {
    const ownMsg: Message = { ...baseMsg, senderId: 'user-me' };
    const { container } = render(
      <MessageBubble
        message={ownMsg}
        sender={otherUser}
        isOwn={true}
        showSender={false}
      />
    );
    // Own messages use flex-row-reverse — check the wrapper has it
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-row-reverse');
  });

  it('shows the reaction picker on mouse enter', () => {
    const { container } = render(
      <MessageBubble
        message={baseMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    // The outermost element of the component handles mouse events
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    // After hover, at least one reaction emoji button should appear
    const pickerButtons = container.querySelectorAll('[title]');
    expect(pickerButtons.length).toBeGreaterThan(0);
  });
});

// ── Image lightbox ────────────────────────────────────────────────────────────
describe('MessageBubble image lightbox', () => {
  const imageMsg: Message = {
    id: 'msg-img',
    chatId: 'chat-1',
    senderId: 'user-other',
    type: 'image',
    imageUrl: '/uploads/photo.jpg',
    createdAt: new Date().toISOString(),
    reactions: {},
  };

  beforeEach(() => {
    // createPortal renders into document.body — jsdom supports this
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an img element for image messages', () => {
    render(
      <MessageBubble
        message={imageMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/uploads/photo.jpg');
  });

  it('does not show lightbox before clicking the image', () => {
    render(
      <MessageBubble
        message={imageMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    // The close button (aria-label="Close") only exists inside the lightbox
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('opens the lightbox when the image is clicked', () => {
    render(
      <MessageBubble
        message={imageMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    fireEvent.click(screen.getByRole('img'));
    // Lightbox renders a Close button via portal into document.body
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('shows the full-size image inside the lightbox', () => {
    render(
      <MessageBubble
        message={imageMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    fireEvent.click(screen.getByRole('img'));
    // There are now two img elements (thumbnail + lightbox)
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(2);
    expect(images[1]).toHaveAttribute('src', '/uploads/photo.jpg');
  });

  it('closes the lightbox when the Close button is clicked', () => {
    render(
      <MessageBubble
        message={imageMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    fireEvent.click(screen.getByRole('img'));
    expect(screen.getByLabelText('Close')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('closes the lightbox when Escape is pressed', () => {
    render(
      <MessageBubble
        message={imageMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    fireEvent.click(screen.getByRole('img'));
    expect(screen.getByLabelText('Close')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('closes the lightbox when the dark backdrop is clicked', () => {
    render(
      <MessageBubble
        message={imageMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    fireEvent.click(screen.getByRole('img'));
    const backdrop = screen.getByLabelText('Close').parentElement!;
    fireEvent.click(backdrop);
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('shows a download button inside the lightbox', () => {
    render(
      <MessageBubble
        message={imageMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    fireEvent.click(screen.getByRole('img'));
    // t() is mocked to return the key
    expect(screen.getByText('downloadImage')).toBeInTheDocument();
  });

  it('triggers fetch-based download when download button is clicked', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })),
    } as any);
    vi.stubGlobal('fetch', fetchMock);
    // jsdom does not implement URL.createObjectURL; stub to prevent TypeError
    if (!URL.createObjectURL) (URL as any).createObjectURL = () => 'blob:fake';
    if (!URL.revokeObjectURL) (URL as any).revokeObjectURL = () => {};

    render(
      <MessageBubble
        message={imageMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    fireEvent.click(screen.getByRole('img'));
    fireEvent.click(screen.getByText('downloadImage'));

    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/uploads/photo.jpg'),
    );
    vi.unstubAllGlobals();
  });
});

// ── Reply feature ─────────────────────────────────────────────────────────────
describe('MessageBubble reply feature', () => {
  const msgWithReply: Message = {
    ...baseMsg,
    replyTo: {
      id: 'msg-0',
      senderId: 'user-other',
      type: 'text',
      text: 'Original message',
    },
  };

  it('renders the reply quote block when message has replyTo', () => {
    render(
      <MessageBubble
        message={msgWithReply}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    expect(screen.getByTestId('reply-quote')).toBeInTheDocument();
    expect(screen.getByText('Original message')).toBeInTheDocument();
  });

  it('does not render a reply quote when message has no replyTo', () => {
    render(
      <MessageBubble
        message={baseMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    expect(screen.queryByTestId('reply-quote')).not.toBeInTheDocument();
  });

  it('applies line-clamp-2 to truncate long reply quote text', () => {
    const longText = 'A'.repeat(300);
    const msgWithLongReply: Message = {
      ...baseMsg,
      replyTo: { id: 'msg-0', senderId: 'user-other', type: 'text', text: longText },
    };
    render(
      <MessageBubble
        message={msgWithLongReply}
        sender={otherUser}
        isOwn={false}
        showSender={false}
      />
    );
    const quote = screen.getByTestId('reply-quote');
    const textSpan = quote.querySelector('.line-clamp-2');
    expect(textSpan).not.toBeNull();
    expect(textSpan?.textContent).toBe(longText);
  });

  it('calls onReply when the reply button is clicked', () => {
    const onReply = vi.fn();
    const { container } = render(
      <MessageBubble
        message={baseMsg}
        sender={otherUser}
        isOwn={false}
        showSender={false}
        onReply={onReply}
      />
    );
    // Hover to show action strip
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    const replyBtn = screen.getByLabelText('reply');
    fireEvent.mouseDown(replyBtn);
    expect(onReply).toHaveBeenCalledWith(baseMsg);
  });
});
