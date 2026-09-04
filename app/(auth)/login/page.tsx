import { Metadata } from "next"
import { LoginForm } from "@/components/sections/auth/LoginForm"
import { Sparkles, Database, Cpu, Layers } from "lucide-react"

export const metadata: Metadata = {
  title: "Masuk | AURA UII — Intelligent Academic Ops",
  description: "Gerbang otorisasi asisten virtual akademik resmi Universitas Islam Indonesia berbasis RAG ter-grounding.",
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 lg:gap-16 items-center">
      
      {/* Left Column: Editorial & Research Identity (Lando Norris / 0xAlvary Inspired) */}
      <div className="lg:col-span-7 space-y-8 text-left">
        
        {/* Academic Meta Badge */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#00F5A0]" />
          <span className="text-xs font-mono tracking-widest text-white/70 uppercase">
            SKRIPSI TEKNOLOGI INFORMASI // 2026
          </span>
        </div>

        {/* High-Impact Hero Typography */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
            Layanan Informasi{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F5A0] via-[#00D2FF] to-white">
              Akademik UII
            </span>{" "}
            Berbasis RAG.
          </h1>
          <p className="text-base sm:text-lg text-white/60 font-light leading-relaxed max-w-xl">
            Sistem representasi pengetahuan terdistribusi yang memadukan pemulihan vektor padat, perankingan ulang semantik, dan penalaran mutlak bersumber pada dokumen resmi kampus.
          </p>
        </div>

        {/* Technical Architecture Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md hover:border-white/20 transition-colors">
            <div className="flex items-center gap-2 text-[#00F5A0] mb-2">
              <Database className="w-4 h-4" />
              <span className="text-[11px] font-mono tracking-wider">01 // RETRIEVAL</span>
            </div>
            <div className="text-sm font-bold text-white">Pinecone Vector</div>
            <p className="text-[11px] text-white/40 mt-1">Dense embeddings similarity search top-20 chunks.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md hover:border-white/20 transition-colors">
            <div className="flex items-center gap-2 text-[#00D2FF] mb-2">
              <Layers className="w-4 h-4" />
              <span className="text-[11px] font-mono tracking-wider">02 // RERANKING</span>
            </div>
            <div className="text-sm font-bold text-white">Cohere v3.0</div>
            <p className="text-[11px] text-white/40 mt-1">Cross-encoder reranking presisi tinggi top-8 konteks.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md hover:border-white/20 transition-colors">
            <div className="flex items-center gap-2 text-indigo-400 mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-[11px] font-mono tracking-wider">03 // REASONER</span>
            </div>
            <div className="text-sm font-bold text-white">DeepSeek R1</div>
            <p className="text-[11px] text-white/40 mt-1">Penalaran logis anti-halusinasi strictly grounded.</p>
          </div>

        </div>

        {/* Faculty & Campus Verification Ribbon */}
        <div className="flex items-center gap-3 pt-2 text-xs text-white/40 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00F5A0]" />
          <span>TERINTEGRASI DOKUMEN RESMI FAKULTAS & UNIVERSITAS ISLAM INDONESIA</span>
        </div>

      </div>

      {/* Right Column: High-End Glassmorphic Login Console */}
      <div className="lg:col-span-5 flex justify-center w-full">
        <LoginForm />
      </div>

    </div>
  )
}
