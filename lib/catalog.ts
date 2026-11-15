// lib/catalog.ts
// The course catalogue: terms → courses, assessment weights, deadlines,
// practices, professors and live sessions.
//
// Two sources:
//  • built-in  — the hand-entered data in lib/store.ts + lib/grades.ts (the original owner's intake)
//  • canvas    — discovered from each person's own Canvas (any intake, any programme)
//
// Browser: the app loads the signed-in person's catalogue once and calls
// setActiveCatalog(); every helper then uses it by default.
// Server: always pass the person's catalogue explicitly (see lib/catalog-server.ts).
import {
  TERM_COURSES, TERM_PROFESSORS, initialAssessments, initialPractices, DEFAULT_TERM,
  type Course, type Professor, type Assessment, type Practice,
} from "@/lib/store"
import { GRADE_WEIGHTS, CANVAS_COURSE_IDS } from "@/lib/grades"

export type CatalogCourse = Course & { canvasId?: number | null }
export type CatalogAssessment = Assessment & { dueAt?: string | null; unlockAt?: string | null; url?: string | null }
export type WeightSource = "built-in" | "canvas-groups" | "description" | "syllabus" | "points" | "estimated" | "you"

export type CatalogTerm = {
  start: string | null                       // Monday of week 1 (yyyy-mm-dd) — week numbers + year inference
  courses: CatalogCourse[]
  weights: Record<string, number[]>          // course → % per assessment (Ass. 1, Ass. 2 …)
  weightSource: Record<string, WeightSource>
  assessments: CatalogAssessment[]
  practices: Practice[]
  professors: Professor[]
}

export type Catalog = {
  source: "built-in" | "canvas" | "mixed"
  defaultTerm: string
  terms: Record<string, CatalogTerm>
  discoveredAt?: string | null
  role?: "student" | "teacher" | null       // what Canvas enrolments say
}

// ── Built-in catalogue ──────────────────────────────────────────────────
const BUILTIN_START: Record<string, string> = {
  "Term 1": "2025-09-15",
  "Term 2": "2026-01-12",
  "Term 3": "2026-09-21",
}

function buildBuiltIn(): Catalog {
  const terms: Record<string, CatalogTerm> = {}
  for (const [term, courses] of Object.entries(TERM_COURSES)) {
    const codes = new Set(courses.map(c => c.code))
    const weights = GRADE_WEIGHTS[term] ?? {}
    terms[term] = {
      start: BUILTIN_START[term] ?? null,
      courses: courses.map(c => ({ ...c, canvasId: CANVAS_COURSE_IDS[term]?.[c.code] ?? null })),
      weights,
      weightSource: Object.fromEntries(Object.keys(weights).map(c => [c, "built-in" as const])),
      assessments: initialAssessments.filter(a => codes.has(a.courseCode)),
      practices: initialPractices.filter(p => codes.has(p.courseCode)),
      professors: TERM_PROFESSORS[term] ?? [],
    }
  }
  return { source: "built-in", defaultTerm: DEFAULT_TERM, terms }
}

export const BUILT_IN: Catalog = buildBuiltIn()
export const EMPTY_CATALOG: Catalog = { source: "canvas", defaultTerm: "", terms: {} }

// ── Active catalogue (browser) ──────────────────────────────────────────
let active: Catalog = BUILT_IN
export const setActiveCatalog = (c: Catalog) => { active = c }
export const getActiveCatalog = () => active

// ── Lookups ─────────────────────────────────────────────────────────────
const emptyTerm: CatalogTerm = { start: null, courses: [], weights: {}, weightSource: {}, assessments: [], practices: [], professors: [] }

export const termData = (term: string, cat: Catalog = active): CatalogTerm => cat.terms[term] ?? emptyTerm
export const termNames = (cat: Catalog = active) => Object.keys(cat.terms)
export const gradedTerms = (cat: Catalog = active) =>
  Object.entries(cat.terms).filter(([, t]) => Object.keys(t.weights).length > 0).map(([n]) => n)
export const weightsOf = (term: string, code: string, cat: Catalog = active) => termData(term, cat).weights[code] ?? []
export const termStart = (term: string, cat: Catalog = active) => termData(term, cat).start

// Practices/assessments are looked up by course code across all terms
const allTerms = (cat: Catalog) => Object.values(cat.terms)
export const allPractices = (cat: Catalog = active) => allTerms(cat).flatMap(t => t.practices)
export const allAssessments = (cat: Catalog = active) => allTerms(cat).flatMap(t => t.assessments)

// ── Merge for the original owner ────────────────────────────────────────
// Terms with hand-entered weights stay exactly as they were (so every saved
// grade/attendance/practice keeps matching). New terms come from Canvas.
export function mergeBuiltIn(discovered: Catalog | null): Catalog {
  if (!discovered || Object.keys(discovered.terms).length === 0) return BUILT_IN
  const terms: Record<string, CatalogTerm> = {}
  const names = new Set([...Object.keys(BUILT_IN.terms), ...Object.keys(discovered.terms)])
  for (const n of names) {
    const b = BUILT_IN.terms[n], d = discovered.terms[n]
    const builtInComplete = b && Object.keys(b.weights).length > 0
    terms[n] = builtInComplete || !d ? b : d
  }
  // Keep term order Term 1, Term 2 …, then anything else
  const ordered = Object.fromEntries(Object.entries(terms).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })))
  const discoveredDefault = discovered.defaultTerm && ordered[discovered.defaultTerm] ? discovered.defaultTerm : null
  return { source: "mixed", defaultTerm: discoveredDefault ?? BUILT_IN.defaultTerm, terms: ordered, discoveredAt: discovered.discoveredAt, role: discovered.role }
}

// Apply the person's own weight corrections on top of any catalogue
export function applyWeightOverrides(cat: Catalog, overrides: { term: string; course_code: string; weights: number[] }[]): Catalog {
  if (overrides.length === 0) return cat
  const terms = { ...cat.terms }
  for (const o of overrides) {
    const t = terms[o.term]
    if (!t || !t.courses.some(c => c.code === o.course_code)) continue
    const assessments = t.assessments.map(a => {
      if (a.courseCode !== o.course_code) return a
      const idx = t.assessments.filter(x => x.courseCode === o.course_code).indexOf(a)
      return o.weights[idx] != null ? { ...a, weight: `${o.weights[idx]}%` } : a
    })
    terms[o.term] = {
      ...t,
      weights: { ...t.weights, [o.course_code]: o.weights },
      weightSource: { ...t.weightSource, [o.course_code]: "you" },
      assessments,
    }
  }
  return { ...cat, terms }
}
