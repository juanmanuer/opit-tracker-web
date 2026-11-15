import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUser, updateUser, resetTopic, upsertUser, alertsAvailableFor } from "@/lib/users"

// The signed-in person's own settings: role, alert channels, personal ntfy topic
export async function GET() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({}, { status: 401 })
  const u = (await getUser(email)) ?? (await upsertUser(email, session.user?.name))
  return NextResponse.json({
    email: u.email, name: u.name, role: u.role,
    emailAlerts: u.email_alerts, pushAlerts: u.push_alerts,
    ntfyTopic: u.ntfy_topic, ntfyUrl: `https://ntfy.sh/${u.ntfy_topic}`,
    builtInCourses: u.legacy_catalog, onboarded: !!u.onboarded_at,
    alertsAvailable: alertsAvailableFor(u),
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({}, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const me = await getUser(email)
  const alertsOk = !!me && alertsAvailableFor(me)
  if (body.action === "reset-topic") return NextResponse.json({ ntfyTopic: await resetTopic(email) })
  const patch: Parameters<typeof updateUser>[1] = {}
  if (alertsOk && typeof body.emailAlerts === "boolean") patch.email_alerts = body.emailAlerts
  if (alertsOk && typeof body.pushAlerts === "boolean") patch.push_alerts = body.pushAlerts
  if (["student", "teacher", "staff"].includes(body.role)) patch.role = body.role
  if (body.onboarded === true) patch.onboarded_at = new Date().toISOString()
  await updateUser(email, patch)
  return NextResponse.json({ success: true })
}
