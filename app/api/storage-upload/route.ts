import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const path = form.get('path')
    const bucket = (form.get('bucket') as string) || 'band-logos'

    if (!file || typeof path !== 'string' || !path) {
      return NextResponse.json(
        { error: 'Missing file or path.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ path })
  } catch (e: any) {
    const message =
      typeof e?.message === 'string' ? e.message : 'Unexpected error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

