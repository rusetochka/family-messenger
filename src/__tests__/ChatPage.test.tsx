import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockSetActiveChat = vi.fn();
let storeState: Record<string, any> = {};

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(() => storeState),
}));

vi.mock('../i18n', () => ({
  t: (key: string) => key,
  formatLastSeen: () => 'offline',
  formatMessageTime: () => '12:00',
}));

vi.mock('../wallpapers', () => ({
  getWallpaperStyle: () => ({}),
}));

vi.mock('@emoji-mart/react', () => ({ default: () => null }));
vi.mock('@emoji-mart/data', () => ({ default: {} }));

// Import after mocks
import ChatPage from '../pages/ChatPage';

const baseUser = {
  id: 'user-1', name: 'Test User', email: 'test@test.com',
  avatar: 0, status: 'approved' as const, isAdmin: false, online: true,
};

const adminUser = { ...baseUser, isAdmin: true };

const chat1 = {
  id: 'chat-1', isGroup: false, name: null, memberIds: ['user-1', 'user-2'],
  createdAt: new Date().toISOString(), unreadCount: 0,
};

const groupChat = {
  id: 'group-1', isGroup: true, name: 'Test Group', memberIds: ['user-1', 'user-2'],
  createdAt: new Date().toISOString(), unreadCount: 0,
};

beforeEach(() => {
  mockNavigate.mockReset();
  mockSetActiveChat.mockReset();
  localStorage.clear();
  storeState = {
    currentUser: baseUser,
    users: [baseUser, { ...baseUser, id: 'user-2', name: 'Other User' }],
    chats: [chat1],
    messages: {},
    chatUsers: {},
    activeChat: null,
    wallpaper: 'none',
    setActiveChat: mockSetActiveChat,
    loadPendingUsers: vi.fn(),
    loadChats: vi.fn(),
    loadUsers: vi.fn(),
    createDM: vi.fn(),
    deleteGroup: vi.fn(),
    markAsRead: vi.fn(),
    loadMessages: vi.fn(),
    sendMessage: vi.fn(),
    updateGroupPhoto: vi.fn(),
    addMemberToGroup: vi.fn(),
    removeMemberFromGroup: vi.fn(),
    renameGroup: vi.fn(),
    addReaction: vi.fn(),
    deleteMessage: vi.fn(),
    editMessage: vi.fn(),
  };
});

afterEach(() => {
  localStorage.clear();
});

describe('Onboarding', () => {
  it('shows onboarding modal for non-admin user on first visit', () => {
    render(<ChatPage />);
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    expect(screen.getByText('onboardingStep1Title')).toBeInTheDocument();
  });

  it('does not show onboarding for admin users', () => {
    storeState.currentUser = adminUser;
    render(<ChatPage />);
    expect(screen.queryByText('1 / 4')).not.toBeInTheDocument();
  });

  it('does not show onboarding when already seen', () => {
    localStorage.setItem('onboarding_done', '1');
    render(<ChatPage />);
    expect(screen.queryByText('1 / 4')).not.toBeInTheDocument();
  });

  it('dismisses onboarding when Skip is clicked', () => {
    render(<ChatPage />);
    fireEvent.click(screen.getByLabelText('onboardingSkip'));
    expect(screen.queryByText('1 / 4')).not.toBeInTheDocument();
    expect(localStorage.getItem('onboarding_done')).toBe('1');
  });
});

describe('ChatPage mobile navigation', () => {
  it('shows sidebar (chat list) when no activeChat', () => {
    render(<ChatPage />);
    // Sidebar renders the "chats" heading
    expect(screen.getByText('chats')).toBeInTheDocument();
    // Empty state placeholder should also be present on desktop (hidden on mobile)
    expect(screen.getByText('selectChat')).toBeInTheDocument();
  });

  it('shows ChatWindow when activeChat is set', () => {
    storeState.activeChat = chat1;
    render(<ChatPage />);
    // ChatWindow renders the other user's name or input bar
    expect(screen.getByPlaceholderText('typeMessage')).toBeInTheDocument();
  });

  it('does not show hamburger menu button', () => {
    render(<ChatPage />);
    expect(screen.queryByText('☰')).not.toBeInTheDocument();
  });
});

describe('Sidebar bottom bar', () => {
  it('renders current user avatar that navigates to profile', () => {
    render(<ChatPage />);
    // The user's name should be in the bottom bar
    expect(screen.getByText('Test User')).toBeInTheDocument();
    // Click the user name to navigate to profile
    fireEvent.click(screen.getByText('Test User'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('shows admin button with badge for admin users', () => {
    storeState.currentUser = adminUser;
    storeState.users = [
      adminUser,
      { ...baseUser, id: 'user-2', name: 'Pending User', status: 'pending' },
    ];
    render(<ChatPage />);
    expect(screen.getByTitle('adminPanel')).toBeInTheDocument();
    // Pending badge should show count
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not show admin button for non-admin users', () => {
    render(<ChatPage />);
    expect(screen.queryByTitle('adminPanel')).not.toBeInTheDocument();
  });

  it('navigates to admin page when admin button clicked', () => {
    storeState.currentUser = adminUser;
    render(<ChatPage />);
    fireEvent.click(screen.getByTitle('adminPanel'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });
});

describe('ChatWindow back button', () => {
  it('renders back button that clears activeChat', () => {
    storeState.activeChat = chat1;
    render(<ChatPage />);
    const backBtn = screen.getByLabelText('Back');
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(mockSetActiveChat).toHaveBeenCalledWith(null);
  });
});

describe('Sidebar admin badge edge cases', () => {
  it('shows no badge when admin has zero pending users', () => {
    storeState.currentUser = adminUser;
    storeState.users = [adminUser];
    render(<ChatPage />);
    const adminBtn = screen.getByTitle('adminPanel');
    expect(adminBtn).toBeInTheDocument();
    // The badge span should not be rendered
    expect(adminBtn.querySelector('span')).toBeNull();
  });

  it('shows correct count when multiple users are pending', () => {
    storeState.currentUser = adminUser;
    storeState.users = [
      adminUser,
      { ...baseUser, id: 'u2', name: 'Pending 1', status: 'pending' },
      { ...baseUser, id: 'u3', name: 'Pending 2', status: 'pending' },
      { ...baseUser, id: 'u4', name: 'Pending 3', status: 'pending' },
    ];
    render(<ChatPage />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('ChatWindow group header menu', () => {
  beforeEach(() => {
    storeState.activeChat = groupChat;
    storeState.chats = [];  // empty so sidebar has no chat-row "More" buttons
    storeState.chatUsers = { 'group-1': [baseUser] };
  });

  it('shows three-dot menu button for group chats', () => {
    render(<ChatPage />);
    expect(screen.getByTitle('More')).toBeInTheDocument();
  });

  it('opens the header menu when three-dot button is clicked', () => {
    render(<ChatPage />);
    fireEvent.click(screen.getByTitle('More'));
    expect(screen.getByText('members')).toBeInTheDocument();
    expect(screen.getByText(/addMembers/)).toBeInTheDocument();
    expect(screen.getByText('renameGroup')).toBeInTheDocument();
  });

  it('closes the header menu when backdrop is clicked', () => {
    render(<ChatPage />);
    fireEvent.click(screen.getByTitle('More'));
    expect(screen.getByText('members')).toBeInTheDocument();
    // Click the fixed backdrop (first fixed inset-0 element)
    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(backdrop);
    expect(screen.queryByText('addMembers')).not.toBeInTheDocument();
  });

  it('shows delete group option for admin users', () => {
    storeState.currentUser = adminUser;
    render(<ChatPage />);
    fireEvent.click(screen.getByTitle('More'));
    expect(screen.getByText('deleteGroup')).toBeInTheDocument();
  });

  it('does not show delete group option for non-admin users', () => {
    render(<ChatPage />);
    fireEvent.click(screen.getByTitle('More'));
    expect(screen.queryByText('deleteGroup')).not.toBeInTheDocument();
  });
});

describe('Sidebar chat context menu (delete)', () => {
  beforeEach(() => {
    storeState.activeChat = null;
    storeState.chats = [chat1, groupChat];
    storeState.chatUsers = {};
  });

  it('does not show the three-dot menu button for non-admin users', () => {
    render(<ChatPage />);
    expect(screen.queryByTitle('More')).not.toBeInTheDocument();
  });

  it('shows the three-dot menu button for admin users', () => {
    storeState.currentUser = adminUser;
    render(<ChatPage />);
    // Two chats → two "More" buttons
    expect(screen.getAllByTitle('More').length).toBe(2);
  });

  it('shows delete option in sidebar menu for admin', () => {
    storeState.currentUser = adminUser;
    render(<ChatPage />);
    const moreButtons = screen.getAllByTitle('More');
    fireEvent.click(moreButtons[0]);
    // DM chat shows deleteChat label
    expect(screen.getByText('deleteChat')).toBeInTheDocument();
  });

  it('calls deleteGroup when admin confirms deletion of a DM', () => {
    storeState.currentUser = adminUser;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ChatPage />);
    const moreButtons = screen.getAllByTitle('More');
    fireEvent.click(moreButtons[0]);
    fireEvent.click(screen.getByText('deleteChat'));
    expect(storeState.deleteGroup).toHaveBeenCalledWith(chat1.id);
    vi.restoreAllMocks();
  });

  it('does not call deleteGroup when admin cancels deletion', () => {
    storeState.currentUser = adminUser;
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ChatPage />);
    fireEvent.click(screen.getAllByTitle('More')[0]);
    fireEvent.click(screen.getByText('deleteChat'));
    expect(storeState.deleteGroup).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
