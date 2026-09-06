'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Smartphone,
  Fingerprint,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [active2FaMethod, setActive2FaMethod] = useState<'totp' | 'passkey' | 'backup'>('totp');

  // Credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // 2FA state
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  useEffect(() => {
    // Warm up application cache ahead of login
    router.prefetch?.('/home');
    router.prefetch?.('/accounts');
    router.prefetch?.('/transactions');
    router.prefetch?.('/settings');
    router.prefetch?.('/register');

    if (searchParams?.get('deleted') === 'true') {
      setNotice('Your account and all associated data have been permanently deleted.');
    }
    if (searchParams?.get('twoFactor') === 'true') {
      setStep('2fa');
    }
  }, [router, searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice(null);

    try {
      const res = await authClient.signIn.email({
        email,
        password,
      });

      if (res.error) {
        setError(res.error.message || 'Invalid email or password');
        return;
      }

      // Check if 2FA challenge is required
      if ((res.data as any)?.twoFactorRedirect) {
        setStep('2fa');
        return;
      }

      router.push('/home');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyDirectLogin = async () => {
    setPasskeyLoading(true);
    setError('');
    setNotice(null);

    try {
      const res = await authClient.signIn.passkey();
      if (res?.error) {
        if ((res.error as any).name === 'NotAllowedError') {
          setError('Biometric login was cancelled.');
        } else {
          setError(res.error.message || 'Biometric authentication failed.');
        }
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric authentication cancelled.');
      } else {
        setError(err.message || 'Failed to authenticate with biometrics.');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/home',
      });
    } catch {
      setError('Failed to initiate Google login');
      setGoogleLoading(false);
    }
  };

  // 2FA Verification handlers
  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim()) return;

    setTwoFaLoading(true);
    setError('');

    try {
      const res = await authClient.twoFactor.verifyTotp({
        code: totpCode.trim(),
      });

      if (res.error) {
        setError(res.error.message || 'Invalid 6-digit code. Please check your authenticator app.');
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerifyPasskey2Fa = async () => {
    setTwoFaLoading(true);
    setError('');

    try {
      const res = await authClient.signIn.passkey();
      if (res?.error) {
        setError(res.error.message || 'Biometric verification failed.');
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric verification cancelled.');
      } else {
        setError(err.message || 'Biometric verification failed.');
      }
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerifyBackupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode.trim()) return;

    setTwoFaLoading(true);
    setError('');

    try {
      const res = await authClient.twoFactor.verifyBackupCode({
        code: backupCode.trim(),
      });

      if (res.error) {
        setError(res.error.message || 'Invalid backup code. Please try another code.');
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Backup code verification failed.');
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-card rounded-2xl border border-border shadow-md">
      {notice && (
        <div className="p-3.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 text-xs text-destructive bg-destructive/10 rounded-xl border border-destructive/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === 'credentials' ? (
        <>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Welcome to Veltis</h1>
            <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
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
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              {loading ? 'Signing in...' : 'Sign in with Email'}
            </Button>
          </form>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 text-foreground font-medium"
              onClick={handlePasskeyDirectLogin}
              disabled={loading || passkeyLoading}
              loading={passkeyLoading}
            >
              <Fingerprint className="w-4 h-4 text-emerald-500" />
              Sign in with Biometrics / Passkey
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading || passkeyLoading}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting to Google...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        /* Two-Factor Authentication Challenge View */
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-1">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Two-Factor Verification
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Confirm your identity using any verification method linked to your account.
            </p>
          </div>

          {/* Verification Method Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActive2FaMethod('totp');
                setError('');
              }}
              className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                active2FaMethod === 'totp'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>App</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActive2FaMethod('passkey');
                setError('');
              }}
              className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                active2FaMethod === 'passkey'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Fingerprint className="h-4 w-4 text-emerald-500" />
              <span>Biometrics</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActive2FaMethod('backup');
                setError('');
              }}
              className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                active2FaMethod === 'backup'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Backup</span>
            </button>
          </div>

          {/* Form: Authenticator App */}
          {active2FaMethod === 'totp' && (
            <form onSubmit={handleVerifyTotp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  6-Digit Authenticator Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  autoFocus
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center font-mono tracking-widest text-lg h-12"
                  disabled={twoFaLoading}
                />
                <p className="text-[11px] text-muted-foreground text-center">
                  Open Google Authenticator, 1Password, or Apple Passwords to get your code.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                loading={twoFaLoading}
                disabled={totpCode.length < 6 || twoFaLoading}
              >
                Verify & Sign In
              </Button>
            </form>
          )}

          {/* Form: Biometrics / Passkey */}
          {active2FaMethod === 'passkey' && (
            <div className="space-y-4 text-center p-4 rounded-xl border border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Authenticate with Touch ID, Face ID, or Windows Hello registered on your device.
              </p>
              <Button
                type="button"
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleVerifyPasskey2Fa}
                loading={twoFaLoading}
              >
                <Fingerprint className="h-4 w-4" /> Verify with Biometrics
              </Button>
            </div>
          )}

          {/* Form: Backup Code */}
          {active2FaMethod === 'backup' && (
            <form onSubmit={handleVerifyBackupCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  One-Time Backup Code
                </label>
                <Input
                  type="text"
                  autoFocus
                  placeholder="e.g. 1a2b-3c4d or 87654321"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  className="font-mono text-center tracking-wider text-sm h-11"
                  disabled={twoFaLoading}
                />
                <p className="text-[11px] text-muted-foreground text-center">
                  Enter one of your emergency recovery backup codes. Each code can only be used once.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                loading={twoFaLoading}
                disabled={!backupCode.trim() || twoFaLoading}
              >
                Verify Backup Code
              </Button>
            </form>
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setError('');
                setTotpCode('');
                setBackupCode('');
              }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to email & password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
