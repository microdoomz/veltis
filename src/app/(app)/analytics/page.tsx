import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { workspace } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function AnalyticsPage() {
  const authContext = await requireWorkspaceAccess();
  
  const workspaceRecord = await db.query.workspace.findFirst({
    where: eq(workspace.id, authContext.workspaceId)
  });

  return (
    <AnalyticsDashboard 
      workspaceId={authContext.workspaceId} 
      baseCurrency={workspaceRecord?.baseCurrency || 'USD'} 
    />
  );
}
