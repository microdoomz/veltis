import { LoginForm } from '@/components/auth/LoginForm';
import { requireUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  if (resolvedParams?.mode === 'register') {
    redirect('/register');
  }

  // If the user is already authenticated, don't let them stay on the login page
  let session = null;
  try {
    session = await requireUser();
  } catch {
    // Expected to throw if unauthorized, which is fine for the login page
  }

  if (session) {
    redirect('/home');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <LoginForm />
    </div>
  );
}
