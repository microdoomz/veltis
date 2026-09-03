import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { PrivacySettings } from './privacy-settings';

export default async function PrivacyPage() {
  await requireWorkspaceAccess();
  
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Privacy & Security</h1>
      <PrivacySettings />
    </div>
  );
}
