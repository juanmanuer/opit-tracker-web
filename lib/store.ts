// Shared types and initial data for OPIT Tracker

export type Term = "Term 1" | "Term 2" | "Term 3" | "Term 4" | "Term 5" | "Term 6"

export type SidebarSection = "assessments" | "practices" | "grades" | "misc" | "attendance" | "courses"

export interface Assessment {
  id: string
  title: string
  course: string
  courseCode: string
  deadline: string
  weight: string
  status: "todo" | "in-progress" | "done"
}

export interface Practice {
  id: string
  title: string
  course: string
  courseCode: string
  type: "quiz" | "assignment"
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
  // ── TERM 2 ──────────────────────────────────────────────────────────────
  { id: "t2-a1", title: "Assessment 1", courseCode: "COMP-2001", course: "Foundational Mathematics",           deadline: "Feb 15", weight: "30%", status: "todo" },
  { id: "t2-a2", title: "Assessment 2", courseCode: "COMP-2001", course: "Foundational Mathematics",           deadline: "Mar 15", weight: "35%", status: "todo" },
  { id: "t2-a3", title: "Assessment 3", courseCode: "COMP-2001", course: "Foundational Mathematics",           deadline: "Apr 12", weight: "35%", status: "todo" },
  { id: "t2-b1", title: "Assessment 1", courseCode: "COMP-2005", course: "Project Management and QA",          deadline: "Mar 22", weight: "50%", status: "todo" },
  { id: "t2-b2", title: "Assessment 2", courseCode: "COMP-2005", course: "Project Management and QA",          deadline: "Apr 12", weight: "50%", status: "todo" },
  { id: "t2-c1", title: "Assessment 1", courseCode: "COMP-2002", course: "Web Development",                    deadline: "Feb 11", weight: "30%", status: "todo" },
  { id: "t2-c2", title: "Assessment 2", courseCode: "COMP-2002", course: "Web Development",                    deadline: "Mar 25", weight: "40%", status: "todo" },
  { id: "t2-c3", title: "Assessment 3", courseCode: "COMP-2002", course: "Web Development",                    deadline: "Apr 14", weight: "30%", status: "todo" },
  { id: "t2-d1", title: "Assessment 1", courseCode: "COMP-2003", course: "Introduction to Operating Systems",  deadline: "Feb 22", weight: "40%", status: "todo" },
  { id: "t2-d2", title: "Assessment 2", courseCode: "COMP-2003", course: "Introduction to Operating Systems",  deadline: "Mar 22", weight: "10%", status: "todo" },
  { id: "t2-d3", title: "Assessment 3", courseCode: "COMP-2003", course: "Introduction to Operating Systems",  deadline: "Apr 12", weight: "40%", status: "todo" },
  { id: "t2-d4", title: "Assessment 4", courseCode: "COMP-2003", course: "Introduction to Operating Systems",  deadline: "Apr 12", weight: "10%", status: "todo" },
  { id: "t2-e1", title: "Assessment 1", courseCode: "COMP-2004", course: "Data Structure and Algorithms",      deadline: "Feb 14", weight: "35%", status: "todo" },
  { id: "t2-e2", title: "Assessment 2", courseCode: "COMP-2004", course: "Data Structure and Algorithms",      deadline: "Mar 14", weight: "35%", status: "todo" },
  { id: "t2-e3", title: "Assessment 3", courseCode: "COMP-2004", course: "Data Structure and Algorithms",      deadline: "Apr 12", weight: "30%", status: "todo" },

  // ── TERM 3 ──────────────────────────────────────────────────────────────
  { id: "t3-a1", title: "Assessment 1", courseCode: "COMP-3001", course: "Intro to Artificial Intelligence",   deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t3-a2", title: "Assessment 2", courseCode: "COMP-3001", course: "Intro to Artificial Intelligence",   deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t3-b1", title: "Assessment 1", courseCode: "COMP-3002", course: "Introduction to Databases",          deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t3-b2", title: "Assessment 2", courseCode: "COMP-3002", course: "Introduction to Databases",          deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t3-c1", title: "Assessment 1", courseCode: "COMP-3003", course: "Cloud Computing Infrastructure",     deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t3-c2", title: "Assessment 2", courseCode: "COMP-3003", course: "Cloud Computing Infrastructure",     deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t3-d1", title: "Assessment 1", courseCode: "COMP-3004", course: "Business Strategy",                  deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t3-d2", title: "Assessment 2", courseCode: "COMP-3004", course: "Business Strategy",                  deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t3-e1", title: "Assessment 1", courseCode: "COMP-3005", course: "Programming Paradigms",              deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t3-e2", title: "Assessment 2", courseCode: "COMP-3005", course: "Programming Paradigms",              deadline: "TBD", weight: "TBD", status: "todo" },

  // ── TERM 4 ──────────────────────────────────────────────────────────────
  { id: "t4-a1", title: "Assessment 1", courseCode: "COMP-4001", course: "Introduction to Machine Learning",      deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t4-a2", title: "Assessment 2", courseCode: "COMP-4001", course: "Introduction to Machine Learning",      deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t4-b1", title: "Assessment 1", courseCode: "COMP-4002", course: "Introduction to Computer Security",     deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t4-b2", title: "Assessment 2", courseCode: "COMP-4002", course: "Introduction to Computer Security",     deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t4-c1", title: "Assessment 1", courseCode: "COMP-4003", course: "Introduction to Software Engineering",  deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t4-c2", title: "Assessment 2", courseCode: "COMP-4003", course: "Introduction to Software Engineering",  deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t4-d1", title: "Assessment 1", courseCode: "COMP-4004", course: "Cloud Development",                     deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t4-d2", title: "Assessment 2", courseCode: "COMP-4004", course: "Cloud Development",                     deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t4-e1", title: "Assessment 1", courseCode: "COMP-4005", course: "Digital Marketing",                     deadline: "TBD", weight: "TBD", status: "todo" },
  { id: "t4-e2", title: "Assessment 2", courseCode: "COMP-4005", course: "Digital Marketing",                     deadline: "TBD", weight: "TBD", status: "todo" },

  // ── TERM 6 ──────────────────────────────────────────────────────────────
  { id: "t6-a1", title: "Dissertation / Internship", courseCode: "COMP-6001", course: "Dissertation — Internship", deadline: "TBD", weight: "100%", status: "todo" },
]

export const initialPractices: Practice[] = [
  // ── COMP-2001 Foundational Mathematics — 12 Practice Quizzes ──────────
  { id: "p-2001-q1",  courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 1",  completed: false },
  { id: "p-2001-q2",  courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 2",  completed: false },
  { id: "p-2001-q3",  courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 3",  completed: false },
  { id: "p-2001-q4",  courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 4",  completed: false },
  { id: "p-2001-q5",  courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 5",  completed: false },
  { id: "p-2001-q6",  courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 6",  completed: false },
  { id: "p-2001-q7",  courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 7",  completed: false },
  { id: "p-2001-q8",  courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 8",  completed: false },
  { id: "p-2001-q9",  courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 9",  completed: false },
  { id: "p-2001-q10", courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 10", completed: false },
  { id: "p-2001-q11", courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 11", completed: false },
  { id: "p-2001-q12", courseCode: "COMP-2001", course: "Foundational Mathematics", type: "quiz", title: "Practice Quiz 12", completed: false },

  // ── COMP-2002 Web Development — 10 Quizzes + 10 Assignments ───────────
  { id: "p-2002-q1",  courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 1",  completed: false },
  { id: "p-2002-q2",  courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 2",  completed: false },
  { id: "p-2002-q3",  courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 3",  completed: false },
  { id: "p-2002-q4",  courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 4",  completed: false },
  { id: "p-2002-q5",  courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 5",  completed: false },
  { id: "p-2002-q6",  courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 6",  completed: false },
  { id: "p-2002-q7",  courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 7",  completed: false },
  { id: "p-2002-q8",  courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 8",  completed: false },
  { id: "p-2002-q9",  courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 9",  completed: false },
  { id: "p-2002-q10", courseCode: "COMP-2002", course: "Web Development", type: "quiz", title: "Practice Quiz 10", completed: false },
  { id: "p-2002-a1",  courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 1",  completed: false },
  { id: "p-2002-a2",  courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 2",  completed: false },
  { id: "p-2002-a3",  courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 3",  completed: false },
  { id: "p-2002-a4",  courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 4",  completed: false },
  { id: "p-2002-a5",  courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 5",  completed: false },
  { id: "p-2002-a6",  courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 6",  completed: false },
  { id: "p-2002-a7",  courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 7",  completed: false },
  { id: "p-2002-a8",  courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 8",  completed: false },
  { id: "p-2002-a9",  courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 9",  completed: false },
  { id: "p-2002-a10", courseCode: "COMP-2002", course: "Web Development", type: "assignment", title: "Practice Assignment 10", completed: false },

  // ── COMP-2003 Operating Systems — 12 Practice Quizzes ─────────────────
  { id: "p-2003-q1",  courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 1",  completed: false },
  { id: "p-2003-q2",  courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 2",  completed: false },
  { id: "p-2003-q3",  courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 3",  completed: false },
  { id: "p-2003-q4",  courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 4",  completed: false },
  { id: "p-2003-q5",  courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 5",  completed: false },
  { id: "p-2003-q6",  courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 6",  completed: false },
  { id: "p-2003-q7",  courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 7",  completed: false },
  { id: "p-2003-q8",  courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 8",  completed: false },
  { id: "p-2003-q9",  courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 9",  completed: false },
  { id: "p-2003-q10", courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 10", completed: false },
  { id: "p-2003-q11", courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 11", completed: false },
  { id: "p-2003-q12", courseCode: "COMP-2003", course: "Introduction to Operating Systems", type: "quiz", title: "Practice Quiz 12", completed: false },

  // ── COMP-2004 Data Structures & Algorithms — 4 Practice Quizzes ───────
  { id: "p-2004-q1", courseCode: "COMP-2004", course: "Data Structure and Algorithms", type: "quiz", title: "Practice Quiz 1", completed: false },
  { id: "p-2004-q2", courseCode: "COMP-2004", course: "Data Structure and Algorithms", type: "quiz", title: "Practice Quiz 2", completed: false },
  { id: "p-2004-q3", courseCode: "COMP-2004", course: "Data Structure and Algorithms", type: "quiz", title: "Practice Quiz 3", completed: false },
  { id: "p-2004-q4", courseCode: "COMP-2004", course: "Data Structure and Algorithms", type: "quiz", title: "Practice Quiz 4", completed: false },

  // ── COMP-2005 Project Management & QA — 6 Practice Assignments ────────
  { id: "p-2005-a1", courseCode: "COMP-2005", course: "Project Management and QA", type: "assignment", title: "Practice Assignment 1", completed: false },
  { id: "p-2005-a2", courseCode: "COMP-2005", course: "Project Management and QA", type: "assignment", title: "Practice Assignment 2", completed: false },
  { id: "p-2005-a3", courseCode: "COMP-2005", course: "Project Management and QA", type: "assignment", title: "Practice Assignment 3", completed: false },
  { id: "p-2005-a4", courseCode: "COMP-2005", course: "Project Management and QA", type: "assignment", title: "Practice Assignment 4", completed: false },
  { id: "p-2005-a5", courseCode: "COMP-2005", course: "Project Management and QA", type: "assignment", title: "Practice Assignment 5", completed: false },
  { id: "p-2005-a6", courseCode: "COMP-2005", course: "Project Management and QA", type: "assignment", title: "Practice Assignment 6", completed: false },
]]

export const initialGrades: Grade[] = [
  { id: "g1", course: "Mathematics",      assessment: "Linear Algebra Quiz 1",  grade: "A",  weight: "10%" },
  { id: "g2", course: "Computer Science", assessment: "Algorithms Assignment",   grade: "B+", weight: "15%" },
  { id: "g3", course: "Philosophy",       assessment: "Ethics Discussion",       grade: "A-", weight: "5%"  },
  { id: "g4", course: "Database Systems", assessment: "ER Diagram Project",      grade: "A",  weight: "20%" },
]

export const initialMiscItems: MiscItem[] = [
  { id: "m1", label: "Prof. Smith Email",   value: "smith@opit.edu",                    type: "email" },
  { id: "m2", label: "CS Lecture Zoom",     value: "https://zoom.us/j/123456789",       type: "zoom"  },
  { id: "m3", label: "Math Office Hours",   value: "https://zoom.us/j/987654321",       type: "zoom"  },
  { id: "m4", label: "Academic Advisor",    value: "advisor@opit.edu",                  type: "email" },
  { id: "m5", label: "Library Portal",      value: "https://library.opit.edu",          type: "link"  },
]

export const initialAttendance: AttendanceRecord[] = [
  { id: "at1", course: "Mathematics",      date: "2026-02-03", status: "present" },
  { id: "at2", course: "Computer Science", date: "2026-02-03", status: "present" },
  { id: "at3", course: "Philosophy",       date: "2026-02-04", status: "absent"  },
  { id: "at4", course: "Mathematics",      date: "2026-02-05", status: "present" },
  { id: "at5", course: "Database Systems", date: "2026-02-05", status: "excused" },
  { id: "at6", course: "Networking",       date: "2026-02-06", status: "present" },
]

export const initialKanbanTasks: KanbanTask[] = [
  { id: "k1", title: "Study Linear Algebra Ch.5",    course: "Mathematics",      type: "reading",    column: "todo"        },
  { id: "k2", title: "Complete DS Project Part 2",   course: "Computer Science", type: "assessment", dueDate: "Feb 20", column: "todo"        },
  { id: "k3", title: "Review SQL Joins",             course: "Database Systems", type: "practice",   column: "in-progress" },
  { id: "k4", title: "Ethics Essay Draft",           course: "Philosophy",       type: "assessment", dueDate: "Feb 28", column: "in-progress" },
  { id: "k5", title: "Probability Homework",         course: "Mathematics",      type: "practice",   column: "done"        },
  { id: "k6", title: "Network Lab Report",           course: "Networking",       type: "other",      dueDate: "Mar 1",  column: "todo"        },
]

export const initialCalendarEvents: CalendarEvent[] = [
  { id: "e1", title: "Linear Algebra Midterm", date: "2026-02-15", type: "exam",     time: "10:00" },
  { id: "e2", title: "DS Project Due",         date: "2026-02-20", type: "deadline", time: "23:59" },
  { id: "e3", title: "Ethics Essay Due",       date: "2026-02-28", type: "deadline", time: "23:59" },
  { id: "e4", title: "Math Lecture",           date: "2026-02-10", type: "class",    time: "09:00" },
  { id: "e5", title: "CS Lecture",             date: "2026-02-10", type: "class",    time: "14:00" },
  { id: "e6", title: "Advisor Meeting",        date: "2026-02-12", type: "meeting",  time: "11:00" },
  { id: "e7", title: "Stats Quiz 3",           date: "2026-03-05", type: "exam",     time: "15:00" },
  { id: "e8", title: "Philosophy Seminar",     date: "2026-02-11", type: "class",    time: "16:00" },
]

// ── Course catalogue per term ──────────────────────────────────────────────

export interface Course {
  code: string
  name: string
  color: string
}

export const TERM_COURSES: Record<Term, Course[]> = {
  "Term 1": [
    { code: "COMP-1001", name: "Technical English",        color: "#4F46E5" },
    { code: "COMP-1002", name: "Computer Networks",        color: "#059669" },
    { code: "COMP-1003", name: "Programming Principles",   color: "#DC2626" },
    { code: "COMP-1004", name: "Computer Architectures",   color: "#D97706" },
    { code: "COMP-1005", name: "ICT Fundamentals",         color: "#7C3AED" },
  ],
  "Term 2": [
    { code: "COMP-2001", name: "Foundational Mathematics",           color: "#4F46E5" },
    { code: "COMP-2002", name: "Web Development",                    color: "#059669" },
    { code: "COMP-2003", name: "Introduction to Operating Systems",  color: "#DC2626" },
    { code: "COMP-2004", name: "Data Structure and Algorithms",      color: "#D97706" },
    { code: "COMP-2005", name: "Project Management and QA",          color: "#7C3AED" },
  ],
  "Term 3": [
    { code: "COMP-3001", name: "Intro to Artificial Intelligence",   color: "#0891B2" },
    { code: "COMP-3002", name: "Introduction to Databases",          color: "#059669" },
    { code: "COMP-3003", name: "Cloud Computing Infrastructure",     color: "#6366F1" },
    { code: "COMP-3004", name: "Business Strategy",                  color: "#D97706" },
    { code: "COMP-3005", name: "Programming Paradigms",              color: "#DC2626" },
  ],
  "Term 4": [
    { code: "COMP-4001", name: "Introduction to Machine Learning",       color: "#7C3AED" },
    { code: "COMP-4002", name: "Introduction to Computer Security",      color: "#DC2626" },
    { code: "COMP-4003", name: "Introduction to Software Engineering",   color: "#059669" },
    { code: "COMP-4004", name: "Cloud Development",                      color: "#0891B2" },
    { code: "COMP-4005", name: "Digital Marketing",                      color: "#D97706" },
  ],
  "Term 5": [
    { code: "COMP-5001", name: "Cloud Computing Automation and Ops",     color: "#0891B2" },
    { code: "COMP-5002", name: "Big Data Technologies",                  color: "#7C3AED" },
    { code: "COMP-5003", name: "Cloud Architecture Paradigms",           color: "#6366F1" },
    { code: "COMP-5004", name: "Cloud Data Stacks",                      color: "#059669" },
    { code: "COMP-5005", name: "Cloud Adoption Frameworks",              color: "#0E7490" },
    { code: "COMP-5006", name: "Cloud and IoT Security",                 color: "#DC2626" },
    { code: "COMP-5007", name: "Cybersecurity",                          color: "#B91C1C" },
    { code: "COMP-5008", name: "Generative AI in Cybersecurity",         color: "#9333EA" },
    { code: "COMP-5009", name: "Cryptography & Secure Communications",   color: "#4F46E5" },
    { code: "COMP-5010", name: "Network Security & Intrusion Detection", color: "#0F766E" },
    { code: "COMP-5011", name: "Secure Software Development",            color: "#15803D" },
    { code: "COMP-5012", name: "Reinforcement Learning",                 color: "#D97706" },
    { code: "COMP-5013", name: "Machine Learning",                       color: "#CA8A04" },
    { code: "COMP-5014", name: "Complex Networks & Applications",        color: "#7C3AED" },
    { code: "COMP-5015", name: "Computer Vision",                        color: "#0891B2" },
    { code: "COMP-5016", name: "Ethics of Computer Science and AI",      color: "#059669" },
    { code: "COMP-5017", name: "Natural Language Processing",            color: "#6366F1" },
    { code: "COMP-5018", name: "Game Development",                       color: "#DC2626" },
    { code: "COMP-5019", name: "Project Methodology & V Communication",  color: "#D97706" },
    { code: "COMP-5020", name: "Digital Application for Digital Environments", color: "#0F766E" },
    { code: "COMP-5021", name: "Digital Video, VFX and Virtual Reality", color: "#9333EA" },
    { code: "COMP-5022", name: "Sensors and Devices for VAX Reality",    color: "#4F46E5" },
    { code: "COMP-5023", name: "Leadership & Business Dev for Metaverse",color: "#B45309" },
    { code: "COMP-5024", name: "Parallel and Distributed Computing",     color: "#15803D" },
    { code: "COMP-5025", name: "Front-end Programming",                  color: "#059669" },
    { code: "COMP-5026", name: "Mobile Programming",                     color: "#0891B2" },
    { code: "COMP-5027", name: "Software Engineering",                   color: "#7C3AED" },
  ],
  "Term 6": [
    { code: "COMP-6001", name: "Dissertation — Internship",              color: "#059669" },
  ],
}