import { NextResponse } from "next/server"
import { checkNewGrades } from "@/lib/grade-alerts"

// Called every hour by cron-job.org with "Authorization: Bearer <CRON_SECRET>".
// Optional ?test=1 sends a test notification to check email + phone.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const url = new URL(req.url)
    if (url.searchParams.get("test") === "1" && process.env.NTFY_TOPIC) {
      await fetch(`https://ntfy.sh/${encodeURIComponent(process.env.NTFY_TOPIC)}`, {
        method: "POST", headers: { Title: "OPIT Tracker", Tags: "white_check_mark" },
        body: "Grade alerts are connected ✓",
      })
    }
    const result = await checkNewGrades()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Grade alerts error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
