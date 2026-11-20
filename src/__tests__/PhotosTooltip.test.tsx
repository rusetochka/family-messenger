import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotosTooltip, {
  hasSeenPhotosHighlight,
  markPhotosHighlightSeen,
  PHOTOS_HIGHLIGHT_KEY,
} from '../components/PhotosTooltip';

vi.mock('../i18n', () => ({
  t: (key: string) => key,
}));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('hasSeenPhotosHighlight / markPhotosHighlightSeen', () => {
  it('returns false when localStorage is empty', () => {
    expect(hasSeenPhotosHighlight()).toBe(false);
  });

  it('returns true after markPhotosHighlightSeen is called', () => {
    markPhotosHighlightSeen();
    expect(hasSeenPhotosHighlight()).toBe(true);
  });

  it('persists the "1" value in localStorage', () => {
    markPhotosHighlightSeen();
    expect(localStorage.getItem(PHOTOS_HIGHLIGHT_KEY)).toBe('1');
  });

  it('dispatches photos-highlight-dismissed window event on mark', () => {
    const handler = vi.fn();
    window.addEventListener('photos-highlight-dismissed', handler);
    markPhotosHighlightSeen();
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('photos-highlight-dismissed', handler);
  });
});

describe('PhotosTooltip', () => {
  it('renders the title and description', () => {
    render(<PhotosTooltip onDone={vi.fn()} />);
    expect(screen.getByText('photosHighlightTitle')).toBeInTheDocument();
    expect(screen.getByText('photosHighlightDesc')).toBeInTheDocument();
  });

  it('renders the dismiss button', () => {
    render(<PhotosTooltip onDone={vi.fn()} />);
    expect(screen.getByText('photosHighlightDismiss')).toBeInTheDocument();
  });

  it('calls onDone and marks storage when dismiss button is clicked', () => {
    const onDone = vi.fn();
    render(<PhotosTooltip onDone={onDone} />);
    fireEvent.click(screen.getByText('photosHighlightDismiss'));
    expect(onDone).toHaveBeenCalledOnce();
    expect(hasSeenPhotosHighlight()).toBe(true);
  });

  it('has role="dialog" with correct aria-label', () => {
    render(<PhotosTooltip onDone={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute('aria-label')).toBe('photosHighlightTitle');
  });

  it('renders a spotlight frame and arrow when the target element is in DOM', () => {
    const anchor = document.createElement('button');
    anchor.setAttribute('data-onboarding', 'photos-btn');
    Object.defineProperty(anchor, 'getBoundingClientRect', {
      value: () => ({ top: 700, left: 200, width: 40, height: 40, bottom: 740, right: 240 }),
    });
    document.body.appendChild(anchor);

    const { container } = render(<PhotosTooltip onDone={vi.fn()} />);

    // Spotlight div with box-shadow is rendered
    const hiddenDivs = container.querySelectorAll('[aria-hidden]');
    expect(hiddenDivs.length).toBeGreaterThan(0);

    document.body.removeChild(anchor);
  });

  it('dispatches photos-highlight-dismissed event on dismiss', () => {
    const handler = vi.fn();
    window.addEventListener('photos-highlight-dismissed', handler);

    render(<PhotosTooltip onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('photosHighlightDismiss'));

    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('photos-highlight-dismissed', handler);
  });
});
