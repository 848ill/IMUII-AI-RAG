"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WavyBackground } from "@/components/ui/wavy-background"
import { TypewriterEffect } from "@/components/ui/typewriter-effect"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

export function LandingSection() {
  return (
    <>
      {/* Hero - wavy background fullscreen, teks di atasnya */}
      <section className={cn("relative min-h-screen bg-black")}>
        <WavyBackground
          colors={["#0B3B75", "#1e5a9e", "#FDB913", "#0d4a8f", "#2d6bb3"]}
          waveWidth={80}
          backgroundFill="transparent"
          blur={2}
          speed="fast"
          waveOpacity={0.7}
          waveStyle="line"
          containerClassName="absolute inset-0"
          className="flex min-h-screen items-center justify-center px-6"
        >
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/90">
              Asisten Virtual Resmi UII
            </p>
            <h1>
              <TypewriterEffect
                words={[
                  { text: "I'm", className: "text-white" },
                  { text: "UII", className: "text-white" },
                  { text: "AI", className: "text-white" },
                ]}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-white"
                cursorClassName="bg-[#FDB913] h-6 md:h-8 lg:h-10"
              />
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto md:text-xl">
              Akses informasi kampus, riwayat percakapan, dan bantuan kampus dalam satu tempat.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
              >
                <Link href="/login">
                  Masuk
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 border-2 border-white/70 text-white hover:bg-white/15 hover:border-white font-semibold"
              >
                <Link href="/signup">Daftar</Link>
              </Button>
            </div>
          </div>
        </WavyBackground>
      </section>

      {/* Footer - di luar wavy background */}
      <footer className="py-6 border-t border-border bg-background">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>
            IMUII — Asisten Virtual Resmi Universitas Islam Indonesia
          </p>
        </div>
      </footer>
    </>
  )
}
