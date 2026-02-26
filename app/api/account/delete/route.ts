import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase-server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    // Delete profile first (cascades to demos, demo_shares, messages, etc.)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      console.error('[account-delete] Profile delete error:', profileError)
      return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (authError) {
      console.error('[account-delete] Auth delete error:', authError)
      return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account-delete] Error:', err)
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
  }
}
