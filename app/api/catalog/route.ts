import { NextResponse, after } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCatalog, discoverCatalog, getDiscoveryReport, saveWeightOverride, compareWithBuiltIn } from "@/lib/catalog-server"
import { getCanvasToken } from "@/lib/canvas-token"
import { getUser } from "@/lib/users"

// GET              → the signed-in person's catalogue (re-discovered from Canvas once a day)
// GET ?report=1    → what discovery found per course (weights + where they came from)
// GET ?compare=1   → discovery vs hand-entered weights (original owner only; writes nothing new)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({}, { status: 401 })
  const q = new URL(req.url).searchParams
  try {
    if (q.get("report") === "1") return NextResponse.json({ report: await getDiscoveryReport(email) })
    if (q.get("compare") === "1") {
      const { catalog, report } = await discoverCatalog(email)
      return NextResponse.json({ ...compareWithBuiltIn(catalog), report })
    }
    const [user, token] = await Promise.all([getUser(email), getCanvasToken(email)])
    let catalog = await getCatalog(email)
    if (token) {
      const age = catalog.discoveredAt ? Date.now() - new Date(catalog.discoveredAt).getTime() : Infinity
      if (Object.keys(catalog.terms).length === 0) {
        // First visit with Canvas connected: discover now
        await discoverCatalog(email).catch(err => console.error("Discovery:", err))
        catalog = await getCatalog(email)
      } else if (age > 24 * 3_600_000) {
        // Refresh quietly after the response; the next visit gets the new data
        after(() => discoverCatalog(email).then(() => undefined).catch(err => console.error("Discovery:", err)))
      }
    }
    return NextResponse.json({ catalog, canvasConnected: !!token, role: user?.role ?? "student", onboarded: !!user?.onboarded_at })
  } catch (error) {
    return NextResponse.json({ error: String(error).replace("Error: ", "") }, { status: 500 })
  }
}

// POST { action: "refresh" }                          → discover again now
// POST { action: "weights", term, courseCode, weights } → save your own weights (null = back to automatic)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return NextResponse.json({}, { status: 401 })
  const body = await req.json().catch(() => ({}))
  try {
    if (body.action === "refresh") {
      const { report } = await discoverCatalog(email)
      return NextResponse.json({ catalog: await getCatalog(email), report })
    }
    if (body.action === "weights") {
      const { term, courseCode, weights } = body
      if (typeof term !== "string" || typeof courseCode !== "string") return NextResponse.json({ error: "Bad request" }, { status: 400 })
      if (weights !== null) {
        const ok = Array.isArray(weights) && weights.length > 0 && weights.length <= 12 &&
          weights.every((w: unknown) => typeof w === "number" && w >= 0 && w <= 100) &&
          Math.abs(weights.reduce((a: number, b: number) => a + b, 0) - 100) <= 1
        if (!ok) return NextResponse.json({ error: "Weights must be numbers that add up to 100" }, { status: 400 })
        const cat = await getCatalog(email)
        if (!cat.terms[term]?.courses.some(c => c.code === courseCode)) return NextResponse.json({ error: "Unknown course" }, { status: 400 })
      }
      await saveWeightOverride(email, term, courseCode, weights)
      return NextResponse.json({ catalog: await getCatalog(email) })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error).replace("Error: ", "") }, { status: 500 })
  }
}
