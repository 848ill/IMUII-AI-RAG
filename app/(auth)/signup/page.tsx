import { Metadata } from "next"
import { SignupForm } from "@/components/sections/auth/SignupForm"
import { Sparkles, ShieldCheck, UserCheck, KeyRound } from "lucide-react"

export const metadata: Metadata = {
  title: "Daftar Akun | AURA UII — Intelligent Academic Ops",
  description: "Registrasi akun baru asisten virtual akademik resmi Universitas Islam Indonesia.",
}

export default function SignupPage() {
  return (
    <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 lg:gap-16 items-center">
      
      {/* Left Column: Identity & Security */}
      <div className="lg:col-span-7 space-y-8 text-left">
        
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#00F5A0]" />
          <span className="text-xs font-mono tracking-widest text-white/70 uppercase">
            02 // USER REGISTRATION
          </span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
            Akses Penuh ke{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F5A0] via-[#00D2FF] to-white">
              Ekosistem AURA UII
            </span>.
          </h1>
          <p className="text-base sm:text-lg text-white/60 font-light leading-relaxed max-w-xl">
            Daftarkan akun untuk menyimpan riwayat percakapan secara aman, mengunggah dokumen PDF akademik ke knowledge base pribadi, dan berinteraksi secara realtime.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
            <div className="flex items-center gap-2 text-[#00F5A0] mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[11px] font-mono">ENCRYPTED</span>
            </div>
            <div className="text-sm font-bold text-white">Row Level Security</div>
            <p className="text-[11px] text-white/40 mt-1">Isolasi data antar mahasiswa/i terjamin di PostgreSQL.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
            <div className="flex items-center gap-2 text-[#00D2FF] mb-2">
              <UserCheck className="w-4 h-4" />
              <span className="text-[11px] font-mono">REALTIME</span>
            </div>
            <div className="text-sm font-bold text-white">Live Sync Session</div>
            <p className="text-[11px] text-white/40 mt-1">Sinkronisasi pesan instan antar perangkat/tab.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
            <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <KeyRound className="w-4 h-4" />
              <span className="text-[11px] font-mono">OAUTH READY</span>
            </div>
            <div className="text-sm font-bold text-white">Google SSO</div>
            <p className="text-[11px] text-white/40 mt-1">Dapat langsung masuk menggunakan Gmail / akun kampus.</p>
          </div>
        </div>

      </div>

      {/* Right Column: Glassmorphic Signup Form */}
      <div className="lg:col-span-5 flex justify-center w-full">
        <SignupForm />
      </div>

    </div>
  )
}
