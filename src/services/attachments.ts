import { supabase } from '@/services/supabase'

export type Attachment = {
  id: string
  user_id: string
  expense_id: string | null
  income_id: string | null
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  expired: boolean
  created_at: string
}

export type AttachTarget = { expenseId?: string; incomeId?: string }

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user.id
}

export async function listAttachments(target: AttachTarget): Promise<Attachment[]> {
  let q = supabase.from('attachments').select('*').order('created_at', { ascending: false })
  q = target.expenseId ? q.eq('expense_id', target.expenseId) : q.eq('income_id', target.incomeId!)
  const { data, error } = await q
  if (error) throw error
  return data as Attachment[]
}

export async function uploadAttachment(file: File, target: AttachTarget): Promise<Attachment> {
  const user_id = await currentUserId()
  const path = `${user_id}/${crypto.randomUUID()}-${file.name}`
  const { error: upErr } = await supabase.storage
    .from('attachments')
    .upload(path, file, { contentType: file.type })
  if (upErr) throw upErr
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      user_id,
      expense_id: target.expenseId ?? null,
      income_id: target.incomeId ?? null,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select()
    .single()
  if (error) throw error
  return data as Attachment
}

/** Signed URL to view/download a private attachment (valid 60s). */
export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('attachments').createSignedUrl(path, 60)
  if (error) throw error
  return data.signedUrl
}

export async function deleteAttachment(att: Attachment): Promise<void> {
  if (!att.expired) {
    await supabase.storage.from('attachments').remove([att.storage_path])
  }
  const { error } = await supabase.from('attachments').delete().eq('id', att.id)
  if (error) throw error
}
