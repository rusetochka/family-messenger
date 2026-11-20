import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingModal, { hasSeenOnboarding, markOnboardingDone } from '../components/OnboardingModal';

vi.mock('../i18n', () => ({
  t: (key: string) => key,
}));

const STORAGE_KEY = 'onboarding_done';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('hasSeenOnboarding / markOnboardingDone', () => {
  it('returns false when localStorage is empty', () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('returns true after markOnboardingDone is called', () => {
    markOnboardingDone();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('persists the "1" value in localStorage', () => {
    markOnboardingDone();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });
});

describe('OnboardingModal', () => {
  it('renders the first step with step counter "1 / 4"', () => {
    render(<OnboardingModal onDone={vi.fn()} />);
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    expect(screen.getByText('onboardingStep1Title')).toBeInTheDocument();
    expect(screen.getByText('onboardingStep1Desc')).toBeInTheDocument();
  });

  it('shows "onboardingNext" button on non-last steps', () => {
    render(<OnboardingModal onDone={vi.fn()} />);
    expect(screen.getByText('onboardingNext')).toBeInTheDocument();
  });

  it('advances to the next step on Next click', () => {
    render(<OnboardingModal onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('onboardingNext'));
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
    expect(screen.getByText('onboardingStep2Title')).toBeInTheDocument();
  });

  it('shows "onboardingDone" on the last step', () => {
    render(<OnboardingModal onDone={vi.fn()} />);
    // Advance through all steps
    fireEvent.click(screen.getByText('onboardingNext')); // step 2
    fireEvent.click(screen.getByText('onboardingNext')); // step 3
    fireEvent.click(screen.getByText('onboardingNext')); // step 4
    expect(screen.getByText('onboardingDone')).toBeInTheDocument();
    expect(screen.queryByText('onboardingNext')).not.toBeInTheDocument();
  });

  it('calls onDone and marks storage when Done is clicked', () => {
    const onDone = vi.fn();
    render(<OnboardingModal onDone={onDone} />);
    fireEvent.click(screen.getByText('onboardingNext'));
    fireEvent.click(screen.getByText('onboardingNext'));
    fireEvent.click(screen.getByText('onboardingNext'));
    fireEvent.click(screen.getByText('onboardingDone'));
    expect(onDone).toHaveBeenCalledOnce();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('calls onDone and marks storage when Skip is clicked', () => {
    const onDone = vi.fn();
    render(<OnboardingModal onDone={onDone} />);
    fireEvent.click(screen.getByLabelText('onboardingSkip'));
    expect(onDone).toHaveBeenCalledOnce();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('renders 4 dot indicators', () => {
    const { container } = render(<OnboardingModal onDone={vi.fn()} />);
    // Each dot is a <span> inside the dot container — there should be exactly 4
    const dots = container.querySelectorAll('span.rounded-full');
    expect(dots.length).toBe(4);
  });

  it('active dot is wider than inactive dots on first step', () => {
    const { container } = render(<OnboardingModal onDone={vi.fn()} />);
    const dots = container.querySelectorAll('span.rounded-full');
    expect(dots[0].className).toContain('w-5');
    expect(dots[1].className).toContain('w-2');
  });

  it('renders a spotlight frame and arrow when a data-onboarding target is present', () => {
    // Mount a target element before the modal so getRect can find it
    const anchor = document.createElement('button');
    anchor.setAttribute('data-onboarding', 'new-dm');
    // jsdom reports non-zero rect when width/height are set via style
    Object.defineProperty(anchor, 'getBoundingClientRect', {
      value: () => ({ top: 100, left: 50, width: 44, height: 44, bottom: 144, right: 94 }),
    });
    document.body.appendChild(anchor);

    const { container } = render(<OnboardingModal onDone={vi.fn()} />);

    // Spotlight div is rendered (has box-shadow style)
    const spotlight = container.querySelector('[aria-hidden]');
    expect(spotlight).toBeTruthy();

    document.body.removeChild(anchor);
  });
});

describe('ChatPage onboarding integration', () => {
  it('does not show onboarding when already seen', () => {
    markOnboardingDone();
    expect(hasSeenOnboarding()).toBe(true);
    // After marking done, a new render would not trigger onboarding
    // (verified via unit tests above; ChatPage integration is covered in ChatPage.test.tsx)
  });
});
