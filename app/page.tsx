"use client"

export const dynamic = "force-dynamic"

import { AppShell } from "@/components/app/app-shell"
import { CatalogGate } from "@/components/app/catalog-gate"

export default function Page() {
  return <CatalogGate><AppShell /></CatalogGate>
}
