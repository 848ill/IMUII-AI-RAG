import { HomePageClient } from "@/components/sections/HomePageClient"
import { ResizableHeader } from "@/components/layout/ResizableHeader"
import { cn } from "@/lib/utils"

export default async function HomePage() {
  // Sessions will be fetched client-side after auth to ensure proper user filtering
  // Server-side can't access user session easily, so we start empty
  const sessions: never[] = []
  const initialMessages: never[] = []

  return (
    <>
      <ResizableHeader />
      <main className={cn("min-h-screen bg-background")}>
        <HomePageClient
          initialSessions={sessions}
          initialMessages={initialMessages}
          initialSessionId={null}
        />
      </main>
    </>
  )
}

