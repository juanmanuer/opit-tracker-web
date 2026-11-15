import { NextResponse } from "next/server"
import { checkAllUsers } from "@/lib/grade-alerts"

// Called every hour by cron-job.org with "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await checkAllUsers()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Grade alerts error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
