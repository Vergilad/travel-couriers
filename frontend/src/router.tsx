import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"

import { Layout } from "@/components/layout/Layout"
import { LandingPage } from "@/pages/Landing"
import { PlaceholderPage } from "@/pages/PlaceholderPage"

const rootRoute = createRootRoute({
  component: Layout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
})

const browseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/browse",
  component: () => <PlaceholderPage title="Browse — coming in step 8" />,
})

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: () => <PlaceholderPage title="Auth — coming in step 6" />,
})

const tripsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trips/new",
  component: () => <PlaceholderPage title="Post a trip — coming in step 8" />,
})

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/messages",
  component: () => <PlaceholderPage title="Messages — coming in step 9" />,
})

const listingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/listings/$id",
  component: () => <PlaceholderPage title="Listing detail — coming in step 8" />,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile/$userId",
  component: () => <PlaceholderPage title="Profile — coming in step 7" />,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  browseRoute,
  authRoute,
  tripsNewRoute,
  messagesRoute,
  listingRoute,
  profileRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
