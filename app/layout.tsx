import React from "react"
import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "OPIT Tracker - Developed by Juan M. Aguilar",
  description: "Track your assessments, practices, grades, and attendance across all terms.",
  applicationName: "OPIT Tracker",
  appleWebApp: { capable: true, title: "OPIT", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E9EBF0" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0F14" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Bento design: Space Grotesk for headings and numbers, Inter for text */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}