"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function LoginGreeting() {
  const [hasVisitedBefore, setHasVisitedBefore] = useState(false)

  useEffect(() => {
    // Cek apakah user pernah login sebelumnya (ada session di localStorage atau cookie)
    const checkPreviousVisit = () => {
      // Cek localStorage untuk flag pernah login
      const hasLoggedInBefore = localStorage.getItem("imuii_has_logged_in")
      
      // Atau cek apakah ada Supabase session di cookie
      const hasSession = document.cookie.includes("sb-")
      
      setHasVisitedBefore(!!hasLoggedInBefore || hasSession)
    }

    checkPreviousVisit()
  }, [])

  return (
    <p className={cn("text-white/90 text-sm md:text-base max-w-xl leading-relaxed")}>
      {hasVisitedBefore
        ? "Selamat datang kembali. Akses percakapan, riwayat, dan bantuan kampus dalam satu tempat."
        : "Selamat datang. Akses percakapan, riwayat, dan bantuan kampus dalam satu tempat."}
    </p>
  )
}

