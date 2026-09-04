"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SceneCanvas } from "@/components/visuals/SceneCanvas"
import { 
  ArrowRight, 
  Sparkles, 
  Database, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  FileText, 
  Search, 
  CheckCircle2, 
  ExternalLink,
  Bot
} from "lucide-react"

const QUICK_INQUIRIES = [
  "Berapa batas SKS minimal untuk pengajuan seminar proposal skripsi?",
  "Apa saja program studi sarjana & magister di FTI UII?",
  "Bagaimana alur pengajuan dispensasi keterlambatan KRS?",
  "Syarat dan jadwal pendaftaran beasiswa prestasi UII",
]

const ARCHITECTURE_STEPS = [
  {
    step: "01",
    title: "Document Ingestion & Splitter",
    tech: "LangChain + Jina Reader",
    desc: "Ekstraksi PDF resmi kampus, pembersihan noise, dan pemotongan teks secara rekursif (1000 char, 200 overlap).",
    icon: FileText,
    accent: "text-[#00F5A0]",
  },
  {
    step: "02",
    title: "Dense Semantic Vectorization",
    tech: "Cohere Multilingual v3.0",
    desc: "Transformasi teks akademik ke ruang vektor padat multibahasa dengan pemahaman terminologi kampus.",
    icon: Database,
    accent: "text-[#00D2FF]",
  },
  {
    step: "03",
    title: "High-Dimensional Vector Search",
    tech: "Pinecone Vector Index",
    desc: "Pencarian kemiripan kosinus berkecepatan tinggi yang mengambil 20 kandidat chunk paling relevan.",
    icon: Search,
    accent: "text-sky-400",
  },
  {
    step: "04",
    title: "Cross-Encoder Reranker",
    tech: "Cohere Rerank v3.0",
    desc: "Penyaringan noise dan perankingan ulang 20 kandidat menjadi 8 dokumen konteks dengan akurasi semantik puncak.",
    icon: Layers,
    accent: "text-indigo-400",
  },
  {
    step: "05",
    title: "Reasoning & Grounded Generation",
    tech: "DeepSeek Reasoner (R1)",
    desc: "Penalaran berantai (Chain-of-Thought) dengan aturan sistem mutlak: hanya menjawab dari konteks resmi tanpa halusinasi.",
    icon: Cpu,
    accent: "text-emerald-400",
  },
  {
    step: "06",
    title: "Realtime Hydration & Storage",
    tech: "Supabase Postgres + Realtime",
    desc: "Isolasi data sesi pengguna dengan Row Level Security dan streaming pesan instan antar perangkat.",
    icon: ShieldCheck,
    accent: "text-teal-300",
  },
]

const OFFICIAL_DOCUMENTS = [
  {
    title: "Buku Pedoman Akademik UII",
    badge: "Official Handbook",
    pages: "240 Halaman",
    status: "Indexed",
  },
  {
    title: "Pedoman Penulisan Skripsi & Tugas Akhir",
    badge: "Faculty Guidelines",
    pages: "118 Halaman",
    status: "Indexed",
  },
  {
    title: "Katalog Program Studi FTI, FE, FH, FIAI, FPSB",
    badge: "Curriculum Map",
    pages: "312 Halaman",
    status: "Indexed",
  },
  {
    title: "Ketentuan Beasiswa & Layanan Mahasiswa",
    badge: "Student Affairs",
    pages: "86 Halaman",
    status: "Indexed",
  },
]

export function LandingSection() {
  const router = useRouter()
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleDemoBypass = () => {
    localStorage.setItem("imuii_has_logged_in", "true")
    localStorage.setItem("imuii_demo_mode", "true")
    localStorage.setItem("imuii_demo_user", JSON.stringify({
      id: "demo-scholar-2026",
      email: "mahasiswa@uii.ac.id",
      name: "Akademisi UII",
      role: "student",
    }))
    router.push("/")
    router.refresh()
  }

  const handleCopyInquiry = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  return (
    <div className="relative min-h-screen w-full bg-[#070709] text-white selection:bg-[#00F5A0]/20 selection:text-[#00F5A0] overflow-x-hidden">
      
      {/* Interactive 3D Background */}
      <SceneCanvas />

      {/* Hero Section */}
      <section className="relative z-10 pt-28 pb-20 md:pt-36 md:pb-28 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        
        {/* Research Tag */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl mb-8 shadow-2xl hover:border-white/20 transition-all">
          <span className="h-2 w-2 rounded-full bg-[#00F5A0] animate-pulse" />
          <span className="text-xs font-mono tracking-widest text-white/70 uppercase">
            AURA UII // TWO-STAGE RAG RESEARCH PLATFORM
          </span>
        </div>

        {/* Editorial Big Typography */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white max-w-5xl leading-[1.02] mb-6">
          AKADEMIK UII DALAM{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F5A0] via-[#00D2FF] to-white">
            KENDALI KOGNITIF
          </span>.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-white/60 font-light leading-relaxed max-w-2xl mx-auto mb-10">
          Asisten virtual cerdas Universitas Islam Indonesia yang menghubungkan mahasiswa dan civitas akademika langsung ke dokumen resmi kampus melalui pencarian semantik dan penalaran ter-grounding.
        </p>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16 w-full max-w-md">
          <Link
            href="/login"
            className="group relative flex-1 min-w-[200px] h-12 flex items-center justify-center gap-2 rounded-2xl bg-[#00F5A0] hover:bg-[#00F5A0]/90 text-black text-sm font-bold tracking-tight shadow-[0_0_30px_rgba(0,245,160,0.35)] hover:shadow-[0_0_45px_rgba(0,245,160,0.55)] transition-all duration-200"
          >
            <span>Masuk ke Antarmuka</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            type="button"
            onClick={handleDemoBypass}
            className="flex-1 min-w-[200px] h-12 flex items-center justify-center gap-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-semibold border border-white/[0.1] hover:border-white/25 backdrop-blur-xl transition-all duration-200"
          >
            <Sparkles className="w-4 h-4 text-[#00D2FF]" />
            <span>Mode Demo Sidang (1-Klik)</span>
          </button>
        </div>

        {/* Interactive Quick Inquiries Carousel / Grid */}
        <div className="w-full max-w-4xl space-y-3">
          <p className="text-xs font-mono uppercase tracking-widest text-white/40">
            Contoh Pertanyaan yang Dapat Dijawab:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUICK_INQUIRIES.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleCopyInquiry(q, idx)}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-[#00F5A0]/30 text-left transition-all backdrop-blur-md"
              >
                <span className="text-xs text-white/70 group-hover:text-white transition-colors line-clamp-1 pr-2">
                  &ldquo;{q}&rdquo;
                </span>
                <span className="text-[10px] font-mono text-white/30 group-hover:text-[#00F5A0] shrink-0">
                  {copiedIndex === idx ? "Disalin!" : "Salin ↗"}
                </span>
              </button>
            ))}
          </div>
        </div>

      </section>

      {/* RAG Architecture Section */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.07] bg-[#070709]/80 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-mono uppercase tracking-widest text-[#00F5A0]">
              PIPELINE REKAYASA SISTEM
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
              Arsitektur Retrieval-Augmented Generation
            </h2>
            <p className="text-sm sm:text-base text-white/50 leading-relaxed">
              Mekanisme 6-tahap yang menjamin setiap jawaban yang dikeluarkan model berlandaskan dokumen sah institusi, bukan prediksi probabilitas tanpa bukti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ARCHITECTURE_STEPS.map((item, idx) => (
              <div
                key={idx}
                className="group relative p-7 rounded-3xl bg-white/[0.02] border border-white/[0.07] hover:border-white/20 transition-all duration-300 backdrop-blur-xl shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono text-white/30 tracking-widest">
                      PHASE // {item.step}
                    </span>
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                      <item.icon className={`w-5 h-5 ${item.accent}`} />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1.5">{item.title}</h3>
                  <div className="inline-block text-xs font-mono text-[#00D2FF] mb-3">
                    {item.tech}
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Official Knowledge Base Documents Section */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#00D2FF]">
                KNOWLEDGE BASE REPOSITORY
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Dokumen Terindeks di Sistem
              </h2>
            </div>
            <p className="text-xs text-white/40 font-mono max-w-sm">
              Diperbarui secara berkala melalui pipeline scraper otomatis n8n dan penambahan manual oleh civitas akademika.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OFFICIAL_DOCUMENTS.map((doc, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-white/60 border border-white/[0.08]">
                    {doc.badge}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-[#00F5A0]">
                    <CheckCircle2 className="w-3 h-3" /> {doc.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">
                  {doc.title}
                </h4>
                <div className="text-[11px] font-mono text-white/40 pt-2 border-t border-white/[0.05]">
                  Volume: {doc.pages}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Academic Thesis CTA */}
      <section className="relative z-10 py-20 px-6 border-t border-white/[0.07] bg-gradient-to-b from-[#0F1015]/40 to-transparent">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-[#00F5A0] mb-2">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Siap untuk Eksplorasi Akademik?
          </h3>
          <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
            Mulai berdialog dengan asisten virtual resmi UII sekarang atau jalankan pengujian sistem langsung.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-2xl bg-[#00F5A0] hover:bg-[#00F5A0]/90 text-black text-sm font-bold tracking-tight shadow-[0_0_25px_rgba(0,245,160,0.3)] transition-all"
            >
              Masuk ke Sesi Chat
            </Link>
          </div>
        </div>
      </section>

      {/* High-End Minimalist Footer */}
      <footer className="relative z-10 border-t border-white/[0.07] py-10 px-6 text-xs font-mono text-white/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            AURA UII — RESEARCH THESIS DEMO // UNIVERSITAS ISLAM INDONESIA
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-white/50">
            <span>REGION: AP-SOUTHEAST</span>
            <span>•</span>
            <span>MODEL: DEEPSEEK REASONER</span>
            <span>•</span>
            <span>RAG ENGINE: COHERE + PINECONE</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
