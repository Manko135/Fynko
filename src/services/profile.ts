import { supabase } from '@/services/supabase'

export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  currency: string
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Sessão expirada.')
  return data.user
}

export async function getProfile(): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, currency')
    .single()
  if (error) throw error
  return data as Profile
}

/** Upload a new profile photo to the public 'avatars' bucket and save its URL. */
export async function uploadAvatar(file: File): Promise<string> {
  const user = await currentUser()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${user.id}/avatar-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = data.publicUrl
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
  if (error) throw error
  await supabase.auth.updateUser({ data: { avatar_url: url } })
  return url
}

export async function updateProfile(patch: {
  full_name?: string
  currency?: string
}): Promise<void> {
  const user = await currentUser()
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
  if (error) throw error
  // Keep the auth metadata name in sync (used by the top bar before profile loads).
  if (patch.full_name !== undefined) {
    await supabase.auth.updateUser({ data: { full_name: patch.full_name } })
  }
}

/** Change email — Supabase sends a confirmation link to the new address. */
export async function changeEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw error
}

/**
 * Change password, re-authenticating with the current one first (spec: don't
 * allow a password change just because a session is open).
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await currentUser()
  if (!user.email) throw new Error('Conta sem e-mail.')
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (reauthError) throw new Error('Senha atual incorreta.')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
