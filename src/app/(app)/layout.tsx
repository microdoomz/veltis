import { AppLayout } from "@/components/layout/app-layout"
import { requireUser } from "@/lib/auth/guards"

export default async function AppRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Enforce authentication at the layout level
  await requireUser()

  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}
