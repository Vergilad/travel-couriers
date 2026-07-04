import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req) => {
  const { name, supabase_uid } = await req.json()
  const data = { message: `Hello ${name}! Your user ID is ${supabase_uid}.` }

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  })
})