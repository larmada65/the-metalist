import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const jsonHeaders = { 'Content-Type': 'application/json' as const }
  try {
    let form: FormData
    try {
      form = await req.formData()
    } catch (parseErr: any) {
      const msg = parseErr?.message || ''
      if (msg.includes('body') && msg.includes('limit') || msg.includes('size')) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 25MB.' },
          { status: 413, headers: jsonHeaders }
        )
      }
      throw parseErr
    }
    const file = form.get('file') as File | null
    const path = form.get('path')
    const bucket = (form.get('bucket') as string) || 'band-logos'

    if (!file || typeof path !== 'string' || !path) {
      return NextResponse.json(
        { error: 'Missing file or path.' },
        { status: 400, headers: jsonHeaders }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401, headers: jsonHeaders }
      )
    }

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
      })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: jsonHeaders }
      )
    }

    return NextResponse.json({ path }, { status: 200, headers: jsonHeaders })
  } catch (e: any) {
    const message =
      typeof e?.message === 'string' ? e.message : 'Unexpected error.'
    return NextResponse.json(
      { error: message },
      { status: 500, headers: jsonHeaders }
    )
  }
}

