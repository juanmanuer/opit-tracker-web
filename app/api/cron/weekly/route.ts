import { NextResponse } from "next/server"
import { weeklyDigestAll } from "@/lib/digest"

// Sundays 17:00 UTC (18:00 Brussels) via Vercel Cron — see vercel.json
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json(await weeklyDigestAll())
  } catch (error) {
    console.error("Weekly digest error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
