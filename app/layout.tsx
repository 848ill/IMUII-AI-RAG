import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "AURA UII — Intelligent Academic Ops Platform",
  description: "Asisten virtual akademik resmi Universitas Islam Indonesia berbasis RAG",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={cn("dark", plusJakartaSans.variable)}>
      <body className={cn("font-sans antialiased min-h-screen bg-[#070709] text-[#F3F4F6] selection:bg-[#00F5A0]/20 selection:text-[#00F5A0]")}>
        {children}
      </body>
    </html>
  )
}

