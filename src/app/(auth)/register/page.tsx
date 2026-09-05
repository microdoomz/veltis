import { SignupForm } from '@/components/auth/SignupForm';
import { requireUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Register — Veltis',
  description: 'Create your Veltis account to manage your personal liquid finances with mathematical certainty.',
};

export default async function RegisterPage() {
  // If the user is already authenticated, redirect to home
  let session = null;
  try {
    session = await requireUser();
  } catch {
    // Expected to throw if unauthorized
  }

  if (session) {
    redirect('/home');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <SignupForm />
    </div>
  );
}
