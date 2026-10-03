import { OnboardingForm } from '@/components/auth/OnboardingForm';
import { getUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  // If the user is NOT authenticated, redirect to login
  const session = await getUser();
  if (!session || !session.user) {
    redirect('/login');
  }

  // If we had a flag in the DB like `onboarded`, we could check it here
  // if (session.user.onboarded) redirect('/home');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <OnboardingForm />
    </div>
  );
}
