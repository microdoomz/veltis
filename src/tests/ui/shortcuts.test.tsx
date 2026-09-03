import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CreateShortcutForm } from '../../app/(app)/settings/shortcuts/create-form';
import { addShortcutTokenAction } from '../../app/actions/shortcut';

afterEach(() => {
  cleanup();
});

vi.mock('../../app/actions/shortcut', () => ({
  addShortcutTokenAction: vi.fn(),
}));

describe('CreateShortcutForm', () => {
  it('renders correctly', () => {
    render(<CreateShortcutForm workspaceId="test-ws" />);
    expect(screen.getByText('Create New Token')).toBeDefined();
    expect(screen.getByPlaceholderText('e.g., iPhone Personal')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDefined();
  });

  it('disables create button when input is empty', () => {
    render(<CreateShortcutForm workspaceId="test-ws" />);
    const button = screen.getByRole('button', { name: 'Create' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables create button when input is typed', () => {
    render(<CreateShortcutForm workspaceId="test-ws" />);
    const input = screen.getByPlaceholderText('e.g., iPhone Personal');
    fireEvent.change(input, { target: { value: 'My Token' } });
    
    const button = screen.getByRole('button', { name: 'Create' });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it('handles successful token creation', async () => {
    const mockToken = 'vsh_mocktoken123';
    vi.mocked(addShortcutTokenAction).mockResolvedValueOnce({ rawToken: mockToken } as never);

    render(<CreateShortcutForm workspaceId="test-ws" />);
    
    const input = screen.getByPlaceholderText('e.g., iPhone Personal');
    fireEvent.change(input, { target: { value: 'Test Token' } });
    
    const button = screen.getByRole('button', { name: 'Create' });
    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Token created successfully!')).toBeDefined();
    });

    expect(screen.getByText(mockToken)).toBeDefined();

    const doneButton = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneButton);

    expect(screen.queryByText('Token created successfully!')).toBeNull();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDefined();
  });
});
