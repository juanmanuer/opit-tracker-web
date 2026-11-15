import { NextResponse } from "next/server"
import { sessionReminders } from "@/lib/reminders"

// Called every 5 minutes by cron-job.org with "Authorization: Bearer <CRON_SECRET>"
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json(await sessionReminders())
  } catch (error) {
    console.error("Reminders error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
