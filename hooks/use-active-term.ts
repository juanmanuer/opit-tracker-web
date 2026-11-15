"use client"

import { useEffect, useState } from "react"
import type { Term } from "@/lib/store"
import { getActiveCatalog, termNames } from "@/lib/catalog"

const STORAGE_KEY = "opit-active-term"

// Remembers the last term the user selected (saved in the browser).
// First visit, or if the saved term isn't in this person's catalogue → their current term.
export function useActiveTerm() {
  const [activeTerm, setActiveTerm] = useState<Term>(() => getActiveCatalog().defaultTerm as Term)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && termNames().includes(saved)) setActiveTerm(saved as Term)
    } catch {}
  }, [])

  const changeTerm = (term: Term) => {
    setActiveTerm(term)
    try { localStorage.setItem(STORAGE_KEY, term) } catch {}
  }

  return [activeTerm, changeTerm] as const
}
