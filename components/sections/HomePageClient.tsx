"use client"

import { useAuth } from "@/hooks/useAuth"
import { ProtectedChat } from "@/components/sections/ProtectedChat"
import { LandingSection } from "@/components/sections/LandingSection"
import { cn } from "@/lib/utils"
import type { ChatSession, ChatMessage } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <section className={cn("container py-6 md:py-8 lg:py-10")}>
        <div className={cn("mx-auto max-w-6xl")}>
          <ProtectedChat
            initialSessions={initialSessions}
            initialMessages={initialMessages}
            initialSessionId={initialSessionId}
          />
        </div>
      </section>
    )
  }

  return (
    <section className={cn("relative min-h-screen bg-background")}>
      <LandingSection />
    </section>
  )
}
