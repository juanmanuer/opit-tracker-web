// Shared types and initial data for OPIT Tracker

export type Term = "Term 1" | "Term 2" | "Term 3" | "Term 4" | "Term 5" | "Term 6"

export type SidebarSection = "assessments" | "practices" | "grades" | "misc" | "attendance"

export interface Assessment {
  id: string
  title: string
  course: string
  deadline: string
  status: "todo" | "in-progress" | "done"
}

export interface Practice {
  id: string
  title: string
  course: string
  completed: boolean
}

export interface Grade {
  id: string
  course: string
  assessment: string
  grade: string
  weight: string
}

export interface MiscItem {
  id: string
  label: string
  value: string
  type: "email" | "zoom" | "link"
}

export interface AttendanceRecord {
  id: string
  course: string
  date: string
  status: "present" | "absent" | "excused"
}

export interface KanbanTask {
  id: string
  title: string
  course: string
  type: "assessment" | "practice" | "reading" | "other"
  dueDate?: string
  column: "todo" | "in-progress" | "done"
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  type: "deadline" | "class" | "exam" | "meeting"
  time?: string
}

export const TERMS: Term[] = ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5", "Term 6"]

export const initialAssessments: Assessment[] = [
  { id: "a1", title: "Linear Algebra Midterm", course: "Mathematics", deadline: "2026-02-15", status: "in-progress" },
  { id: "a2", title: "Data Structures Project", course: "Computer Science", deadline: "2026-02-20", status: "todo" },
  { id: "a3", title: "Ethics Essay", course: "Philosophy", deadline: "2026-02-28", status: "todo" },
  { id: "a4", title: "Statistics Quiz 3", course: "Mathematics", deadline: "2026-03-05", status: "done" },
]

export const initialPractices: Practice[] = [
  { id: "p1", title: "Binary Trees Worksheet", course: "Computer Science", completed: true },
  { id: "p2", title: "Matrix Operations Set 5", course: "Mathematics", completed: false },
  { id: "p3", title: "SQL Query Exercises", course: "Database Systems", completed: false },
  { id: "p4", title: "Probability Problems Ch.7", course: "Mathematics", completed: true },
  { id: "p5", title: "Network Topology Lab", course: "Networking", completed: false },
]

export const initialGrades: Grade[] = [
  { id: "g1", course: "Mathematics", assessment: "Linear Algebra Quiz 1", grade: "A", weight: "10%" },
  { id: "g2", course: "Computer Science", assessment: "Algorithms Assignment", grade: "B+", weight: "15%" },
  { id: "g3", course: "Philosophy", assessment: "Ethics Discussion", grade: "A-", weight: "5%" },
  { id: "g4", course: "Database Systems", assessment: "ER Diagram Project", grade: "A", weight: "20%" },
]

export const initialMiscItems: MiscItem[] = [
  { id: "m1", label: "Prof. Smith Email", value: "smith@opit.edu", type: "email" },
  { id: "m2", label: "CS Lecture Zoom", value: "https://zoom.us/j/123456789", type: "zoom" },
  { id: "m3", label: "Math Office Hours", value: "https://zoom.us/j/987654321", type: "zoom" },
  { id: "m4", label: "Academic Advisor", value: "advisor@opit.edu", type: "email" },
  { id: "m5", label: "Library Portal", value: "https://library.opit.edu", type: "link" },
]

export const initialAttendance: AttendanceRecord[] = [
  { id: "at1", course: "Mathematics", date: "2026-02-03", status: "present" },
  { id: "at2", course: "Computer Science", date: "2026-02-03", status: "present" },
  { id: "at3", course: "Philosophy", date: "2026-02-04", status: "absent" },
  { id: "at4", course: "Mathematics", date: "2026-02-05", status: "present" },
  { id: "at5", course: "Database Systems", date: "2026-02-05", status: "excused" },
  { id: "at6", course: "Networking", date: "2026-02-06", status: "present" },
]

export const initialKanbanTasks: KanbanTask[] = [
  { id: "k1", title: "Study Linear Algebra Ch.5", course: "Mathematics", type: "reading", column: "todo" },
  { id: "k2", title: "Complete DS Project Part 2", course: "Computer Science", type: "assessment", dueDate: "Feb 20", column: "todo" },
  { id: "k3", title: "Review SQL Joins", course: "Database Systems", type: "practice", column: "in-progress" },
  { id: "k4", title: "Ethics Essay Draft", course: "Philosophy", type: "assessment", dueDate: "Feb 28", column: "in-progress" },
  { id: "k5", title: "Probability Homework", course: "Mathematics", type: "practice", column: "done" },
  { id: "k6", title: "Network Lab Report", course: "Networking", type: "other", dueDate: "Mar 1", column: "todo" },
]

export const initialCalendarEvents: CalendarEvent[] = [
  { id: "e1", title: "Linear Algebra Midterm", date: "2026-02-15", type: "exam", time: "10:00" },
  { id: "e2", title: "DS Project Due", date: "2026-02-20", type: "deadline", time: "23:59" },
  { id: "e3", title: "Ethics Essay Due", date: "2026-02-28", type: "deadline", time: "23:59" },
  { id: "e4", title: "Math Lecture", date: "2026-02-10", type: "class", time: "09:00" },
  { id: "e5", title: "CS Lecture", date: "2026-02-10", type: "class", time: "14:00" },
  { id: "e6", title: "Advisor Meeting", date: "2026-02-12", type: "meeting", time: "11:00" },
  { id: "e7", title: "Stats Quiz 3", date: "2026-03-05", type: "exam", time: "15:00" },
  { id: "e8", title: "Philosophy Seminar", date: "2026-02-11", type: "class", time: "16:00" },
]
