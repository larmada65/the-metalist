import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Validate invite code. If INVITE_CODE is not set, any code is accepted (open signup). */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    const expected = process.env.INVITE_CODE?.trim()

    if (!expected) {
      return NextResponse.json({ valid: true })
    }

    const valid = code === expected
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
