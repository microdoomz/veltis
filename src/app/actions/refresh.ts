'use server';

import { revalidatePath } from 'next/cache';

export async function refreshAllDataAction() {
  revalidatePath('/(app)', 'layout');
  revalidatePath('/home');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/investments');
  return { success: true };
}
