"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const handleAuth = async () => {
      try {
        const supabase = getSupabaseBrowserClient()

        // 1. Check if session already exists
        const { data: { session } } = await supabase.auth.getSession()
        if (session && isMounted) {
          router.replace("/")
          return
        }

        // 2. If code in query param, exchange it for session in browser (stores in localStorage)
        const params = new URLSearchParams(window.location.search)
        const code = params.get("code")

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error("Auth callback error:", error)
            if (isMounted) {
              setErrorMsg(error.message)
              setTimeout(() => router.replace("/login"), 3000)
            }
            return
          }
        }

        // 3. Fallback check for hash fragments (implicit flow)
        if (window.location.hash) {
          const { data: hashSession } = await supabase.auth.getSession()
          if (hashSession?.session && isMounted) {
            router.replace("/")
            return
          }
        }

        // Success: redirect to app
        if (isMounted) {
          router.replace("/")
        }
      } catch (err: any) {
        console.error("Callback exception:", err)
        if (isMounted) {
          setErrorMsg(err?.message || "Gagal memproses login")
          setTimeout(() => router.replace("/login"), 3000)
        }
      }
    }

    handleAuth()

    return () => {
      isMounted = false
    }
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070709] text-white">
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        {!errorMsg ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight">Menyinkronkan Akun Google...</h2>
            <p className="text-sm text-neutral-400">Sedang menghubungkan profil AURA UII Anda.</p>
          </>
        ) : (
          <>
            <div className="rounded-full bg-red-500/20 p-3 text-red-400">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-red-400">Gagal Masuk</h2>
            <p className="text-sm text-neutral-400">{errorMsg}</p>
            <p className="text-xs text-neutral-500">Mengalihkan kembali ke halaman login...</p>
          </>
        )}
      </div>
    </div>
  )
}
