"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

export function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    const trimmedConfirm = confirmPassword.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError("Email dan password wajib diisi.")
      return
    }

    if (trimmedPassword.length < 8) {
      setError("Password minimal 8 karakter.")
      return
    }

    if (trimmedPassword !== trimmedConfirm) {
      setError("Konfirmasi password tidak cocok.")
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
        setError(signupError.message || "Pendaftaran gagal. Coba lagi.")
        return
      }

      // Check if email confirmation is required
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Email confirmation required
        setSuccess("Berhasil mendaftar! Silakan cek email untuk verifikasi sebelum login.")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        // Already confirmed, can login directly
        setSuccess("Berhasil mendaftar! Mengarahkan ke halaman utama...")
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 600)
      }
    } catch (err) {
      console.error("Signup error:", err)
      setError("Terjadi kesalahan tak terduga.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("w-full space-y-5")}>
      <form className={cn("space-y-4")} onSubmit={handleSubmit}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          disabled={isSubmitting}
          onChange={(e) => setEmail(e.target.value)}
          className={cn("h-11 border-input bg-background focus-visible:ring-primary")}
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="Password (min. 8 karakter)"
          value={password}
          disabled={isSubmitting}
          onChange={(e) => setPassword(e.target.value)}
          className={cn("h-11 border-input bg-background focus-visible:ring-primary")}
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="Konfirmasi password"
          value={confirmPassword}
          disabled={isSubmitting}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={cn("h-11 border-input bg-background focus-visible:ring-primary")}
        />

        {error && (
          <p className={cn("text-sm text-red-400 bg-red-950/50 border border-red-900/50 rounded-lg px-3 py-2")}>{error}</p>
        )}
        {success && (
          <p className={cn("text-sm text-emerald-400 bg-emerald-950/50 border border-emerald-900/50 rounded-lg px-3 py-2")}>{success}</p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn("w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md")}
        >
          {isSubmitting ? "Memproses..." : "Daftar"}
        </Button>
      </form>

      <p className={cn("text-sm text-center text-muted-foreground")}>
        Sudah punya akun?{" "}
        <Link href="/login" className={cn("text-primary font-medium hover:underline")}>
          Masuk
        </Link>
      </p>
    </div>
  )
}

