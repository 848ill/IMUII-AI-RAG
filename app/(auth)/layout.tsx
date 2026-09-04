import { ReactNode } from "react"
import { SceneCanvas } from "@/components/visuals/SceneCanvas"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-[#070709] text-white flex flex-col justify-between overflow-x-hidden selection:bg-[#00F5A0]/20 selection:text-[#00F5A0]">
      {/* 3D WebGL Canvas */}
      <SceneCanvas />

      {/* Top Editorial Brand Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#00F5A0] via-[#00D2FF] to-[#3B82F6] p-[1px] flex items-center justify-center shadow-[0_0_20px_rgba(0,245,160,0.2)]">
            <div className="h-full w-full bg-[#070709] rounded-[11px] flex items-center justify-center font-bold text-white tracking-tighter text-sm">
              AU
            </div>
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">AURA UII</span>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">RAG Ops Engine v2.1</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-white/60 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F5A0] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F5A0]"></span>
            </span>
            <span>RAG PIPELINE: ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        {children}
      </main>

      {/* Bottom Editorial Meta Bar */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-white/40 border-t border-white/[0.06] backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          <span>UNIVERSITAS ISLAM INDONESIA // THESIS DEFENSE EDITION</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-white/50">
          <span>LATENCY: ~24MS</span>
          <span>•</span>
          <span>MODEL: DEEPSEEK REASONER</span>
          <span>•</span>
          <span>VECTOR: PINECONE</span>
        </div>
      </footer>
    </div>
  )
}
