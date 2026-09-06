'use server'

import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { createShortcutToken, revokeShortcutToken } from '@/lib/services/shortcut';
import { revalidatePath } from 'next/cache';

export async function addShortcutTokenAction(workspaceId: string, formData: FormData) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId);
  
  const name = formData.get('name') as string;
  if (!name || name.trim() === '') throw new Error('Name is required');

  const { rawToken } = await createShortcutToken({
    workspaceId: authContext.workspaceId,
    userId: authContext.session.user.id,
    name: name.trim()
  });

  revalidatePath('/shortcuts');
  revalidatePath('/settings/shortcuts');
  
  // Note: we can't easily return rawToken from server action form submission if we want to show it nicely without JS,
  // but we can return it as serializable data if called from a client component.
  return { rawToken };
}

export async function deleteShortcutTokenAction(workspaceId: string, formData: FormData) {
  const authContext = await requireStrictWorkspaceAccess(workspaceId);
  
  const tokenId = formData.get('tokenId') as string;
  if (!tokenId) throw new Error('Token ID is required');

  await revokeShortcutToken(authContext.workspaceId, tokenId);
  revalidatePath('/shortcuts');
  revalidatePath('/settings/shortcuts');
}
