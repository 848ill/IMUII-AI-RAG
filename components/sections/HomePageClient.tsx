"use client"

import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/useAuth"
import { LandingSection } from "@/components/sections/LandingSection-redesign"
import { ResizableHeader } from "@/components/layout/ResizableHeader"
import type { ChatSession, ChatMessage } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

const ProtectedChat = dynamic(
  () => import("@/components/sections/ProtectedChat").then((mod) => mod.ProtectedChat),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-[#070709] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Menyiapkan Workspace AURA UII...
          </p>
        </div>
      </div>
    ),
  }
)


interface HomePageClientProps {
  initialSessions: ChatSession[]
  initialMessages: ChatMessage[]
  initialSessionId: string | null
}

export function HomePageClient({
  initialSessions,
  initialMessages,
  initialSessionId,
}: HomePageClientProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070709] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Menginisialisasi AURA UII...
          </p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="h-screen w-full overflow-hidden bg-[#070709] text-white">
        <ProtectedChat
          initialSessions={initialSessions}
          initialMessages={initialMessages}
          initialSessionId={initialSessionId}
        />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#070709] text-white">
      <ResizableHeader />
      <LandingSection />
    </div>
  )
}

