import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getTokenStatus, saveManualToken, renewToken } from "@/lib/canvas-token"

// GET  → token status (never returns the token itself)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })
  try {
    return NextResponse.json(await getTokenStatus())
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST { token } → save a pasted token · POST { action: "renew" } → renew now
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })
  try {
    const body = await req.json()
    if (body.action === "renew") {
      return NextResponse.json(await renewToken(session.user.email))
    }
    const token = String(body.token ?? "").trim()
    if (token.length < 20) return NextResponse.json({ error: "That doesn't look like a Canvas token." }, { status: 400 })
    await saveManualToken(token, session.user.email)
    return NextResponse.json(await getTokenStatus())
  } catch (error) {
    return NextResponse.json({ error: String(error).replace("Error: ", "") }, { status: 400 })
  }
}
