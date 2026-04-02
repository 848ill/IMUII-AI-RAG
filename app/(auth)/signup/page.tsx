import { Metadata } from "next"
import { SignupForm } from "@/components/sections/auth/SignupForm"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Daftar | IMUII",
  description: "Buat akun baru untuk mulai menggunakan IMUII, asisten virtual UII.",
}

export default function SignupPage() {
  return (
    <main className={cn("w-full max-w-6xl mx-auto space-y-10")}>
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border border-border shadow-[0_20px_60px_-28px_rgba(11,59,117,0.35)]",
          "grid lg:grid-cols-2 gap-0"
        )}
      >
        <div className={cn("relative overflow-hidden p-10 md:p-12 aurora-bg text-white space-y-4")}>
          <div className={cn("inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]")}>
            IMUII
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-semibold leading-tight")}>
            Mulai perjalananmu
          </h1>
          <p className={cn("text-white/90 text-sm md:text-base max-w-xl leading-relaxed")}>
            Buat akun. Akses percakapan, riwayat, dan bantuan kampus dalam satu tempat.
          </p>
          <div className={cn("flex flex-wrap items-center gap-3 text-white/80 text-sm")}>
            <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20")}>
              <span className="h-2 w-2 rounded-full bg-secondary" />
              Aman & privat
            </span>
            <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20")}>
              <span className="h-2 w-2 rounded-full bg-white" />
              Riwayat tersimpan
            </span>
          </div>
          <div className={cn("pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.24),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.18),transparent_30%)]")} />
        </div>

        <div className={cn("p-10 md:p-12 bg-card border-l border-border flex items-center justify-center")}>
          <div className={cn("w-full max-w-md space-y-6")}>
            <SignupForm />
          </div>
        </div>
      </div>
    </main>
  )
}

