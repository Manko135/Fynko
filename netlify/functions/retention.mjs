import { createClient } from '@supabase/supabase-js'

// Runs daily on Netlify. Deletes attachment FILES older than 90 days from
// Storage and marks the row `expired` (the financial record is kept).
//
// Required Netlify env vars (Site settings → Environment variables):
//   SUPABASE_URL           = https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE  = the service_role key (server-only; NEVER in the
//                            frontend). Rotate the key that was shared in chat
//                            before using it here.
//
// Netlify free tier note: Scheduled Functions are included, but invocation and
// runtime limits change over time — confirm the current free-tier limits in
// the Netlify docs before relying on this in production.

export const config = { schedule: '@daily' }

export default async () => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) {
    return new Response('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE', { status: 500 })
  }
  const sb = createClient(url, key)
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: expired, error } = await sb
    .from('attachments')
    .select('id, storage_path')
    .eq('expired', false)
    .lt('created_at', cutoff)
  if (error) return new Response(error.message, { status: 500 })

  for (const a of expired ?? []) {
    await sb.storage.from('attachments').remove([a.storage_path])
    await sb.from('attachments').update({ expired: true }).eq('id', a.id)
  }
  return new Response(`Retention: expired ${expired?.length ?? 0} attachment(s).`)
}
