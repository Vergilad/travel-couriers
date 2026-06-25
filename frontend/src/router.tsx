import * as React from "react"
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
} from "@tanstack/react-router"

import { Layout } from "@/components/layout/Layout"
import { AuthPage } from "@/pages/Auth"
import { LandingPage } from "@/pages/Landing"
import { ProfilePage } from "@/pages/Profile"
import { SettingsPage } from "@/pages/Settings"
import { PlaceholderPage } from "@/pages/PlaceholderPage"
import { Browse } from "@/pages/Browse"
import { CreateListing } from "@/pages/CreateListing"
import { ListingDetail } from "@/pages/ListingDetail"
import { useAuth } from "@/lib/auth"

function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0E0B08] z-50">
      <div className="w-6 h-6 rounded-full border-2 border-[#C8956A]/20 border-t-[#C8956A] animate-spin" />
    </div>
  )
}

const rootRoute = createRootRoute({ component: Layout })

function AuthGuard() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!loading && !user) {
      const path = window.location.pathname
      navigate({ to: "/auth", search: { mode: "signin", redirect: path } })
    }
  }, [loading, user, navigate])

  if (loading) return <FullPageSpinner />
  if (!user) return null
  return <Outlet />
}

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  component: AuthGuard,
})

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode as "signin" | "signup" | undefined) ?? "signin",
    redirect: (search.redirect as string | undefined) ?? undefined,
  }),
  component: AuthRouteComponent,
})

function AuthRouteComponent() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { mode, redirect } = authRoute.useSearch()

  React.useEffect(() => {
    if (!loading && user) {
      navigate({ to: (redirect ?? "/browse") as "/" })
    }
  }, [loading, user, navigate, redirect])

  if (!loading && user) return null
  return <AuthPage mode={mode} redirect={redirect} />
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
})

const browseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/browse",
  component: Browse,
})

const listingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/listings/$id",
  component: ListingDetail,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$userId",
  component: function ProfileRoute() {
    const { userId } = profileRoute.useParams()
    return <ProfilePage userId={userId} />
  },
})

const tripsNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/trips/new",
  component: () => <CreateListing kind="trip" />,
})

const requestsNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/requests/new",
  component: () => <CreateListing kind="request" />,
})

const deliveriesNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/deliveries/new",
  component: () => <CreateListing kind="delivery" />,
})

const messagesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/messages",
  component: () => <PlaceholderPage title="Messages — coming in step 9" />,
})

const messageThreadRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/messages/$threadId",
  component: () => <PlaceholderPage title="Message thread — coming in step 9" />,
})

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings",
  component: SettingsPage,
})

const reportsNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports/new",
  component: () => <PlaceholderPage title="Report — coming soon" />,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  browseRoute,
  authRoute,
  listingRoute,
  profileRoute,
  authenticatedRoute.addChildren([
    tripsNewRoute,
    requestsNewRoute,
    deliveriesNewRoute,
    messagesRoute,
    messageThreadRoute,
    settingsRoute,
    reportsNewRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
