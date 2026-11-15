"use client"

import { useEffect, useState } from "react"
import { TERMS, DEFAULT_TERM, type Term } from "@/lib/store"

const STORAGE_KEY = "opit-active-term"

// Remembers the last term the user selected (saved in the browser).
// First visit, or if nothing valid is saved -> DEFAULT_TERM.
export function useActiveTerm() {
  const [activeTerm, setActiveTerm] = useState<Term>(DEFAULT_TERM)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Term | null
      if (saved && TERMS.includes(saved)) setActiveTerm(saved)
    } catch {}
  }, [])

  const changeTerm = (term: Term) => {
    setActiveTerm(term)
    try { localStorage.setItem(STORAGE_KEY, term) } catch {}
  }

  return [activeTerm, changeTerm] as const
}