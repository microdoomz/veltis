'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { error } = await authClient.forgetPassword({
        email,
        redirectTo: '/reset-password',
      });
      if (error) {
        setError(error.message || 'Failed to send reset link');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-card rounded-xl border border-border shadow-sm text-center">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Check your email</h1>
        <p className="text-muted-foreground text-sm">
          We have sent a password reset link to {email}.
        </p>
        <Button asChild className="w-full mt-4">
          <Link href="/login">Return to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-card rounded-xl border border-border shadow-sm">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Reset Password</h1>
        <p className="text-muted-foreground text-sm">Enter your email to receive a reset link</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input 
            type="email" 
            placeholder="Email address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending link...' : 'Send reset link'}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </div>
    </div>
  );
}
