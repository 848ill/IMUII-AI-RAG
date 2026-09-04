"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { ArrowRight, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"

export function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Handle Google OAuth Sign Up
  const handleGoogleSignup = async () => {
    setError(null)
    setIsGoogleLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const redirectTo = `${origin}/auth/callback`

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (oauthError) {
        setError(oauthError.message || "Gagal menghubungkan ke Google.")
        setIsGoogleLoading(false)
      }
    } catch (err: any) {
      console.error("Google Auth error:", err)
      setError("Koneksi gagal. Cek koneksi Supabase Anda.")
      setIsGoogleLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    const trimmedConfirm = confirmPassword.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError("Email dan kata sandi wajib diisi.")
      return
    }

    if (trimmedPassword.length < 8) {
      setError("Kata sandi minimal 8 karakter.")
      return
    }

    if (trimmedPassword !== trimmedConfirm) {
      setError("Konfirmasi kata sandi tidak cocok.")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: signupError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      })

      if (signupError) {
        if (signupError.message.includes("fetch") || signupError.message.includes("521")) {
          setError("Server database Supabase sedang berstatus 'Coming up...'. Harap restore di dashboard.")
        } else {
          setError(signupError.message || "Pendaftaran gagal. Coba lagi.")
        }
        setIsSubmitting(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setSuccess("Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi sebelum masuk.")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        localStorage.setItem("imuii_has_logged_in", "true")
        setSuccess("Akun berhasil dibuat! Mengarahkan ke antarmuka...")
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 700)
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      setError("Terjadi kesalahan jaringan.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative rounded-3xl bg-[#0F1015]/70 border border-white/[0.09] p-8 md:p-10 shadow-[0_20px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-300 hover:border-white/[0.14]">
        
        <div className="pointer-events-none absolute -top-20 -left-20 h-44 w-44 rounded-full bg-[#00F5A0]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-[#00D2FF]/10 blur-3xl" />

        <div className="space-y-2 mb-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide uppercase bg-white/[0.04] text-white/70 border border-white/[0.08]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00D2FF]" />
            REGISTRATION PORTAL
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white pt-2">
            Buat Akun Baru
          </h2>
          <p className="text-sm text-white/50 leading-relaxed">
            Daftar untuk mengakses asisten virtual dan knowledge base akademik Anda.
          </p>
        </div>

        {/* Google Quick Signup */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isGoogleLoading || isSubmitting}
          className="group relative w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm font-semibold border border-white/[0.12] hover:border-white/25 shadow-lg transition-all duration-200 active:scale-[0.99] disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#00D2FF]" />
              <span>Menghubungkan...</span>
            </div>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Daftar dengan Google / Gmail</span>
            </>
          )}
        </button>

        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-white/[0.08]" />
          <span className="absolute bg-[#0F1015] px-3 text-[11px] font-mono uppercase tracking-widest text-white/35">
            atau gunakan email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-white/60">
              Alamat Email
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="nama@uii.ac.id"
              value={email}
              disabled={isSubmitting}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.1] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D2FF]/60 focus:ring-1 focus:ring-[#00D2FF]/60 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-white/60">
              Kata Sandi (min. 8 karakter)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••••"
              value={password}
              disabled={isSubmitting}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.1] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D2FF]/60 focus:ring-1 focus:ring-[#00D2FF]/60 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-white/60">
              Konfirmasi Kata Sandi
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••••"
              value={confirmPassword}
              disabled={isSubmitting}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white/[0.03] border border-white/[0.1] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00D2FF]/60 focus:ring-1 focus:ring-[#00D2FF]/60 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#00F5A0]/10 border border-[#00F5A0]/25 text-[#00F5A0] text-xs leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className="group relative w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#00D2FF] hover:bg-[#00D2FF]/90 text-black text-sm font-bold tracking-tight shadow-[0_0_25px_rgba(0,210,255,0.3)] hover:shadow-[0_0_35px_rgba(0,210,255,0.5)] transition-all duration-200 disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <>
                <span>Buat Akun Sekarang</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-white/40">
          Sudah memiliki akun?{" "}
          <Link href="/login" className="text-white hover:text-[#00D2FF] font-medium transition-colors">
            Masuk ke Sistem
          </Link>
        </div>

      </div>
    </div>
  )
}
