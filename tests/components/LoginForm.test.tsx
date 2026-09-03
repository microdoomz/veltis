import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { authClient } from '@/lib/auth/client';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
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
});
