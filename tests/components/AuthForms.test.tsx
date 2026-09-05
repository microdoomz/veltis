import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { SignupForm } from '@/components/auth/SignupForm';
import { authClient } from '@/lib/auth/client';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockPrefetch = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    prefetch: mockPrefetch,
  }),
}));

vi.mock('@/lib/auth/client', () => ({
  authClient: {
    signUp: {
      email: vi.fn(),
    },
    signIn: {
      social: vi.fn(),
    },
  },
}));

describe('SignupForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all fields including password and confirm password', () => {
    render(<SignupForm />);

    expect(screen.getByPlaceholderText('Full Name')).toBeDefined();
    expect(screen.getByPlaceholderText('Email address')).toBeDefined();
    expect(screen.getByPlaceholderText(/Password \(min\. 8 characters\)/i)).toBeDefined();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign up with Email/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeDefined();

    const signinLink = screen.getByRole('link', { name: /Sign in/i });
    expect(signinLink.getAttribute('href')).toBe('/login');
  });

  it('toggles password and confirm password visibility', () => {
    render(<SignupForm />);

    const passwordInput = screen.getByPlaceholderText(/Password \(min\. 8 characters\)/i);
    const confirmInput = screen.getByPlaceholderText('Confirm Password');

    expect(passwordInput.getAttribute('type')).toBe('password');
    expect(confirmInput.getAttribute('type')).toBe('password');

    // Toggle password
    const showPasswordBtn = screen.getByLabelText('Show password');
    fireEvent.click(showPasswordBtn);
    expect(passwordInput.getAttribute('type')).toBe('text');

    // Toggle confirm password
    const showConfirmBtn = screen.getByLabelText('Show confirm password');
    fireEvent.click(showConfirmBtn);
    expect(confirmInput.getAttribute('type')).toBe('text');

    // Toggle back
    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(passwordInput.getAttribute('type')).toBe('password');

    fireEvent.click(screen.getByLabelText('Hide confirm password'));
    expect(confirmInput.getAttribute('type')).toBe('password');
  });

  it('shows error if password is less than 8 characters', async () => {
    render(<SignupForm />);

    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password \(min\. 8 characters\)/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign up with Email/i }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeDefined();
      expect(authClient.signUp.email).not.toHaveBeenCalled();
    });
  });

  it('shows error if passwords do not match', async () => {
    render(<SignupForm />);

    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password \(min\. 8 characters\)/i), { target: { value: 'ValidPassword123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'DifferentPassword123' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign up with Email/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeDefined();
      expect(authClient.signUp.email).not.toHaveBeenCalled();
    });
  });

  it('submits registration successfully and redirects to onboarding', async () => {
    (authClient.signUp.email as any).mockResolvedValue({ error: null });

    render(<SignupForm />);

    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password \(min\. 8 characters\)/i), { target: { value: 'ValidPassword123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'ValidPassword123' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign up with Email/i }));

    await waitFor(() => {
      expect(authClient.signUp.email).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'ValidPassword123',
      });
      expect(mockPush).toHaveBeenCalledWith('/onboarding');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
