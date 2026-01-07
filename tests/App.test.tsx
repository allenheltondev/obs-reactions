import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverlayPage, ControlPage, ErrorPage } from '../src/pages';

vi.mock('react-router-dom', () => ({
  useParams: vi.fn()
}));

vi.mock('../src/types/environment', () => ({
  getEnvironmentConfig: vi.fn(() => ({
    VITE_MOMENTO_API_KEY: 'test-api-key',
    VITE_MOMENTO_TOPICS_URL: 'test-url',
    VITE_MOMENTO_CACHE_NAME: 'test-cache',
    VITE_EVENT_NAME: 'Test Event',
    VITE_PRIMARY_COLOR: '#000000',
    VITE_SECONDARY_COLOR: '#ffffff',
    VITE_TERTIARY_COLOR: '#cccccc'
  }))
}));

import { useParams } from 'react-router-dom';

describe('Routing Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render overlay page with session ID from URL params', async () => {
    (useParams as vi.MockedFunction<typeof useParams>).mockReturnValue({ sessionId: 'test-session-123' });

    render(<OverlayPage />);

    // The overlay page should render without errors when a valid session ID is provided
    // It doesn't display the session ID text, just the reactions container
    expect(screen.queryByText('Session Error')).not.toBeInTheDocument();
    expect(screen.queryByText(/Session ID is required/)).not.toBeInTheDocument();
  });

  it('should render overlay page error when no session ID', async () => {
    (useParams as vi.MockedFunction<typeof useParams>).mockReturnValue({});

    render(<OverlayPage />);

    expect(screen.getByText('Session Error')).toBeInTheDocument();
    expect(screen.getByText(/Session ID is required/)).toBeInTheDocument();
  });

  it('should render control page with session ID from URL params', async () => {
    (useParams as vi.MockedFunction<typeof useParams>).mockReturnValue({ sessionId: 'test-session-456' });

    render(<ControlPage />);

    expect(screen.getByText('🎉 Live Reactions! 🎉')).toBeInTheDocument();
  });

  it('should render control page error when no session ID', async () => {
    (useParams as vi.MockedFunction<typeof useParams>).mockReturnValue({});

    render(<ControlPage />);

    expect(screen.getByText('Session Error')).toBeInTheDocument();
    expect(screen.getByText(/Session ID is required/)).toBeInTheDocument();
  });

  it('should render error page with default message', async () => {
    render(<ErrorPage />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText(/Session ID is required/)).toBeInTheDocument();
  });

  it('should render error page with custom message', async () => {
    const customMessage = 'Custom error message';
    render(<ErrorPage message={customMessage} />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });
});
