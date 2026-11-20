import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'test-token' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('../api', () => ({
  invitationsApi: {
    validate: vi.fn(() => Promise.resolve()),
    accept: vi.fn(() => Promise.resolve()),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock('../i18n', () => ({
  t: (key: string) => key,
}));

import InvitePage from '../pages/InvitePage';

describe('InvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows password rules after the token validates', async () => {
    render(<InvitePage />);

    // Wait for the form to appear after validate() resolves
    const passwordInput = await screen.findByPlaceholderText('passwordPlaceholder');
    expect(passwordInput).toBeTruthy();

    expect(screen.getByText('• passwordRuleLength')).toBeTruthy();
    expect(screen.getByText('• passwordRuleUppercase')).toBeTruthy();
    expect(screen.getByText('• passwordRuleDigit')).toBeTruthy();
    expect(screen.getByText('• passwordRuleSpecial')).toBeTruthy();
  });
});
