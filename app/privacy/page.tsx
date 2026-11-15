import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Privacy policy · OPIT Tracker" }

const UPDATED = "15 November 2026"
const CONTACT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

// Public page (no sign-in) — linked from the login screen and Google's consent screen
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-[hsl(var(--foreground))] [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_p]:text-[hsl(var(--muted-foreground))] [&_li]:text-[hsl(var(--muted-foreground))]">
        <Link href="/login" className="text-xs text-[hsl(var(--primary))] hover:underline">← OPIT Tracker</Link>
        <h1 className="mt-4 text-2xl font-semibold">Privacy policy</h1>
        <p className="text-xs">Last updated {UPDATED}</p>

        <p>
          OPIT Tracker is an independent study dashboard built by an OPIT student for OPIT students and staff. It is not an
          official OPIT service and is not affiliated with OPIT. This page explains what it stores and why.
        </p>

        <h2>Who can use it</h2>
        <p>Only people who sign in with an OPIT Google account (any @opit.com address). We use Google Sign-In to read your name, email address and profile picture — nothing else from your Google account (no Gmail, Drive or Calendar access).</p>

        <h2>What we store</h2>
        <ul>
          <li>Your name, OPIT email, role (student, professor or staff) and alert settings.</li>
          <li>Your Canvas access token, <b>encrypted</b> (AES-256-GCM). It is used only to read your own courses, assessments, due dates and grades from Canvas, and is renewed automatically before it expires. It is never shown, exported or shared.</li>
          <li>The course list read from your Canvas (courses, assessment weights, due dates, practices).</li>
          <li>What you enter in the app: grades, live-session attendance, completed practices, assessment status, notes and calendar events.</li>
          <li>Course details shared within a course (live-session time, Zoom link and passcode, office hours, professor). These are visible only to people enrolled in that same Canvas course.</li>
        </ul>

        <h2>What we use it for</h2>
        <p>Only to run the app for you: show your progress, calculate grades and bonuses, and send the alerts you switch on (new grades, live sessions, deadlines, a weekly summary). No advertising, no tracking, no selling or sharing of data, no profiling.</p>

        <h2>Who can see your data</h2>
        <p>Nobody else using the app can see your grades, attendance, notes or settings. The app owner runs the infrastructure and could technically access the database, and does so only to keep the service working.</p>

        <h2>Where it is kept</h2>
        <p>The app is hosted on Vercel and the database on Neon (PostgreSQL). Alert emails are sent through Resend and phone notifications through ntfy.sh, using a private, random topic name per person.</p>

        <h2>Your choices</h2>
        <ul>
          <li><b>Export</b> everything stored about you: Account → Export my data.</li>
          <li><b>Delete</b> everything, including your Canvas connection: Account → Delete my data. This is immediate and permanent.</li>
          <li>Turn email or phone alerts off at any time in Account → Alerts.</li>
          <li>You can also revoke the app's Canvas token yourself in Canvas → Account → Settings, and Google access at myaccount.google.com/permissions.</li>
        </ul>

        <h2>Retention</h2>
        <p>Data is kept while you use the app and deleted when you delete your data. Inactive accounts may be removed after 12 months.</p>

        <h2>Contact</h2>
        <p>{CONTACT ? <>Questions or requests: <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</> : "Questions or requests: contact the app owner through the support email shown on the Google sign-in screen."}</p>
      </article>
    </main>
  )
}
