import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUpdateAvatar = vi.fn();
const mockUpdatePhoto = vi.fn();
const mockLogout = vi.fn();
let storeState: Record<string, any> = {};

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(() => storeState),
}));

vi.mock('../i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('../components/Avatar', () => ({
  default: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

vi.mock('../components/AvatarPicker', () => ({
  default: ({ onSelect }: { onSelect: (i: number) => void }) => (
    <button onClick={() => onSelect(3)}>pick-avatar</button>
  ),
}));

vi.mock('../components/WallpaperPicker', () => ({
  default: () => <div>wallpaper-picker</div>,
}));

import ProfilePage from '../pages/ProfilePage';

const baseUser = {
  id: 'u-1', name: 'Alice', email: 'alice@test.com',
  avatar: 0, status: 'approved' as const, isAdmin: false,
  online: true, photoUrl: undefined,
};

beforeEach(() => {
  mockNavigate.mockReset();
  mockUpdateAvatar.mockReset();
  mockUpdatePhoto.mockReset();
  mockUpdateAvatar.mockResolvedValue(undefined);
  mockUpdatePhoto.mockResolvedValue(undefined);
  storeState = {
    currentUser: baseUser,
    updateAvatar: mockUpdateAvatar,
    updatePhoto: mockUpdatePhoto,
    logout: mockLogout,
  };
});

describe('ProfilePage – name editing', () => {
  it('saves name when Save Changes is clicked', async () => {
    render(<ProfilePage />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Alice Renamed' } });
    fireEvent.click(screen.getByText('saveChanges'));
    await waitFor(() => expect(mockUpdateAvatar).toHaveBeenCalledWith(0, 'Alice Renamed'));
    expect(mockNavigate).toHaveBeenCalledWith('/chat');
  });

  it('does NOT save when back button is clicked with unsaved name change', async () => {
    render(<ProfilePage />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Alice Changed' } });
    fireEvent.click(screen.getByTitle('back'));
    expect(mockUpdateAvatar).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/chat');
  });

  it('does NOT save when back button is clicked with unsaved avatar change', async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByText('pick-avatar'));
    fireEvent.click(screen.getByTitle('back'));
    expect(mockUpdateAvatar).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/chat');
  });

  it('navigates back without saving when there are no changes', async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByTitle('back'));
    expect(mockUpdateAvatar).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/chat');
  });
});
