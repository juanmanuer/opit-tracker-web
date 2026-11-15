import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCatalog } from "@/lib/catalog-server"
import { saveCourseInfo, INFO_FIELDS } from "@/lib/course-info"
import { parseLiveSession } from "@/lib/academic"

// POST { term, courseCode, live_sessions, office_hours, meeting_id, passcode, … }
// Saves the shared details of a course you are enrolled in (or teach).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({}, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const cat = await getCatalog(email)
  const course = cat.terms[body.term]?.courses.find(c => c.code === body.courseCode)
  if (!course?.canvasId) return NextResponse.json({ error: "You can only edit courses from your own Canvas" }, { status: 403 })
  if (body.live_sessions && !parseLiveSession(body.live_sessions)) return NextResponse.json({ error: "Live session must look like “Mondays 12:00–13:30”" }, { status: 400 })
  if (body.meeting_id && !/^[\d\s]{9,14}$/.test(body.meeting_id)) return NextResponse.json({ error: "Zoom meeting ID should be 9–11 digits" }, { status: 400 })
  if (body.professor_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.professor_email)) return NextResponse.json({ error: "Invalid professor email" }, { status: 400 })
  const fields = Object.fromEntries(INFO_FIELDS.map(k => [k, typeof body[k] === "string" ? body[k] : ""]))
  await saveCourseInfo(email, course.canvasId, fields)
  return NextResponse.json({ catalog: await getCatalog(email) })
}
