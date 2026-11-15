import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { fetchCanvasTermGrades } from "@/lib/canvas-grades"
import type { CanvasDates } from "@/lib/plan"

// Canvas due / unlock dates per assessment (read-only)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })
  const term = new URL(req.url).searchParams.get("term") ?? "Term 3"
  try {
    const courses = await fetchCanvasTermGrades(term)
    const out: CanvasDates = {}
    for (const c of courses) out[c.code] = c.assessments.map(a => ({ idx: a.idx, dueAt: a.dueAt ?? null, unlockAt: a.unlockAt ?? null, url: a.url ?? null }))
    return NextResponse.json(out)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
