import React from "react"
import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "OPIT Tracker - Developed by Juan M. Aguilar",
  description: "Track your assessments, practices, grades, and attendance across all terms.",
}

export const viewport: Viewport = {
  themeColor: "#0a0b10",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}