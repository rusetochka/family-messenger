import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

let storeState: Record<string, any> = {};
vi.mock('../store/useStore', () => ({
  useStore: vi.fn(() => storeState),
}));

vi.mock('../i18n', () => ({
  t: (key: string) => key,
  formatYearsAgo: (n: number) => `This day ${n} years ago`,
}));

// Mock photosApi and uploadFile
const mockPhotosList   = vi.fn();
const mockPhotosAdd    = vi.fn();
const mockPhotosRemove = vi.fn();
const mockUploadFile   = vi.fn();
const mockSetActiveChat = vi.fn();
const mockSendMessage   = vi.fn();

vi.mock('../api', () => ({
  photosApi: {
    list:   (...args: any[]) => mockPhotosList(...args),
    add:    (...args: any[]) => mockPhotosAdd(...args),
    remove: (...args: any[]) => mockPhotosRemove(...args),
  },
  uploadFile: (...args: any[]) => mockUploadFile(...args),
}));

const mockMarkPhotosVisited = vi.fn();
vi.mock('../components/PhotosTooltip', () => ({
  markPhotosVisited: (...args: any[]) => mockMarkPhotosVisited(...args),
  hasSeenPhotosHighlight: () => true,
  hasNewPhotoBadge: () => false,
}));

import PhotosPage from '../pages/PhotosPage';

const baseUser = {
  id: 'u-1', name: 'Alice', email: 'alice@test.com',
  avatar: 0, status: 'approved' as const, isAdmin: false,
  online: true, photoUrl: null,
};

const adminUser = { ...baseUser, id: 'admin-1', isAdmin: true };

const fakePhotos = [
  { id: 'p1', title: 'This day 5 years ago', photo_url: '/uploads/a.jpg', created_at: '2021-04-17T00:00:00Z', author_name: 'Admin' },
  { id: 'p2', title: 'This day 3 years ago', photo_url: '/uploads/b.jpg', created_at: '2023-04-17T00:00:00Z', author_name: 'Admin' },
];

beforeEach(() => {
  mockNavigate.mockReset();
  mockPhotosList.mockReset();
  mockPhotosAdd.mockReset();
  mockPhotosRemove.mockReset();
  mockUploadFile.mockReset();
  mockSetActiveChat.mockReset();
  mockSendMessage.mockReset();
  mockSendMessage.mockResolvedValue(undefined);
  mockMarkPhotosVisited.mockReset();
  storeState = { currentUser: baseUser, chats: [], users: [baseUser], setActiveChat: mockSetActiveChat, sendMessage: mockSendMessage };
});

describe('PhotosPage – gallery display', () => {
  it('calls markPhotosVisited on mount to clear the new-photo badge', async () => {
    mockPhotosList.mockResolvedValue([]);
    render(<PhotosPage />);
    await waitFor(() => expect(mockMarkPhotosVisited).toHaveBeenCalledOnce());
  });

  it('shows spinner while loading', () => {
    mockPhotosList.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PhotosPage />);
    expect(document.querySelector('svg.animate-spin')).not.toBeNull();
  });

  it('shows empty state when no photos exist', async () => {
    mockPhotosList.mockResolvedValue([]);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByText('photosEmpty')).toBeTruthy());
  });

  it('renders photo titles from the API', async () => {
    mockPhotosList.mockResolvedValue(fakePhotos);
    render(<PhotosPage />);
    await waitFor(() => {
      expect(screen.getByText('This day 5 years ago')).toBeTruthy();
      expect(screen.getByText('This day 3 years ago')).toBeTruthy();
    });
  });

  it('navigates back to /chat when back button is clicked', async () => {
    mockPhotosList.mockResolvedValue([]);
    render(<PhotosPage />);
    fireEvent.click(screen.getByTitle('back'));
    expect(mockNavigate).toHaveBeenCalledWith('/chat');
  });
});

describe('PhotosPage – add new memory (all users)', () => {
  it('shows "Add a new memory" button for regular users', async () => {
    storeState = { currentUser: baseUser, chats: [], users: [], setActiveChat: mockSetActiveChat, sendMessage: mockSendMessage };
    mockPhotosList.mockResolvedValue([]);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByTestId('add-memory-btn')).toBeTruthy());
    expect(screen.queryByTestId('add-memory-form')).toBeNull();
  });

  it('shows "Add a new memory" button for admin users', async () => {
    storeState = { currentUser: adminUser, chats: [], users: [], setActiveChat: mockSetActiveChat, sendMessage: mockSendMessage };
    mockPhotosList.mockResolvedValue([]);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByTestId('add-memory-btn')).toBeTruthy());
  });

  it('expands the form when "Add a new memory" button is clicked', async () => {
    storeState = { currentUser: baseUser, chats: [], users: [], setActiveChat: mockSetActiveChat, sendMessage: mockSendMessage };
    mockPhotosList.mockResolvedValue([]);
    render(<PhotosPage />);
    await waitFor(() => screen.getByTestId('add-memory-btn'));

    fireEvent.click(screen.getByTestId('add-memory-btn'));

    expect(screen.getByTestId('add-memory-form')).toBeTruthy();
    expect(screen.queryByTestId('add-memory-btn')).toBeNull();
    expect(screen.getByRole('spinbutton')).toBeTruthy(); // years-ago input
  });

  it('collapses the form when × button is clicked', async () => {
    storeState = { currentUser: baseUser, chats: [], users: [], setActiveChat: mockSetActiveChat, sendMessage: mockSendMessage };
    mockPhotosList.mockResolvedValue([]);
    render(<PhotosPage />);
    await waitFor(() => screen.getByTestId('add-memory-btn'));

    fireEvent.click(screen.getByTestId('add-memory-btn'));
    expect(screen.getByTestId('add-memory-form')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('cancel'));
    expect(screen.queryByTestId('add-memory-form')).toBeNull();
    expect(screen.getByTestId('add-memory-btn')).toBeTruthy();
  });

  it('adds a photo, shows it in gallery, and collapses the form', async () => {
    storeState = { currentUser: baseUser, chats: [], users: [], setActiveChat: mockSetActiveChat, sendMessage: mockSendMessage };
    mockPhotosList.mockResolvedValue(fakePhotos.slice(1));
    mockUploadFile.mockResolvedValue('/uploads/new.jpg');
    const newPhoto = { id: 'p3', title: 'This day 7 years ago', photo_url: '/uploads/new.jpg', created_at: new Date().toISOString(), author_name: 'Alice' };
    mockPhotosAdd.mockResolvedValue(newPhoto);

    render(<PhotosPage />);
    await waitFor(() => screen.getByTestId('add-memory-btn'));

    // Expand form
    fireEvent.click(screen.getByTestId('add-memory-btn'));
    await waitFor(() => screen.getByRole('spinbutton'));

    // Change years-ago value to 7
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '7' } });

    // Simulate file selection
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['(image)'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByText('photosUploadBtn'));

    await waitFor(() => expect(screen.getByText('This day 7 years ago')).toBeTruthy());
    expect(mockUploadFile).toHaveBeenCalledWith(file);
    expect(mockPhotosAdd).toHaveBeenCalledWith('This day 7 years ago', '/uploads/new.jpg');
    // Form collapses after successful upload
    expect(screen.queryByTestId('add-memory-form')).toBeNull();
    expect(screen.getByTestId('add-memory-btn')).toBeTruthy();
  });
});

describe('PhotosPage – admin delete photo', () => {
  beforeEach(() => {
    storeState = { currentUser: adminUser };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('removes photo from list after deletion', async () => {
    mockPhotosList.mockResolvedValue([...fakePhotos]);
    mockPhotosRemove.mockResolvedValue(undefined);

    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByText('This day 5 years ago')).toBeTruthy());

    // Click first delete button
    const deleteBtns = document.querySelectorAll('button[title="deleteMessage"]');
    fireEvent.click(deleteBtns[0]);

    await waitFor(() => expect(screen.queryByText('This day 5 years ago')).toBeNull());
    expect(mockPhotosRemove).toHaveBeenCalledWith('p1');
  });
});

describe('PhotosPage – download photo', () => {
  beforeEach(() => {
    storeState = { currentUser: baseUser };
  });

  it('shows a download button on each photo card', async () => {
    mockPhotosList.mockResolvedValue(fakePhotos);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByText('This day 5 years ago')).toBeTruthy());
    const downloadBtns = document.querySelectorAll('button[title="downloadImage"]');
    expect(downloadBtns.length).toBe(fakePhotos.length);
  });

  it('shows a download button inside the lightbox', async () => {
    mockPhotosList.mockResolvedValue(fakePhotos);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByText('This day 5 years ago')).toBeTruthy());

    // Open lightbox by clicking the photo
    const photoBtn = document.querySelectorAll('button[aria-label="This day 5 years ago"]')[0];
    fireEvent.click(photoBtn);

    // Download button should appear inside the lightbox
    await waitFor(() =>
      expect(screen.getAllByTitle('downloadImage').length).toBeGreaterThanOrEqual(1)
    );
  });
});

describe('PhotosPage – discuss in chat', () => {
  const fakeChat = {
    id: 'c1', isGroup: false, name: undefined, photoUrl: undefined,
    memberIds: ['u-1', 'u-2'], createdAt: '2021-01-01T00:00:00Z', unreadCount: 0,
  };
  const otherUser = {
    id: 'u-2', name: 'Bob', email: 'bob@test.com',
    avatar: 1, status: 'approved' as const, isAdmin: false, online: true,
  };

  beforeEach(() => {
    storeState = {
      currentUser: baseUser,
      chats: [fakeChat],
      users: [baseUser, otherUser],
      setActiveChat: mockSetActiveChat,
      sendMessage: mockSendMessage,
    };
  });

  it('shows a discuss button on each photo card', async () => {
    mockPhotosList.mockResolvedValue(fakePhotos);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByText('This day 5 years ago')).toBeTruthy());
    const btns = document.querySelectorAll('button[title="discussInChat"]');
    expect(btns.length).toBe(fakePhotos.length);
  });

  it('opens chat picker modal when discuss button is clicked', async () => {
    mockPhotosList.mockResolvedValue(fakePhotos);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByText('This day 5 years ago')).toBeTruthy());

    const btn = document.querySelectorAll('button[title="discussInChat"]')[0];
    fireEvent.click(btn);

    expect(screen.getByText('shareToChat')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('sends image message and navigates to chat on chat selection', async () => {
    mockPhotosList.mockResolvedValue(fakePhotos);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByText('This day 5 years ago')).toBeTruthy());

    fireEvent.click(document.querySelectorAll('button[title="discussInChat"]')[0]);
    fireEvent.click(screen.getByText('Bob'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('c1', 'image', { imageUrl: '/uploads/a.jpg' });
      expect(mockSetActiveChat).toHaveBeenCalledWith(fakeChat);
      expect(mockNavigate).toHaveBeenCalledWith('/chat');
    });
  });

  it('closes modal when cancel button is clicked', async () => {
    mockPhotosList.mockResolvedValue(fakePhotos);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByText('This day 5 years ago')).toBeTruthy());

    fireEvent.click(document.querySelectorAll('button[title="discussInChat"]')[0]);
    expect(screen.getByText('shareToChat')).toBeTruthy();

    fireEvent.click(screen.getByText('cancel'));
    expect(screen.queryByText('shareToChat')).toBeNull();
  });

  it('shows "no chats" message when user has no chats', async () => {
    storeState = { ...storeState, chats: [] };
    mockPhotosList.mockResolvedValue(fakePhotos);
    render(<PhotosPage />);
    await waitFor(() => expect(screen.getByText('This day 5 years ago')).toBeTruthy());

    fireEvent.click(document.querySelectorAll('button[title="discussInChat"]')[0]);
    expect(screen.getByText('noChatsFound')).toBeTruthy();
  });
});
