import { AppLayout } from "@/components/layout/app-layout"
import { getUser } from "@/lib/auth/guards"
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

  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}
