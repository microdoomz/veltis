import { AppLayout } from "@/components/layout/app-layout"
import { getUser, requireWorkspaceAccess } from "@/lib/auth/guards"
import { CurrencyProvider } from "@/components/layout/CurrencyProvider"
import { db } from "@/lib/db"
import { workspace } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

export default async function AppRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getUser()
  if (!session) {
    redirect('/login')
  }

  let baseCurrency = 'USD'
  try {
    const authContext = await requireWorkspaceAccess()
    const ws = await db.query.workspace.findFirst({
      where: eq(workspace.id, authContext.workspaceId),
    })
    if (ws?.baseCurrency) {
      baseCurrency = ws.baseCurrency
    }
  } catch {
    // If no active workspace yet, fallback to USD
  }

  return (
    <CurrencyProvider baseCurrency={baseCurrency}>
      <AppLayout>
        {children}
      </AppLayout>
    </CurrencyProvider>
  )
}

