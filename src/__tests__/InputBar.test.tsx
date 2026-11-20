import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InputBar from '../components/InputBar';

const mockSendMessage = vi.fn();

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(() => ({ sendMessage: mockSendMessage })),
}));

vi.mock('../i18n', () => ({
  t: (key: string) => key,
  appLocale: 'en',
}));

// emoji-mart is not needed for these tests
vi.mock('@emoji-mart/react', () => ({ default: () => null }));
vi.mock('@emoji-mart/data', () => ({ default: {} }));

beforeEach(() => {
  mockSendMessage.mockReset();
});

// ── InputBar image upload ─────────────────────────────────────────────────────
describe('InputBar image upload', () => {
  it('shows imageTooLarge error when file exceeds 10 MB', async () => {
    render(<InputBar chatId="chat-1" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = new File(['x'.repeat(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(await screen.findByText('imageTooLarge')).toBeInTheDocument();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('does not show an error for a file within the size limit', async () => {
    mockSendMessage.mockResolvedValue(undefined);
    render(<InputBar chatId="chat-1" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const smallFile = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [smallFile] } });

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledOnce());
    expect(screen.queryByText('imageTooLarge')).not.toBeInTheDocument();
    expect(screen.queryByText('imageUploadFailed')).not.toBeInTheDocument();
  });

  it('shows imageUploadFailed error when sendMessage rejects', async () => {
    mockSendMessage.mockRejectedValue(new Error('network error'));
    render(<InputBar chatId="chat-1" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('imageUploadFailed')).toBeInTheDocument();
  });

  it('dismisses the error banner when × is clicked', async () => {
    mockSendMessage.mockRejectedValue(new Error('fail'));
    render(<InputBar chatId="chat-1" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    const banner = await screen.findByText('imageUploadFailed');
    expect(banner).toBeInTheDocument();

    fireEvent.click(screen.getByText('×'));
    expect(screen.queryByText('imageUploadFailed')).not.toBeInTheDocument();
  });

  it('disables the attach button while uploading', async () => {
    let resolveUpload!: () => void;
    mockSendMessage.mockReturnValue(new Promise<void>(res => { resolveUpload = res; }));
    render(<InputBar chatId="chat-1" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    // Button should be disabled while in-flight
    const attachBtn = screen.getByTitle('attachImageTitle');
    expect(attachBtn).toBeDisabled();

    resolveUpload();
    await waitFor(() => expect(attachBtn).not.toBeDisabled());
  });
});

// ── InputBar reply strip ──────────────────────────────────────────────────────
describe('InputBar reply strip', () => {
  it('shows the reply preview strip when replyingTo is provided', () => {
    const replyingTo = {
      id: 'msg-0', chatId: 'chat-1', senderId: 'user-other',
      type: 'text' as const, text: 'Original message', createdAt: new Date().toISOString(),
    };
    render(<InputBar chatId="chat-1" replyingTo={replyingTo} onCancelReply={() => {}} />);
    expect(screen.getByTestId('reply-preview')).toBeInTheDocument();
    expect(screen.getByText('Original message')).toBeInTheDocument();
  });

  it('does not show the reply strip when replyingTo is null', () => {
    render(<InputBar chatId="chat-1" replyingTo={null} onCancelReply={() => {}} />);
    expect(screen.queryByTestId('reply-preview')).not.toBeInTheDocument();
  });

  it('calls onCancelReply when the × button in the strip is clicked', () => {
    const onCancelReply = vi.fn();
    const replyingTo = {
      id: 'msg-0', chatId: 'chat-1', senderId: 'user-other',
      type: 'text' as const, text: 'Hi', createdAt: new Date().toISOString(),
    };
    render(<InputBar chatId="chat-1" replyingTo={replyingTo} onCancelReply={onCancelReply} />);
    fireEvent.click(screen.getByLabelText('cancelReply'));
    expect(onCancelReply).toHaveBeenCalledOnce();
  });

  it('passes replyToId to sendMessage and clears reply on send', async () => {
    mockSendMessage.mockResolvedValue(undefined);
    const onCancelReply = vi.fn();
    const replyingTo = {
      id: 'msg-reply-target', chatId: 'chat-1', senderId: 'user-other',
      type: 'text' as const, text: 'Quoted', createdAt: new Date().toISOString(),
    };
    render(<InputBar chatId="chat-1" replyingTo={replyingTo} onCancelReply={onCancelReply} />);

    const textarea = screen.getByPlaceholderText('typeMessage');
    fireEvent.change(textarea, { target: { value: 'My reply' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalledWith(
      'chat-1', 'text', { text: 'My reply', replyToId: 'msg-reply-target' },
    ));
    expect(onCancelReply).toHaveBeenCalledOnce();
  });
});
