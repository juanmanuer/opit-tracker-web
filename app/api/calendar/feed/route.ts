import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getFeedToken, createFeedToken } from "@/lib/calendar-feed"

const feedUrl = (req: Request, token: string) =>
  `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin}/api/ics/${token}`

// GET → current link (or null) · POST → create / reset the link
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })
  const token = await getFeedToken(session.user.email)
  return NextResponse.json({ url: token ? feedUrl(req, token) : null })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })
  const token = await createFeedToken(session.user.email)
  return NextResponse.json({ url: feedUrl(req, token) })
}
