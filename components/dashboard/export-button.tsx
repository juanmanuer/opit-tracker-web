"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { initialAssessments, initialPractices, TERM_COURSES, type Term } from "@/lib/store"

interface Props {
  activeTerm: Term
}

const WEIGHT_MAP: Record<string, number[]> = {
  "COMP-2001": [30, 35, 35],
  "COMP-2002": [30, 40, 30],
  "COMP-2003": [40, 10, 40, 10],
  "COMP-2004": [35, 35, 30],
  "COMP-2005": [50, 50],
}

function getGradeLetter(score: number): string {
  if (score >= 90) return "A+"
  if (score >= 85) return "A"
  if (score >= 80) return "A-"
  if (score >= 75) return "B+"
  if (score >= 70) return "B"
  if (score >= 65) return "B-"
  if (score >= 60) return "C+"
  if (score >= 55) return "C"
  if (score >= 50) return "C-"
  return "F"
}

function getGradeColor(score: number): string {
  if (score >= 80) return "#3fb950"
  if (score >= 65) return "#00bfff"
  if (score >= 50) return "#e3b341"
  return "#f85149"
}

export function ExportButton({ activeTerm }: Props) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/export?term=${encodeURIComponent(activeTerm)}`)
      const data = await res.json()

      const courses = TERM_COURSES[activeTerm]
      const termAssessments = initialAssessments.filter(a =>
        courses.some(c => c.code === a.courseCode)
      )
      const termPractices = initialPractices.filter(p =>
        courses.some(c => c.code === p.courseCode)
      )

      // Compute stats
      const statusMap: Record<string, string> = {}
      data.assessments.forEach((a: any) => { statusMap[a.assessmentId] = a.status })

      const practiceMap: Record<string, boolean> = {}
      data.practices.forEach((p: any) => { practiceMap[p.practiceId] = p.completed })

      const attendanceMap: Record<string, Record<number, string>> = {}
      data.attendance.forEach((a: any) => {
        if (!attendanceMap[a.courseCode]) attendanceMap[a.courseCode] = {}
        attendanceMap[a.courseCode][a.lessonNumber] = a.status
      })

      const gradesMap: Record<string, Record<number, number>> = {}
      data.grades.forEach((g: any) => {
        if (!gradesMap[g.courseCode]) gradesMap[g.courseCode] = {}
        gradesMap[g.courseCode][g.assessmentIndex] = Number(g.score)
      })

      const doneAssessments = termAssessments.filter(a => statusMap[a.id] === "done").length
      const donePractices = termPractices.filter(p => practiceMap[p.id]).length
      const totalLessons = courses.length * 13
      const presentLessons = courses.reduce((sum, c) => {
        const att = attendanceMap[c.code] ?? {}
        return sum + Object.values(att).filter(s => s === "present").length
      }, 0)

      // Course scores
      const courseScores = courses.map(course => {
        const cGrades = gradesMap[course.code] ?? {}
        const weights = WEIGHT_MAP[course.code] ?? []
        if (Object.keys(cGrades).length === 0) return null
        return Object.entries(cGrades).reduce((sum, [idx, score]) => {
          return sum + (score * (weights[Number(idx)] ?? 0)) / 100
        }, 0)
      })
      const validScores = courseScores.filter(s => s !== null) as number[]
      const termAvg = validScores.length > 0
        ? validScores.reduce((s, v) => s + v, 0) / validScores.length
        : null

      // Build HTML
      const exportDate = new Date().toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric"
      })

      const courseRows = courses.map((course, i) => {
        const score = courseScores[i]
        const cAssessments = termAssessments.filter(a => a.courseCode === course.code)
        const doneCourse = cAssessments.filter(a => statusMap[a.id] === "done").length
        const cPractices = termPractices.filter(p => p.courseCode === course.code)
        const donePCourse = cPractices.filter(p => practiceMap[p.id]).length
        const att = attendanceMap[course.code] ?? {}
        const present = Object.values(att).filter(s => s === "present").length

        return `
          <tr>
            <td><span style="color:${course.color};font-weight:700">${course.code}</span><br><small>${course.name}</small></td>
            <td style="text-align:center">${doneCourse}/${cAssessments.length}</td>
            <td style="text-align:center">${donePCourse}/${cPractices.length}</td>
            <td style="text-align:center">${present}/13</td>
            <td style="text-align:center;font-weight:700;color:${score !== null ? getGradeColor(score) : "#6B7280"}">
              ${score !== null ? `${score.toFixed(1)} (${getGradeLetter(score)})` : "—"}
            </td>
          </tr>
        `
      }).join("")

      const assessmentRows = courses.map(course => {
        const cAssessments = termAssessments.filter(a => a.courseCode === course.code)
        return cAssessments.map((a, idx) => {
          const status = statusMap[a.id] ?? "todo"
          const gradeScore = gradesMap[course.code]?.[idx]
          const statusLabel = status === "done" ? "✓ Done" : status === "in-progress" ? "⟳ In Progress" : "○ To Do"
          const statusColor = status === "done" ? "#3fb950" : status === "in-progress" ? "#00bfff" : "#6B7280"
          return `
            <tr>
              <td><span style="color:${course.color};font-weight:600">${course.code}</span></td>
              <td>${a.title}</td>
              <td style="text-align:center">${a.weight}</td>
              <td style="text-align:center">${a.deadline}</td>
              <td style="text-align:center;color:${statusColor};font-weight:600">${statusLabel}</td>
              <td style="text-align:center;font-weight:700;color:${gradeScore !== undefined ? getGradeColor(gradeScore) : "#6B7280"}">
                ${gradeScore !== undefined ? `${gradeScore}` : "—"}
              </td>
            </tr>
          `
        }).join("")
      }).join("")

      const notesHTML = data.notes.length > 0
        ? data.notes.map((n: any) => `
            <div style="border-left:3px solid #00bfff;padding:8px 12px;margin-bottom:8px;background:#f8f9fa">
              <p style="margin:0;font-size:13px">${n.content}</p>
              <p style="margin:4px 0 0;font-size:10px;color:#8b949e">${new Date(n.createdAt).toLocaleDateString("en-GB")}</p>
            </div>
          `).join("")
        : "<p style='color:#8b949e;font-size:13px'>No notes for this term.</p>"

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>OPIT Tracker — ${activeTerm} Report</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; font-size: 13px; }
            h1 { font-size: 24px; font-weight: 800; color: #1a1a2e; }
            h2 { font-size: 15px; font-weight: 700; color: #1a1a2e; margin: 28px 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
            .header-left h1 span { color: #00bfff; }
            .header-meta { font-size: 11px; color: #6b7280; margin-top: 4px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
            .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
            .kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
            .kpi-value { font-size: 22px; font-weight: 800; margin-top: 4px; }
            .kpi-sub { font-size: 10px; color: #6b7280; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
            td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
            tr:last-child td { border-bottom: none; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
            @media print {
              body { padding: 20px; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>

          <div class="header">
            <div class="header-left">
              <h1>OPIT <span>Tracker</span> — ${activeTerm} Report</h1>
              <p class="header-meta">${data.user.name} · ${data.user.email}</p>
              <p class="header-meta">BSc Modern Computer Science · OPIT</p>
            </div>
            <div style="text-align:right">
              <p style="font-size:11px;color:#6b7280">Generated on</p>
              <p style="font-size:13px;font-weight:600">${exportDate}</p>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="kpis">
            <div class="kpi" style="border-left:3px solid #4F46E5">
              <div class="kpi-label">Assessments</div>
              <div class="kpi-value" style="color:#4F46E5">${doneAssessments}/${termAssessments.length}</div>
              <div class="kpi-sub">${Math.round((doneAssessments / termAssessments.length) * 100)}% complete</div>
            </div>
            <div class="kpi" style="border-left:3px solid #059669">
              <div class="kpi-label">Practices</div>
              <div class="kpi-value" style="color:#059669">${donePractices}/${termPractices.length}</div>
              <div class="kpi-sub">${Math.round((donePractices / termPractices.length) * 100)}% complete</div>
            </div>
            <div class="kpi" style="border-left:3px solid #D97706">
              <div class="kpi-label">Attendance</div>
              <div class="kpi-value" style="color:#D97706">${presentLessons}/${totalLessons}</div>
              <div class="kpi-sub">${Math.round((presentLessons / totalLessons) * 100)}% present</div>
            </div>
            <div class="kpi" style="border-left:3px solid ${termAvg !== null ? getGradeColor(termAvg) : "#6B7280"}">
              <div class="kpi-label">Term Average</div>
              <div class="kpi-value" style="color:${termAvg !== null ? getGradeColor(termAvg) : "#6B7280"}">
                ${termAvg !== null ? `${termAvg.toFixed(1)}` : "—"}
              </div>
              <div class="kpi-sub">${termAvg !== null ? getGradeLetter(termAvg) : "No grades yet"}</div>
            </div>
          </div>

          <!-- Course Summary -->
          <h2>Course Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th style="text-align:center">Assessments</th>
                <th style="text-align:center">Practices</th>
                <th style="text-align:center">Attendance</th>
                <th style="text-align:center">Grade</th>
              </tr>
            </thead>
            <tbody>${courseRows}</tbody>
          </table>

          <!-- Assessment Detail -->
          <h2>Assessment Detail</h2>
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Assessment</th>
                <th style="text-align:center">Weight</th>
                <th style="text-align:center">Deadline</th>
                <th style="text-align:center">Status</th>
                <th style="text-align:center">Score</th>
              </tr>
            </thead>
            <tbody>${assessmentRows}</tbody>
          </table>

          <!-- Notes -->
          <h2>My Notes · ${activeTerm}</h2>
          ${notesHTML}

          <div class="footer">
            <span>OPIT Tracker — Academic Dashboard</span>
            <span>Exported ${exportDate}</span>
          </div>

          <script>window.onload = () => window.print()</script>
        </body>
        </html>
      `

      const win = window.open("", "_blank")
      if (win) {
        win.document.write(html)
        win.document.close()
      }
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors disabled:opacity-50"
      aria-label="Export to PDF"
      title="Export term report to PDF"
    >
      <Download className="h-4 w-4" />
    </button>
  )
}