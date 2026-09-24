import * as React from "react"
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
  type ErrorComponentProps,
  type NotFoundRouteProps,
} from "@tanstack/react-router"

import { Layout } from "@/components/layout/Layout"
import { AuthPage } from "@/pages/Auth"
import { LandingPage } from "@/pages/Landing"
import { ProfilePage } from "@/pages/Profile"
import { SettingsPage } from "@/pages/Settings"
import { PlaceholderPage } from "@/pages/PlaceholderPage"
import { ErrorPage } from "@/pages/ErrorPage"
import { Inbox } from "@/pages/Inbox"
import { Browse } from "@/pages/Browse"
import { MyRoutes } from "@/pages/MyRoutes"
import { CreateListing } from "@/pages/CreateListing"
import { ListingDetail } from "@/pages/ListingDetail"
import { VerificationPage } from "@/pages/Verification"
import { AdminPage } from "@/pages/Admin"
import { useAuth } from "@/lib/auth"

function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "var(--bg)" }}>
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(59,130,246,0.2)", borderTopColor: "var(--accent)" }} />
    </div>
  )
}

const routeError = (props: ErrorComponentProps) => (
  <ErrorPage error={props.error} reset={props.reset} />
)
const routeNotFound = (_props: NotFoundRouteProps) => <ErrorPage />

const rootRoute = createRootRoute({ component: Layout, notFoundComponent: routeNotFound, errorComponent: routeError })

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

const carryNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/carry/new",
  component: () => <CreateListing kind="carry" />,
})

const needNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/need/new",
  component: () => <CreateListing kind="need" />,
})

const messagesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/messages",
  component: () => <Inbox />,
})

const messageThreadRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/messages/$threadId",
  component: function MessageThreadRoute() {
    const { threadId } = messageThreadRoute.useParams()
    return <Inbox initialThreadId={threadId} />
  },
})

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings",
  component: SettingsPage,
})

const myListingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/my-listings",
  component: MyRoutes,
})

const matchesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/matches",
  component: function MatchesRedirect() {
    // Merged into My routes; the old address forwards.
    const navigate = useNavigate()
    React.useEffect(() => {
      navigate({ to: "/my-listings" })
    }, [navigate])
    return null
  },
})

const reportsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports/new",
  component: () => <PlaceholderPage title="Report — coming soon" />,
})

const verifyRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/verify",
  component: VerificationPage,
})

const adminRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin",
  component: AdminPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  browseRoute,
  authRoute,
  listingRoute,
  profileRoute,
  authenticatedRoute.addChildren([
    carryNewRoute,
    needNewRoute,
    messagesRoute,
    messageThreadRoute,
    settingsRoute,
    myListingsRoute,
    matchesRoute,
    reportsNewRoute,
    verifyRoute,
    adminRoute,
  ]),
])

export const router = createRouter({ routeTree, defaultNotFoundComponent: routeNotFound, defaultErrorComponent: routeError })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
