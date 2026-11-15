import { NextResponse } from "next/server"
import { dailyTokenCheck } from "@/lib/canvas-token"

// Called once a day by Vercel Cron (see vercel.json).
// Vercel sends "Authorization: Bearer <CRON_SECRET>" automatically.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await dailyTokenCheck()
    console.log("Canvas token check:", result.action)
    return NextResponse.json({ action: result.action, daysLeft: result.status.daysLeft })
  } catch (error) {
    console.error("Canvas token cron error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
