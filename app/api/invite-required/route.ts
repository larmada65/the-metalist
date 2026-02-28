import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** If INVITE_CODE is set in env, registration is invite-only. */
export async function GET() {
  const required = Boolean(process.env.INVITE_CODE?.trim())
  return NextResponse.json({ required })
}
