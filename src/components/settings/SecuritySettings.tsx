'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient, useSession } from '@/lib/auth/client';
import {
  KeyRound,
  Shield,
  Fingerprint,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Zap,
  Smartphone,
  Copy,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface SessionInfo {
  id: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string | Date;
  expiresAt: string | Date;
}

interface SecurityProfile {
  userId: string;
  hasPassword: boolean;
  providers: string[];
  hasPasskeys: boolean;
  passkeysCount: number;
  twoFactorEnabled: boolean;
  isGoogleUser: boolean;
}

export function SecuritySettings() {
  const { data: session } = useSession();

  // Security profile state
  const [securityProfile, setSecurityProfile] = useState<SecurityProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 2FA state
  const is2FAEnabled = Boolean(
    securityProfile?.twoFactorEnabled || (session?.user && (session.user as any).twoFactorEnabled)
  );
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState('');
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [twoFaMessage, setTwoFaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDisableModal, setConfirmDisableModal] = useState(false);

  // Passkey state
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokeSessionsLoading, setRevokeSessionsLoading] = useState(false);

  useEffect(() => {
    loadSessions();
    loadSecurityProfile();
  }, []);

  async function loadSecurityProfile() {
    try {
      setProfileLoading(true);
      const res = await fetch('/api/user/security-profile');
      if (res.ok) {
        const data = await res.json();
        setSecurityProfile(data);
      }
    } catch (err) {
      console.error('Failed to load security profile', err);
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadSessions() {
    try {
      setSessionsLoading(true);
      const res = await authClient.listSessions();
      if (res.data) {
        setSessions(res.data as SessionInfo[]);
      }
    } catch (err) {
      console.error('Failed to load active sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  }

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: revokeOthers,
      });

      if (res.error) {
        throw new Error(res.error.message || 'Failed to update password');
      }

      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (revokeOthers) {
        loadSessions();
      }
      await loadSecurityProfile();
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to update password. Verify your current password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Start 2FA Enable (supports passwordless Google users via password: '')
  const startTotpSetup = async (pwd = '') => {
    setTwoFaMessage(null);
    try {
      setTwoFaLoading(true);
      const enableRes = await authClient.twoFactor.enable({
        password: pwd,
      });

      if (enableRes.error) {
        throw new Error(enableRes.error.message || 'Failed to enable 2FA.');
      }

      if (enableRes.data) {
        if ((enableRes.data as any).totpURI) {
          setTotpUri((enableRes.data as any).totpURI);
        }
        if ((enableRes.data as any).backupCodes) {
          setBackupCodes((enableRes.data as any).backupCodes);
        }
      }

      setTwoFaMessage({
        type: 'success',
        text: 'Authenticator secret generated. Scan the code in your authenticator app to complete setup.',
      });
    } catch (err: any) {
      setTwoFaMessage({ type: 'error', text: err.message || 'Failed to initialize 2FA.' });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    await startTotpSetup(twoFaPassword);
  };

  // Verify TOTP
  const handleVerifyTotp = async () => {
    if (!totpCode || totpCode.length < 6) return;
    try {
      setTwoFaLoading(true);
      setTwoFaMessage(null);
      const verifyRes = await authClient.twoFactor.verifyTotp({
        code: totpCode,
      });

      if (verifyRes.error) {
        throw new Error(verifyRes.error.message || 'Invalid authenticator code');
      }

      setTwoFaMessage({ type: 'success', text: 'Two-factor authentication is now fully active!' });
      setShow2FaModal(false);
      setTotpUri(null);
      setTwoFaPassword('');
      setTotpCode('');
      await loadSecurityProfile();
    } catch (err: any) {
      setTwoFaMessage({ type: 'error', text: err.message || 'Verification failed. Check the code and try again.' });
    } finally {
      setTwoFaLoading(false);
    }
  };

  // Disable 2FA (supports passwordless Google users)
  const handleDisable2FA = async (password = '') => {
    try {
      setTwoFaLoading(true);
      setTwoFaMessage(null);
      const res = await authClient.twoFactor.disable({
        password,
      });
      if (res.error) {
        throw new Error(res.error.message || 'Failed to disable 2FA');
      }
      setTwoFaMessage({ type: 'success', text: 'Two-factor authentication has been disabled.' });
      setShow2FaModal(false);
      setConfirmDisableModal(false);
      await loadSecurityProfile();
    } catch (err: any) {
      setTwoFaMessage({ type: 'error', text: err.message || 'Failed to disable 2FA.' });
    } finally {
      setTwoFaLoading(false);
    }
  };

  // Add Passkey / Biometrics
  const handleAddPasskey = async () => {
    setPasskeyMessage(null);
    try {
      setPasskeyLoading(true);
      const res = await authClient.passkey.addPasskey({
        name: 'Device Biometrics (Passkey)',
      });
      if (res?.error) {
        throw new Error(res.error.message || 'Failed to register biometric passkey');
      }
      setPasskeyMessage({ type: 'success', text: 'Biometrics / Passkey registered successfully! You can now verify with Touch ID, Face ID, or Windows Hello.' });
      await loadSecurityProfile();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setPasskeyMessage({ type: 'error', text: 'Biometric verification cancelled.' });
      } else {
        setPasskeyMessage({ type: 'error', text: err.message || 'Biometric passkey setup could not be completed on this device.' });
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Revoke other sessions
  const handleRevokeOtherSessions = async () => {
    try {
      setRevokeSessionsLoading(true);
      const res = await authClient.revokeOtherSessions();
      if (res.error) {
        throw new Error(res.error.message || 'Failed to revoke other sessions');
      }
      await loadSessions();
    } catch (err: any) {
      console.error('Error revoking sessions', err);
    } finally {
      setRevokeSessionsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Password & Authentication
          </CardTitle>
          <CardDescription>
            {securityProfile?.hasPassword === false
              ? 'You are signed in using Google OAuth. You do not need a password to log in.'
              : 'Change your account login password. Must be at least 8 characters.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityProfile?.hasPassword === false ? (
            <div className="space-y-4 max-w-lg">
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">Google OAuth Authentication</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Your account is securely authenticated via your Google login ({session?.user?.email}). You can enable 2FA and Biometrics below without needing to set or manage a password.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              {passwordMessage && (
                <div
                  className={`p-3.5 rounded-xl flex items-center gap-2.5 text-sm font-medium ${
                    passwordMessage.type === 'success'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={passwordLoading}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="revokeOthers"
                  checked={revokeOthers}
                  onChange={(e) => setRevokeOthers(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="revokeOthers" className="text-xs text-muted-foreground cursor-pointer">
                  Sign out of all other devices and sessions upon password change
                </label>
              </div>

              <Button type="submit" loading={passwordLoading} className="mt-2">
                Update Password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Two-Factor Authentication (2FA)
              </CardTitle>
              <CardDescription>
                Add secondary verification using an authenticator app (Google Authenticator, Apple Passwords) or hardware biometrics.
              </CardDescription>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
                is2FAEnabled
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {is2FAEnabled ? '2FA Active' : 'Not Enabled'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFaMessage && (
            <div
              className={`p-3.5 rounded-xl flex items-center gap-2.5 text-sm font-medium ${
                twoFaMessage.type === 'success'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {twoFaMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{twoFaMessage.text}</span>
            </div>
          )}

          {!is2FAEnabled ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Protect your wealth, accounts, and financial data with secondary multi-factor verification.
              </p>

              {!show2FaModal ? (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      if (securityProfile?.hasPassword === false) {
                        // Google OAuth user: no password required, start TOTP setup directly
                        startTotpSetup('');
                        setShow2FaModal(true);
                      } else {
                        setShow2FaModal(true);
                      }
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <Smartphone className="h-4 w-4 text-primary" /> Set Up Authenticator App
                  </Button>
                  <Button
                    onClick={handleAddPasskey}
                    variant="outline"
                    className="gap-2"
                    loading={passkeyLoading}
                  >
                    <Fingerprint className="h-4 w-4 text-emerald-500" /> Use Device Biometrics (Passkey)
                  </Button>
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-border bg-muted/30 space-y-4 max-w-lg">
                  {!totpUri ? (
                    <form onSubmit={handleEnable2FA} className="space-y-3">
                      <p className="text-sm font-medium">Enter your account password to begin 2FA setup:</p>
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={twoFaPassword}
                        onChange={(e) => setTwoFaPassword(e.target.value)}
                        required
                        disabled={twoFaLoading}
                      />
                      <div className="flex gap-2">
                        <Button type="submit" loading={twoFaLoading}>
                          Continue
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShow2FaModal(false);
                            setTwoFaPassword('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">1. Add to Authenticator App</p>
                        <p className="text-xs text-muted-foreground">
                          Scan the TOTP code or copy the secret key into Google Authenticator or your password manager:
                        </p>
                        <div className="p-3 bg-background border border-border rounded-lg text-xs font-mono break-all flex items-center justify-between gap-2">
                          <span>{totpUri}</span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(totpUri)}
                            className="p-1 hover:text-primary transition-colors"
                            title="Copy Key"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {backupCodes.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">2. Save Backup Codes</p>
                          <div className="grid grid-cols-2 gap-1.5 p-3 bg-background border border-border rounded-lg text-xs font-mono">
                            {backupCodes.map((code, idx) => (
                              <span key={idx}>{code}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">3. Enter Verification Code</p>
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value)}
                          className="font-mono tracking-widest text-center text-lg h-11"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleVerifyTotp} loading={twoFaLoading} disabled={totpCode.length < 6}>
                          Verify & Activate
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShow2FaModal(false);
                            setTotpUri(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication is Active</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your account requires two-factor verification upon signing in.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (securityProfile?.hasPassword === false) {
                    // Google user: no password required, confirm disable directly
                    if (window.confirm('Are you sure you want to disable Two-Factor Authentication?')) {
                      handleDisable2FA('');
                    }
                  } else {
                    const pass = prompt('Enter your password to disable 2FA:');
                    if (pass) handleDisable2FA(pass);
                  }
                }}
                loading={twoFaLoading}
              >
                Disable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passkeys (Platform Biometrics) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-primary" /> Passkeys & Biometrics
              </CardTitle>
              <CardDescription>
                Log in and authenticate securely without entering passwords using Touch ID, Face ID, or Windows Hello.
              </CardDescription>
            </div>
            {securityProfile?.hasPasskeys && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 self-start sm:self-auto">
                {securityProfile.passkeysCount} {securityProfile.passkeysCount === 1 ? 'Passkey' : 'Passkeys'} Active
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {passkeyMessage && (
            <div
              className={`p-3.5 rounded-xl flex items-center gap-2.5 text-sm font-medium ${
                passkeyMessage.type === 'success'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {passkeyMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{passkeyMessage.text}</span>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Passkeys use asymmetric public-key cryptography stored securely in your device hardware enclave. They provide phishing-resistant, instant biometric login.
          </p>

          <Button onClick={handleAddPasskey} loading={passkeyLoading} variant="outline" className="gap-2">
            <Fingerprint className="h-4 w-4 text-emerald-500" /> Register This Device Biometrics
          </Button>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="h-5 w-5 text-primary" /> Active Sessions
              </CardTitle>
              <CardDescription>
                Devices and browsers currently logged into your Veltis account.
              </CardDescription>
            </div>
            {sessions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeOtherSessions}
                loading={revokeSessionsLoading}
              >
                Log Out Other Devices
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-3">
              <div className="h-14 rounded-lg bg-muted animate-pulse" />
              <div className="h-14 rounded-lg bg-muted animate-pulse" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other active sessions detected.</p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {sessions.map((s, idx) => {
                const isCurrent = s.token === session?.session?.token;
                return (
                  <div key={s.id || idx} className="p-4 flex items-center justify-between bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        <Laptop className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {s.userAgent?.slice(0, 45) || 'Web Browser'}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                              Current Device
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.ipAddress ? `IP: ${s.ipAddress} • ` : ''}
                          Created {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apple Shortcuts API Quick Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" /> Apple Shortcuts Integration
              </CardTitle>
              <CardDescription>
                Automate rapid expense logging straight from Siri or your iPhone lockscreen without opening the browser.
              </CardDescription>
            </div>
            <Link href="/shortcuts">
              <Button variant="outline" size="sm" className="gap-1.5">
                Manage Tokens <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
