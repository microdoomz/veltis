import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SettingsPage from '@/app/(app)/settings/page';

vi.mock('@/lib/auth/client', () => ({
  authClient: {
    updateUser: vi.fn(),
    changePassword: vi.fn(),
    listSessions: vi.fn().mockResolvedValue({ data: [] }),
    revokeOtherSessions: vi.fn(),
    twoFactor: {
      enable: vi.fn(),
      disable: vi.fn(),
      verifyTotp: vi.fn(),
    },
    passkey: {
      addPasskey: vi.fn(),
    },
  },
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        name: 'Jane Doe',
        email: 'jane@example.com',
        twoFactorEnabled: false,
      },
      session: {
        token: 'test-token',
      },
    },
    isPending: false,
  }),
}));

// Mock global fetch for workspace
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    workspace: {
      id: 'ws-123',
      name: 'Personal Workspace',
      baseCurrency: 'USD',
    },
    user: {
      id: 'test-user-id',
      name: 'Jane Doe',
      email: 'jane@example.com',
    },
    role: 'owner',
  }),
}) as any;

describe('Settings Page & Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Settings tabs correctly', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'General' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Taxonomy' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Security' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Billing' })).toBeDefined();
  });

  it('renders Profile and Workspace preferences in General tab', async () => {
    render(<SettingsPage />);

    expect(screen.getByText('User Profile')).toBeDefined();
    expect(screen.getByText('Workspace & Preferences')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeDefined();
  });
});
