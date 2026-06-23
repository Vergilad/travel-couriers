---
name: Auth patterns for this project
description: Decisions around AuthProvider, signOut navigation, and TanStack Router search params for the auth page.
---

## signOut navigation
Use `window.location.href = '/'` in the AuthProvider's signOut function. Do NOT import the router into auth.tsx — it creates a circular dependency (App.tsx → AuthProvider → router → App.tsx).

**Why:** The router singleton is defined in router.tsx which is imported by App.tsx which wraps AuthProvider. Importing router back into auth.tsx creates a cycle.

## TanStack Router search params for /auth
Define `validateSearch` on the route:
```ts
validateSearch: (search) => ({
  mode: search.mode as 'signin' | 'signup' ?? 'signin',
  redirect: search.redirect as string ?? undefined,
})
```
Then in the component use `authRoute.useSearch()` to get typed params.

## Nav flash prevention
The Nav uses `!loading && (...)` to render nothing while auth state resolves, preventing flicker between signed-in and signed-out UI.
