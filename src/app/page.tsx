import { redirect } from "next/navigation"

export default function RootPage() {
  // Redirect the base URL to the home dashboard. 
  // If not authenticated, the requireUser guard in (app)/layout.tsx will catch it.
  // Wait, if it redirects to /home, and that requires auth, the guard throws.
  // Actually, we don't have a public landing page in this V1 demo, so we'll just redirect to /home.
  redirect("/home")
}
