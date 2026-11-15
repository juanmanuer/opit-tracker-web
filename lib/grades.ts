// lib/grades.ts
// Single source of truth for grade weights and Canvas course IDs.
// New term? Add its weights + Canvas IDs here and everything else follows.

// Assessment weights (%) per course, in order: Ass. 1, Ass. 2, ...
export const GRADE_WEIGHTS: Record<string, Record<string, number[]>> = {
  "Term 1": {
    "COMP-1001": [20, 20, 25, 35],
    "COMP-1002": [30, 30, 30, 10],
    "COMP-1003": [40, 60],
    "COMP-1004": [20, 30, 20, 30],
    "COMP-1005": [30, 30, 30, 10],
  },
  "Term 2": {
    "COMP-2001": [30, 35, 35],
    "COMP-2002": [30, 40, 30],
    "COMP-2003": [40, 10, 40, 10],
    "COMP-2004": [35, 35, 30],
    "COMP-2005": [50, 50],
  },
  "Term 3": {
    "COMP-3001": [60, 40],
    "COMP-3002": [60, 40],
    "COMP-3003": [30, 30, 40],
    "COMP-3004": [35, 35, 30],
    "COMP-3005": [25, 25, 25, 25],
  },
}

// Canvas course IDs (number in opit.instructure.com/courses/XXX)
export const CANVAS_COURSE_IDS: Record<string, Record<string, number>> = {
  "Term 1": { "COMP-1001": 453, "COMP-1002": 446, "COMP-1003": 454, "COMP-1004": 447, "COMP-1005": 455 },
  "Term 2": { "COMP-2001": 448, "COMP-2002": 456, "COMP-2003": 449, "COMP-2004": 450, "COMP-2005": 457 },
  "Term 3": { "COMP-3001": 790, "COMP-3002": 645, "COMP-3003": 646, "COMP-3004": 647, "COMP-3005": 648 },
}

export const GRADED_TERMS = Object.keys(GRADE_WEIGHTS)

export function getGrade(score: number) {
  if (score >= 90) return { letter: "A+", color: "#3fb950" }
  if (score >= 85) return { letter: "A",  color: "#3fb950" }
  if (score >= 80) return { letter: "A-", color: "#3fb950" }
  if (score >= 75) return { letter: "B+", color: "#00bfff" }
  if (score >= 70) return { letter: "B",  color: "#00bfff" }
  if (score >= 65) return { letter: "B-", color: "#00bfff" }
  if (score >= 60) return { letter: "C+", color: "#e3b341" }
  if (score >= 55) return { letter: "C",  color: "#e3b341" }
  if (score >= 50) return { letter: "C-", color: "#e3b341" }
  return { letter: "F", color: "#f85149" }
}

// scores[i] = score of Ass. i+1 (null = not graded yet)
export function courseStats(weights: number[], scores: (number | null)[]) {
  let earned = 0, gradedWeight = 0
  weights.forEach((w, i) => {
    const s = scores[i]
    if (s !== null && s !== undefined) { earned += (s * w) / 100; gradedWeight += w }
  })
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  return {
    earned,                                   // points banked out of 100
    lost: gradedWeight - earned,              // points already lost
    gradedWeight,
    remainingWeight: totalWeight - gradedWeight,
    average: gradedWeight > 0 ? (earned / gradedWeight) * 100 : null, // current performance
  }
}
