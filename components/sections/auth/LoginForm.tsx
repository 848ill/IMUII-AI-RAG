"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    if (!trimmedEmail || !trimmedPassword) {
      setError("Email dan password wajib diisi.")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      })

      if (authError) {
        setError(authError.message || "Login gagal. Coba lagi.")
        return
      }

      // Set flag bahwa user pernah login
      localStorage.setItem("imuii_has_logged_in", "true")

      setSuccess("Berhasil masuk. Mengarahkan...")
      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 600)
    } catch (err) {
      console.error("Login error:", err)
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
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          disabled={isSubmitting}
          onChange={(e) => setPassword(e.target.value)}
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
          {isSubmitting ? "Memproses..." : "Masuk"}
        </Button>
      </form>

      <p className={cn("text-sm text-center text-muted-foreground")}>
        Belum punya akun?{" "}
        <Link href="/signup" className={cn("text-primary font-medium hover:underline")}>
          Daftar
        </Link>
      </p>
    </div>
  )
}

