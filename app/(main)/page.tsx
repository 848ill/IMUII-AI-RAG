import { HomePageClient } from "@/components/sections/HomePageClient"

export default async function HomePage() {
  const sessions: never[] = []
  const initialMessages: never[] = []

  return (
    <main className="min-h-screen bg-[#070709] text-white">
      <HomePageClient
        initialSessions={sessions}
        initialMessages={initialMessages}
        initialSessionId={null}
      />
    </main>
  )
}


