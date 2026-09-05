import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
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
    signIn: {
      email: vi.fn(),
      social: vi.fn(),
    }
  }
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly', () => {
    render(<LoginForm />);
    
    expect(screen.getByPlaceholderText('Email address')).toBeDefined();
    expect(screen.getByPlaceholderText('Password')).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign in with Email/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue with Apple/i })).toBeDefined();
  });

  it('submits email login correctly and redirects on success', async () => {
    (authClient.signIn.email as any).mockResolvedValue({ error: null });
    
    render(<LoginForm />);
    
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Sign in with Email/i }));
    
    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(mockPush).toHaveBeenCalledWith('/home');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays error message on failed email login', async () => {
    (authClient.signIn.email as any).mockResolvedValue({ error: { message: 'Invalid credentials' } });
    
    render(<LoginForm />);
    
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpassword' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Sign in with Email/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeDefined();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('initiates Google login', async () => {
    (authClient.signIn.social as any).mockResolvedValue({ error: null });
    
    render(<LoginForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));
    
    await waitFor(() => {
      expect(authClient.signIn.social).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: '/home'
      });
    });
  });

  it('has Apple login disabled', () => {
    render(<LoginForm />);
    
    const appleBtn = screen.getByRole('button', { name: /Continue with Apple/i });
    expect(appleBtn.hasAttribute('disabled')).toBe(true);
  });

  it('toggles password visibility when toggle button is clicked', () => {
    render(<LoginForm />);
    const passwordInput = screen.getByPlaceholderText('Password');
    expect(passwordInput.getAttribute('type')).toBe('password');

    const toggleBtn = screen.getByLabelText(/Show password/i);
    fireEvent.click(toggleBtn);
    expect(passwordInput.getAttribute('type')).toBe('text');

    const hideBtn = screen.getByLabelText(/Hide password/i);
    fireEvent.click(hideBtn);
    expect(passwordInput.getAttribute('type')).toBe('password');
  });

  it('renders link to registration page', () => {
    render(<LoginForm />);
    const registerLink = screen.getByRole('link', { name: /Create an account/i });
    expect(registerLink.getAttribute('href')).toBe('/register');
  });
});
