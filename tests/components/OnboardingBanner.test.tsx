import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingBanner } from '@/components/onboarding/OnboardingBanner';

describe('OnboardingBanner Component', () => {
  it('renders onboarding progress, steps, and action links', () => {
    render(<OnboardingBanner workspaceName="Family Office" />);

    expect(screen.getByText(/Finish setting up your workspace/i)).toBeDefined();
    expect(screen.getByText(/50% Complete/i)).toBeDefined();
    expect(screen.getByText(/Step 1: Workspace provisioned/i)).toBeDefined();
    expect(screen.getByText(/Step 2: Add first account & currency/i)).toBeDefined();
    expect(screen.getByText(/"Family Office" is ready/i)).toBeDefined();

    const onboardingLink = screen.getByRole('link', { name: /Continue Onboarding/i });
    expect(onboardingLink.getAttribute('href')).toBe('/onboarding');

    const addAccountLink = screen.getByRole('link', { name: /Add Account/i });
    expect(addAccountLink.getAttribute('href')).toBe('/accounts/new');
  });

  it('renders default workspace copy when workspaceName is not provided', () => {
    render(<OnboardingBanner />);

    expect(screen.getByText(/Your personal workspace is ready/i)).toBeDefined();
  });
});
