'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient, useSession } from '@/lib/auth/client';
import QRCode from 'qrcode';
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
  Download,
  Check,
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
  passkeys?: { id: string; name: string; createdAt?: string | Date }[];
  hasTotp?: boolean;
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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState('');
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [twoFaMessage, setTwoFaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDisableModal, setConfirmDisableModal] = useState(false);

  const extractTotpSecret = (uri: string): string => {
    try {
      const parsed = new URL(uri);
      return parsed.searchParams.get('secret') || uri;
    } catch {
      const match = uri.match(/[?&]secret=([A-Za-z0-9]+)/i);
      return match ? match[1] : uri;
    }
  };

  const handleCopySecret = (secretText: string) => {
    navigator.clipboard.writeText(secretText);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    if (backupCodes.length === 0) return;
    const content = `VELTIS TWO-FACTOR AUTHENTICATION BACKUP CODES
Generated: ${new Date().toLocaleString()}
Account: ${session?.user?.email || 'Veltis User'}

IMPORTANT INSTRUCTIONS:
- Each code can only be used once to sign in.
- Store these codes securely (e.g. in your password vault or printed offline).
- Do not share these codes with anyone.

----------------------------------------
${backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}
----------------------------------------
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veltis-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        const uri = (enableRes.data as any).totpURI;
        if (uri) {
          setTotpUri(uri);
          QRCode.toDataURL(uri, { width: 220, margin: 1 })
            .then((url) => setQrDataUrl(url))
            .catch((err) => console.error('Failed to generate QR', err));
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

  // Delete individual passkey
  const handleDeletePasskey = async (passkeyId: string) => {
    if (!window.confirm('Are you sure you want to remove this biometric passkey?')) return;
    try {
      setPasskeyLoading(true);
      const res = await fetch('/api/user/security-profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkeyId }),
      });
      if (!res.ok) throw new Error('Failed to remove biometric passkey');
      setTwoFaMessage({ type: 'success', text: 'Biometric passkey removed successfully.' });
      await loadSecurityProfile();
    } catch (err: any) {
      setTwoFaMessage({ type: 'error', text: err.message || 'Failed to remove biometric passkey.' });
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Disable TOTP Authenticator app independently
  const handleDisableTotp = async () => {
    if (!window.confirm('Are you sure you want to disable your Authenticator App?')) return;
    try {
      setTwoFaLoading(true);
      const res = await fetch('/api/user/security-profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable_totp' }),
      });
      if (!res.ok) throw new Error('Failed to disable authenticator app');
      setTwoFaMessage({ type: 'success', text: 'Authenticator App disabled successfully.' });
      await loadSecurityProfile();
    } catch (err: any) {
      setTwoFaMessage({ type: 'error', text: err.message || 'Failed to disable authenticator app.' });
    } finally {
      setTwoFaLoading(false);
    }
  };

  // Generate new backup codes
  const handleGenerateBackupCodes = async () => {
    try {
      setTwoFaLoading(true);
      const res = await (authClient.twoFactor as any).generateBackupCodes({});
      if ((res as any)?.data?.backupCodes) {
        setBackupCodes((res as any).data.backupCodes);
        setTwoFaMessage({ type: 'success', text: 'New backup codes generated. Please download and store them safely.' });
      } else if (res?.error) {
        throw new Error(res.error.message || 'Failed to generate backup codes');
      }
    } catch (err: any) {
      setTwoFaMessage({ type: 'error', text: err.message || 'Failed to generate backup codes.' });
    } finally {
      setTwoFaLoading(false);
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

      {/* Unified Two-Factor Authentication (2FA) & Biometrics */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Two-Factor Authentication (2FA)
              </CardTitle>
              <CardDescription>
                Add secondary verification using an authenticator app (Google Authenticator, Apple Passwords) or hardware biometrics (Passkeys).
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              {/* Single Master Switch Toggle */}
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={is2FAEnabled}
                  disabled={twoFaLoading}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if (!securityProfile?.hasTotp && !securityProfile?.hasPasskeys) {
                        // Prompt setup if nothing is configured yet
                        if (securityProfile?.hasPassword === false) {
                          startTotpSetup('');
                          setShow2FaModal(true);
                        } else {
                          setShow2FaModal(true);
                        }
                      } else {
                        // Re-enable 2FA
                        if (securityProfile?.hasPassword === false) {
                          startTotpSetup('');
                          setShow2FaModal(true);
                        } else {
                          setShow2FaModal(true);
                        }
                      }
                    } else {
                      // Single place to disable 2FA
                      if (securityProfile?.hasPassword === false) {
                        if (window.confirm('Are you sure you want to disable Two-Factor Authentication?')) {
                          handleDisable2FA('');
                        }
                      } else {
                        const pass = prompt('Enter your password to disable 2FA:');
                        if (pass) handleDisable2FA(pass);
                      }
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-2 text-xs font-semibold text-foreground">
                  {is2FAEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Status summary banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
            is2FAEnabled
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-border bg-muted/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${is2FAEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {is2FAEnabled ? 'Two-Factor Protection is Active' : 'Two-Factor Protection is Inactive'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {is2FAEnabled
                    ? 'Your account requires two-factor verification each time you sign in.'
                    : 'Enable an authenticator app or device biometrics below to protect your wealth.'}
                </p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
              is2FAEnabled
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-muted text-muted-foreground border border-border'
            }`}>
              {is2FAEnabled ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Setup Modal / Form if user is currently configuring TOTP */}
          {show2FaModal && (
            <div className="p-5 rounded-xl border border-border bg-muted/30 space-y-4 max-w-lg animate-in fade-in duration-200">
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
                <div className="space-y-5">
                  <div className="space-y-3 text-center sm:text-left">
                    <p className="text-sm font-semibold text-foreground">1. Scan QR Code or Enter Secret Key</p>
                    <p className="text-xs text-muted-foreground">
                      Scan the code using Google Authenticator, Microsoft Authenticator, Apple Passwords, or 1Password.
                    </p>

                    {/* Live Visual QR Code */}
                    {qrDataUrl ? (
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-border/80 shadow-xs max-w-[240px] mx-auto">
                        <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48 rounded-lg object-contain" />
                        <span className="text-[10px] text-gray-500 font-mono mt-1 font-medium">Scan with Authenticator App</span>
                      </div>
                    ) : (
                      <div className="h-48 w-48 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                        Generating QR code...
                      </div>
                    )}

                    {/* Secret String with One-Click Copy */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block text-left">
                        Manual Setup Key
                      </label>
                      <div className="p-2.5 bg-background border border-border rounded-xl flex items-center justify-between gap-2 shadow-xs">
                        <code className="text-xs font-mono font-bold tracking-wider text-primary break-all select-all">
                          {extractTotpSecret(totpUri)}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopySecret(extractTotpSecret(totpUri))}
                          className="h-7 px-2.5 shrink-0 gap-1 text-xs transition-all"
                        >
                          {secretCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {backupCodes.length > 0 && (
                    <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border/80">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground">2. Save Backup Codes</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadBackupCodes}
                          className="h-7 text-xs px-2.5 gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                        >
                          <Download className="h-3 w-3" /> Download (.txt)
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 p-2 bg-background border border-border rounded-lg text-xs font-mono text-center font-medium">
                        {backupCodes.map((code, idx) => (
                          <span key={idx} className="p-1 rounded bg-muted/40">{code}</span>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Save these one-time backup codes in a safe place. You can use them to recover your account if you lose your phone.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <p className="text-sm font-semibold text-foreground">
                      {backupCodes.length > 0 ? '3.' : '2.'} Enter Verification Code
                    </p>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      className="font-mono tracking-widest text-center text-lg h-11 bg-background"
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
                        setQrDataUrl(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Available 2FA Verification Methods (Configurable Independently) */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Configured Verification Methods
            </h3>

            {/* Method 1: Authenticator App */}
            <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Authenticator App</p>
                    {securityProfile?.hasTotp ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                        Not Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Google Authenticator, Microsoft Authenticator, Apple Passwords, or 1Password.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {securityProfile?.hasTotp ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (securityProfile?.hasPassword === false) {
                          startTotpSetup('');
                          setShow2FaModal(true);
                        } else {
                          setShow2FaModal(true);
                        }
                      }}
                      disabled={twoFaLoading}
                      className="text-xs h-8"
                    >
                      Reconfigure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisableTotp}
                      loading={twoFaLoading}
                      className="text-xs h-8 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Disable
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (securityProfile?.hasPassword === false) {
                        startTotpSetup('');
                        setShow2FaModal(true);
                      } else {
                        setShow2FaModal(true);
                      }
                    }}
                    disabled={twoFaLoading}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-primary" /> Set Up App
                  </Button>
                )}
              </div>
            </div>

            {/* Method 2: Device Biometrics (Passkey) */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Device Biometrics (Passkeys)</p>
                      {securityProfile?.hasPasskeys ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> {securityProfile.passkeysCount} Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                          Not Configured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Instant hardware-backed verification using Touch ID, Face ID, or Windows Hello.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleAddPasskey}
                  loading={passkeyLoading}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8 self-start sm:self-auto shrink-0"
                >
                  <Fingerprint className="h-3.5 w-3.5 text-emerald-500" />
                  {securityProfile?.hasPasskeys ? 'Add Another Device' : 'Register Device'}
                </Button>
              </div>

              {/* Registered passkeys list with individual remove buttons */}
              {securityProfile?.passkeys && securityProfile.passkeys.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/80 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Registered Biometric Devices
                  </p>
                  <div className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden bg-muted/20">
                    {securityProfile.passkeys.map((pk) => (
                      <div key={pk.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Fingerprint className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="font-medium text-foreground">{pk.name}</span>
                          {pk.createdAt && (
                            <span className="text-muted-foreground text-[10px]">
                              &bull; Added {new Date(pk.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePasskey(pk.id)}
                          loading={passkeyLoading}
                          className="h-6 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Method 3: Backup Recovery Codes */}
            {is2FAEnabled && (
              <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Emergency Recovery Codes</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Single-use emergency codes to access your account if you lose your phone or biometrics.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateBackupCodes}
                    loading={twoFaLoading}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" /> Generate Backup Codes
                  </Button>
                </div>
              </div>
            )}
          </div>
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
