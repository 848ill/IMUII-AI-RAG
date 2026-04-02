import type { Metadata } from "next"
import "./globals.css"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "IMUII - Asisten Virtual UII",
  description: "Asisten virtual resmi Universitas Islam Indonesia",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={cn("font-sans antialiased")}>
        {children}
      </body>
    </html>
  )
}

