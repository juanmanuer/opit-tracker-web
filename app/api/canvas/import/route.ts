import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { syncTermFromCanvas, writeScore, ensureGradeSchema } from "@/lib/canvas-grades"
import { GRADE_WEIGHTS } from "@/lib/grades"

// GET  ?term=Term 1 → fills EMPTY boxes + official bonuses from Canvas,
//                     returns differences (conflicts) without touching them.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })
  const term = new URL(req.url).searchParams.get("term") ?? "Term 3"
  if (!GRADE_WEIGHTS[term]) return NextResponse.json({ error: `Unknown term ${term}` }, { status: 400 })
  try {
    return NextResponse.json(await syncTermFromCanvas(session.user.email, term, { applyFills: true }))
  } catch (error) {
    return NextResponse.json({ error: String(error).replace("Error: ", "") }, { status: 500 })
  }
}

// POST { term, accept: [{ courseCode, idx, score }] } → overwrite only the
// conflicts the user explicitly accepted in the review panel.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({}, { status: 401 })
  try {
    const { term, accept } = await req.json()
    if (!GRADE_WEIGHTS[term] || !Array.isArray(accept)) return NextResponse.json({ error: "Bad request" }, { status: 400 })
    await ensureGradeSchema()
    for (const a of accept) {
      const n = GRADE_WEIGHTS[term][a.courseCode]?.length ?? 0
      if (typeof a.idx !== "number" || a.idx < 0 || a.idx >= n || typeof a.score !== "number") continue
      await writeScore(session.user.email, term, a.courseCode, a.idx, Math.min(100, Math.max(0, a.score)))
    }
    return NextResponse.json({ success: true, applied: accept.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
