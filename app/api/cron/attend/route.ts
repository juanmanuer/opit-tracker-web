import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAttend, ownerEmail } from "@/lib/reminders"

// "✓ Mark attended" button in the phone notification.
// The link is signed (HMAC with CRON_SECRET) and expires after 3 days.
async function handle(req: Request) {
  const u = new URL(req.url)
  const c = u.searchParams.get("c") ?? "", n = u.searchParams.get("n") ?? "", e = u.searchParams.get("e") ?? "", s = u.searchParams.get("s") ?? ""
  const lesson = parseInt(n)
  if (!/^COMP-\d{4}$/.test(c) || !(lesson >= 1 && lesson <= 13) || !verifyAttend(c, n, e, s)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })
  }
  const email = await ownerEmail()
  if (!email) return NextResponse.json({ error: "No owner" }, { status: 500 })
  // Same write as the app's attendance button
  await sql`
    INSERT INTO attendance (email, course_code, lesson_number, status)
    VALUES (${email}, ${c}, ${lesson}, 'present')
    ON CONFLICT (email, course_code, lesson_number) DO UPDATE SET status = 'present'
  `
  return req.method === "GET"
    ? new Response(`<html><body style="font-family:Arial;padding:40px;text-align:center"><h2>✓ ${c} · session ${lesson} marked as attended</h2></body></html>`, { headers: { "Content-Type": "text/html" } })
    : NextResponse.json({ success: true, courseCode: c, lesson })
}
export const GET = handle
export const POST = handle
